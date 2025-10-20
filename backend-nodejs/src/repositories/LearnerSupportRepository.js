import crypto from 'crypto';

import db from '../config/database.js';

function toIso(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseAttachments(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      name: item.name ?? item.filename ?? 'Attachment',
      size: item.size ?? item.bytes ?? null,
      url: item.url ?? item.href ?? null,
      type: item.type ?? item.mimeType ?? null
    }));
  }
  return [];
}

function mapMessage(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    author: row.author,
    body: row.body,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: toIso(row.created_at)
  };
}

function mapCase(row, messages = []) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    reference: row.reference,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    channel: row.channel,
    satisfaction: row.satisfaction,
    owner: row.owner,
    lastAgent: row.last_agent,
    metadata: row.metadata ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    messages: messages.map((message) => mapMessage(message)).filter(Boolean)
  };
}

export default class LearnerSupportRepository {
  static async listCases(userId) {
    const cases = await db('learner_support_cases').where({ user_id: userId }).orderBy('created_at', 'desc');
    if (!cases.length) {
      return [];
    }
    const caseIds = cases.map((item) => item.id);
    const messages = await db('learner_support_messages')
      .whereIn('case_id', caseIds)
      .orderBy('created_at', 'asc');
    const messagesByCase = messages.reduce((acc, message) => {
      const list = acc.get(message.case_id) ?? [];
      list.push(message);
      acc.set(message.case_id, list);
      return acc;
    }, new Map());
    return cases.map((supportCase) => mapCase(supportCase, messagesByCase.get(supportCase.id) ?? []));
  }

  static async findCase(userId, caseId) {
    const record = await db('learner_support_cases')
      .where({ user_id: userId, id: caseId })
      .first();
    if (!record) {
      return null;
    }
    const messages = await db('learner_support_messages')
      .where({ case_id: caseId })
      .orderBy('created_at', 'asc');
    return mapCase(record, messages);
  }

  static async createCase(userId, payload = {}) {
    const reference = payload.reference ?? `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const [caseId] = await db('learner_support_cases').insert(
      {
        user_id: userId,
        reference,
        subject: payload.subject,
        category: payload.category ?? 'General',
        priority: payload.priority ?? 'normal',
        status: payload.status ?? 'open',
        channel: payload.channel ?? 'Portal',
        owner: payload.owner ?? null,
        last_agent: payload.lastAgent ?? payload.owner ?? null,
        satisfaction: payload.satisfaction ?? null,
        metadata: payload.metadata ?? null
      },
      ['id']
    );
    const resolvedCaseId = typeof caseId === 'object' ? caseId.id : caseId;

    const messagesPayload = Array.isArray(payload.messages)
      ? payload.messages
      : Array.isArray(payload.initialMessages)
        ? payload.initialMessages
        : [];

    if (messagesPayload.length) {
      await db('learner_support_messages').insert(
        messagesPayload.map((message) => ({
          case_id: resolvedCaseId,
          author: message.author ?? 'learner',
          body: message.body ?? '',
          attachments: parseAttachments(message.attachments ?? message.files),
          created_at: toIso(message.createdAt ?? message.sentAt ?? new Date())
        }))
      );
    }

    return this.findCase(userId, resolvedCaseId);
  }

  static async updateCase(userId, caseId, updates = {}) {
    const payload = {};
    if (updates.subject) {
      payload.subject = updates.subject;
    }
    if (updates.category) {
      payload.category = updates.category;
    }
    if (updates.priority) {
      payload.priority = updates.priority;
    }
    if (updates.status) {
      payload.status = updates.status;
    }
    if (updates.owner !== undefined) {
      payload.owner = updates.owner;
    }
    if (updates.lastAgent !== undefined) {
      payload.last_agent = updates.lastAgent;
    }
    if (updates.satisfaction !== undefined) {
      payload.satisfaction = updates.satisfaction;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = updates.metadata;
    }
    if (Object.keys(payload).length === 0) {
      return this.findCase(userId, caseId);
    }
    await db('learner_support_cases').where({ user_id: userId, id: caseId }).update({ ...payload, updated_at: db.fn.now() });
    return this.findCase(userId, caseId);
  }

  static async addMessage(userId, caseId, message = {}) {
    const target = await db('learner_support_cases')
      .where({ user_id: userId, id: caseId })
      .first();
    if (!target) {
      return null;
    }
    const [inserted] = await db('learner_support_messages').insert(
      {
        case_id: caseId,
        author: message.author ?? 'learner',
        body: message.body ?? '',
        attachments: parseAttachments(message.attachments ?? message.files),
        created_at: toIso(message.createdAt ?? new Date())
      },
      ['id']
    );
    const messageId = typeof inserted === 'object' ? inserted.id : inserted;
    await db('learner_support_cases').where({ id: caseId }).update({ updated_at: db.fn.now(), last_agent: message.author });
    const created = await db('learner_support_messages').where({ id: messageId }).first();
    return mapMessage(created);
  }

  static async closeCase(userId, caseId, { resolutionNote, satisfaction } = {}) {
    const existing = await db('learner_support_cases')
      .where({ user_id: userId, id: caseId })
      .first();
    if (!existing) {
      return null;
    }
    await db('learner_support_cases')
      .where({ id: caseId })
      .update({
        status: 'closed',
        satisfaction: satisfaction ?? existing.satisfaction,
        metadata: {
          ...existing.metadata,
          resolutionNote: resolutionNote ?? existing.metadata?.resolutionNote ?? null
        },
        updated_at: db.fn.now()
      });
    if (resolutionNote) {
      await db('learner_support_messages').insert({
        case_id: caseId,
        author: 'support',
        body: resolutionNote,
        attachments: [],
        created_at: db.fn.now()
      });
    }
    return this.findCase(userId, caseId);
  }
}
