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
  } catch (error) {
    return fallback;
  }
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
    attachments: parseJson(record.attachments, []),
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

export default class CommunityMessageModel {
  static async create(message, connection = db) {
    const payload = {
      community_id: message.communityId,
      channel_id: message.channelId,
      author_id: message.authorId,
      message_type: message.messageType ?? 'text',
      body: message.body,
      attachments: JSON.stringify(message.attachments ?? []),
      metadata: JSON.stringify(message.metadata ?? {}),
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
    const { limit = 50, before, after, threadRootId } = options;
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

    const rows = await query.orderBy('cm.created_at', 'desc').limit(limit);
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
    const rows = await connection('community_messages as cm')
      .leftJoin('users as author', 'cm.author_id', 'author.id')
      .select(MESSAGE_COLUMNS)
      .whereIn('cm.channel_id', channelIds)
      .andWhereNot('cm.status', 'deleted')
      .orderBy('cm.created_at', 'desc');

    const seen = new Map();
    rows.forEach((row) => {
      if (!seen.has(row.channelId)) {
        seen.set(row.channelId, mapMessage(row));
      }
    });
    return Array.from(seen.entries()).map(([channelId, message]) => ({ channelId, message }));
  }
}
