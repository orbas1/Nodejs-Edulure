import knex from 'knex';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerOnboardingInsightsService from '../src/services/LearnerOnboardingInsightsService.js';

function createTestDb() {
  return knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });
}

describe('LearnerOnboardingInsightsService', () => {
  let connection;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-04-30T12:00:00Z'));

    connection = createTestDb();
    await connection.raw('PRAGMA foreign_keys = ON');

    await connection.schema.createTable('learner_onboarding_responses', (table) => {
      table.increments('id').primary();
      table.string('email');
      table.string('role');
      table.string('persona');
      table.text('invites');
      table.timestamp('submitted_at');
      table.timestamp('created_at');
      table.timestamp('updated_at');
    });

    await connection.schema.createTable('telemetry_events', (table) => {
      table.increments('id').primary();
      table.string('event_name');
      table.timestamp('occurred_at');
      table.timestamp('created_at');
      table.timestamp('updated_at');
    });

    const inviteSets = [
      {
        invites: [
          { code: 'FLOW5-OPS-GUILD', status: 'accepted' },
          { code: 'FLOW5-GROWTH-LAB', status: 'pending' },
          { code: 'FLOW4-ARCHIVE', status: 'expired' }
        ],
        submittedAt: '2025-04-26T10:00:00Z',
        persona: 'Community architect'
      },
      {
        invites: [
          { code: 'LEARNER-LAUNCH-OPS', status: 'pending' },
          { code: 'OPS-REVOCATION', status: 'revoked' }
        ],
        submittedAt: '2025-04-21T09:30:00Z',
        persona: 'Operations lead'
      },
      {
        invites: [
          { code: 'ENABLEMENT-WORKSHOP-1', status: 'accepted' },
          { code: 'ENABLEMENT-WORKSHOP-2', status: 'accepted' }
        ],
        submittedAt: '2025-03-15T08:00:00Z',
        persona: 'Enablement strategist'
      }
    ];

    for (const [index, inviteSet] of inviteSets.entries()) {
      await connection('learner_onboarding_responses').insert({
        email: `user-${index}@example.test`,
        role: index === 1 ? 'learner' : 'instructor',
        persona: inviteSet.persona,
        invites: JSON.stringify(inviteSet.invites),
        submitted_at: inviteSet.submittedAt,
        created_at: inviteSet.submittedAt,
        updated_at: inviteSet.submittedAt
      });
    }

    const surveyEvents = [
      '2025-04-28T12:00:00Z',
      '2025-04-22T12:00:00Z',
      '2025-04-15T12:00:00Z',
      '2025-04-08T12:00:00Z',
      '2025-03-25T12:00:00Z',
      '2025-02-24T12:00:00Z'
    ];

    for (const occurredAt of surveyEvents) {
      const occurredAtDate = new Date(occurredAt);
      await connection('telemetry_events').insert({
        event_name: 'learner.survey.submitted',
        occurred_at: occurredAtDate,
        created_at: occurredAtDate,
        updated_at: occurredAtDate
      });
    }
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (connection) {
      await connection.destroy();
    }
  });

  it('summarises learner readiness metrics with invite status breakdowns', async () => {
    const summary = await LearnerOnboardingInsightsService.summarise({ sinceDays: 30, connection });

    expect(summary.windowDays).toBe(30);
    expect(summary.onboarding.totalResponses).toBe(3);
    expect(summary.onboarding.recentResponses).toBe(2);
    expect(summary.onboarding.acceptedInvites).toBe(3);
    expect(summary.onboarding.pendingInvites).toBe(2);
    expect(summary.onboarding.expiredInvites).toBe(1);
    expect(summary.onboarding.revokedInvites).toBe(1);
    expect(summary.onboarding.totalInvites).toBe(7);
    expect(summary.onboarding.recentAcceptedInvites).toBe(1);
    expect(summary.onboarding.recentPendingInvites).toBe(2);
    expect(summary.onboarding.recentExpiredInvites).toBe(1);
    expect(summary.onboarding.recentRevokedInvites).toBe(1);
    expect(summary.onboarding.recentTotalInvites).toBe(5);
    expect(summary.onboarding.acceptanceRate).toBeCloseTo(3 / 7, 5);
    expect(summary.onboarding.recentAcceptanceRate).toBeCloseTo(1 / 5, 5);
    expect(summary.onboarding.lastSubmittedAt).toBe('2025-04-26T10:00:00.000Z');
    expect(summary.feedback.totalResponses).toBe(6);
    expect(summary.feedback.recentResponses).toBe(4);
    expect(summary.feedback.lastSubmittedAt).toBe('2025-04-28T12:00:00.000Z');
    expect(summary.feedback.dailyBreakdown[0].date).toBe('2025-04-28');
  });
});
