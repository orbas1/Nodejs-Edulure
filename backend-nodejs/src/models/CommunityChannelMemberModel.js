import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    channelId: record.channel_id,
    userId: record.user_id,
    role: record.role,
    notificationsEnabled: Boolean(record.notifications_enabled),
    muteUntil: record.mute_until,
    lastReadAt: record.last_read_at,
    lastReadMessageId: record.last_read_message_id ?? null,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunityChannelMemberModel {
  static async ensureMembership(channelId, userId, defaults = {}, connection = db) {
    const existing = await this.findMembership(channelId, userId, connection);
    if (existing) {
      return existing;
    }
    const payload = {
      channel_id: channelId,
      user_id: userId,
      role: defaults.role ?? 'member',
      notifications_enabled: defaults.notificationsEnabled ?? true,
      mute_until: defaults.muteUntil ?? null,
      metadata: JSON.stringify(defaults.metadata ?? {})
    };
    const [id] = await connection('community_channel_members').insert(payload);
    const row = await connection('community_channel_members').where({ id }).first();
    return mapRecord(row);
  }

  static async findMembership(channelId, userId, connection = db) {
    const row = await connection('community_channel_members')
      .where({ channel_id: channelId, user_id: userId })
      .first();
    return mapRecord(row);
  }

  static async updateLastRead(channelId, userId, { timestamp, messageId }, connection = db) {
    await connection('community_channel_members')
      .where({ channel_id: channelId, user_id: userId })
      .update({
        last_read_at: timestamp ?? connection.fn.now(),
        last_read_message_id: messageId ?? null,
        updated_at: connection.fn.now()
      });
    return this.findMembership(channelId, userId, connection);
  }

  static async listForUser(userId, connection = db) {
    const rows = await connection('community_channel_members as ccm')
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
      .where('ccm.user_id', userId);

    return rows.map((row) => ({ ...mapRecord(row), communityId: row.community_id }));
  }

  static async listForChannel(channelId, connection = db) {
    const rows = await connection('community_channel_members')
      .where({ channel_id: channelId })
      .orderBy('created_at', 'asc');
    return rows.map((row) => mapRecord(row));
  }
}
