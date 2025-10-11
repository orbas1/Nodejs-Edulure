import slugify from 'slugify';

import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
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
    startAt: row.start_at,
    endAt: row.end_at,
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
    locationLatitude: row.location_latitude ? Number(row.location_latitude) : null,
    locationLongitude: row.location_longitude ? Number(row.location_longitude) : null,
    coverImageUrl: row.cover_image_url ?? null,
    recurrenceRule: row.recurrence_rule ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityEventModel {
  static table(connection = db) {
    return connection('community_events');
  }

  static async create(event, connection = db) {
    const slug = event.slug ?? slugify(`${event.title}-${Date.now()}`, { lower: true, strict: true });
    const payload = {
      community_id: event.communityId,
      created_by: event.createdBy,
      title: event.title,
      slug,
      summary: event.summary ?? null,
      description: event.description ?? null,
      start_at: event.startAt,
      end_at: event.endAt,
      timezone: event.timezone ?? 'Etc/UTC',
      visibility: event.visibility ?? 'members',
      status: event.status ?? 'scheduled',
      attendance_limit: event.attendanceLimit ?? null,
      attendance_count: event.attendanceCount ?? 0,
      waitlist_count: event.waitlistCount ?? 0,
      requires_rsvp: event.requiresRsvp ?? true,
      is_online: event.isOnline ?? false,
      meeting_url: event.meetingUrl ?? null,
      location_name: event.locationName ?? null,
      location_address: event.locationAddress ?? null,
      location_latitude: event.locationLatitude ?? null,
      location_longitude: event.locationLongitude ?? null,
      cover_image_url: event.coverImageUrl ?? null,
      recurrence_rule: event.recurrenceRule ?? null,
      metadata: JSON.stringify(event.metadata ?? {})
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findBySlug(communityId, slug, connection = db) {
    const row = await this.table(connection)
      .where({ community_id: communityId, slug })
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
    } = filters;

    const query = this.table(connection)
      .where({ community_id: communityId })
      .modify((qb) => {
        if (from) {
          qb.andWhere('start_at', '>=', from);
        }
        if (to) {
          qb.andWhere('start_at', '<=', to);
        }
        if (status) {
          qb.andWhere({ status });
        }
        if (visibility) {
          qb.andWhere({ visibility });
        }
      })
      .orderBy('start_at', order === 'desc' ? 'desc' : 'asc')
      .limit(limit)
      .offset(offset);

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }

  static async incrementAttendance(eventId, deltaGoing, deltaWaitlist = 0, connection = db) {
    await this.table(connection)
      .where({ id: eventId })
      .update({
        attendance_count: connection.raw('GREATEST(attendance_count + ?, 0)', [deltaGoing]),
        waitlist_count: connection.raw('GREATEST(waitlist_count + ?, 0)', [deltaWaitlist]),
        updated_at: connection.fn.now()
      });
    return this.findById(eventId, connection);
  }

  static async refreshCounts(eventId, connection = db) {
    const aggregates = await connection('community_event_participants')
      .where({ event_id: eventId })
      .select({
        going: connection.raw("SUM(CASE WHEN status IN ('going', 'checked_in') THEN 1 ELSE 0 END)"),
        waitlisted: connection.raw("SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END)")
      })
      .first();

    await this.table(connection)
      .where({ id: eventId })
      .update({
        attendance_count: Number(aggregates?.going ?? 0),
        waitlist_count: Number(aggregates?.waitlisted ?? 0),
        updated_at: connection.fn.now()
      });

    return this.findById(eventId, connection);
  }
}
