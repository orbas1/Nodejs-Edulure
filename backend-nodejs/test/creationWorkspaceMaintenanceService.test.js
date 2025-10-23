import { afterEach, describe, expect, it, vi } from 'vitest';

import CreationProjectChecklistItemModel from '../src/models/CreationProjectChecklistItemModel.js';
import { runCreationWorkspaceMaintenance } from '../src/services/CreationWorkspaceMaintenanceService.js';

describe('CreationWorkspaceMaintenanceService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('elevates warnings and escalates overdue tasks', async () => {
    const now = new Date('2025-03-01T12:00:00Z');
    const dueSoonRows = [
      {
        id: 1,
        project_id: 11,
        status: 'pending',
        severity: 'info',
        metadata: JSON.stringify({}),
        due_at: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
      }
    ];
    const overdueRows = [
      {
        id: 2,
        project_id: 11,
        status: 'pending',
        severity: 'warning',
        metadata: JSON.stringify({ escalations: { warningAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() } }),
        due_at: new Date(now.getTime() - 80 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        project_id: 12,
        status: 'blocked',
        severity: 'critical',
        metadata: JSON.stringify({ escalations: { criticalAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString() } }),
        due_at: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString()
      }
    ];

    const builders = [createQueryBuilder(dueSoonRows), createQueryBuilder(overdueRows)];
    let callIndex = 0;
    const trx = vi.fn(() => builders[callIndex++] ?? createQueryBuilder([]));
    const connection = {
      transaction: async (handler) => handler(trx)
    };

    const updateSpy = vi
      .spyOn(CreationProjectChecklistItemModel, 'updateById')
      .mockImplementation(async (id, updates) => ({ id, ...updates }));

    const summary = await runCreationWorkspaceMaintenance({
      warningThresholdHours: 48,
      escalationThresholdHours: 72,
      now,
      connection
    });

    expect(summary).toEqual({ warningsElevated: 1, escalated: 1, blocked: 1 });
    expect(updateSpy).toHaveBeenCalledTimes(2);

    const firstCall = updateSpy.mock.calls[0];
    expect(firstCall[0]).toBe(1);
    expect(firstCall[1].severity).toBe('warning');
    expect(firstCall[1].metadata.escalations.warningAt).toBeDefined();

    const secondCall = updateSpy.mock.calls[1];
    expect(secondCall[0]).toBe(2);
    expect(secondCall[1].status).toBe('blocked');
    expect(secondCall[1].severity).toBe('critical');
    expect(secondCall[1].metadata.escalations.criticalAt).toBeDefined();
  });
});

function createQueryBuilder(rows) {
  return {
    select() {
      return this;
    },
    whereIn() {
      return this;
    },
    andWhere() {
      return this;
    },
    whereNotNull() {
      return this;
    },
    then(onFulfilled, onRejected) {
      const promise = Promise.resolve(rows);
      return promise.then(onFulfilled, onRejected);
    }
  };
}
