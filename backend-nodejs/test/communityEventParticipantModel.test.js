import { describe, expect, it } from 'vitest';

import CommunityEventParticipantModel from '../src/models/CommunityEventParticipantModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityEventParticipantModel', () => {
  it('upserts participants with validated statuses and metadata', async () => {
    const connection = createMockConnection({ community_event_participants: [] });

    const participant = await CommunityEventParticipantModel.upsert(
      {
        eventId: 8,
        userId: 4,
        status: 'GOING',
        rsvpAt: '2024-05-01T09:00:00Z',
        metadata: { reminders: true }
      },
      connection
    );

    expect(participant.status).toBe('going');
    expect(participant.metadata).toEqual({ reminders: true });

    const rows = connection.__getRows('community_event_participants');
    expect(rows[0].metadata).toBe('{"reminders":true}');
  });

  it('counts participants by status case insensitively', async () => {
    const connection = createMockConnection({
      community_event_participants: [
        { id: 1, event_id: 2, user_id: 1, status: 'going', metadata: '{}' },
        { id: 2, event_id: 2, user_id: 2, status: 'going', metadata: '{}' },
        { id: 3, event_id: 2, user_id: 3, status: 'waitlisted', metadata: '{}' }
      ]
    });

    const count = await CommunityEventParticipantModel.countByStatus(2, 'Going', connection);
    expect(count).toBe(2);
  });

  it('lists participants ordered by RSVP timestamp', async () => {
    const connection = createMockConnection({
      community_event_participants: [
        { id: 1, event_id: 3, user_id: 2, status: 'going', rsvp_at: '2024-05-01T11:00:00Z', metadata: '{}' },
        { id: 2, event_id: 3, user_id: 1, status: 'going', rsvp_at: '2024-05-01T09:00:00Z', metadata: '{}' }
      ]
    });

    const attendees = await CommunityEventParticipantModel.listForEvent(3, connection);
    expect(attendees[0].userId).toBe(1);
  });
});

