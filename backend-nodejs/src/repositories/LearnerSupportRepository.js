import db from '../config/database.js';
import logger from '../config/logger.js';
import DomainEventModel from '../models/DomainEventModel.js';
import SupportTicketModel, { __testables as modelTestables } from '../models/SupportTicketModel.js';

function groupMessagesByCase(messages) {
  return messages.reduce((acc, message) => {
    const list = acc.get(message.case_id) ?? [];
    list.push(message);
    acc.set(message.case_id, list);
    return acc;
  }, new Map());
}

function normaliseListOptions(options = {}) {
  const limit = (() => {
    const numeric = Number(options.limit ?? 50);
    if (!Number.isFinite(numeric)) {
      return 50;
    }
    return Math.min(Math.max(Math.trunc(numeric), 1), 200);
  })();

  const status = typeof options.status === 'string' && options.status.trim().length
    ? options.status.trim().toLowerCase()
    : undefined;

  return { limit, status };
}

const log = logger.child({ service: 'LearnerSupportRepository' });

async function recordCaseEvent(caseId, eventType, payload = {}, performedBy) {
  try {
    await DomainEventModel.record({
      entityType: 'learner_support_case',
      entityId: caseId,
      eventType,
      payload,
      performedBy
    });
  } catch (error) {
    log.warn({ err: error, caseId, eventType }, 'Failed to record learner support domain event');
  }
}

export default class LearnerSupportRepository {
  static async listCases(userId, options = {}) {
    const { status, limit } = normaliseListOptions(options);
    const query = db('learner_support_cases')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (status) {
      query.andWhere({ status });
    }

    const cases = await query;
    if (!cases.length) {
      return [];
    }

    const caseIds = cases.map((item) => item.id);
    const messages = await db('learner_support_messages').whereIn('case_id', caseIds).orderBy('created_at', 'asc');
    const messagesByCase = groupMessagesByCase(messages);

    return cases.map((row) => SupportTicketModel.mapCase(row, messagesByCase.get(row.id) ?? []));
  }

  static async findCase(userId, caseId) {
    const record = await db('learner_support_cases').where({ user_id: userId, id: caseId }).first();
    if (!record) {
      return null;
    }
    const messages = await db('learner_support_messages').where({ case_id: caseId }).orderBy('created_at', 'asc');
    return SupportTicketModel.mapCase(record, messages);
  }

  static async createCase(userId, payload = {}) {
    const { caseRecord, messageRecords } = SupportTicketModel.buildCreatePayload(userId, payload);
    const [inserted] = await db('learner_support_cases').insert(caseRecord, ['id']);
    const caseId = typeof inserted === 'object' ? inserted.id : inserted;

    if (messageRecords.length) {
      await db('learner_support_messages').insert(
        messageRecords.map((message) => SupportTicketModel.prepareMessageInsert(caseId, message))
      );
    }

    await recordCaseEvent(
      caseId,
      'case_created',
      {
        subject: caseRecord.subject,
        category: caseRecord.category,
        priority: caseRecord.priority,
        status: caseRecord.status,
        channel: caseRecord.channel,
        messageCount: messageRecords.length,
        requester: {
          name: caseRecord.requester_name ?? null,
          email: caseRecord.requester_email ?? null,
          timezone: caseRecord.requester_timezone ?? null
        },
        notificationPreferences: SupportTicketModel.normaliseNotificationPreferences(
          caseRecord.notification_preferences
        )
      },
      userId
    );

    return this.findCase(userId, caseId);
  }

