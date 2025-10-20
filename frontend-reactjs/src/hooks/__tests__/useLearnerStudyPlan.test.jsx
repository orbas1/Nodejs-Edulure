import { act, renderHook } from '@testing-library/react';

import useLearnerStudyPlan from '../useLearnerStudyPlan.js';

describe('useLearnerStudyPlan', () => {
  it('normalises initial plan and computes study statistics', () => {
    const initialPlan = [
      {
        id: 'block-1',
        focus: 'Deep work',
        course: 'Foundations',
        startAt: '2024-01-01T10:00:00.000Z',
        endAt: '2024-01-01T11:00:00.000Z',
        duration: '60 minutes',
        status: 'scheduled'
      }
    ];

    const { result } = renderHook(() =>
      useLearnerStudyPlan(initialPlan, { session: { user: { id: 'tester' } } })
    );

    expect(result.current.plan).toHaveLength(1);
    expect(result.current.plan[0].focus).toBe('Deep work');
    expect(result.current.stats.scheduled).toBe(1);
    expect(result.current.stats.completed).toBe(0);
  });

  it('creates, updates, toggles and removes study blocks', () => {
    const { result } = renderHook(() => useLearnerStudyPlan([], { session: { user: { id: 'tester-2' } } }));

    let created;
    act(() => {
      created = result.current.createBlock({ focus: 'Revision sprint', durationMinutes: 45 });
    });

    expect(result.current.plan).toHaveLength(1);
    expect(result.current.stats.scheduled).toBe(1);

    act(() => {
      result.current.updateBlock(created.id, { status: 'completed', notes: 'Wrapped early.' });
    });

    expect(result.current.plan[0].status).toBe('completed');
    expect(result.current.stats.completed).toBe(1);

    act(() => {
      result.current.toggleCompletion(created.id);
    });

    expect(result.current.plan[0].status).toBe('scheduled');

    act(() => {
      result.current.removeBlock(created.id);
    });

    expect(result.current.plan).toHaveLength(0);
    expect(result.current.stats.scheduled).toBe(0);
  });

  it('duplicates study blocks into the future', () => {
    const { result } = renderHook(() =>
      useLearnerStudyPlan(
        [
          {
            id: 'plan-original',
            focus: 'Assessment prep',
            startAt: '2024-03-01T09:00:00.000Z',
            endAt: '2024-03-01T10:30:00.000Z',
            durationMinutes: 90,
            status: 'scheduled'
          }
        ],
        { session: { user: { id: 'tester-3' } } }
      )
    );

    act(() => {
      result.current.duplicateBlock('plan-original');
    });

    expect(result.current.plan.length).toBeGreaterThanOrEqual(2);
    const duplicate = result.current.plan.find((block) => block.id !== 'plan-original');
    expect(duplicate).toBeTruthy();
    expect(duplicate.status).toBe('scheduled');
  });
});
