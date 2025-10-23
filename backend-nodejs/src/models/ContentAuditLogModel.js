import db from '../config/database.js';

const TABLE = 'content_audit_logs';

const BASE_COLUMNS = [
  'id',
  'asset_id as assetId',
  'event',
  'performed_by as performedBy',
  'payload',
  'created_at as createdAt'
];

export default class ContentAuditLogModel {
  static async record({ assetId, event, performedBy, payload }, connection = db) {
    await connection(TABLE).insert({
      asset_id: assetId,
      event,
      performed_by: performedBy ?? null,
      payload: JSON.stringify(payload ?? {}),
      created_at: connection.fn.now()
    });
  }

  static async listForAsset(assetId, connection = db) {
    const rows = await connection(TABLE).select(BASE_COLUMNS).where({ asset_id: assetId }).orderBy('created_at', 'desc');
    return rows.map((row) => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : row.payload
    }));
  }

  static async listRecent({ limit = 25, since } = {}, connection = db) {
    const resolvedLimit = Math.max(1, Math.min(100, Number.parseInt(limit ?? 25, 10) || 25));
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy('created_at', 'desc')
      .limit(resolvedLimit);

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query.where('created_at', '>=', sinceDate);
      }
    }

    const rows = await query;
    return rows.map((row) => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : row.payload
    }));
  }
}
