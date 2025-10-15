import { Readable } from 'node:stream';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DataPartitionService } from '../src/services/DataPartitionService.js';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

function createService({ repositories, storageOverrides = {}, configOverrides = {}, clock } = {}) {
  const storage = {
    uploadStream: vi.fn().mockImplementation(({ stream, bucket, key }) => {
      stream.resume();
      return Promise.resolve({ bucket, key });
    }),
    ...storageOverrides
  };

  const config = {
    enabled: true,
    dryRun: false,
    lookaheadMonths: 0,
    lookbehindMonths: 0,
    archiveGraceDays: 0,
    minActivePartitions: 0,
    archive: {
      bucket: 'archive-bucket',
      prefix: 'governance/test',
      visibility: 'workspace'
    },
    maxExportRows: null,
    maxExportBytes: null,
    ...configOverrides
  };

  return {
    storage,
    service: new DataPartitionService({
      config,
      repositories,
      storage,
      loggerInstance: noopLogger,
      clock: clock ?? (() => new Date('2025-02-15T00:00:00Z'))
    })
  };
}

describe('DataPartitionService', () => {
  let baseRepository;

  beforeEach(() => {
    baseRepository = {
      fetchPolicies: vi.fn(),
      fetchPartitions: vi.fn(),
      addPartition: vi.fn().mockResolvedValue({ created: true }),
      dropPartition: vi.fn().mockResolvedValue({ dropped: true }),
      findArchive: vi.fn(),
      recordArchive: vi.fn().mockResolvedValue({ id: 42 }),
      markArchiveDropped: vi.fn().mockResolvedValue(),
      streamPartitionRows: vi.fn().mockReturnValue(Readable.from([{ id: 1, occurred_at: '2024-01-02T00:00:00Z' }]))
    };
  });

  it('archives and drops partitions when retention window has elapsed', async () => {
    const policy = {
      id: 1,
      tableName: 'audit_events',
      dateColumn: 'occurred_at',
      strategy: 'monthly_range',
      retentionDays: 30,
      metadata: {}
    };
    const partition = {
      name: 'p202401',
      start: new Date(Date.UTC(2024, 0, 1)),
      end: new Date(Date.UTC(2024, 1, 1))
    };

    baseRepository.fetchPolicies.mockResolvedValue([policy]);
    baseRepository.fetchPartitions.mockResolvedValue([partition]);
    baseRepository.findArchive.mockResolvedValue(null);

    const { service, storage } = createService({ repositories: baseRepository });

    const summary = await service.rotate({ dryRun: false });

    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].archived[0].status).toBe('archived');
    expect(storage.uploadStream).toHaveBeenCalledTimes(1);
    expect(baseRepository.recordArchive).toHaveBeenCalledTimes(1);
    expect(baseRepository.dropPartition).toHaveBeenCalledWith(policy.tableName, partition.name);
    expect(baseRepository.markArchiveDropped).toHaveBeenCalledWith(42);
  });

  it('skips destructive actions when running in dry-run mode', async () => {
    const policy = {
      id: 2,
      tableName: 'consent_records',
      dateColumn: 'granted_at',
      strategy: 'monthly_range',
      retentionDays: 30,
      metadata: {}
    };
    const partition = {
      name: 'p202401',
      start: new Date(Date.UTC(2024, 0, 1)),
      end: new Date(Date.UTC(2024, 1, 1))
    };

    baseRepository.fetchPolicies.mockResolvedValue([policy]);
    baseRepository.fetchPartitions.mockResolvedValue([partition]);
    baseRepository.findArchive.mockResolvedValue(null);

    const { service, storage } = createService({ repositories: baseRepository });

    const summary = await service.rotate({ dryRun: true });

    expect(summary.results[0].archived[0].status).toBe('planned-archive');
    expect(storage.uploadStream).not.toHaveBeenCalled();
    expect(baseRepository.dropPartition).not.toHaveBeenCalled();
  });

  it('requires manual approval when metadata flags manualApprovalRequired', async () => {
    const policy = {
      id: 3,
      tableName: 'security_incidents',
      dateColumn: 'detected_at',
      strategy: 'monthly_range',
      retentionDays: 30,
      metadata: { manualApprovalRequired: true }
    };
    const partition = {
      name: 'p202401',
      start: new Date(Date.UTC(2024, 0, 1)),
      end: new Date(Date.UTC(2024, 1, 1))
    };

    baseRepository.fetchPolicies.mockResolvedValue([policy]);
    baseRepository.fetchPartitions.mockResolvedValue([partition]);
    baseRepository.findArchive.mockResolvedValue(null);

    const { service, storage } = createService({ repositories: baseRepository });

    const summary = await service.rotate({ dryRun: false });
    const archivePlan = summary.results[0].archived[0];

    expect(archivePlan.status).toBe('skipped');
    expect(archivePlan.reason).toBe('manual_approval_required');
    expect(storage.uploadStream).not.toHaveBeenCalled();
    expect(baseRepository.dropPartition).not.toHaveBeenCalled();
  });
});
