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

function coerceString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normaliseEmail(value) {
  const candidate = coerceString(value);
  if (!candidate) {
    return null;
  }
  const lowered = candidate.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered) ? lowered : null;
}

function normaliseRequester(value) {
  if (value === null || value === undefined) {
    return { name: null, email: null, timezone: null };
  }

  if (typeof value === 'string') {
    const parsed = parseJson(value, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { name: null, email: null, timezone: null };
    }
    return normaliseRequester(parsed);
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { name: null, email: null, timezone: null };
  }

  const nameCandidate =
    value.name ?? value.fullName ?? value.displayName ?? value.contactName ?? value.contact ?? null;
  const emailCandidate = value.email ?? value.address ?? value.contactEmail ?? value.contact ?? null;
  const timezoneCandidate = value.timezone ?? value.timeZone ?? value.tz ?? null;

  return {
    name: coerceString(nameCandidate),
    email: normaliseEmail(emailCandidate),
    timezone: coerceString(timezoneCandidate)
  };
}

function normaliseNotificationPreferences(value) {
  if (value === null || value === undefined) {
    return null;
  }

  let source = value;
  if (typeof value === 'string') {
    source = parseJson(value, null);
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }

  const digestCandidate = source.digest ?? source.cadence ?? source.frequency ?? null;
  const digest = coerceString(digestCandidate);

  const normaliseBooleanMap = (input) => {
    if (!input || typeof input !== 'object') {
      return {};
    }
    return Object.entries(input).reduce((acc, [key, raw]) => {
      const label = coerceString(key);
      if (!label) {
        return acc;
      }
      acc[label] = Boolean(raw);
      return acc;
    }, {});
  };

  const channels = normaliseBooleanMap(source.channels);
  const categories = normaliseBooleanMap(source.categories);

  if (!digest && Object.keys(channels).length === 0 && Object.keys(categories).length === 0) {
    return null;
  }

  return { digest, channels, categories };
}

