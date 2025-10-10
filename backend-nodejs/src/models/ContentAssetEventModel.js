import db from '../config/database.js';

const TABLE = 'content_asset_events';

const BASE_COLUMNS = [
  'id',
  'asset_id as assetId',
  'user_id as userId',
  'event_type as eventType',
  'metadata',
  'occurred_at as occurredAt'
];

export default class ContentAssetEventModel {
  static async record({ assetId, userId, eventType, metadata }, connection = db) {
    await connection(TABLE).insert({
      asset_id: assetId,
      user_id: userId ?? null,
      event_type: eventType,
      metadata: JSON.stringify(metadata ?? {}),
      occurred_at: connection.fn.now()
    });
  }

  static async countDownloadsForUser(assetId, userId, connection = db) {
    const [{ count }] = await connection(TABLE)
      .where({ asset_id: assetId, user_id: userId, event_type: 'download' })
      .count({ count: '*' });
    return Number(count ?? 0);
  }

  static async aggregateByEvent(assetId, connection = db) {
    const rows = await connection(TABLE)
      .select('event_type as eventType')
      .count({ total: '*' })
      .where({ asset_id: assetId })
      .groupBy('event_type');
    return rows;
  }

  static async latestForAsset(assetId, limit = 50, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ asset_id: assetId })
      .orderBy('occurred_at', 'desc')
      .limit(limit);
    return rows.map((row) => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
    }));
  }
}
