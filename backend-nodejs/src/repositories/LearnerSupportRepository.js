import db from '../config/database.js';
import SupportTicketModel, { __testables as modelTestables } from '../models/SupportTicketModel.js';

function groupMessagesByCase(messages) {
  return messages.reduce((acc, message) => {
    const list = acc.get(message.case_id) ?? [];
    list.push(message);
    acc.set(message.case_id, list);
    return acc;
  }, new Map());
}

export default class LearnerSupportRepository {
  static async listCases(userId) {
    const cases = await db('learner_support_cases').where({ user_id: userId }).orderBy('created_at', 'desc');
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

    return this.findCase(userId, caseId);
  }

  static async updateCase(userId, caseId, updates = {}) {
    const payload = SupportTicketModel.buildUpdatePayload(updates);
    if (Object.keys(payload).length === 0) {
      return this.findCase(userId, caseId);
    }
    await db('learner_support_cases').where({ user_id: userId, id: caseId }).update(payload);
    return this.findCase(userId, caseId);
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
    return SupportTicketModel.mapMessage(created);
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

    return this.findCase(userId, caseId);
  }
}

export const __testables = {
  ...modelTestables,
  groupMessagesByCase
};