  static async updateCase(userId, caseId, updates = {}) {
    const existing = await db('learner_support_cases').where({ user_id: userId, id: caseId }).first();
    if (!existing) {
      return null;
    }

    const payload = SupportTicketModel.buildUpdatePayload(updates, existing);
    if (Object.keys(payload).length === 0) {
      return this.findCase(userId, caseId);
    }

    await db('learner_support_cases').where({ user_id: userId, id: caseId }).update(payload);
    const updated = await this.findCase(userId, caseId);

    const updatedFields = Object.keys(payload).filter((field) => field !== 'updated_at');
    const statusChanged = updatedFields.includes('status') && payload.status !== existing.status;
    const notificationPreferences = payload.notification_preferences
      ? SupportTicketModel.normaliseNotificationPreferences(payload.notification_preferences)
      : undefined;
    const requesterUpdated =
      ['requester_name', 'requester_email', 'requester_timezone'].filter((key) =>
        updatedFields.includes(key)
      ).length > 0;

    await recordCaseEvent(
      caseId,
      statusChanged ? 'case_status_updated' : 'case_updated',
      {
        updatedFields,
        previousStatus: existing.status,
        nextStatus: updated?.status ?? payload.status ?? existing.status,
        requester: requesterUpdated
          ? {
              name: updated?.requester?.name ?? null,
              email: updated?.requester?.email ?? null,
              timezone: updated?.requester?.timezone ?? null
            }
          : undefined,
        notificationPreferences
      },
      userId
    );

    return updated;
  }

  static async addMessage(userId, caseId, message = {}) {
    const target = await db('learner_support_cases').where({ user_id: userId, id: caseId }).first();
    if (!target) {
      return null;
    }

    const [inserted] = await db('learner_support_messages').insert(
      SupportTicketModel.prepareMessageInsert(caseId, message),
      ['id']
    );
    const messageId = typeof inserted === 'object' ? inserted.id : inserted;

    const newBreadcrumbs = SupportTicketModel.appendBreadcrumb(target.escalation_breadcrumbs, {
      actor: message.author ?? 'learner',
      label: message.author === 'learner' ? 'Learner replied' : 'Support replied',
      note: message.body ?? null,
      at: message.createdAt ?? new Date()
    });

    await db('learner_support_cases')
      .where({ id: caseId })
      .update({
        last_agent: message.author === 'support' ? message.author : target.last_agent,
        escalation_breadcrumbs: SupportTicketModel.serialiseJson(newBreadcrumbs),
        follow_up_due_at:
          message.author === 'support'
            ? SupportTicketModel.calculateFollowUpDueAt(target.priority)
            : target.follow_up_due_at,
        updated_at: db.fn.now()
      });

    const created = await db('learner_support_messages').where({ id: messageId }).first();
    const mapped = SupportTicketModel.mapMessage(created);

    await recordCaseEvent(
      caseId,
      'case_message_added',
      {
        author: mapped.author,
        hasAttachments: Array.isArray(mapped.attachments) && mapped.attachments.length > 0,
        createdAt: mapped.createdAt
      },
      userId
    );

    return mapped;
  }

  static async closeCase(userId, caseId, { resolutionNote, satisfaction } = {}) {
    const existing = await db('learner_support_cases').where({ user_id: userId, id: caseId }).first();
    if (!existing) {
      return null;
    }

    const breadcrumbs = SupportTicketModel.appendBreadcrumb(existing.escalation_breadcrumbs, {
      actor: 'learner',
      label: 'Learner closed ticket',
      note: resolutionNote ?? null,
      at: new Date()
    });

    const existingMetadata = SupportTicketModel.parseJson(existing.metadata, {});
    const updatedMetadata = {
      ...existingMetadata,
      resolutionNote: resolutionNote ?? existingMetadata.resolutionNote ?? null
    };

    await db('learner_support_cases')
      .where({ id: caseId })
      .update({
        status: 'closed',
        satisfaction: satisfaction ?? existing.satisfaction,
        metadata: SupportTicketModel.serialiseMetadata(updatedMetadata),
        escalation_breadcrumbs: SupportTicketModel.serialiseJson(breadcrumbs),
        follow_up_due_at: null,
        updated_at: db.fn.now()
      });

    if (resolutionNote) {
      await db('learner_support_messages').insert(
        SupportTicketModel.prepareMessageInsert(caseId, {
          author: 'learner',
          body: resolutionNote,
          attachments: [],
          createdAt: new Date()
        })
      );
    }

    const closed = await this.findCase(userId, caseId);

    await recordCaseEvent(
      caseId,
      'case_closed',
      {
        satisfaction: closed?.satisfaction ?? satisfaction ?? existing.satisfaction,
        resolutionNote: resolutionNote ?? null
      },
      userId
    );

    return closed;
  }
}

export const __testables = {
  ...modelTestables,
  groupMessagesByCase,
  normaliseListOptions
};
