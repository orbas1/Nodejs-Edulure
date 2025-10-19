import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useOutletContextMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useOutletContext: useOutletContextMock
}));

describe('useLearnerDashboardSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves nested dashboard values for learners', async () => {
    const refreshMock = vi.fn();
    useOutletContextMock.mockReturnValue({
      role: 'learner',
      dashboard: {
        analytics: {
          learning: {
            pace: [
              { day: 'Mon', minutes: 45 },
              { day: 'Tue', minutes: 60 }
            ]
          }
        }
      },
      refresh: refreshMock
    });

    const { default: useLearnerDashboardSection } = await import('../useLearnerDashboard.js');
    const { result } = renderHook(() => useLearnerDashboardSection('analytics.learning.pace'));

    expect(result.current.isLearner).toBe(true);
    expect(result.current.section).toEqual([
      { day: 'Mon', minutes: 45 },
      { day: 'Tue', minutes: 60 }
    ]);

    let mutationRan = false;
    await act(async () => {
      await result.current.refreshAfterAction(async () => {
        mutationRan = true;
        return 'ok';
      });
    });

    expect(mutationRan).toBe(true);
    expect(refreshMock).toHaveBeenCalled();
  });

  it('guards access when the user is not a learner', async () => {
    useOutletContextMock.mockReturnValue({
      role: 'instructor',
      dashboard: { courses: { active: [1, 2, 3] } },
      refresh: vi.fn()
    });

    const { default: useLearnerDashboardSection } = await import('../useLearnerDashboard.js');
    const { result } = renderHook(() => useLearnerDashboardSection('courses.active'));

    expect(result.current.isLearner).toBe(false);
    expect(result.current.section).toBeNull();
  });
});
