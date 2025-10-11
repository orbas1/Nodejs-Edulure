import slugify from 'slugify';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityEventParticipantModel from '../models/CommunityEventParticipantModel.js';
import CommunityEventReminderModel from '../models/CommunityEventReminderModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityMemberPointModel from '../models/CommunityMemberPointModel.js';
import CommunityMemberPointTransactionModel from '../models/CommunityMemberPointTransactionModel.js';
import CommunityMemberStreakModel from '../models/CommunityMemberStreakModel.js';
import CommunityModel from '../models/CommunityModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const log = logger.child({ module: 'community-engagement-service' });

const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);
const POINT_TIERS = [
  { name: 'bronze', minPoints: 0 },
  { name: 'silver', minPoints: 500 },
  { name: 'gold', minPoints: 1500 },
  { name: 'platinum', minPoints: 4000 },
  { name: 'diamond', minPoints: 8000 }
];

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function resolveTier(lifetimePoints) {
  const sorted = [...POINT_TIERS].sort((a, b) => b.minPoints - a.minPoints);
  const tier = sorted.find((entry) => lifetimePoints >= entry.minPoints);
  return tier?.name ?? 'bronze';
}

function parseDateInput(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function extractLocalDate(date, timezone = 'Etc/UTC') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year') acc.year = part.value;
    if (part.type === 'month') acc.month = part.value;
    if (part.type === 'day') acc.day = part.value;
    return acc;
  }, {});
  const iso = `${parts.year}-${parts.month}-${parts.day}T00:00:00Z`;
  return new Date(iso);
}

function buildMapMetadata(event) {
  if (event.isOnline) {
    return {
      type: 'online',
      meetingUrl: event.meetingUrl
    };
  }

  if (event.locationLatitude != null && event.locationLongitude != null) {
    const coordinates = {
      latitude: Number(event.locationLatitude),
      longitude: Number(event.locationLongitude)
    };
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
    return {
      type: 'map',
      provider: 'google-maps',
      coordinates,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      shareUrl: mapUrl
    };
  }

  if (event.locationAddress) {
    const encoded = encodeURIComponent(event.locationAddress);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    return {
      type: 'map',
      provider: 'google-maps',
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      shareUrl: mapUrl
    };
  }

  return { type: 'unspecified' };
}

function assertModeratorRole(membership) {
  if (!membership || !MODERATOR_ROLES.has(membership.role)) {
    const error = new Error('You do not have permission to perform this action');
    error.status = membership ? 403 : 404;
    throw error;
  }
}

function sanitizeReason(reason) {
  return reason?.trim().substring(0, 240) || 'Community contribution';
}

function sanitizeSource(source) {
  return source?.trim().substring(0, 120) || 'manual';
}

export default class CommunityEngagementService {
  static async ensureCommunityAccess(communityId, userId) {
    const communityRecord = await CommunityModel.findById(communityId);
    if (!communityRecord) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const community = { ...communityRecord, metadata: parseMetadata(communityRecord.metadata) };

    if (community.visibility === 'public') {
      return { community, membership: await CommunityMemberModel.findMembership(community.id, userId) };
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership || membership.status !== 'active') {
      const error = new Error('Community is private');
      error.status = membership ? 403 : 404;
      throw error;
    }

    return { community, membership };
  }

