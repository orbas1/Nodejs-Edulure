import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityEngagementService from '../src/services/CommunityEngagementService.js';

const databaseMocks = vi.hoisted(() => {
  const fakeQuery = {
    innerJoin: () => fakeQuery,
    select: () => fakeQuery,
    where: () => fakeQuery,
    andWhere: () => fakeQuery,
    orderBy: () => fakeQuery,
    limit: () => fakeQuery,
    offset: () => fakeQuery,
    groupBy: () => fakeQuery,
    leftJoin: () => fakeQuery,
    andWhereNull: () => fakeQuery,
    modify: () => fakeQuery,
    then: (resolve) => resolve([])
  };
  const transactionSpy = vi.fn(async (handler) => handler({}));
  const dbMock = Object.assign(vi.fn(() => fakeQuery), {
    transaction: transactionSpy,
    raw: vi.fn((value) => value)
  });
  return { dbMock, transactionSpy };
});

const loggerStub = vi.hoisted(() => {
  const base = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn()
  };
  base.child.mockReturnValue(base);
  return base;
});

const communityModelMock = vi.hoisted(() => ({ findById: vi.fn(), findBySlug: vi.fn() }));
const memberModelMock = vi.hoisted(() => ({ findMembership: vi.fn(), ensureMembership: vi.fn() }));
const pointModelMock = vi.hoisted(() => ({ lockSummary: vi.fn(), saveSummary: vi.fn() }));
const pointTransactionModelMock = vi.hoisted(() => ({ create: vi.fn() }));
const streakModelMock = vi.hoisted(() => ({ lock: vi.fn(), save: vi.fn() }));
const eventModelMock = vi.hoisted(() => ({ listForCommunity: vi.fn(), create: vi.fn(), findById: vi.fn() }));
const eventParticipantModelMock = vi.hoisted(() => ({ listForEvent: vi.fn(), find: vi.fn(), upsert: vi.fn() }));
const reminderModelMock = vi.hoisted(() => ({ upsert: vi.fn() }));
const domainEventModelMock = vi.hoisted(() => ({ record: vi.fn() }));

vi.mock('../src/config/database.js', () => ({
  default: databaseMocks.dbMock
}));

vi.mock('../src/config/logger.js', () => ({
  default: loggerStub
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    engagement: {
      defaultTimezone: 'Etc/UTC',
      reminders: {
        enabled: true,
        cronExpression: '*/5 * * * *',
        timezone: 'Etc/UTC',
        lookaheadMinutes: 30,
        batchSize: 100
      }
    }
  }
}));

vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));
vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: memberModelMock
}));
vi.mock('../src/models/CommunityMemberPointModel.js', () => ({
  default: pointModelMock
}));
vi.mock('../src/models/CommunityMemberPointTransactionModel.js', () => ({
  default: pointTransactionModelMock
}));
vi.mock('../src/models/CommunityMemberStreakModel.js', () => ({
  default: streakModelMock
}));
vi.mock('../src/models/CommunityEventModel.js', () => ({
  default: eventModelMock
}));
vi.mock('../src/models/CommunityEventParticipantModel.js', () => ({
  default: eventParticipantModelMock
}));
vi.mock('../src/models/CommunityEventReminderModel.js', () => ({
  default: reminderModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

const baseCommunity = {
  id: 10,
  visibility: 'public',
  metadata: JSON.stringify({ timezone: 'America/New_York' })
};

const resetMocks = () => {
  databaseMocks.transactionSpy.mockClear();
  databaseMocks.dbMock.mockClear();
  databaseMocks.dbMock.raw.mockClear();
  loggerStub.info.mockClear();
  loggerStub.debug.mockClear();
  loggerStub.warn.mockClear();
  loggerStub.error.mockClear();
  domainEventModelMock.record.mockReset();
  [
    communityModelMock,
    memberModelMock,
    pointModelMock,
    pointTransactionModelMock,
    streakModelMock,
    eventModelMock,
    eventParticipantModelMock,
    reminderModelMock
  ].forEach((model) => {
    Object.values(model).forEach((fn) => fn.mockReset());
  });
};

describe('CommunityEngagementService', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('awards points and records streak progress when requested', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    memberModelMock.findMembership.mockResolvedValueOnce({ role: 'owner', status: 'active' });
    memberModelMock.ensureMembership.mockResolvedValue({ role: 'member', status: 'active' });
    pointModelMock.lockSummary.mockResolvedValue({
      points: 50,
      lifetimePoints: 120,
      metadata: {}
    });
    pointModelMock.saveSummary.mockResolvedValue({
      communityId: 10,
      userId: 77,
      points: 80,
      lifetimePoints: 150,
      tier: 'silver'
    });
    pointTransactionModelMock.create.mockResolvedValue({
      id: 999,
      deltaPoints: 30
    });
    streakModelMock.lock.mockResolvedValue({
      communityId: 10,
      userId: 77,
      currentStreakDays: 2,
      longestStreakDays: 5,
      lastActiveOn: '2024-11-18T00:00:00Z',
      metadata: { timezone: 'Etc/UTC' }
    });
    streakModelMock.save.mockResolvedValue({
      communityId: 10,
      userId: 77,
      currentStreakDays: 3,
      longestStreakDays: 5
    });

    const result = await CommunityEngagementService.awardPoints('10', 55, {
      userId: 77,
      points: 30,
      reason: 'Community challenge',
      contributesToStreak: true
    });

    expect(pointModelMock.saveSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: 10,
        userId: 77,
        points: 80,
        lifetimePoints: 150,
        tier: 'bronze'
      }),
      expect.any(Object)
    );
    expect(pointTransactionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: 10,
        userId: 77,
        deltaPoints: 30,
        reason: 'Community challenge'
      }),
      expect.any(Object)
    );
    expect(streakModelMock.save).toHaveBeenCalled();
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'community.points.awarded'
      }),
      expect.any(Object)
    );
    expect(result).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({ tier: 'silver', points: 80 }),
        transaction: expect.objectContaining({ deltaPoints: 30 })
      })
    );
  });

  it('builds event listings with map metadata and attendance snapshot', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    memberModelMock.findMembership.mockResolvedValue(null);
    const eventRecord = {
      id: 44,
      communityId: 10,
      createdBy: 55,
      title: 'Moderator Training',
      slug: 'moderator-training',
      summary: null,
      description: 'Deep dive',
      startAt: '2024-11-25T15:00:00Z',
      endAt: '2024-11-25T16:00:00Z',
      timezone: 'Etc/UTC',
      visibility: 'members',
      status: 'scheduled',
      attendanceLimit: 100,
      attendanceCount: 1,
      waitlistCount: 0,
      requiresRsvp: true,
      isOnline: true,
      meetingUrl: 'https://meet.example.com/session',
      locationName: null,
      locationAddress: null,
      locationLatitude: null,
      locationLongitude: null,
      coverImageUrl: null,
      recurrenceRule: null,
      metadata: {},
      createdAt: '2024-11-01T10:00:00Z',
      updatedAt: '2024-11-01T10:00:00Z'
    };
    eventModelMock.listForCommunity.mockResolvedValue([eventRecord]);
    eventParticipantModelMock.listForEvent.mockResolvedValue([
      { id: 1, eventId: 44, userId: 100, status: 'going' },
      { id: 2, eventId: 44, userId: 102, status: 'waitlisted' }
    ]);

    const events = await CommunityEngagementService.listEvents('10', 200, {});

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 44,
        map: expect.objectContaining({ type: 'online', meetingUrl: 'https://meet.example.com/session' }),
        attendance: { confirmed: 1, waitlisted: 1 }
      })
    );
  });

  it('schedules reminders for RSVP participants', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    memberModelMock.findMembership.mockResolvedValue(null);
    eventModelMock.findById.mockResolvedValue({
      id: 90,
      communityId: 10,
      startAt: '2024-12-01T18:00:00Z'
    });
    eventParticipantModelMock.find.mockResolvedValue({ status: 'going' });
    reminderModelMock.upsert.mockResolvedValue({
      id: 5,
      eventId: 90,
      userId: 200,
      remindAt: '2024-12-01T17:30:00Z',
      channel: 'email'
    });

    const reminder = await CommunityEngagementService.scheduleReminder('10', 90, 200, {
      remindAt: '2024-12-01T17:30:00Z',
      channel: 'email'
    });

    expect(reminderModelMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 90,
        userId: 200,
        remindAt: new Date('2024-12-01T17:30:00Z')
      })
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.event.reminder.scheduled' })
    );
    expect(reminder).toEqual(
      expect.objectContaining({
        eventId: 90,
        channel: 'email'
      })
    );
  });

  it('records new streak entries using community timezone defaults', async () => {
    communityModelMock.findById.mockResolvedValue({
      ...baseCommunity,
      visibility: 'private',
      metadata: JSON.stringify({ timezone: 'America/New_York' })
    });
    memberModelMock.findMembership.mockResolvedValue({ status: 'active', role: 'member' });
    memberModelMock.ensureMembership.mockResolvedValue({ status: 'active', role: 'member' });
    streakModelMock.lock.mockResolvedValue(null);
    streakModelMock.save.mockResolvedValue({
      communityId: 10,
      userId: 55,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastActiveOn: '2024-11-20T05:00:00.000Z'
    });

    const streak = await CommunityEngagementService.recordCheckIn('10', 55, {
      activityAt: '2024-11-20T00:15:00Z'
    });

    expect(streakModelMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStreakDays: 1,
        longestStreakDays: 1
      }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.streak.progressed' }),
      expect.any(Object)
    );
    expect(streak.currentStreakDays).toBe(1);
  });
});
