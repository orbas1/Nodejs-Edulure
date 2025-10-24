import { describe, expect, it } from 'vitest';

import { mergeAnnexQuickActions } from '../../src/navigation/utils.js';

function buildStaticActions() {
  return [
    {
      id: 'create-post',
      label: 'New post',
      description: 'Publish an announcement or share a win with your community.',
      to: '/dashboard/learner/communities',
      icon: () => null,
      analyticsId: 'quick-action-create-post'
    },
    {
      id: 'launch-session',
      label: 'Schedule live session',
      description: 'Spin up a live classroom with chat, recordings, and attendance.',
      to: '/dashboard/instructor/live-classes',
      icon: () => null,
      analyticsId: 'quick-action-launch-session'
    }
  ];
}

describe('mergeAnnexQuickActions', () => {
  it('prefers annex metadata while keeping static fallbacks', () => {
    const staticActions = buildStaticActions();
    const annexActions = [
      {
        id: 'launch-session',
        label: 'Coordinate launch readiness',
        to: '/dashboard/instructor/live-classes?annex=ops-221',
        sortOrder: 0,
        initiative: {
          product: {
            epicId: 'OPS-221',
            backlogRef: '/handbook/navigation-annex#quick-live-session',
            summary: 'Route the live-session quick action through the updated scheduler with readiness gating.'
          },
          operations: {
            runbookSection: 'navigation-registry-validation',
            tasks: [
              {
                id: 'ops-live-session-verify',
                label: 'Verify scheduler readiness before launch',
                href: '/docs/operations/navigation-readiness#live-session-readiness'
              }
            ]
          },
          design: { tokens: [], qa: [], references: [] },
          strategy: { pillar: 'Activation', narrative: 'Live session readiness', metrics: [] }
        }
      }
    ];

    const result = mergeAnnexQuickActions(staticActions, annexActions);

    expect(result.callToAction).toEqual(
      expect.objectContaining({
        id: 'launch-session',
        label: 'Coordinate launch readiness',
        analyticsId: 'OPS-221',
        meta: expect.objectContaining({
          runbookHref: '/docs/operations/navigation-readiness#live-session-readiness',
          operationsTask: expect.objectContaining({ id: 'ops-live-session-verify' })
        })
      })
    );

    const quickAction = result.quickActions.find((item) => item.id === 'create-post');
    expect(quickAction).toEqual(
      expect.objectContaining({
        label: 'New post',
        analyticsId: 'quick-action-create-post',
        meta: expect.objectContaining({ runbookHref: null })
      })
    );
  });

  it('falls back to static ordering when annex data is unavailable', () => {
    const staticActions = buildStaticActions();

    const result = mergeAnnexQuickActions(staticActions, []);

    expect(result.callToAction).toEqual(
      expect.objectContaining({ id: 'create-post', label: 'New post' })
    );

    expect(result.quickActions.map((item) => item.id)).toEqual(['create-post', 'launch-session']);
  });
});

