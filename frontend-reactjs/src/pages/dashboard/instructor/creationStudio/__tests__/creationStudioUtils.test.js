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
      { status: 'draft', collaboratorCount: 2, activeSessions: [{}, {}] },
      { status: 'ready_for_review', collaboratorCount: 1, activeSessions: [{}] },
      { status: 'approved', collaboratorCount: 3, activeSessions: [] },
      { status: 'published', collaboratorCount: 1 }
    ]);

    expect(summary).toEqual({
      drafts: 1,
      awaitingReview: 1,
      launchReady: 2,
      collaborators: 7,
      liveSessions: 3,
      total: 4
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
