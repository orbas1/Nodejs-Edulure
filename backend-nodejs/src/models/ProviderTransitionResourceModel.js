import db from '../config/database.js';

const TABLE = 'provider_transition_resources';

const BASE_COLUMNS = [
  'id',
  'announcement_id as announcementId',
  'label',
  'url',
  'type',
  'locale',
  'description',
  'sort_order as sortOrder',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class ProviderTransitionResourceModel {
  static async forAnnouncement(announcementId, { connection = db } = {}) {
    if (!announcementId) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ announcement_id: announcementId })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async bulkReplace(announcementId, resources, { connection = db } = {}) {
    const trx = connection;
    await trx(TABLE).where({ announcement_id: announcementId }).del();
    if (!resources?.length) {
      return [];
    }
    const payloads = resources.map((resource, index) => this.serialize(resource, { announcementId, sortOrder: index }));
    await trx(TABLE).insert(payloads);
    return this.forAnnouncement(announcementId, { connection: trx });
  }

  static serialize(resource, { announcementId, sortOrder } = {}) {
    return {
      announcement_id: announcementId ?? resource.announcementId,
      label: resource.label,
      url: resource.url,
      type: resource.type ?? 'guide',
      locale: resource.locale ?? 'en',
      description: resource.description ?? null,
      sort_order: sortOrder ?? resource.sortOrder ?? 0,
      created_at: resource.createdAt ?? new Date(),
      updated_at: resource.updatedAt ?? new Date()
    };
  }

  static deserialize(row) {
    return {
      id: row.id,
      announcementId: row.announcementId,
      label: row.label,
      url: row.url,
      type: row.type,
      locale: row.locale,
      description: row.description ?? null,
      sortOrder: row.sortOrder ?? 0,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }
}
