import db from '../config/database.js';

const TABLE = 'user_role_assignments';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'tenant_id as tenantId',
  'role',
  'granted_by as grantedBy',
  'granted_at as grantedAt',
  'expires_at as expiresAt',
  'metadata',
  'revoked_at as revokedAt',
  'revoked_reason as revokedReason',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) return structuredClone(fallback);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialiseMetadata(metadata) {
  if (!metadata) {
    return JSON.stringify({});
  }

  if (typeof metadata === 'string') {
    return metadata;
  }

  return JSON.stringify(metadata);
}

function normaliseAssignmentInput(assignment = {}) {
  const tenantId = typeof assignment.tenantId === 'string' && assignment.tenantId.trim().length
    ? assignment.tenantId.trim()
    : 'global';
  const role = typeof assignment.role === 'string' ? assignment.role.trim().toLowerCase() : null;
  const expiresAt = assignment.expiresAt ? toDate(assignment.expiresAt) : null;
  const metadata = serialiseMetadata(assignment.metadata ?? {});

  return {
    tenantId,
    role,
    expiresAt,
    metadata
  };
}

function toDbPayload(userId, assignment, connection) {
  const payload = normaliseAssignmentInput(assignment);
  if (!payload.role) {
    return null;
  }

  return {
    user_id: userId,
    tenant_id: payload.tenantId,
    role: payload.role,
    granted_by: assignment.grantedBy ?? null,
    granted_at: assignment.grantedAt ?? connection.fn?.now?.() ?? new Date(),
    expires_at: payload.expiresAt,
    metadata: payload.metadata,
    revoked_at: assignment.revokedAt ?? null,
    revoked_reason: assignment.revokedReason ?? null
  };
}

export default class UserRoleAssignmentModel {
  static deserialize(record) {
    if (!record) {
      return null;
    }

    return {
      ...record,
      metadata: parseJson(record.metadata, {}),
      grantedAt: toDate(record.grantedAt),
      expiresAt: toDate(record.expiresAt),
      revokedAt: toDate(record.revokedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async listActiveByUserIds(userIds, connection = db) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('user_id', userIds)
      .whereNull('revoked_at');

    return rows.map((row) => this.deserialize(row));
  }

  static async listActiveByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ user_id: userId })
      .whereNull('revoked_at');
    return rows.map((row) => this.deserialize(row));
  }

  static async syncDefaultRole(userId, role, connection = db, { grantedBy = null } = {}) {
    if (!userId || !role) {
      return null;
    }

    await connection(TABLE)
      .where({ user_id: userId, tenant_id: 'global' })
      .whereNull('revoked_at')
      .whereNot('role', role)
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: 'replaced'
      });

    const existing = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ user_id: userId, tenant_id: 'global', role })
      .whereNull('revoked_at')
      .first();

    if (existing) {
      return this.deserialize(existing);
    }

    const payload = toDbPayload(
      userId,
      {
        tenantId: 'global',
        role,
        grantedBy
      },
      connection
    );

    const [id] = await connection(TABLE).insert(payload);
    const created = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return this.deserialize(created);
  }
}
