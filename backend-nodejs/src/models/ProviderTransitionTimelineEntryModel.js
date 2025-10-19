import db from '../config/database.js';

const TABLE = 'provider_transition_timeline_entries';

const BASE_COLUMNS = [
  'id',
  'announcement_id as announcementId',
  'occurs_on as occursOn',
  'headline',
  'owner',
  'cta_label as ctaLabel',
  'cta_url as ctaUrl',
  'details_markdown as detailsMarkdown',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class ProviderTransitionTimelineEntryModel {
  static async forAnnouncement(announcementId, { connection = db } = {}) {
    if (!announcementId) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ announcement_id: announcementId })
      .orderBy('occurs_on', 'asc')
      .orderBy('id', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async bulkReplace(announcementId, entries, { connection = db } = {}) {
    const trx = connection;
    await trx(TABLE).where({ announcement_id: announcementId }).del();
    if (!entries?.length) {
      return [];
    }
    const payloads = entries.map((entry) => this.serialize(entry, { announcementId }));
    await trx(TABLE).insert(payloads);
    return this.forAnnouncement(announcementId, { connection: trx });
  }

  static serialize(entry, { announcementId } = {}) {
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
      announcement_id: announcementId ?? entry.announcementId,
      occurs_on: normalizeDate(entry.occursOn),
      headline: entry.headline,
      owner: entry.owner ?? null,
      cta_label: entry.ctaLabel ?? null,
      cta_url: entry.ctaUrl ?? null,
      details_markdown: entry.detailsMarkdown,
      created_at: entry.createdAt ?? new Date(),
      updated_at: entry.updatedAt ?? new Date()
    };
  }

  static deserialize(row) {
    return {
      id: row.id,
      announcementId: row.announcementId,
      occursOn: row.occursOn ? new Date(row.occursOn) : null,
      headline: row.headline,
      owner: row.owner ?? null,
      ctaLabel: row.ctaLabel ?? null,
      ctaUrl: row.ctaUrl ?? null,
      detailsMarkdown: row.detailsMarkdown,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }
}
