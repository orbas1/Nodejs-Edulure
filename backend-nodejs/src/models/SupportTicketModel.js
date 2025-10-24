import crypto from 'crypto';

import db from '../config/database.js';

function toIso(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    try {
      JSON.stringify(value);
      return value;
    } catch (_error) {
      return fallback;
    }
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      return fallback;
    }
    if (!Array.isArray(fallback) && typeof parsed !== 'object') {
      return fallback;
    }
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_error) {
      return null;
    }
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return null;
  }
}

function serialiseMetadata(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_error) {
      return '{}';
    }
  }

  try {
    return JSON.stringify(value ?? {});
  } catch (_error) {
    return '{}';
  }
}

function normaliseAttachmentInput(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.map((item, index) => {
      const id = item?.id ?? item?.attachmentId ?? crypto.randomUUID();
      const name = item?.name ?? item?.filename ?? `Attachment-${index + 1}`;
      const size = (() => {
        const raw = item?.size ?? item?.bytes;
        if (raw === null || raw === undefined || raw === '') {
          return null;
        }
        const numeric = Number(raw);
        return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
      })();
      const url = item?.url ?? item?.href ?? null;
      const type = item?.type ?? item?.mimeType ?? null;
      return { id, name, size, url, type };
    });
  }

  return [];
}

function serialiseAttachments(payload) {
  const attachments = normaliseAttachmentInput(payload);
  if (!attachments.length) {
    return '[]';
  }
  return JSON.stringify(attachments);
}

function normaliseKnowledgeSuggestions(value) {
  const suggestions = parseJson(value, []);
  if (!Array.isArray(suggestions)) {
    return [];
  }
  return suggestions
    .map((suggestion, index) => {
      if (!suggestion) {
        return null;
      }
      const id = suggestion.id ?? suggestion.slug ?? `kb-${index}`;
      const minutesRaw = suggestion.minutes ?? suggestion.readTime ?? suggestion.duration ?? null;
      const minutes = Number.isFinite(Number(minutesRaw)) ? Number(minutesRaw) : 3;
      return {
        id,
        title: suggestion.title ?? 'Knowledge base article',
        excerpt: suggestion.excerpt ?? suggestion.summary ?? suggestion.description ?? '',
        url: suggestion.url ?? suggestion.link ?? '#',
        category: suggestion.category ?? suggestion.topic ?? 'General',
        minutes
      };
    })
    .filter(Boolean);
}