  static async awardPoints(communityIdentifier, actorId, payload) {
    const community = await CommunityServiceHelpers.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const actorMembership = await CommunityMemberModel.findMembership(community.id, actorId);
    assertModeratorRole(actorMembership);

    const targetMembership = await CommunityMemberModel.ensureMembership(
      community.id,
      payload.userId,
      { status: 'active' }
    );

    if (targetMembership.status !== 'active') {
      const error = new Error('Member is not active in this community');
      error.status = 409;
      throw error;
    }

    if (!Number.isFinite(payload.points) || payload.points === 0) {
      const error = new Error('Points adjustment must be a non-zero numeric value');
      error.status = 422;
      throw error;
    }

    const reason = sanitizeReason(payload.reason);
    const source = sanitizeSource(payload.source);

    return db.transaction(async (trx) => {
      const existing = await CommunityMemberPointModel.lockSummary(community.id, payload.userId, trx);
      const currentPoints = existing?.points ?? 0;
      const lifetimePoints = existing?.lifetimePoints ?? 0;
      const newBalance = currentPoints + payload.points;
      if (newBalance < 0) {
        const error = new Error('Points balance cannot become negative');
        error.status = 422;
        throw error;
      }

      const newLifetime = payload.points > 0 ? lifetimePoints + payload.points : lifetimePoints;
      const tier = resolveTier(newLifetime);

      const summary = await CommunityMemberPointModel.saveSummary(
        {
          communityId: community.id,
          userId: payload.userId,
          points: newBalance,
          lifetimePoints: newLifetime,
          tier,
          lastAwardedAt: new Date(),
          lastActivityAt: payload.activityAt ?? existing?.lastActivityAt ?? null,
          metadata: existing?.metadata ?? {}
        },
        trx
      );

      const transaction = await CommunityMemberPointTransactionModel.create(
        {
          communityId: community.id,
          userId: payload.userId,
          awardedBy: actorId,
          deltaPoints: payload.points,
          balanceAfter: newBalance,
          reason,
          source,
          referenceId: payload.referenceId ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${payload.userId}`,
          eventType: 'community.points.awarded',
          payload: {
            communityId: community.id,
            userId: payload.userId,
            awardedBy: actorId,
            deltaPoints: payload.points,
            balanceAfter: newBalance,
            tier
          },
          performedBy: actorId
        },
        trx
      );

      if (payload.contributesToStreak) {
        await this.recordStreakActivityInternal(
          community.id,
          payload.userId,
          payload.activityAt ?? new Date(),
          payload.timezone ?? community.metadata?.timezone ?? 'Etc/UTC',
          trx
        );
      }

      log.info(
        {
          communityId: community.id,
          targetUserId: payload.userId,
          actorId,
          deltaPoints: payload.points,
          tier
        },
        'Community member points adjusted'
      );

      return { summary, transaction };
    });
  }

  static async recordCheckIn(communityIdentifier, userId, payload = {}) {
    const community = await CommunityServiceHelpers.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.ensureMembership(community.id, userId, { status: 'active' });
    if (membership.status !== 'active') {
      const error = new Error('Member is not active in this community');
      error.status = 409;
      throw error;
    }

    const activityAt = parseDateInput(payload.activityAt) ?? new Date();
    const timezone = payload.timezone ?? community.metadata?.timezone ?? env.engagement.defaultTimezone;

    return db.transaction(async (trx) => {
      const streak = await this.recordStreakActivityInternal(community.id, userId, activityAt, timezone, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${userId}`,
          eventType: 'community.streak.progressed',
          payload: {
            communityId: community.id,
            userId,
            currentStreakDays: streak.currentStreakDays,
            longestStreakDays: streak.longestStreakDays,
            activityAt: activityAt.toISOString(),
            timezone
          },
          performedBy: userId
        },
        trx
      );

      log.debug(
        {
          communityId: community.id,
          userId,
          currentStreak: streak.currentStreakDays,
          longestStreak: streak.longestStreakDays
        },
        'Community streak checkpoint recorded'
      );

      return streak;
    });
  }

