import db from '../config/database.js';

const MESSAGE_COLUMNS = [
  'cm.id',
  'cm.community_id as communityId',
  'cm.channel_id as channelId',
  'cm.author_id as authorId',
  'cm.message_type as messageType',
  'cm.body',
  'cm.attachments',
  'cm.metadata',
  'cm.status',
  'cm.pinned',
  'cm.thread_root_id as threadRootId',
  'cm.reply_to_message_id as replyToMessageId',
  'cm.delivered_at as deliveredAt',
  'cm.deleted_at as deletedAt',
  'cm.created_at as createdAt',
  'cm.updated_at as updatedAt',
  'author.first_name as authorFirstName',
  'author.last_name as authorLastName',
  'author.email as authorEmail',
  'author.role as authorRole'
];

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normaliseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

function mapMessage(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.communityId,
    channelId: record.channelId,
    authorId: record.authorId,
    messageType: record.messageType,
    body: record.body,
    attachments: normaliseArray(record.attachments),
    metadata: parseJson(record.metadata, {}),
    status: record.status,
    pinned: Boolean(record.pinned),
    threadRootId: record.threadRootId ?? null,
    replyToMessageId: record.replyToMessageId ?? null,
    deliveredAt: record.deliveredAt,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    author: {
      id: record.authorId,
      firstName: record.authorFirstName,
      lastName: record.authorLastName,
      email: record.authorEmail,
      role: record.authorRole
    }
  };
}

function sanitiseMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata;
}

function clampLimit(limit, defaultValue, max) {
  const numeric = Number(limit);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }
  return Math.min(Math.max(Math.trunc(numeric), 1), max);
}

export default class CommunityMessageModel {
  static toDomain(record) {
    return mapMessage(record);
  }

  static sanitiseListOptions(options = {}) {
    return {
      ...options,
      limit: clampLimit(options.limit, 50, 200)
    };
  }

  static async create(message, connection = db) {
    const payload = {
      community_id: message.communityId,
      channel_id: message.channelId,
      author_id: message.authorId,
      message_type: message.messageType ?? 'text',
      body: message.body,
      attachments: JSON.stringify(normaliseArray(message.attachments)),
      metadata: JSON.stringify(sanitiseMetadata(message.metadata)),
      status: message.status ?? 'visible',
      pinned: Boolean(message.pinned),
      thread_root_id: message.threadRootId ?? null,
      reply_to_message_id: message.replyToMessageId ?? null,
      delivered_at: message.deliveredAt ?? null
    };

    const [id] = await connection('community_messages').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_messages as cm')
      .leftJoin('users as author', 'cm.author_id', 'author.id')
      .select(MESSAGE_COLUMNS)
      .where('cm.id', id)
      .first();
    return mapMessage(record);
  }

  static async listForChannel(communityId, channelId, options = {}, connection = db) {
    const { limit, before, after, threadRootId } = this.sanitiseListOptions(options);
    const query = connection('community_messages as cm')
      .leftJoin('users as author', 'cm.author_id', 'author.id')
      .select(MESSAGE_COLUMNS)
      .where('cm.community_id', communityId)
      .andWhere('cm.channel_id', channelId);

    if (options.includeHidden !== true) {
      query.andWhereNot('cm.status', 'deleted');
    }

    if (threadRootId) {
      query.andWhere((builder) => {
        builder.where('cm.id', threadRootId).orWhere('cm.thread_root_id', threadRootId);
      });
    }

    if (before) {
      query.andWhere('cm.created_at', '<', before);
    }
    if (after) {
      query.andWhere('cm.created_at', '>', after);
    }

    const rows = await query
      .orderBy('cm.created_at', 'desc')
      .orderBy('cm.id', 'desc')
      .limit(limit);
    return rows.map((row) => mapMessage(row));
  }

  static async listByIds(ids, connection = db) {
    if (!ids?.length) return [];
    const rows = await connection('community_messages as cm')
      .leftJoin('users as author', 'cm.author_id', 'author.id')
      .select(MESSAGE_COLUMNS)
      .whereIn('cm.id', ids);
    return rows.map((row) => mapMessage(row));
  }

  static async updateStatus(messageId, status, connection = db) {
    await connection('community_messages')
      .where({ id: messageId })
      .update({ status, updated_at: connection.fn.now() });
    return this.findById(messageId, connection);
  }

  static async updatePinState(messageId, pinned, connection = db) {
    await connection('community_messages')
      .where({ id: messageId })
      .update({ pinned: Boolean(pinned), updated_at: connection.fn.now() });
    return this.findById(messageId, connection);
  }

  static async markDeleted(messageId, connection = db) {
    await connection('community_messages')
      .where({ id: messageId })
      .update({ status: 'deleted', deleted_at: connection.fn.now(), updated_at: connection.fn.now() });
    return this.findById(messageId, connection);
  }

  static async countSince(channelId, since, connection = db) {
    const query = connection('community_messages').where({ channel_id: channelId });
    if (since) {
      query.andWhere('created_at', '>', since);
    }
    query.andWhereNot('status', 'deleted');
    const [{ count }] = await query.count({ count: '*' });
    return Number(count ?? 0);
  }

  static async latestForChannels(channelIds, connection = db) {
    if (!channelIds?.length) return [];
    const latestTimestamps = connection('community_messages')
      .select('channel_id')
      .max({ created_at: 'created_at' })
      .whereIn('channel_id', channelIds)
      .andWhereNot('status', 'deleted')
      .groupBy('channel_id');

    const rows = await connection('community_messages as cm')
      .join(latestTimestamps.as('latest'), function joinLatest() {
        this.on('cm.channel_id', '=', 'latest.channel_id').andOn('cm.created_at', '=', 'latest.created_at');
      })
      .leftJoin('users as author', 'cm.author_id', 'author.id')
      .select(MESSAGE_COLUMNS)
      .whereIn('cm.channel_id', channelIds)
      .andWhereNot('cm.status', 'deleted')
      .orderBy('cm.channel_id', 'asc')
      .orderBy('cm.id', 'desc');

    const latestByChannel = new Map();
    for (const row of rows) {
      const message = mapMessage(row);
      if (!latestByChannel.has(message.channelId)) {
        latestByChannel.set(message.channelId, message);
      }
    }

    return Array.from(latestByChannel.entries()).map(([channelId, message]) => ({ channelId, message }));
  }
}
