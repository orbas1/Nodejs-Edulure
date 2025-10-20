import db from '../config/database.js';

const TABLE = 'provider_transition_acknowledgements';

const BASE_COLUMNS = [
  'id',
  'announcement_id as announcementId',
  'provider_reference as providerReference',
  'organisation_name as organisationName',
  'contact_name as contactName',
  'contact_email as contactEmail',
  'ack_method as ackMethod',
  'follow_up_required as followUpRequired',
  'follow_up_notes as followUpNotes',
  'metadata',
  'acknowledged_at as acknowledgedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class ProviderTransitionAcknowledgementModel {
  static async upsertForContact(announcementId, contactEmail, payload, { connection = db } = {}) {
    if (!announcementId) {
      throw new Error('announcementId is required to record an acknowledgement');
    }
    const normalizedEmail = contactEmail?.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new Error('contactEmail is required to record an acknowledgement');
    }

    const existing = await connection(TABLE)
      .where({ announcement_id: announcementId, contact_email: normalizedEmail })
      .first();

    const serialized = this.serialize({ ...payload, announcementId, contactEmail: normalizedEmail });
    serialized.updated_at = new Date();

    if (existing) {
      await connection(TABLE).where({ id: existing.id }).update(serialized);
      return this.findById(existing.id, { connection });
    }

    const [id] = await connection(TABLE).insert(serialized);
    return this.findById(id, { connection });
  }

  static async findById(id, { connection = db } = {}) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async countForAnnouncement(announcementId, { connection = db } = {}) {
    const result = await connection(TABLE)
      .where({ announcement_id: announcementId })
      .count({ total: '*' })
      .first();
    const total = Number(result?.total ?? 0);
    return Number.isNaN(total) ? 0 : total;
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

    let metadata = payload.metadata ?? {};
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
  } catch (_error) {
        metadata = {};
      }
    }

    return {
      announcement_id: payload.announcementId,
      provider_reference: payload.providerReference ?? null,
      organisation_name: payload.organisationName,
      contact_name: payload.contactName,
      contact_email: payload.contactEmail?.toLowerCase(),
      ack_method: payload.ackMethod ?? 'portal',
      follow_up_required: payload.followUpRequired === true,
      follow_up_notes: payload.followUpNotes ?? null,
      metadata: JSON.stringify(metadata),
      acknowledged_at: normalizeDate(payload.acknowledgedAt),
      created_at: payload.createdAt ?? new Date(),
      updated_at: payload.updatedAt ?? new Date()
    };
  }

  static deserialize(row) {
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
    } catch (_error) {
        metadata = {};
      }
    }

    return {
      id: row.id,
      announcementId: row.announcementId,
      providerReference: row.providerReference ?? null,
      organisationName: row.organisationName,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      ackMethod: row.ackMethod,
      followUpRequired: Boolean(row.followUpRequired),
      followUpNotes: row.followUpNotes ?? null,
      metadata,
      acknowledgedAt: row.acknowledgedAt ? new Date(row.acknowledgedAt) : null,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }
}
