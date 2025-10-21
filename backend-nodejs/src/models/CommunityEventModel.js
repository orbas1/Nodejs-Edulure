import slugify from 'slugify';

import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseBoolean,
  normaliseOptionalString,
  normaliseSlug,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_events';
const STATUS_OPTIONS = new Set(['draft', 'scheduled', 'live', 'completed', 'cancelled', 'archived']);
const VISIBILITY_OPTIONS = new Set(['members', 'public', 'admins', 'owners', 'private']);

function normalisePrimaryId(value, fieldName, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseStatus(status) {
  if (status === undefined || status === null) {
    return 'scheduled';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported community event status '${status}'`);
  }
  return candidate;
}

function normaliseVisibility(value) {
  if (value === undefined || value === null || value === '') {
    return 'members';
  }

  const candidate = String(value).trim().toLowerCase();
  if (!VISIBILITY_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported community event visibility '${value}'`);
  }
  return candidate;
}

function normaliseAttendanceLimit(limit) {
  if (limit === undefined || limit === null || limit === '') {
    return null;
  }

  return ensureIntegerInRange(limit, {
    fieldName: 'attendanceLimit',
    min: 1,
    max: 100_000
  });
}

function normaliseTimestamp(value, { fieldName, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid datetime`);
  }
  return date;
}

function ensureChronology(startAt, endAt) {
  if (!startAt || !endAt) {
    return;
  }

  if (endAt <= startAt) {
    throw new Error('endAt must be after startAt');
  }
}

function normaliseCoordinate(value, { fieldName, min, max }) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  if (numeric < min || numeric > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return numeric;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    createdBy: row.created_by,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    description: row.description ?? null,
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    timezone: row.timezone,
    visibility: row.visibility,
    status: row.status,
    attendanceLimit: row.attendance_limit ?? null,
    attendanceCount: Number(row.attendance_count ?? 0),
    waitlistCount: Number(row.waitlist_count ?? 0),
    requiresRsvp: Boolean(row.requires_rsvp),
    isOnline: Boolean(row.is_online),
    meetingUrl: row.meeting_url ?? null,
    locationName: row.location_name ?? null,
    locationAddress: row.location_address ?? null,
    locationLatitude:
      row.location_latitude === null || row.location_latitude === undefined
        ? null
        : Number(row.location_latitude),
    locationLongitude:
      row.location_longitude === null || row.location_longitude === undefined
        ? null
        : Number(row.location_longitude),
    coverImageUrl: row.cover_image_url ?? null,
    recurrenceRule: row.recurrence_rule ?? null,
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

function buildInsertPayload(event) {
  if (!event) {
    throw new Error('Event payload is required');
  }

  const startAt = normaliseTimestamp(event.startAt, { fieldName: 'startAt', required: true });
  const endAt = normaliseTimestamp(event.endAt, { fieldName: 'endAt', required: true });
  ensureChronology(startAt, endAt);

  const slugSource = event.slug ?? slugify(`${event.title}-${Date.now()}`, { lower: true, strict: true });

  return {
    community_id: normalisePrimaryId(event.communityId, 'communityId'),
    created_by: normalisePrimaryId(event.createdBy, 'createdBy'),
    title: ensureNonEmptyString(event.title, { fieldName: 'title', maxLength: 200 }),
    slug: normaliseSlug(slugSource, { maxLength: 180 }),
    summary: normaliseOptionalString(event.summary, { maxLength: 500 }),
    description: normaliseOptionalString(event.description, { maxLength: 5000 }),
    start_at: startAt,
    end_at: endAt,
    timezone: ensureNonEmptyString(event.timezone ?? 'Etc/UTC', { fieldName: 'timezone', maxLength: 60 }),
    visibility: normaliseVisibility(event.visibility),
    status: normaliseStatus(event.status),
    attendance_limit: normaliseAttendanceLimit(event.attendanceLimit),
    attendance_count: ensureIntegerInRange(event.attendanceCount, {
      fieldName: 'attendanceCount',
      min: 0,
      max: 100_000,
      defaultValue: 0
    }),
    waitlist_count: ensureIntegerInRange(event.waitlistCount, {
      fieldName: 'waitlistCount',
      min: 0,
      max: 100_000,
      defaultValue: 0
    }),
    requires_rsvp: normaliseBoolean(event.requiresRsvp, true),
    is_online: normaliseBoolean(event.isOnline, false),
    meeting_url: normaliseOptionalString(event.meetingUrl, { maxLength: 500 }),
    location_name: normaliseOptionalString(event.locationName, { maxLength: 200 }),
    location_address: normaliseOptionalString(event.locationAddress, { maxLength: 500 }),
    location_latitude: normaliseCoordinate(event.locationLatitude, {
      fieldName: 'locationLatitude',
      min: -90,
      max: 90
    }),
    location_longitude: normaliseCoordinate(event.locationLongitude, {
      fieldName: 'locationLongitude',
      min: -180,
      max: 180
    }),
    cover_image_url: normaliseOptionalString(event.coverImageUrl, { maxLength: 500 }),
    recurrence_rule: normaliseOptionalString(event.recurrenceRule, { maxLength: 240 }),
    metadata: writeJsonColumn(event.metadata, {})
  };
}

export default class CommunityEventModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async create(event, connection = db) {
    const payload = buildInsertPayload(event);
    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findBySlug(communityId, slug, connection = db) {
    const row = await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        slug: normaliseSlug(slug, { maxLength: 180 })
      })
      .first();
    return mapRow(row);
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const {
      from,
      to,
      limit = 50,
      offset = 0,
      status,
      visibility,
      order = 'asc'
    } = filters ?? {};

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const sortDirection = order === 'desc' ? 'desc' : 'asc';

    const fromDate = from ? normaliseTimestamp(from, { fieldName: 'from', required: false }) : null;
    const toDate = to ? normaliseTimestamp(to, { fieldName: 'to', required: false }) : null;
    const isMock = typeof connection.__getRows === 'function';

    if (isMock) {
      const rows = await this.table(connection).where({ community_id: normalisePrimaryId(communityId, 'communityId') });

      const normalisedStatuses = Array.isArray(status)
        ? status.map(normaliseStatus)
        : status
          ? [normaliseStatus(status)]
          : null;
      const visibilityFilter = visibility ? normaliseVisibility(visibility) : null;

      const filtered = rows
        .filter((row) => {
          if (normalisedStatuses && !normalisedStatuses.includes(String(row.status).toLowerCase())) {
            return false;
          }
          if (visibilityFilter && String(row.visibility).toLowerCase() !== visibilityFilter) {
            return false;
          }
          if (fromDate) {
            const start = new Date(row.start_at ?? row.startAt ?? 0);
            if (!(start instanceof Date) || Number.isNaN(start.getTime()) || start < fromDate) {
              return false;
            }
          }
          if (toDate) {
            const start = new Date(row.start_at ?? row.startAt ?? 0);
            if (!(start instanceof Date) || Number.isNaN(start.getTime()) || start > toDate) {
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => {
          const aTime = new Date(a.start_at ?? a.startAt ?? 0).getTime();
          const bTime = new Date(b.start_at ?? b.startAt ?? 0).getTime();
          return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
        });

      const total = filtered.length;
      const sliced = filtered.slice(safeOffset, safeOffset + safeLimit);

      const items = sliced.map((row) => mapRow(row));
      items.total = total;
      items.limit = safeLimit;
      items.offset = safeOffset;
      return items;
    }

    const baseQuery = this.table(connection).where({ community_id: normalisePrimaryId(communityId, 'communityId') });

    if (Array.isArray(status) && status.length) {
      const statuses = status.map(normaliseStatus);
      baseQuery.whereIn('status', statuses);
    } else if (typeof status === 'string' && status) {
      baseQuery.andWhere({ status: normaliseStatus(status) });
    }

    if (visibility) {
      baseQuery.andWhere({ visibility: normaliseVisibility(visibility) });
    }

    if (fromDate) {
      baseQuery.andWhere('start_at', '>=', fromDate);
    }
    if (toDate) {
      baseQuery.andWhere('start_at', '<=', toDate);
    }

    const [rows, totalResult] = await Promise.all([
      baseQuery.clone().orderBy('start_at', sortDirection).limit(safeLimit).offset(safeOffset),
      baseQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .count({ total: '*' })
        .first()
    ]);

    const total = Number(totalResult?.total ?? rows.length ?? 0);

    const items = rows.map((row) => mapRow(row));
    items.total = total;
    items.limit = safeLimit;
    items.offset = safeOffset;
    return items;
  }

  static async incrementAttendance(eventId, deltaGoing, deltaWaitlist = 0, connection = db) {
    const goingDelta = ensureIntegerInRange(deltaGoing, {
      fieldName: 'deltaGoing',
      min: -100_000,
      max: 100_000,
      defaultValue: 0
    });
    const waitlistDelta = ensureIntegerInRange(deltaWaitlist, {
      fieldName: 'deltaWaitlist',
      min: -100_000,
      max: 100_000,
      defaultValue: 0
    });

    const isMock = typeof connection.__getRows === 'function' || typeof connection.raw !== 'function';
    const eventKey = normalisePrimaryId(eventId, 'eventId');

    if (!isMock) {
      await this.table(connection)
        .where({ id: eventKey })
        .update({
          attendance_count: connection.raw('GREATEST(attendance_count + ?, 0)', [goingDelta]),
          waitlist_count: connection.raw('GREATEST(waitlist_count + ?, 0)', [waitlistDelta]),
          updated_at: connection.fn.now()
        });
      return this.findById(eventId, connection);
    }

    const current = await this.table(connection).where({ id: eventKey }).first();
    const nextAttendance = Math.max(Number(current?.attendance_count ?? 0) + goingDelta, 0);
    const nextWaitlist = Math.max(Number(current?.waitlist_count ?? 0) + waitlistDelta, 0);

    await this.table(connection)
      .where({ id: eventKey })
      .update({
        attendance_count: nextAttendance,
        waitlist_count: nextWaitlist,
        updated_at: connection.fn.now()
      });

    return this.findById(eventId, connection);
  }

  static async refreshCounts(eventId, connection = db) {
    const aggregates = await connection('community_event_participants')
      .where({ event_id: normalisePrimaryId(eventId, 'eventId') })
      .select({
        going: connection.raw("SUM(CASE WHEN status IN ('going', 'checked_in') THEN 1 ELSE 0 END)"),
        waitlisted: connection.raw("SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END)")
      })
      .first();

    await this.table(connection)
      .where({ id: normalisePrimaryId(eventId, 'eventId') })
      .update({
        attendance_count: Number(aggregates?.going ?? 0),
        waitlist_count: Number(aggregates?.waitlisted ?? 0),
        updated_at: connection.fn.now()
      });

    return this.findById(eventId, connection);
  }
}
