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

function buildPerson({ id, firstName, lastName, email }) {
  const resolvedId = id ?? null;
  const resolvedEmail = email ?? null;
  const resolvedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!resolvedId && !resolvedEmail && !resolvedName) {
    return null;
  }

  return {
    id: resolvedId,
    name: resolvedName || null,
    email: resolvedEmail
  };
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
    createdAt: record.created_at,
    actor: buildPerson({
      id: record.user_id,
      firstName: record.actorFirstName ?? record.actor_first_name,
      lastName: record.actorLastName ?? record.actor_last_name,
      email: record.actorEmail ?? record.actor_email
    }),
    targetUser: buildPerson({
      id: record.target_user_id,
      firstName: record.targetFirstName ?? record.target_first_name,
      lastName: record.targetLastName ?? record.target_last_name,
      email: record.targetEmail ?? record.target_email
    })
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

  static async listRecent({ limit = 25, since } = {}, connection = db) {
    const resolvedLimit = Math.max(1, Math.min(100, Number.parseInt(limit ?? 25, 10) || 25));
    const query = connection('social_audit_logs as sal')
      .leftJoin('users as actor', 'actor.id', 'sal.user_id')
      .leftJoin('users as target', 'target.id', 'sal.target_user_id')
      .select([
        'sal.id',
        'sal.user_id',
        'sal.target_user_id',
        'sal.action',
        'sal.source',
        'sal.ip_address',
        'sal.metadata',
        'sal.created_at',
        'actor.first_name as actor_first_name',
        'actor.last_name as actor_last_name',
        'actor.email as actor_email',
        'target.first_name as target_first_name',
        'target.last_name as target_last_name',
        'target.email as target_email'
      ])
      .orderBy('sal.created_at', 'desc')
      .limit(resolvedLimit);

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query.where('sal.created_at', '>=', sinceDate);
      }
    }

    const rows = await query;
    return rows.map(mapRecord);
  }
}
