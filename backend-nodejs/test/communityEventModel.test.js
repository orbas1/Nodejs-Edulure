import { describe, expect, it } from 'vitest';

import CommunityEventModel from '../src/models/CommunityEventModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityEventModel', () => {
  it('creates events with normalised fields and metadata persistence', async () => {
    const connection = createMockConnection({ community_events: [] });

    const event = await CommunityEventModel.create(
      {
        communityId: 2,
        createdBy: 11,
        title: ' Spring Kickoff ',
        slug: ' spring kickoff 2024 ',
        summary: 'Welcome new members',
        description: 'A hybrid session to kickstart the cohort.',
        startAt: '2024-05-01T10:00:00Z',
        endAt: '2024-05-01T11:00:00Z',
        timezone: 'America/New_York',
        visibility: 'PUBLIC',
        status: 'SCHEDULED',
        attendanceLimit: 150,
        requiresRsvp: 'true',
        isOnline: '1',
        locationLatitude: '40.7128',
        locationLongitude: '-74.0060',
        metadata: { tags: ['welcome'] }
      },
      connection
    );

    expect(event.slug).toBe('spring-kickoff-2024');
    expect(event.visibility).toBe('public');
    expect(event.requiresRsvp).toBe(true);
    expect(event.metadata).toEqual({ tags: ['welcome'] });

    const rows = connection.__getRows('community_events');
    expect(rows[0].metadata).toBe('{"tags":["welcome"]}');
  });

  it('lists events with filter constraints and safe pagination', async () => {
    const connection = createMockConnection({
      community_events: [
        {
          id: 1,
          community_id: 3,
          created_by: 1,
          title: 'Workshop',
          slug: 'workshop',
          start_at: '2024-05-02T09:00:00Z',
          end_at: '2024-05-02T10:00:00Z',
          timezone: 'UTC',
          visibility: 'members',
          status: 'scheduled',
          metadata: '{}'
        },
        {
          id: 2,
          community_id: 3,
          created_by: 1,
          title: 'Town Hall',
          slug: 'town-hall',
          start_at: '2024-05-10T09:00:00Z',
          end_at: '2024-05-10T10:00:00Z',
          timezone: 'UTC',
          visibility: 'public',
          status: 'cancelled',
          metadata: '{}'
        }
      ]
    });

    const events = await CommunityEventModel.listForCommunity(
      3,
      { from: '2024-05-01', status: ['SCHEDULED'], order: 'DESC', limit: 400 },
      connection
    );

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Workshop');
    expect(events.total).toBe(1);
  });

  it('increments attendance counts without allowing negative balances', async () => {
    const connection = createMockConnection({
      community_events: [
        {
          id: 5,
          community_id: 7,
          created_by: 4,
          title: 'Monthly AMA',
          slug: 'monthly-ama',
          start_at: '2024-05-20T10:00:00Z',
          end_at: '2024-05-20T11:00:00Z',
          timezone: 'UTC',
          visibility: 'members',
          status: 'scheduled',
          attendance_count: 10,
          waitlist_count: 5,
          metadata: '{}'
        }
      ]
    });

    await CommunityEventModel.incrementAttendance(5, -50, -1, connection);

    const rows = connection.__getRows('community_events');
    expect(rows[0].attendance_count).toBe(0);
    expect(rows[0].waitlist_count).toBe(4);
  });
});

