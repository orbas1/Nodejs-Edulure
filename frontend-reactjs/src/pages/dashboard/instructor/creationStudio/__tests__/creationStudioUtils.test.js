import { describe, expect, it } from 'vitest';

import {
  calculateProjectSummary,
  determineStepStates,
  describeTemplateSchema,
  findActiveSessionForUser,
  sessionRecency
} from '../creationStudioUtils.js';

describe('creationStudioUtils', () => {
  it('calculates project summary metrics', () => {
    const summary = calculateProjectSummary([
      { status: 'draft', type: 'course', collaboratorCount: 2, activeSessions: [{}, {}] },
      { status: 'ready_for_review', type: 'community', collaboratorCount: 1, activeSessions: [{}] },
      { status: 'approved', type: 'ebook', collaboratorCount: 3, activeSessions: [] },
      { status: 'published', type: 'ads_asset', collaboratorCount: 1 }
    ]);

    expect(summary).toMatchObject({
      drafts: 1,
      awaitingReview: 1,
      launchReady: 2,
      collaborators: 7,
      liveSessions: 3,
      total: 4,
      typeBreakdown: { course: 1, community: 1, ebook: 1, ads_asset: 1 }
    });
  });

  it('determines wizard step states from project data', () => {
    const project = {
      title: 'AI Course',
      summary: 'A full production course',
      metadata: {
        objectives: ['Launch'],
        modules: [{ id: 'm1' }],
        schedule: 'Weekly',
        pricing: { plans: [{ name: 'Standard', amountCents: 12000 }] },
        assets: ['intro.mp4'],
        publishingChannels: ['web']
      },
      contentOutline: [{ id: 'wk1', label: 'Week 1' }],
      status: 'approved',
      complianceNotes: [{ message: 'Update refund policy' }]
    };

    const steps = determineStepStates(project);
    expect(steps.map((step) => step.state)).toEqual(['complete', 'complete', 'complete', 'complete', 'warning']);
    expect(steps[0].metrics.summaryLength).toBe(project.summary.length);
  });

  it('builds community-focused steps with readiness states', () => {
    const project = {
      type: 'community',
      title: 'Design Leaders Guild',
      status: 'ready_for_review',
      metadata: {
        audience: ['UX designers'],
        mission: 'Support peer learning across design teams',
        engagementPrograms: ['Monthly critique'],
        spaces: ['Slack workspace'],
        moderation: {
          guidelines: ['Be respectful'],
          escalationContacts: ['ops@edulure.com'],
          tools: ['Escalation queue']
        }
      }
    };

    const steps = determineStepStates(project);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toMatchObject({ id: 'identity', state: 'complete' });
    expect(steps[1]).toMatchObject({ id: 'programming', state: 'complete' });
    expect(steps[2]).toMatchObject({ id: 'moderation', state: 'complete' });
    expect(steps[3]).toMatchObject({ id: 'enablement', state: 'complete' });
    expect(steps[4]).toMatchObject({ id: 'publish', state: 'in-progress' });
  });

  it('describes template schema counts', () => {
    const stats = describeTemplateSchema({
      schema: {
        outline: [{}, {}],
        assets: ['pdf'],
        bestPractices: ['rule1', 'rule2', 'rule3']
      }
    });

    expect(stats).toEqual({ outlineLength: 2, assetCount: 1, bestPractices: 3 });
  });

  it('returns the active session for a user', () => {
    const sessions = [
      { id: 's1', participantId: 2, leftAt: null },
      { id: 's2', participantId: 1, leftAt: null },
      { id: 's3', participantId: 1, leftAt: '2024-02-02T10:00:00.000Z' }
    ];

    const active = findActiveSessionForUser(sessions, 1);
    expect(active).toMatchObject({ id: 's2' });
  });

  it('computes session recency and handles missing heartbeat', () => {
    const now = new Date('2024-02-02T12:00:00.000Z');
    const session = { lastHeartbeatAt: '2024-02-02T11:59:00.000Z' };
    expect(sessionRecency(session, now)).toBe(60 * 1000);
    expect(sessionRecency({}, now)).toBe(Infinity);
  });
});
