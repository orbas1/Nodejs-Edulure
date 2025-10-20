import db from '../config/database.js';
import { ensureIntegerInRange, normaliseBoolean, readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

const TABLE = 'community_channel_members';
const MEMBER_ROLES = new Set(['member', 'moderator']);

function parseRole(role, { defaultRole = 'member' } = {}) {
  if (role === undefined || role === null) {
    return defaultRole;
  }
  const candidate = String(role).trim().toLowerCase();
  if (!MEMBER_ROLES.has(candidate)) {
    throw new Error(`Unsupported channel member role '${role}'`);
  }
  return candidate;
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    channelId: record.channel_id,
    userId: record.user_id,
    role: record.role,
    notificationsEnabled: Boolean(record.notifications_enabled),
    muteUntil: record.mute_until ?? null,
    lastReadAt: record.last_read_at ?? null,
    lastReadMessageId: record.last_read_message_id ?? null,
    metadata: readJsonColumn(record.metadata, {}),
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null
  };
}

export default class CommunityChannelMemberModel {
  static async ensureMembership(channelId, userId, defaults = {}, connection = db) {
    const existing = await this.findMembership(channelId, userId, connection);
    if (existing) {
      return existing;
    }

    const payload = {
      channel_id: ensureIntegerInRange(channelId, { fieldName: 'channelId', min: 1 }),
      user_id: ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 }),
      role: parseRole(defaults.role),
      notifications_enabled: normaliseBoolean(defaults.notificationsEnabled ?? true),
      mute_until: defaults.muteUntil ?? null,
      metadata: writeJsonColumn(defaults.metadata, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRecord(row);
  }

  static async findMembership(channelId, userId, connection = db) {
    const row = await connection(TABLE)
      .where({ channel_id: ensureIntegerInRange(channelId, { fieldName: 'channelId', min: 1 }), user_id: ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 }) })
      .first();
    return mapRecord(row);
  }

  static async updateLastRead(channelId, userId, { timestamp, messageId }, connection = db) {
    await connection(TABLE)
      .where({ channel_id: channelId, user_id: userId })
      .update({
        last_read_at: timestamp ?? connection.fn.now(),
        last_read_message_id: messageId ?? null,
        updated_at: connection.fn.now()
      });
    return this.findMembership(channelId, userId, connection);
  }

  static async listForUser(userId, connection = db) {
    const rows = await connection(`${TABLE} as ccm`)
      .leftJoin('community_channels as cc', 'ccm.channel_id', 'cc.id')
      .select([
        'ccm.id',
        'ccm.channel_id',
        'ccm.user_id',
        'ccm.role',
        'ccm.notifications_enabled',
        'ccm.mute_until',
        'ccm.last_read_at',
        'ccm.last_read_message_id',
        'ccm.metadata',
        'ccm.created_at',
        'ccm.updated_at',
        'cc.community_id'
      ])
      .where('ccm.user_id', ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 }));

    return rows.map((row) => ({ ...mapRecord(row), communityId: row.community_id ?? null }));
  }

  static async listForChannel(channelId, connection = db) {
    const rows = await connection(TABLE)
      .where({ channel_id: ensureIntegerInRange(channelId, { fieldName: 'channelId', min: 1 }) })
      .orderBy('created_at', 'asc');
    return rows.map((row) => mapRecord(row));
  }

  static async updateMembership(channelId, userId, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.role !== undefined) {
      payload.role = parseRole(updates.role);
    }
    if (updates.notificationsEnabled !== undefined) {
      payload.notifications_enabled = normaliseBoolean(updates.notificationsEnabled);
    }
    if (updates.muteUntil !== undefined) {
      payload.mute_until = updates.muteUntil ?? null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = writeJsonColumn(updates.metadata, {});
    }

    await connection(TABLE)
      .where({
        channel_id: ensureIntegerInRange(channelId, { fieldName: 'channelId', min: 1 }),
        user_id: ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 })
      })
      .update(payload);
    return this.findMembership(channelId, userId, connection);
  }

  static async removeMembership(channelId, userId, connection = db) {
    return connection(TABLE)
      .where({
        channel_id: ensureIntegerInRange(channelId, { fieldName: 'channelId', min: 1 }),
        user_id: ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 })
      })
      .del();
  }
}