function normaliseBreadcrumbs(value) {
  const breadcrumbs = parseJson(value, []);
  if (!Array.isArray(breadcrumbs)) {
    return [];
  }
  return breadcrumbs
    .map((crumb, index) => {
      if (!crumb) {
        return null;
      }
      const at = toIso(crumb.at ?? crumb.timestamp ?? crumb.occurredAt ?? new Date());
      return {
        id: crumb.id ?? `crumb-${crumb.actor ?? 'system'}-${index}`,
        actor: crumb.actor ?? crumb.source ?? 'system',
        label: crumb.label ?? crumb.title ?? 'Update',
        note: crumb.note ?? crumb.description ?? null,
        at
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0))
    .map((crumb, index) => ({
      ...crumb,
      id: crumb.id ?? `crumb-${index}`
    }));
}

function mapMessage(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    author: row.author ?? 'support',
    body: row.body ?? '',
    attachments: normaliseAttachmentInput(parseJson(row.attachments, [])),
    createdAt: toIso(row.created_at ?? row.createdAt)
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
    metadata: parseJson(row.metadata, {}),
    knowledgeSuggestions: normaliseKnowledgeSuggestions(row.knowledge_suggestions),
    escalationBreadcrumbs: normaliseBreadcrumbs(row.escalation_breadcrumbs),
    aiSummary: row.ai_summary ?? null,
    followUpDueAt: toIso(row.follow_up_due_at),
    aiSummaryGeneratedAt: toIso(row.ai_summary_generated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    messages: messages.map((message) => mapMessage(message)).filter(Boolean)
  };
}

function generateReference() {
  return `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function calculateFollowUpDueAt(priority) {
  const now = new Date();
  const baseMinutes = (() => {
    switch (priority) {
      case 'urgent':
        return 120;
      case 'high':
        return 240;
      case 'low':
        return 1440;
      default:
        return 720;
    }
  })();
  return new Date(now.getTime() + baseMinutes * 60 * 1000).toISOString();
}

function buildInitialBreadcrumbs({ subject, createdAt, category }) {
  const timestamp = toIso(createdAt ?? new Date());
  return [
    {
      id: 'crumb-created',
      actor: 'learner',
      label: 'Ticket created',
      note: subject ? `Learner opened “${subject}” (${category ?? 'General'})` : null,
      at: timestamp
    }
  ];
}

function buildCreatePayload(userId, payload = {}) {
  const subject = payload.subject ?? 'Support request';
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : new Date();
  const reference = payload.reference ?? generateReference();
  const followUpDueAt = toIso(payload.followUpDueAt) ?? calculateFollowUpDueAt(payload.priority);
  const tenantId = payload.tenantId ?? payload.tenant_id ?? 'global';
  const breadcrumbs = normaliseBreadcrumbs(payload.escalationBreadcrumbs);
  const initialBreadcrumbs = breadcrumbs.length ? breadcrumbs : buildInitialBreadcrumbs({ subject, createdAt, category: payload.category });

  const knowledgeSuggestions = serialiseJson(payload.knowledgeSuggestions ?? []);
  const breadcrumbPayload = serialiseJson(initialBreadcrumbs);

  const caseRecord = {
    user_id: userId,
    reference,
    subject,
    category: payload.category ?? 'General',
    priority: payload.priority ?? 'normal',
    status: payload.status ?? 'open',
    channel: payload.channel ?? 'Portal',
    tenant_id: tenantId,
    satisfaction: payload.satisfaction ?? null,
    owner: payload.owner ?? null,
    last_agent: payload.lastAgent ?? payload.owner ?? null,
    metadata: serialiseMetadata(payload.metadata ?? {}),
    knowledge_suggestions: knowledgeSuggestions,
    escalation_breadcrumbs: breadcrumbPayload,
    ai_summary: payload.aiSummary ?? null,
    follow_up_due_at: followUpDueAt,
    ai_summary_generated_at: toIso(payload.aiSummaryGeneratedAt ?? new Date()),
    created_at: toIso(createdAt),
    updated_at: toIso(payload.updatedAt ?? createdAt)
  };

  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : Array.isArray(payload.initialMessages)
      ? payload.initialMessages
      : [];

  const messageRecords = messages.map((message) => ({
    author: message.author ?? 'learner',
    body: message.body ?? '',
    attachments: message.attachments ?? message.files ?? [],
    createdAt: message.createdAt ?? new Date()
  }));

  return { caseRecord, messageRecords, breadcrumbs: initialBreadcrumbs };
}

function buildUpdatePayload(updates = {}) {
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
  if (updates.channel) {
    payload.channel = updates.channel;
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
    payload.metadata = serialiseMetadata(updates.metadata);
  }
  if (updates.knowledgeSuggestions !== undefined) {
    payload.knowledge_suggestions = serialiseJson(updates.knowledgeSuggestions ?? []);
  }
  if (updates.escalationBreadcrumbs !== undefined) {
    payload.escalation_breadcrumbs = serialiseJson(updates.escalationBreadcrumbs ?? []);
  }
  if (updates.aiSummary !== undefined) {
    payload.ai_summary = updates.aiSummary ?? null;
    payload.ai_summary_generated_at = toIso(updates.aiSummaryGeneratedAt ?? new Date());
  }
  if (updates.followUpDueAt !== undefined) {
    payload.follow_up_due_at = toIso(updates.followUpDueAt);
  }
  if (Object.keys(payload).length === 0) {
    return payload;
  }
  payload.updated_at = db.fn.now();
  return payload;
}

function prepareMessageInsert(caseId, message = {}) {
  return {
    case_id: caseId,
    author: message.author ?? 'learner',
    body: message.body ?? '',
    attachments: serialiseAttachments(message.attachments ?? message.files),
    created_at: toIso(message.createdAt ?? new Date())
  };
}

function appendBreadcrumb(existingBreadcrumbs, nextBreadcrumb) {
  const breadcrumbs = normaliseBreadcrumbs(existingBreadcrumbs);
  const next = normaliseBreadcrumbs([nextBreadcrumb]);
  return [...breadcrumbs, ...next];
}

export default class SupportTicketModel {
  static toIso = toIso;
  static parseJson = parseJson;
  static serialiseJson = serialiseJson;
  static serialiseMetadata = serialiseMetadata;
  static normaliseAttachmentInput = normaliseAttachmentInput;
  static serialiseAttachments = serialiseAttachments;
  static normaliseKnowledgeSuggestions = normaliseKnowledgeSuggestions;
  static normaliseBreadcrumbs = normaliseBreadcrumbs;
  static mapMessage = mapMessage;
  static mapCase = mapCase;
  static buildCreatePayload = buildCreatePayload;
  static buildUpdatePayload = buildUpdatePayload;
  static prepareMessageInsert = prepareMessageInsert;
  static appendBreadcrumb = appendBreadcrumb;
  static calculateFollowUpDueAt = calculateFollowUpDueAt;
}

export const __testables = {
  toIso,
  parseJson,
  serialiseJson,
  serialiseMetadata,
  normaliseAttachmentInput,
  serialiseAttachments,
  normaliseKnowledgeSuggestions,
  normaliseBreadcrumbs,
  mapMessage,
  mapCase,
  buildCreatePayload,
  buildUpdatePayload,
  prepareMessageInsert,
  appendBreadcrumb,
  calculateFollowUpDueAt
};
