import { describe, expect, it, vi } from 'vitest';

import EnvironmentParitySnapshotModel from '../src/models/EnvironmentParitySnapshotModel.js';

describe('EnvironmentParitySnapshotModel resilience', () => {
  const baseSnapshot = {
    environmentName: 'prod-env',
    environmentProvider: 'aws',
    manifestHash: 'abc123',
    mismatches: [{ id: 'config' }],
    dependencies: [{ name: 'database', status: 'degraded' }],
    metadata: { region: 'us-east-1' },
    status: 'healthy'
  };

  it('returns a fallback snapshot when the table is missing during recordSnapshot', async () => {
    const error = new Error('insert into environment_parity_snapshots - SQLITE_ERROR: no such table');
    error.code = 'SQLITE_ERROR';

    const builder = {
      insert: vi.fn(() => Promise.reject(error))
    };

    const connection = () => builder;
    connection.fn = { now: () => new Date('2025-01-01T00:00:00Z') };

    const snapshot = await EnvironmentParitySnapshotModel.recordSnapshot(baseSnapshot, connection);

    expect(snapshot).toMatchObject({
      id: null,
      environmentName: 'prod-env',
      environmentProvider: 'aws',
      manifestHash: 'abc123',
      mismatches: baseSnapshot.mismatches,
      dependencies: baseSnapshot.dependencies,
      status: 'healthy'
    });
  });

  it('returns an empty history when listRecent cannot reach the table', async () => {
    const error = new Error('select * - SQLITE_ERROR: no such table');
    error.code = 'SQLITE_ERROR';

    const builder = {
      select() {
        return this;
      },
      orderBy() {
        return this;
      },
      where() {
        return this;
      },
      whereNotIn() {
        return this;
      },
      limit() {
        return this;
      },
      then(_, reject) {
        reject(error);
      }
    };

    const connection = () => builder;

    const rows = await EnvironmentParitySnapshotModel.listRecent({}, connection);
    expect(rows).toEqual([]);
  });
});
