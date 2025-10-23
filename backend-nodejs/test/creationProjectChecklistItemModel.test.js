import { describe, expect, it } from 'vitest';

import CreationProjectChecklistItemModel, {
  normaliseSeverity,
  normaliseStatus
} from '../src/models/CreationProjectChecklistItemModel.js';

describe('CreationProjectChecklistItemModel', () => {
  it('deserialises metadata safely when provided as a string', () => {
    const row = {
      id: 1,
      project_id: 9,
      task_key: 'outline',
      title: 'Draft outline',
      description: null,
      category: 'content',
      status: 'pending',
      severity: 'info',
      sequence_index: 1,
      due_at: '2025-03-01T10:00:00Z',
      completed_at: null,
      metadata: '{"escalations":{"warningAt":"2025-02-28T08:00:00Z"}}'
    };

    const entity = CreationProjectChecklistItemModel.deserialize(row);

    expect(entity.metadata).toEqual({ escalations: { warningAt: '2025-02-28T08:00:00Z' } });
    expect(entity.status).toBe('pending');
    expect(entity.severity).toBe('info');
  });

  it('maps raw summary rows to keyed summary objects', () => {
    const rows = [
      {
        projectId: 1,
        total: '5',
        completed: '2',
        overdue: '1',
        critical: '1',
        warnings: '2',
        blocked: '1'
      },
      {
        project_id: 2,
        total: 3,
        completed: 1,
        overdue: 0,
        critical: 0,
        warnings: 1,
        blocked: 0
      }
    ];

    const summary = CreationProjectChecklistItemModel.mapSummaryRows(rows);

    expect(summary.get(1)).toEqual({ total: 5, completed: 2, overdue: 1, critical: 1, warnings: 2, blocked: 1 });
    expect(summary.get(2)).toEqual({ total: 3, completed: 1, overdue: 0, critical: 0, warnings: 1, blocked: 0 });
  });

  it('normalises status and severity values defensively', () => {
    expect(normaliseStatus('Published')).toBe('pending');
    expect(normaliseStatus('blocked')).toBe('blocked');
    expect(normaliseSeverity('Critical')).toBe('critical');
    expect(normaliseSeverity('unknown')).toBe('info');
  });
});
