import db from '../config/database.js';

const TABLE = 'ebook_read_progress';

const BASE_COLUMNS = [
  'id',
  'asset_id as assetId',
  'user_id as userId',
  'progress_percent as progressPercent',
  'last_location as lastLocation',
  'time_spent_seconds as timeSpentSeconds',
  'updated_at as updatedAt',
  'created_at as createdAt'
];

export default class EbookProgressModel {
  static async upsert({ assetId, userId, progressPercent, lastLocation, timeSpentSeconds }, connection = db) {
    const payload = {
      asset_id: assetId,
      user_id: userId,
      progress_percent: progressPercent,
      last_location: lastLocation,
      time_spent_seconds: timeSpentSeconds ?? 0
    };

    const existing = await connection(TABLE).where({ asset_id: assetId, user_id: userId }).first();
    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({
          ...payload,
          time_spent_seconds: (existing.time_spent_seconds ?? 0) + (timeSpentSeconds ?? 0),
          updated_at: connection.fn.now()
        });
      return this.findById(existing.id, connection);
    }

    const [id] = await connection(TABLE).insert({ ...payload, created_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async findByAssetAndUser(assetId, userId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ asset_id: assetId, user_id: userId }).first();
    if (!row) return null;
    return this.deserialize(row);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!row) return null;
    return this.deserialize(row);
  }

  static deserialize(row) {
    return { ...row };
  }
}
