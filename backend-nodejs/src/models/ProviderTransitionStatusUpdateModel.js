import db from '../config/database.js';

const TABLE = 'provider_transition_status_updates';

const BASE_COLUMNS = [
  'id',
  'announcement_id as announcementId',
  'provider_reference as providerReference',
  'status_code as statusCode',
  'notes',
  'recorded_at as recordedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class ProviderTransitionStatusUpdateModel {
  static async record(announcementId, payload, { connection = db } = {}) {
    if (!announcementId) {
      throw new Error('announcementId is required to record a status update');
    }
    const serialized = this.serialize({ ...payload, announcementId });
    const [id] = await connection(TABLE).insert(serialized);
    return this.findById(id, { connection });
  }

  static async findById(id, { connection = db } = {}) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async recentForAnnouncement(announcementId, { limit = 10, connection = db } = {}) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ announcement_id: announcementId })
      .orderBy('recorded_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.deserialize(row));
  }

  static serialize(payload) {
    const normalizeDate = (value) => {
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date();
    };

    return {
      announcement_id: payload.announcementId,
      provider_reference: payload.providerReference ?? null,
      status_code: payload.statusCode,
      notes: payload.notes ?? null,
      recorded_at: normalizeDate(payload.recordedAt),
      created_at: payload.createdAt ?? new Date(),
      updated_at: payload.updatedAt ?? new Date()
    };
  }

  static deserialize(row) {
    return {
      id: row.id,
      announcementId: row.announcementId,
      providerReference: row.providerReference ?? null,
      statusCode: row.statusCode,
      notes: row.notes ?? null,
      recordedAt: row.recordedAt ? new Date(row.recordedAt) : null,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }
}