  static async recordStreakActivityInternal(communityId, userId, activityAt, timezone, trx) {
    const localAnchor = extractLocalDate(activityAt, timezone);
    const existing = await CommunityMemberStreakModel.lock(communityId, userId, trx);

    if (!existing) {
      return CommunityMemberStreakModel.save(
        {
          communityId,
          userId,
          currentStreakDays: 1,
          longestStreakDays: 1,
          lastActiveOn: localAnchor,
          resumedAt: new Date(),
          metadata: { timezone }
        },
        trx
      );
    }

    const lastActiveOn = existing.lastActiveOn ? new Date(existing.lastActiveOn) : null;
    const dayDifference = lastActiveOn
      ? Math.floor((localAnchor.getTime() - new Date(lastActiveOn).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    let currentStreak = existing.currentStreakDays;
    let longestStreak = existing.longestStreakDays;
    let resumedAt = existing.resumedAt ? new Date(existing.resumedAt) : new Date();

    if (dayDifference === null || dayDifference > 1) {
      currentStreak = 1;
      resumedAt = new Date();
    } else if (dayDifference === 1) {
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    return CommunityMemberStreakModel.save(
      {
        communityId,
        userId,
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        lastActiveOn: localAnchor,
        resumedAt,
        metadata: { ...existing.metadata, timezone }
      },
      trx
    );
  }

  static async getMemberProgress(communityIdentifier, userId) {
    const community = await CommunityServiceHelpers.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership) {
      const error = new Error('You are not a member of this community');
      error.status = community.visibility === 'public' ? 403 : 404;
      throw error;
    }

    const [points, streak, recentTransactions] = await Promise.all([
      CommunityMemberPointModel.findSummary(community.id, userId),
      CommunityMemberStreakModel.find(community.id, userId),
      CommunityMemberPointTransactionModel.listRecentForUser(community.id, userId, { limit: 10 })
    ]);

    return {
      membership,
      points: points ?? {
        communityId: community.id,
        userId,
        points: 0,
        lifetimePoints: 0,
        tier: 'bronze'
      },
      streak: streak ?? {
        communityId: community.id,
        userId,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActiveOn: null
      },
      transactions: recentTransactions
    };
  }

  static async listLeaderboard(communityIdentifier, userId, query = {}) {
    const { community } = await this.ensureCommunityAccess(communityIdentifier, userId);
    const type = query.type ?? 'points';
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = Number(query.offset ?? 0);

    const connection = db;
    if (type === 'streak') {
      const rows = await connection('community_member_streaks as cms')
        .innerJoin('users as u', 'u.id', 'cms.user_id')
        .select([
          'cms.user_id as userId',
          'u.first_name as firstName',
          'u.last_name as lastName',
          'cms.current_streak_days as currentStreakDays',
          'cms.longest_streak_days as longestStreakDays',
          'cms.last_active_on as lastActiveOn'
        ])
        .where('cms.community_id', community.id)
        .orderBy('cms.current_streak_days', 'desc')
        .orderBy('cms.longest_streak_days', 'desc')
        .orderBy('cms.updated_at', 'desc')
        .limit(limit)
        .offset(offset);

      return rows.map((row) => ({
        userId: row.userId,
        name: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || 'Community Member',
        currentStreakDays: Number(row.currentStreakDays ?? 0),
        longestStreakDays: Number(row.longestStreakDays ?? 0),
        lastActiveOn: row.lastActiveOn
      }));
    }

    if (type === 'attendance') {
      const rows = await connection('community_event_participants as cep')
        .innerJoin('community_events as ce', 'ce.id', 'cep.event_id')
        .innerJoin('users as u', 'u.id', 'cep.user_id')
        .select([
          'cep.user_id as userId',
          'u.first_name as firstName',
          'u.last_name as lastName',
          connection.raw(
            "SUM(CASE WHEN cep.status IN ('going', 'checked_in') THEN 1 ELSE 0 END) as attendedCount"
          ),
          connection.raw("SUM(CASE WHEN cep.status = 'waitlisted' THEN 1 ELSE 0 END) as waitlistedCount")
        ])
        .where('ce.community_id', community.id)
        .groupBy('cep.user_id', 'u.first_name', 'u.last_name')
        .orderBy('attendedCount', 'desc')
        .orderBy('waitlistedCount', 'asc')
        .orderBy('cep.user_id', 'asc')
        .limit(limit)
        .offset(offset);

      return rows.map((row) => ({
        userId: row.userId,
        name: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || 'Community Member',
        attendedEvents: Number(row.attendedCount ?? 0),
        waitlistedEvents: Number(row.waitlistedCount ?? 0)
      }));
    }

    const rows = await connection('community_member_points as cmp')
      .innerJoin('users as u', 'u.id', 'cmp.user_id')
      .select([
        'cmp.user_id as userId',
        'u.first_name as firstName',
        'u.last_name as lastName',
        'cmp.points as points',
        'cmp.lifetime_points as lifetimePoints',
        'cmp.tier as tier'
      ])
      .where('cmp.community_id', community.id)
      .orderBy(type === 'lifetime' ? 'cmp.lifetime_points' : 'cmp.points', 'desc')
      .orderBy('cmp.updated_at', 'asc')
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      userId: row.userId,
      name: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || 'Community Member',
      points: Number(row.points ?? 0),
      lifetimePoints: Number(row.lifetimePoints ?? 0),
      tier: row.tier
    }));
  }

  static async listEvents(communityIdentifier, userId, query = {}) {
    const { community } = await this.ensureCommunityAccess(communityIdentifier, userId);

    const now = new Date();
    const from = parseDateInput(query.from) ?? now;
    const to = parseDateInput(query.to) ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events = await CommunityEventModel.listForCommunity(
      community.id,
      {
        from,
        to,
        limit: Math.min(Number(query.limit ?? 50), 200),
        offset: Number(query.offset ?? 0),
        status: query.status,
        visibility: query.visibility ?? 'members',
        order: query.order
      }
    );

    const results = [];
    for (const event of events) {
      const participants = await CommunityEventParticipantModel.listForEvent(event.id);
      results.push({
        ...event,
        map: buildMapMetadata(event),
        participants,
        attendance: {
          confirmed: participants.filter((p) => ['going', 'checked_in'].includes(p.status)).length,
          waitlisted: participants.filter((p) => p.status === 'waitlisted').length
        }
      });
    }

    return results;
  }

  static async createEvent(communityIdentifier, actorId, payload) {
    const community = await CommunityServiceHelpers.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, actorId);
    assertModeratorRole(membership);

    const startAt = parseDateInput(payload.startAt);
    const endAt = parseDateInput(payload.endAt);
    if (!startAt || !endAt || endAt <= startAt) {
      const error = new Error('Invalid event schedule provided');
      error.status = 422;
      throw error;
    }

    if (payload.attendanceLimit && payload.attendanceLimit < 1) {
      const error = new Error('Attendance limit must be a positive number');
      error.status = 422;
      throw error;
    }

    const timezone = payload.timezone ?? community.metadata?.timezone ?? env.engagement.defaultTimezone;
    const slug = slugify(payload.slug ?? payload.title, { lower: true, strict: true });

    return db.transaction(async (trx) => {
      const event = await CommunityEventModel.create(
        {
          communityId: community.id,
          createdBy: actorId,
          title: payload.title,
          slug,
          summary: payload.summary,
          description: payload.description,
          startAt,
          endAt,
          timezone,
          visibility: payload.visibility ?? 'members',
          status: 'scheduled',
          attendanceLimit: payload.attendanceLimit ?? null,
          requiresRsvp: payload.requiresRsvp ?? true,
          isOnline: payload.isOnline ?? false,
          meetingUrl: payload.meetingUrl,
          locationName: payload.locationName,
          locationAddress: payload.locationAddress,
          locationLatitude: payload.locationLatitude,
          locationLongitude: payload.locationLongitude,
          coverImageUrl: payload.coverImageUrl,
          recurrenceRule: payload.recurrenceRule,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_event',
          entityId: event.id,
          eventType: 'community.event.created',
          payload: {
            communityId: community.id,
            title: event.title,
            startAt: event.startAt,
            timezone,
            slug: event.slug
          },
          performedBy: actorId
        },
        trx
      );

      return {
        ...event,
        map: buildMapMetadata(event)
      };
    });
  }

  static async rsvpEvent(communityIdentifier, eventId, userId, payload = {}) {
    const { community } = await this.ensureCommunityAccess(communityIdentifier, userId);
    const event = await CommunityEventModel.findById(eventId);
    if (!event || event.communityId !== community.id) {
      const error = new Error('Event not found');
      error.status = 404;
      throw error;
    }

    if (event.status !== 'scheduled') {
      const error = new Error('Event is not open for RSVP');
      error.status = 409;
      throw error;
    }

    if (event.visibility === 'admins' || event.visibility === 'owners') {
      const membership = await CommunityMemberModel.findMembership(community.id, userId);
      assertModeratorRole(membership);
    }

    const desiredStatus = payload.status ?? 'going';
    const now = new Date();

    return db.transaction(async (trx) => {
      const participant = await CommunityEventParticipantModel.upsert(
        {
          eventId: event.id,
          userId,
          status: desiredStatus,
          rsvpAt: now,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await CommunityEventModel.refreshCounts(event.id, trx);

      await DomainEventModel.record(
        {
          entityType: 'community_event',
          entityId: event.id,
          eventType: 'community.event.rsvp',
          payload: {
            communityId: community.id,
            eventId: event.id,
            userId,
            status: participant.status
          },
          performedBy: userId
        },
        trx
      );

      log.info(
        {
          communityId: community.id,
          eventId: event.id,
          userId,
          status: participant.status
        },
        'Community event RSVP stored'
      );

      return participant;
    });
  }

  static async scheduleReminder(communityIdentifier, eventId, userId, payload = {}) {
    const { community } = await this.ensureCommunityAccess(communityIdentifier, userId);
    const event = await CommunityEventModel.findById(eventId);
    if (!event || event.communityId !== community.id) {
      const error = new Error('Event not found');
      error.status = 404;
      throw error;
    }

    const remindAt = parseDateInput(payload.remindAt);
    if (!remindAt) {
      const error = new Error('Invalid reminder timestamp');
      error.status = 422;
      throw error;
    }

    if (remindAt >= new Date(event.startAt)) {
      const error = new Error('Reminders must be scheduled before the event starts');
      error.status = 422;
      throw error;
    }

    const participant = await CommunityEventParticipantModel.find(eventId, userId);
    if (!participant || !['going', 'checked_in', 'waitlisted', 'interested'].includes(participant.status)) {
      const error = new Error('You must RSVP before scheduling reminders');
      error.status = 409;
      throw error;
    }

    const reminder = await CommunityEventReminderModel.upsert({
      eventId: event.id,
      userId,
      channel: payload.channel ?? 'email',
      remindAt,
      status: 'pending',
      metadata: payload.metadata ?? {}
    });

    await DomainEventModel.record({
      entityType: 'community_event',
      entityId: event.id,
      eventType: 'community.event.reminder.scheduled',
      payload: {
        communityId: community.id,
        eventId: event.id,
        userId,
        remindAt: reminder.remindAt,
        channel: reminder.channel
      },
      performedBy: userId
    });

    log.info(
      {
        communityId: community.id,
        eventId: event.id,
        userId,
        remindAt: reminder.remindAt,
        channel: reminder.channel
      },
      'Community event reminder scheduled'
    );

    return reminder;
  }

  static async getCalendar(communityIdentifier, userId, query = {}) {
    const { community } = await this.ensureCommunityAccess(communityIdentifier, userId);
    const month = Number(query.month ?? new Date().getUTCMonth() + 1);
    const year = Number(query.year ?? new Date().getUTCFullYear());

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const events = await CommunityEventModel.listForCommunity(community.id, {
      from: start,
      to: end,
      limit: 500,
      visibility: query.visibility ?? 'members'
    });

    const calendar = {};
    for (const event of events) {
      const dateKey = new Date(event.startAt).toISOString().slice(0, 10);
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push({
        id: event.id,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        timezone: event.timezone,
        visibility: event.visibility,
        status: event.status,
        map: buildMapMetadata(event)
      });
    }

    return {
      month,
      year,
      eventsByDate: calendar
    };
  }
}

class CommunityServiceHelpers {
  static async resolveCommunity(identifier) {
    if (!identifier) return null;
    if (Number.isInteger(Number(identifier))) {
      const record = await CommunityModel.findById(Number(identifier));
      return record ? { ...record, metadata: parseMetadata(record.metadata) } : null;
    }
    const record = await CommunityModel.findBySlug(String(identifier));
    return record ? { ...record, metadata: parseMetadata(record.metadata) } : null;
  }
}