function serialiseNotificationPreferences(value) {
  const normalised = normaliseNotificationPreferences(value);
  if (!normalised) {
    return null;
  }
  return JSON.stringify(normalised);
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
  const metadata = parseJson(row.metadata, {});
  const columnRequester = normaliseRequester({
    name: row.requester_name,
    email: row.requester_email,
    timezone: row.requester_timezone
  });
  const metadataRequester = normaliseRequester(metadata.requester ?? metadata.requestor);
  const requester = {
    name: columnRequester.name ?? metadataRequester.name ?? null,
    email: columnRequester.email ?? metadataRequester.email ?? null,
    timezone: columnRequester.timezone ?? metadataRequester.timezone ?? null
  };
  const notificationPreferences =
    normaliseNotificationPreferences(row.notification_preferences) ??
    normaliseNotificationPreferences(
      metadata.notificationPreferences ?? metadata.notification_preferences
    );

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
    metadata,
    knowledgeSuggestions: normaliseKnowledgeSuggestions(row.knowledge_suggestions),
    escalationBreadcrumbs: normaliseBreadcrumbs(row.escalation_breadcrumbs),
    aiSummary: row.ai_summary ?? null,
    followUpDueAt: toIso(row.follow_up_due_at),
    aiSummaryGeneratedAt: toIso(row.ai_summary_generated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    messages: messages.map((message) => mapMessage(message)).filter(Boolean),
    requester,
    notificationPreferences
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
  const breadcrumbs = normaliseBreadcrumbs(payload.escalationBreadcrumbs);
  const initialBreadcrumbs = breadcrumbs.length ? breadcrumbs : buildInitialBreadcrumbs({ subject, createdAt, category: payload.category });

  const knowledgeSuggestions = serialiseJson(payload.knowledgeSuggestions ?? []);
  const rawMetadata =
    typeof payload.metadata === 'string'
      ? parseJson(payload.metadata, {})
      : payload.metadata && typeof payload.metadata === 'object'
        ? { ...payload.metadata }
        : {};
  const requesterInput =
    payload.requester ?? payload.requestor ?? rawMetadata.requester ?? rawMetadata.requestor ?? null;
  const requester = normaliseRequester(requesterInput);
  const notificationPreferencesInput =
    payload.notificationPreferences ??
    payload.notification_preferences ??
    rawMetadata.notificationPreferences ??
    rawMetadata.notification_preferences ??
    null;
  const notificationPreferences = normaliseNotificationPreferences(notificationPreferencesInput);
  const attachmentsCount = (() => {
    if (Array.isArray(payload.attachments)) {
      return payload.attachments.length;
    }
    const messageList = Array.isArray(payload.messages)
      ? payload.messages
      : Array.isArray(payload.initialMessages)
        ? payload.initialMessages
        : [];
    if (!messageList.length) {
      return 0;
    }
    return messageList.reduce((count, message) => {
      if (Array.isArray(message.attachments)) {
        return count + message.attachments.length;
      }
      if (Array.isArray(message.files)) {
        return count + message.files.length;
      }
      return count;
    }, 0);
  })();

  const metadata = {
    ...rawMetadata,
    requester,
    notificationPreferences,
    intake: {
      ...(rawMetadata.intake ?? {}),
      channel: rawMetadata.intake?.channel ?? payload.channel ?? 'portal',
      attachments: attachmentsCount
    }
  };
  const breadcrumbPayload = serialiseJson(initialBreadcrumbs);

  const caseRecord = {
    user_id: userId,
    reference,
    subject,
    category: payload.category ?? 'General',
    priority: payload.priority ?? 'normal',
    status: payload.status ?? 'open',
    channel: payload.channel ?? 'Portal',
    satisfaction: payload.satisfaction ?? null,
    owner: payload.owner ?? null,
    last_agent: payload.lastAgent ?? payload.owner ?? null,
    metadata: serialiseMetadata(metadata),
    knowledge_suggestions: knowledgeSuggestions,
    escalation_breadcrumbs: breadcrumbPayload,
    ai_summary: payload.aiSummary ?? null,
    follow_up_due_at: followUpDueAt,
    ai_summary_generated_at: toIso(payload.aiSummaryGeneratedAt ?? new Date()),
    requester_name: requester.name ?? null,
    requester_email: requester.email ?? null,
    requester_timezone: requester.timezone ?? null,
    notification_preferences: serialiseNotificationPreferences(notificationPreferences),
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

function buildUpdatePayload(updates = {}, existing = {}) {
  const payload = {};
  const existingMetadata = parseJson(existing.metadata, {});
  let nextMetadata = existingMetadata;
  let metadataChanged = false;
  let metadataExplicitlyProvided = false;
  const ensureMetadataObject = () => {
    if (!nextMetadata || typeof nextMetadata !== 'object' || Array.isArray(nextMetadata)) {
      nextMetadata = {};
    }
  };
  const existingRequester = normaliseRequester({
    name: existing.requester_name,
    email: existing.requester_email,
    timezone: existing.requester_timezone
  });
  const existingNotificationPreferences =
    normaliseNotificationPreferences(existing.notification_preferences) ??
    normaliseNotificationPreferences(
      existingMetadata.notificationPreferences ?? existingMetadata.notification_preferences
    );
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
    nextMetadata =
      typeof updates.metadata === 'object' && !Array.isArray(updates.metadata)
        ? { ...existingMetadata, ...updates.metadata }
        : updates.metadata;
    metadataExplicitlyProvided = true;
    ensureMetadataObject();
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
  const requesterUpdate = updates.requester ?? updates.requestor;
  if (requesterUpdate !== undefined) {
    const requester = normaliseRequester(requesterUpdate);
    payload.requester_name = requester.name ?? null;
    payload.requester_email = requester.email ?? null;
    payload.requester_timezone = requester.timezone ?? null;
    ensureMetadataObject();
    nextMetadata = { ...nextMetadata, requester };
    metadataChanged = true;
  }
  if (updates.requesterName !== undefined) {
    payload.requester_name = coerceString(updates.requesterName);
    ensureMetadataObject();
    nextMetadata = {
      ...nextMetadata,
      requester: {
        ...normaliseRequester(nextMetadata.requester ?? existingRequester),
        name: coerceString(updates.requesterName)
      }
    };
    metadataChanged = true;
  }
  if (updates.requesterEmail !== undefined) {
    payload.requester_email = normaliseEmail(updates.requesterEmail);
    ensureMetadataObject();
    nextMetadata = {
      ...nextMetadata,
      requester: {
        ...normaliseRequester(nextMetadata.requester ?? existingRequester),
        email: normaliseEmail(updates.requesterEmail)
      }
    };
    metadataChanged = true;
  }
  if (updates.requesterTimezone !== undefined) {
    payload.requester_timezone = coerceString(updates.requesterTimezone);
    ensureMetadataObject();
    nextMetadata = {
      ...nextMetadata,
      requester: {
        ...normaliseRequester(nextMetadata.requester ?? existingRequester),
        timezone: coerceString(updates.requesterTimezone)
      }
    };
    metadataChanged = true;
  }
  const notificationPreferencesUpdate =
    updates.notificationPreferences ?? updates.notification_preferences;
  if (notificationPreferencesUpdate !== undefined) {
    const preferences = normaliseNotificationPreferences(notificationPreferencesUpdate);
    payload.notification_preferences = serialiseNotificationPreferences(preferences);
    ensureMetadataObject();
    nextMetadata = {
      ...nextMetadata,
      notificationPreferences: preferences ?? existingNotificationPreferences ?? null
    };
    metadataChanged = true;
  }
  if (metadataChanged || metadataExplicitlyProvided) {
    payload.metadata = serialiseMetadata(nextMetadata);
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
  static normaliseNotificationPreferences = normaliseNotificationPreferences;
  static serialiseNotificationPreferences = serialiseNotificationPreferences;
  static normaliseRequester = normaliseRequester;
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
  normaliseNotificationPreferences,
  serialiseNotificationPreferences,
  normaliseRequester,
  mapMessage,
  mapCase,
  buildCreatePayload,
  buildUpdatePayload,
  prepareMessageInsert,
  appendBreadcrumb,
  calculateFollowUpDueAt
};
