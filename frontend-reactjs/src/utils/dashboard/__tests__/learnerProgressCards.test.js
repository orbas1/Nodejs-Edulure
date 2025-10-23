import { describe, expect, it } from 'vitest';

import {
  buildLearnerProgressCardPayload,
  buildLearnerProgressCards
} from '../learnerProgressCards.js';

describe('learnerProgressCards', () => {
  it('builds a single card payload with goal and promotion details', () => {
    const course = {
      id: 'course-1',
      title: 'Automation Foundations',
      status: 'Active',
      instructor: 'Jess Lane',
      progressPercent: 42,
      nextLessonLabel: 'Module 3 · Email sequences',
      lastTouchedLabel: '2 days ago'
    };
    const goal = {
      courseId: 'course-1',
      status: 'Focus',
      dueDate: '2030-04-02',
      focusMinutesPerWeek: 150,
      nextStep: 'Submit cohort project',
      progressPercent: 41,
      priority: 1
    };
    const promotion = {
      courseId: 'course-1',
      headline: 'Unlock creator revenue',
      caption: 'Earn referral credit when you share cohort wins.',
      actionLabel: 'View playbook',
      actionHref: 'https://app.edulure.com/revenue'
    };

    const card = buildLearnerProgressCardPayload(course, { goal, promotion });

    expect(card).toMatchObject({
      id: 'course-1',
      title: 'Automation Foundations',
      status: 'Active',
      instructor: 'Jess Lane',
      progressPercent: 42,
      nextLabel: 'Module 3 · Email sequences',
      highlight: true,
      goal: {
        statusLabel: 'Focus',
        dueLabel: '4/2/2030',
        focusMinutesPerWeek: 150,
        nextStep: 'Submit cohort project'
      },
      revenue: {
        headline: 'Unlock creator revenue',
        caption: 'Earn referral credit when you share cohort wins.',
        action: {
          label: 'View playbook',
          href: 'https://app.edulure.com/revenue'
        }
      },
      meta: {
        lastUpdatedLabel: '2 days ago'
      }
    });
    expect(card.links.course).toBe('/dashboard/courses?courseId=course-1');
    expect(card.links.modules).toBe('/dashboard/courses?courseId=course-1#modules');
  });

  it('maps courses with referenced goals and promotions', () => {
    const courses = [
      { id: 'alpha', title: 'Alpha Course', progress: 10 },
      { id: 'beta', title: 'Beta Course', progressPercent: 80, nextLesson: { title: 'Capstone' } },
      { id: 'gamma', title: 'Gamma Course', progress: 0 }
    ];
    const goals = [
      { courseId: 'alpha', statusLabel: 'On track', dueLabel: 'Next week' },
      { courseId: 'gamma', status: 'Focus sprint', upNext: 'Finish orientation' }
    ];
    const promotions = [
      { courseId: 'beta', title: 'Upgrade to pro', action: { label: 'Upgrade', href: '/upgrade' } }
    ];

    const cards = buildLearnerProgressCards({ courses, goals, promotions, limit: null });

    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatchObject({
      id: 'alpha',
      goal: {
        statusLabel: 'On track',
        dueLabel: 'Next week'
      }
    });
    expect(cards[1]).toMatchObject({
      id: 'beta',
      revenue: {
        headline: 'Upgrade to pro',
        action: { label: 'Upgrade', href: '/upgrade' }
      }
    });
    expect(cards[2]).toMatchObject({
      id: 'gamma',
      highlight: true,
      goal: {
        nextStep: 'Finish orientation'
      }
    });
  });
});
