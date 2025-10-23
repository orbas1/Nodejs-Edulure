import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    targetUserId: record.target_user_id,
    action: record.action,
    source: record.source ?? null,
    ipAddress: record.ip_address ?? null,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at
  };
}

export default class SocialAuditLogModel {
  static async record(entry, connection = db) {
    const payload = {
      user_id: entry.userId,
      target_user_id: entry.targetUserId ?? null,
      action: entry.action,
      source: entry.source ?? null,
      ip_address: entry.ipAddress ?? null,
      metadata: JSON.stringify(entry.metadata ?? {})
    };

    const [id] = await connection('social_audit_logs').insert(payload);
    const record = await connection('social_audit_logs').where({ id }).first();
    return mapRecord(record);
  }

  static async listRecent({ limit = 25 } = {}, connection = db) {
    const safeLimit = Math.max(1, Math.min(200, Number.parseInt(limit, 10) || 25));
    const rows = await connection('social_audit_logs')
      .select([
        'id',
        'user_id as userId',
        'target_user_id as targetUserId',
        'action',
        'source',
        'ip_address as ipAddress',
        'metadata',
        'created_at as createdAt'
      ])
      .orderBy('created_at', 'desc')
      .limit(safeLimit);

    return rows.map((row) => ({
      ...row,
      metadata: parseJson(row.metadata, {})
    }));
  }
}
