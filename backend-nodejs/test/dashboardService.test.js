import { describe, expect, it } from 'vitest';

import { buildLearningPace, calculateLearningStreak, humanizeRelativeTime } from '../src/services/DashboardService.js';

describe('DashboardService helpers', () => {
  it('calculates learning streak with contiguous days', () => {
    const reference = new Date('2024-11-05T12:00:00Z');
    const completions = [
      '2024-11-05T09:00:00Z',
      '2024-11-04T18:00:00Z',
      '2024-11-03T08:00:00Z',
      '2024-10-31T14:00:00Z'
    ];

    const streak = calculateLearningStreak(completions, reference);
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it('builds seven-day learning pace entries aggregated by day', () => {
    const reference = new Date('2024-11-07T12:00:00Z');
    const completions = [
      { completedAt: '2024-11-07T08:00:00Z', durationMinutes: 45 },
      { completedAt: '2024-11-06T10:00:00Z', durationMinutes: 30 },
      { completedAt: '2024-11-06T17:00:00Z', durationMinutes: 25 },
      { completedAt: '2024-11-03T09:00:00Z', durationMinutes: 60 }
    ];

    const pace = buildLearningPace(completions, reference);
    expect(pace).toHaveLength(7);
    expect(pace[6]).toEqual({ day: 'Thu', minutes: 45 });
    expect(pace[5]).toEqual({ day: 'Wed', minutes: 55 });
    expect(pace[2]).toEqual({ day: 'Sun', minutes: 60 });
  });

  it('renders humanised time differences', () => {
    const reference = new Date('2024-11-07T12:00:00Z');
    const sameHour = humanizeRelativeTime(new Date('2024-11-07T11:15:00Z'), reference);
    const daysAgo = humanizeRelativeTime(new Date('2024-11-02T12:00:00Z'), reference);

    expect(sameHour).toBe('45m ago');
    expect(daysAgo).toBe('5d ago');
  });
});
