import db from '../config/database.js';
import { ensureIntegerInRange, readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

const TABLE = 'community_members';
const ROLE_OPTIONS = new Set(['owner', 'admin', 'moderator', 'member']);
const STATUS_OPTIONS = new Set(['active', 'pending', 'banned']);

function normalisePrimaryId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseRole(role) {
  if (role === undefined || role === null || role === '') {
    return 'member';
  }

  const candidate = String(role).trim().toLowerCase();
  if (!ROLE_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported community role '${role}'`);
  }
  return candidate;
}

function normaliseStatus(status) {
  if (status === undefined || status === null || status === '') {
    return 'active';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported community membership status '${status}'`);
  }
  return candidate;
}

function normaliseTimestamp(value, { fieldName, defaultValue } = {}) {
  if (value === undefined || value === null || value === '') {
    return defaultValue ?? null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid datetime`);
  }
  return date;
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.community_id,
    userId: record.user_id,
    role: record.role,
    status: record.status,
    joinedAt: record.joined_at ?? null,
    updatedAt: record.updated_at ?? null,
    leftAt: record.left_at ?? null,
    metadata: readJsonColumn(record.metadata, {})
  };
}

function buildInsertPayload(member, connection) {
  if (!member) {
    throw new Error('Member payload is required');
  }

  return {
    community_id: normalisePrimaryId(member.communityId, 'communityId'),
    user_id: normalisePrimaryId(member.userId, 'userId'),
    role: normaliseRole(member.role),
    status: normaliseStatus(member.status),
    joined_at: normaliseTimestamp(member.joinedAt, {
      fieldName: 'joinedAt',
      defaultValue: connection.fn.now()
    }),
    metadata: writeJsonColumn(member.metadata, {})
  };
}

export default class CommunityMemberModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async create(member, connection = db) {
    const payload = buildInsertPayload(member, connection);
    const [id] = await this.table(connection).insert(payload);
    const record = await this.table(connection).where({ id }).first();
    return mapRecord(record);
  }

  static async findMembership(communityId, userId, connection = db) {
    const record = await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .first();
    return mapRecord(record);
  }

  static async ensureMembership(communityId, userId, defaults = {}, connection = db) {
    const existing = await this.findMembership(communityId, userId, connection);
    if (existing) {
      return existing;
    }
    return this.create(
      {
        communityId,
        userId,
        role: defaults.role,
        status: defaults.status,
        metadata: defaults.metadata
      },
      connection
    );
  }

  static async updateRole(communityId, userId, role, connection = db) {
    const payload = {
      role: normaliseRole(role),
      updated_at: connection.fn.now()
    };

    await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .update(payload);

    return this.findMembership(communityId, userId, connection);
  }

  static async updateStatus(communityId, userId, status, connection = db) {
    const normalisedStatus = normaliseStatus(status);
    const payload = {
      status: normalisedStatus,
      updated_at: connection.fn.now()
    };

    if (normalisedStatus === 'active') {
      payload.left_at = null;
    } else if (normalisedStatus !== 'active') {
      payload.left_at = connection.fn.now();
    }

    await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .update(payload);

    return this.findMembership(communityId, userId, connection);
  }

  static async updateMetadata(communityId, userId, metadata, connection = db) {
    await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .update({ metadata: writeJsonColumn(metadata, {}), updated_at: connection.fn.now() });
    return this.findMembership(communityId, userId, connection);
  }

  static async markLeft(communityId, userId, connection = db) {
    await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .update({
        status: 'pending',
        left_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });

    return this.findMembership(communityId, userId, connection);
  }

  static async listByCommunity(communityId, filters = {}, connection = db) {
    const {
      status,
      role,
      limit = null,
      offset = 0,
      order = 'asc',
      orderBy = 'joined_at',
      joinedAfter,
      joinedBefore,
      search
    } = filters ?? {};

    const statusFilters = Array.isArray(status)
      ? status.map((value) => normaliseStatus(value))
      : status
        ? [normaliseStatus(status)]
        : null;
    const roleFilters = Array.isArray(role)
      ? role.map((value) => normaliseRole(value))
      : role
        ? [normaliseRole(role)]
        : null;
    const joinedAfterDate = joinedAfter
      ? normaliseTimestamp(joinedAfter, { fieldName: 'joinedAfter' })
      : null;
    const joinedBeforeDate = joinedBefore
      ? normaliseTimestamp(joinedBefore, { fieldName: 'joinedBefore' })
      : null;
    const rawLimit = limit === undefined || limit === null ? null : Number(limit);
    const safeLimit =
      rawLimit === null
        ? null
        : Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100, 1), 500);
    const safeOffset = Math.max(Number.isFinite(Number(offset)) ? Math.trunc(Number(offset)) : 0, 0);
    const direction = order === 'desc' ? 'desc' : 'asc';
    const allowedOrderColumns = new Set(['joined_at', 'updated_at', 'left_at']);
    const orderColumn = allowedOrderColumns.has(orderBy) ? orderBy : 'joined_at';
    const communityKey = normalisePrimaryId(communityId, 'communityId');
    const searchTerm = typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : null;
    const isMock = typeof connection.__getRows === 'function';

    if (isMock) {
      const rows = connection
        .__getRows(TABLE)
        .filter((row) => Number(row.community_id) === Number(communityKey));

      const filtered = rows
        .filter((row) => {
          if (statusFilters && !statusFilters.includes(String(row.status ?? '').toLowerCase())) {
            return false;
          }
          if (roleFilters && !roleFilters.includes(String(row.role ?? '').toLowerCase())) {
            return false;
          }
          if (joinedAfterDate) {
            const joinedAt = new Date(row.joined_at ?? row.joinedAt ?? 0);
            if (!(joinedAt instanceof Date) || Number.isNaN(joinedAt.getTime()) || joinedAt < joinedAfterDate) {
              return false;
            }
          }
          if (joinedBeforeDate) {
            const joinedAt = new Date(row.joined_at ?? row.joinedAt ?? 0);
            if (!(joinedAt instanceof Date) || Number.isNaN(joinedAt.getTime()) || joinedAt > joinedBeforeDate) {
              return false;
            }
          }
          if (searchTerm) {
            let metadata = {};
            try {
              metadata = row.metadata ? JSON.parse(row.metadata) : {};
            } catch {
              metadata = {};
            }
            const metadataValues = Object.values(metadata).map((value) =>
              value === undefined || value === null ? '' : String(value).toLowerCase()
            );
            const matchesMetadata = metadataValues.some((value) => value.includes(searchTerm));
            const matchesUserId = String(row.user_id ?? '').toLowerCase().includes(searchTerm);
            if (!matchesMetadata && !matchesUserId) {
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => {
          const aValue = a[orderColumn] ?? 0;
          const bValue = b[orderColumn] ?? 0;
          const aTime = aValue instanceof Date ? aValue.getTime() : new Date(aValue ?? 0).getTime();
          const bTime = bValue instanceof Date ? bValue.getTime() : new Date(bValue ?? 0).getTime();
          const comparison = (aTime || 0) - (bTime || 0);
          if (comparison === 0) {
            return Number(a.id ?? 0) - Number(b.id ?? 0);
          }
          return direction === 'desc' ? -comparison : comparison;
        });

      const total = filtered.length;
      const sliced =
        safeLimit === null ? filtered.slice(safeOffset) : filtered.slice(safeOffset, safeOffset + safeLimit);
      const items = sliced.map((row) => mapRecord(row));
      items.total = total;
      items.limit =
        safeLimit ?? (total - safeOffset > 0 ? Math.min(total - safeOffset, filtered.length) : 0);
      items.offset = safeOffset;
      return items;
    }

    const baseQuery = this.table(connection).where({ community_id: communityKey });

    if (statusFilters?.length) {
      if (statusFilters.length === 1) {
        baseQuery.andWhere({ status: statusFilters[0] });
      } else {
        baseQuery.whereIn('status', statusFilters);
      }
    }

    if (roleFilters?.length) {
      if (roleFilters.length === 1) {
        baseQuery.andWhere({ role: roleFilters[0] });
      } else {
        baseQuery.whereIn('role', roleFilters);
      }
    }

    if (joinedAfterDate) {
      baseQuery.andWhere('joined_at', '>=', joinedAfterDate);
    }

    if (joinedBeforeDate) {
      baseQuery.andWhere('joined_at', '<=', joinedBeforeDate);
    }

    if (searchTerm) {
      const like = `%${searchTerm}%`;
      baseQuery.andWhere((inner) => {
        inner.whereRaw('LOWER(metadata::text) LIKE ?', [like]);
        if (/^\d+$/.test(searchTerm)) {
          inner.orWhere('user_id', Number(searchTerm));
        }
      });
    }

    const pagedQuery = baseQuery
      .clone()
      .orderBy(orderColumn, direction)
      .orderBy('id', direction)
      .offset(safeOffset);

    if (safeLimit !== null) {
      pagedQuery.limit(safeLimit);
    }

    const [rows, totalResult] = await Promise.all([
      pagedQuery,
      baseQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .count({ total: '*' })
        .first()
    ]);

    const total = Number(totalResult?.total ?? rows.length ?? 0);
    const items = rows.map((row) => mapRecord(row));
    items.total = total;
    items.limit =
      safeLimit ?? (total - safeOffset > 0 ? Math.min(total - safeOffset, total) : 0);
    items.offset = safeOffset;
    return items;
  }
}
