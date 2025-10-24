import db from '../config/database.js';
import {
  DIRECT_MESSAGE_STATUSES,
  DIRECT_MESSAGE_TYPES,
  normaliseEnum
} from './shared/statusRegistry.js';

const MESSAGE_COLUMNS = [
  'dm.id',
  'dm.thread_id as threadId',
  'dm.sender_id as senderId',
  'dm.message_type as messageType',
  'dm.body',
  'dm.attachments',
  'dm.metadata',
  'dm.status',
  'dm.delivered_at as deliveredAt',
  'dm.read_at as readAt',
  'dm.deleted_at as deletedAt',
  'dm.created_at as createdAt',
  'dm.updated_at as updatedAt',
  'sender.first_name as senderFirstName',
  'sender.last_name as senderLastName',
  'sender.email as senderEmail',
  'sender.role as senderRole'
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

function mapRecord(record) {
  if (!record) return null;
  const messageType = normaliseEnum(record.messageType, DIRECT_MESSAGE_TYPES, {
    defaultValue: 'text',
    fieldName: 'messageType'
  });
  const status = normaliseEnum(record.status, DIRECT_MESSAGE_STATUSES, {
    defaultValue: 'sent',
    fieldName: 'status'
  });
  return {
    id: record.id,
    threadId: record.threadId,
    senderId: record.senderId,
    messageType,
    body: record.body,
    attachments: parseJson(record.attachments, []),
    metadata: parseJson(record.metadata, {}),
    status,
    deliveredAt: record.deliveredAt,
    readAt: record.readAt,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sender: {
      id: record.senderId,
      firstName: record.senderFirstName,
      lastName: record.senderLastName,
      email: record.senderEmail,
      role: record.senderRole
    }
  };
}

function normaliseMessageType(value) {
  return normaliseEnum(value, DIRECT_MESSAGE_TYPES, {
    defaultValue: 'text',
    fieldName: 'messageType'
  });
}

function normaliseStatus(value) {
  return normaliseEnum(value, DIRECT_MESSAGE_STATUSES, {
    defaultValue: 'sent',
    fieldName: 'status'
  });
}

export default class DirectMessageModel {
  static async create(message, connection = db) {
    const payload = {
      thread_id: message.threadId,
      sender_id: message.senderId,
      message_type: normaliseMessageType(message.messageType),
      body: message.body,
      attachments: JSON.stringify(message.attachments ?? []),
      metadata: JSON.stringify(message.metadata ?? {}),
      status: normaliseStatus(message.status),
      delivered_at: message.deliveredAt ?? null,
      read_at: message.readAt ?? null
    };
    const [id] = await connection('direct_messages').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('direct_messages as dm')
      .leftJoin('users as sender', 'dm.sender_id', 'sender.id')
      .select(MESSAGE_COLUMNS)
      .where('dm.id', id)
      .first();
    return mapRecord(record);
  }

  static async listForThread(threadId, { limit = 50, before, after } = {}, connection = db) {
    const query = connection('direct_messages as dm')
      .leftJoin('users as sender', 'dm.sender_id', 'sender.id')
      .select(MESSAGE_COLUMNS)
      .where('dm.thread_id', threadId)
      .andWhereNot('dm.status', 'deleted');

    if (before) {
      query.andWhere('dm.created_at', '<', before);
    }
    if (after) {
      query.andWhere('dm.created_at', '>', after);
    }

    const rows = await query.orderBy('dm.created_at', 'desc').limit(limit);
    return rows.map((row) => mapRecord(row));
  }

  static async markDelivered(messageId, timestamp = new Date(), connection = db) {
    await connection('direct_messages')
      .where({ id: messageId })
      .update({
        delivered_at: timestamp,
        status: normaliseStatus('delivered'),
        updated_at: connection.fn.now()
      });
    return this.findById(messageId, connection);
  }

  static async markRead(messageId, timestamp = new Date(), connection = db) {
    await connection('direct_messages')
      .where({ id: messageId })
      .update({
        read_at: timestamp,
        status: normaliseStatus('read'),
        updated_at: connection.fn.now()
      });
    return this.findById(messageId, connection);
  }

  static async countSince(threadId, since, connection = db) {
    const query = connection('direct_messages').where({ thread_id: threadId });
    if (since) {
      query.andWhere('created_at', '>', since);
    }
    query.andWhereNot('status', 'deleted');
    const [{ count }] = await query.count({ count: '*' });
    return Number(count ?? 0);
  }

  static async latestForThreads(threadIds, connection = db) {
    if (!threadIds?.length) return [];
    const rows = await connection('direct_messages as dm')
      .leftJoin('users as sender', 'dm.sender_id', 'sender.id')
      .select(MESSAGE_COLUMNS)
      .whereIn('dm.thread_id', threadIds)
      .andWhereNot('dm.status', 'deleted')
      .orderBy('dm.created_at', 'desc');

    const seen = new Map();
    rows.forEach((row) => {
      if (!seen.has(row.threadId)) {
        seen.set(row.threadId, mapRecord(row));
      }
    });
    return Array.from(seen.entries()).map(([threadId, message]) => ({ threadId, message }));
  }
}
