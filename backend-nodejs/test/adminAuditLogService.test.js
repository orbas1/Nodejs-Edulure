import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditLogService } from '../src/services/AdminAuditLogService.js';

const contentAuditLogModel = { listRecent: vi.fn() };
const featureFlagAuditModel = { listRecent: vi.fn() };
const kycAuditLogModel = { listRecent: vi.fn() };
const socialAuditLogModel = { listRecent: vi.fn() };

const createService = () =>
  new AdminAuditLogService({
    contentAuditLogModel,
    featureFlagAuditModel,
    kycAuditLogModel,
    socialAuditLogModel
  });

describe('AdminAuditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges and sorts audit entries across sources', async () => {
    contentAuditLogModel.listRecent.mockResolvedValue([
      {
        id: 1,
        assetId: 'asset-1',
        event: 'course_published',
        performedBy: 'alice@example.com',
        payload: { title: 'Automation 101', severity: 'info' },
        createdAt: '2024-05-01T10:00:00.000Z'
      }
    ]);

    featureFlagAuditModel.listRecent.mockResolvedValue([
      {
        id: 2,
        flagId: 7,
        flagKey: 'checkout-rollout',
        changeType: 'updated',
        changedBy: 'ops@example.com',
        payload: { summary: 'Enabled for 25% of tenants', severity: 'warning' },
        createdAt: '2024-05-02T11:00:00.000Z'
      }
    ]);

    kycAuditLogModel.listRecent.mockResolvedValue([
      {
        id: 3,
        verificationId: 'ver-1',
        actorId: 90,
        actorFirstName: 'Jordan',
        actorLastName: 'Ops',
        actorEmail: 'kyc@example.com',
        action: 'approved',
        notes: 'Manual review completed',
        metadata: JSON.stringify({ severity: 'success' }),
        createdAt: '2024-05-01T12:00:00.000Z'
      }
    ]);

    socialAuditLogModel.listRecent.mockResolvedValue([
      {
        id: 4,
        user_id: 32,
        target_user_id: 18,
        action: 'member_suspended',
        metadata: { severity: 'critical', reason: 'Abuse reports' },
        createdAt: '2024-05-02T09:00:00.000Z',
        actor: { id: 32, name: 'Moderator One', email: 'moderator@example.com' },
        targetUser: { id: 18, name: 'Learner Two', email: 'learner@example.com' }
      }
    ]);

    const service = createService();
    const result = await service.listRecent({ limit: 10 });

    expect(result.totals).toEqual({
      content: 1,
      featureFlags: 1,
      identity: 1,
      social: 1
    });
    expect(result.entries).toHaveLength(4);
    expect(result.entries.map((entry) => entry.source)).toEqual([
      'feature_flags',
      'social',
      'identity',
      'content'
    ]);
    expect(result.entries[0]).toMatchObject({
      title: 'Feature flag checkout-rollout',
      severity: 'warning',
      occurredAt: '2024-05-02T11:00:00.000Z'
    });
    expect(result.entries[1]).toMatchObject({
      title: 'Social Member Suspended',
      severity: 'critical',
      actor: { name: 'Moderator One', email: 'moderator@example.com' }
    });
    expect(result.entries[2]).toMatchObject({
      source: 'identity',
      severity: 'success',
      references: [expect.objectContaining({ type: 'verification', id: 'ver-1' })]
    });
    expect(result.entries[3]).toMatchObject({
      source: 'content',
      actor: { email: 'alice@example.com' },
      references: [expect.objectContaining({ id: 'asset-1' })]
    });
  });

  it('forwards limit and since filters to every model', async () => {
    const since = '2024-05-01T00:00:00.000Z';
    contentAuditLogModel.listRecent.mockResolvedValue([]);
    featureFlagAuditModel.listRecent.mockResolvedValue([]);
    kycAuditLogModel.listRecent.mockResolvedValue([]);
    socialAuditLogModel.listRecent.mockResolvedValue([]);

    const service = createService();
    await service.listRecent({ limit: 15, since });

    expect(contentAuditLogModel.listRecent).toHaveBeenCalledWith({ limit: 15, since });
    expect(featureFlagAuditModel.listRecent).toHaveBeenCalledWith({ limit: 15, since });
    expect(kycAuditLogModel.listRecent).toHaveBeenCalledWith({ limit: 15, since });
    expect(socialAuditLogModel.listRecent).toHaveBeenCalledWith({ limit: 15, since });
  });
});
