import db from '../config/database.js';

const TABLE = 'user_role_assignments';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'role_key as roleKey',
  'scope_type as scopeType',
  'scope_id as scopeId',
  'assigned_by as assignedBy',
  'assigned_at as assignedAt',
  'expires_at as expiresAt',
  'metadata',
  'revoked_at as revokedAt',
  'revoked_by as revokedBy',
  'revoked_reason as revokedReason',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function normaliseRoleKey(roleKey) {
  if (typeof roleKey !== 'string') {
    return null;
  }
  const trimmed = roleKey.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function normaliseScopeType(scopeType) {
  if (typeof scopeType !== 'string') {
    return 'global';
  }
  const trimmed = scopeType.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : 'global';
}

function normaliseScopeId(scopeId) {
  if (scopeId === null || scopeId === undefined) {
    return null;
  }
  const value = String(scopeId).trim();
  return value.length > 0 ? value : null;
}

function serialiseMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return JSON.stringify({});
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

function parseMetadata(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'object') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildAssignment(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.userId,
    roleKey: row.roleKey,
    scopeType: row.scopeType ?? 'global',
    scopeId: row.scopeId ?? null,
    assignedBy: row.assignedBy ?? null,
    assignedAt: toDate(row.assignedAt),
    expiresAt: toDate(row.expiresAt),
    metadata: parseMetadata(row.metadata),
    revokedAt: toDate(row.revokedAt),
    revokedBy: row.revokedBy ?? null,
    revokedReason: row.revokedReason ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

function applyScopeFilter(builder, scopeType, scopeId) {
  builder.where({ scope_type: scopeType });
  if (scopeId === null) {
    builder.whereNull('scope_id');
  } else {
    builder.where({ scope_id: scopeId });
  }
}

function activeAssignmentsQuery(connection) {
  return connection(TABLE)
    .select(BASE_COLUMNS)
    .whereNull('revoked_at')
    .andWhere((builder) => {
      builder.whereNull('expires_at').orWhere('expires_at', '>', connection.fn.now());
    });
}

function resolveInsertedId(result) {
  if (result === null || result === undefined) {
    return null;
  }
  if (Array.isArray(result)) {
    if (result.length === 0) {
      return null;
    }
    if (result.length === 1) {
      return resolveInsertedId(result[0]);
    }
    return resolveInsertedId(result[0]);
  }
  if (typeof result === 'object') {
    if (result.id !== undefined && result.id !== null) {
      return result.id;
    }
    if (result.insertId !== undefined && result.insertId !== null) {
      return result.insertId;
    }
    if (result.insertedId !== undefined && result.insertedId !== null) {
      return result.insertedId;
    }
    const numeric = Number(result);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    return null;
  }
  if (typeof result === 'bigint') {
    return Number(result);
  }
  if (typeof result === 'number' || typeof result === 'string') {
    return result;
  }
  return null;
}

export default class UserRoleAssignmentModel {
  static normaliseRoleKey(roleKey) {
    return normaliseRoleKey(roleKey);
  }

  static normaliseScope(scopeType, scopeId) {
    return {
      scopeType: normaliseScopeType(scopeType),
      scopeId: normaliseScopeId(scopeId)
    };
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return buildAssignment(row);
  }

  static async listActiveByUser(userId, connection = db) {
    if (!userId) {
      return [];
    }
    const rows = await activeAssignmentsQuery(connection)
      .andWhere({ user_id: userId })
      .orderBy('assigned_at', 'desc');
    return rows.map((row) => buildAssignment(row));
  }

  static async listActiveRoleKeys(userId, connection = db) {
    const assignments = await this.listActiveByUser(userId, connection);
    const roles = new Set();
    assignments.forEach((assignment) => {
      if (assignment?.roleKey) {
        roles.add(assignment.roleKey);
      }
    });
    return Array.from(roles);
  }

  static async assign({
    userId,
    roleKey,
    scopeType = 'global',
    scopeId = null,
    assignedBy = null,
    assignedAt = null,
    expiresAt = null,
    metadata = {}
  }, connection = db) {
    const normalisedRoleKey = normaliseRoleKey(roleKey);
    if (!normalisedRoleKey) {
      throw Object.assign(new Error('Role key is required'), { status: 400 });
    }
    if (!userId) {
      throw Object.assign(new Error('User id is required'), { status: 400 });
    }

    const { scopeType: resolvedScopeType, scopeId: resolvedScopeId } = this.normaliseScope(scopeType, scopeId);

    const existing = await connection(TABLE)
      .select('id')
      .where({ user_id: userId, role_key: normalisedRoleKey })
      .modify((builder) => applyScopeFilter(builder, resolvedScopeType, resolvedScopeId))
      .whereNull('revoked_at')
      .first();

    const payload = {
      user_id: userId,
      role_key: normalisedRoleKey,
      scope_type: resolvedScopeType,
      scope_id: resolvedScopeId,
      assigned_by: assignedBy ?? null,
      assigned_at: assignedAt ?? connection.fn.now(),
      expires_at: expiresAt ?? null,
      metadata: serialiseMetadata(metadata),
      revoked_at: null,
      revoked_by: null,
      revoked_reason: null,
      updated_at: connection.fn.now()
    };

    if (existing?.id) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update(payload);
      return this.findById(existing.id, connection);
    }

    const insertPayload = {
      ...payload,
      created_at: connection.fn.now()
    };

    const insertResult = await connection(TABLE).insert(insertPayload, ['id']);
    const assignmentId = resolveInsertedId(insertResult);
    if (!assignmentId) {
      const fallback = await connection(TABLE)
        .select('id')
        .where({ user_id: userId, role_key: normalisedRoleKey })
        .modify((builder) => applyScopeFilter(builder, resolvedScopeType, resolvedScopeId))
        .orderBy('created_at', 'desc')
        .first();
      return fallback ? this.findById(fallback.id, connection) : null;
    }
    return this.findById(assignmentId, connection);
  }

  static async revokeById(id, { reason = null, revokedBy = null } = {}, connection = db) {
    if (!id) {
      return false;
    }
    const updated = await connection(TABLE)
      .where({ id })
      .whereNull('revoked_at')
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: reason ?? null,
        revoked_by: revokedBy ?? null,
        updated_at: connection.fn.now()
      });
    return updated > 0;
  }

  static async revokeByComposite({ userId, roleKey, scopeType = 'global', scopeId = null }, connection = db) {
    const normalisedRoleKey = normaliseRoleKey(roleKey);
    if (!normalisedRoleKey || !userId) {
      return 0;
    }
    const { scopeType: resolvedScopeType, scopeId: resolvedScopeId } = this.normaliseScope(scopeType, scopeId);

    const updated = await connection(TABLE)
      .where({ user_id: userId, role_key: normalisedRoleKey })
      .modify((builder) => applyScopeFilter(builder, resolvedScopeType, resolvedScopeId))
      .whereNull('revoked_at')
      .update({ revoked_at: connection.fn.now(), updated_at: connection.fn.now() });

    return updated;
  }

  static async pruneExpired(connection = db) {
    const now = connection.fn.now();
    const expired = await connection(TABLE)
      .select('id')
      .whereNull('revoked_at')
      .whereNotNull('expires_at')
      .andWhere('expires_at', '<=', now);

    if (!expired.length) {
      return [];
    }

    const ids = expired.map((row) => row.id);
    await connection(TABLE)
      .whereIn('id', ids)
      .update({ revoked_at: now, revoked_reason: 'expired', updated_at: now });
    return ids;
  }
}
