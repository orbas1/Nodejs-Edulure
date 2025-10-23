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

  static async listRecent({ limit = 25 } = {}, connection = db) {
    const safeLimit = Math.max(1, Math.min(200, Number.parseInt(limit, 10) || 25));
    const rows = await connection(TABLE).select(BASE_COLUMNS).orderBy('created_at', 'desc').limit(safeLimit);
    return rows.map((row) => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : row.payload
    }));
  }
}
