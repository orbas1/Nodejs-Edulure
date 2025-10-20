import { describe, expect, it } from 'vitest';

import CommunityEventReminderModel from '../src/models/CommunityEventReminderModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityEventReminderModel', () => {
  it('upserts reminders with sanitised channels and metadata', async () => {
    const connection = createMockConnection({ community_event_reminders: [] });

    const reminder = await CommunityEventReminderModel.upsert(
      {
        eventId: 6,
        userId: 3,
        remindAt: '2024-05-02T09:15:00Z',
        channel: ' SMS ',
        metadata: { phoneNumber: '+15551234567' }
      },
      connection
    );

    expect(reminder.channel).toBe('sms');
    expect(reminder.status).toBe('pending');
    expect(reminder.metadata).toEqual({ phoneNumber: '+15551234567' });

    const rows = connection.__getRows('community_event_reminders');
    expect(rows[0].metadata).toBe('{"phoneNumber":"+15551234567"}');
  });

  it('marks reminders as processing while incrementing attempts', async () => {
    const connection = createMockConnection({
      community_event_reminders: [
        {
          id: 1,
          event_id: 2,
          user_id: 3,
          status: 'pending',
          remind_at: '2024-05-02T09:00:00Z',
          attempt_count: 0,
          metadata: '{}'
        }
      ]
    });

    const updatedRows = await CommunityEventReminderModel.markProcessing([1, 1], connection);
    expect(updatedRows).toBe(1);

    const rows = connection.__getRows('community_event_reminders');
    expect(rows[0].status).toBe('processing');
    expect(rows[0].attempt_count).toBe(1);
  });

  it('marks reminder outcomes with enforced statuses', async () => {
    const connection = createMockConnection({
      community_event_reminders: [
        {
          id: 5,
          event_id: 9,
          user_id: 4,
          status: 'processing',
          remind_at: '2024-05-02T09:00:00Z',
          attempt_count: 2,
          metadata: '{}'
        }
      ]
    });

    const reminder = await CommunityEventReminderModel.markOutcome(
      5,
      { status: 'SENT', sentAt: '2024-05-02T08:55:00Z' },
      connection
    );

    expect(reminder.status).toBe('sent');
    expect(new Date(reminder.sentAt).toISOString()).toBe('2024-05-02T08:55:00.000Z');
  });

  it('lists due reminders within a bounded window', async () => {
    const connection = createMockConnection({
      community_event_reminders: [
        {
          id: 1,
          event_id: 1,
          user_id: 1,
          status: 'pending',
          remind_at: new Date('2024-05-02T09:00:00Z'),
          metadata: '{}'
        },
        {
          id: 2,
          event_id: 1,
          user_id: 2,
          status: 'sent',
          remind_at: new Date('2024-05-02T09:05:00Z'),
          metadata: '{}'
        }
      ]
    });

    const due = await CommunityEventReminderModel.listDue(
      { now: '2024-05-02T08:55:00Z', lookaheadMinutes: 15, limit: 1 },
      connection
    );

    expect(due).toHaveLength(1);
    expect(due[0].id).toBe(1);
  });
});

