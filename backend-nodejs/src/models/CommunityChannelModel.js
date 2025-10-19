import db from '../config/database.js';

const CHANNEL_COLUMNS = [
  'cc.id',
  'cc.community_id as communityId',
  'cc.name',
  'cc.slug',
  'cc.channel_type as channelType',
  'cc.description',
  'cc.is_default as isDefault',
  'cc.metadata',
  'cc.created_at as createdAt',
  'cc.updated_at as updatedAt'
];

export default class CommunityChannelModel {
  static async create(channel, connection = db) {
    const payload = {
      community_id: channel.communityId,
      name: channel.name,
      slug: channel.slug,
      channel_type: channel.channelType ?? 'general',
      description: channel.description ?? null,
      is_default: channel.isDefault ?? false,
      metadata: JSON.stringify(channel.metadata ?? {})
    };

    const [id] = await connection('community_channels').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('community_channels as cc').select(CHANNEL_COLUMNS).where('cc.id', id).first();
  }

  static async update(id, updates, connection = db) {
    const payload = {};
    if (updates.name !== undefined) {
      payload.name = updates.name ?? null;
    }
    if (updates.slug !== undefined) {
      payload.slug = updates.slug ?? null;
    }
    if (updates.channelType !== undefined) {
      payload.channel_type = updates.channelType ?? 'general';
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.isDefault !== undefined) {
      payload.is_default = Boolean(updates.isDefault);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_channels')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    return connection('community_channels').where({ id }).del();
  }

  static async listByCommunity(communityId, connection = db) {
    return connection('community_channels as cc')
      .select(CHANNEL_COLUMNS)
      .where('cc.community_id', communityId)
      .orderBy('cc.is_default', 'desc')
      .orderBy('cc.name');
  }

  static async findDefault(communityId, connection = db) {
    return connection('community_channels as cc')
      .select(CHANNEL_COLUMNS)
      .where('cc.community_id', communityId)
      .andWhere('cc.is_default', true)
      .first();
  }
}
