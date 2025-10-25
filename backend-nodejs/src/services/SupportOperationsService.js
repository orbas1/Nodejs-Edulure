import db from '../config/database.js';
import logger from '../config/logger.js';
import SupportTicketModel from '../models/SupportTicketModel.js';

const OPEN_STATUSES = new Set(['open', 'waiting', 'pending', 'in_progress']);
const CLOSED_STATUSES = new Set(['resolved', 'closed', 'archived']);

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function normaliseMetadata(row) {
  return SupportTicketModel.parseJson(row.metadata, {});
}

function resolveRequester(row) {
  const firstName = row.first_name ?? row.firstName ?? '';
  const lastName = row.last_name ?? row.lastName ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Learner';
  return {
    id: row.user_id ?? null,
    name,
    organisation: row.metadata?.organisation ?? row.organisation ?? null,
    email: row.email ?? null
  };
}

function resolveAssignee(row) {
  if (!row.owner) {
    return null;
  }
  return {
    id: row.owner,
    name: row.owner,
    email: row.metadata?.ownerEmail ?? null
  };
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isBreached(row, now) {
  if (!row.follow_up_due_at) {
    return false;
  }
  const due = new Date(row.follow_up_due_at);
  if (Number.isNaN(due.getTime())) {
    return false;
  }
  return due.getTime() < now.getTime() && !CLOSED_STATUSES.has((row.status ?? '').toLowerCase());
}

function buildQueueItem(row, now) {
  const metadata = normaliseMetadata(row);
  return {
    id: row.id,
    reference: row.reference,
    subject: row.subject,
    priority: row.priority,
    status: row.status,
    channel: row.channel,
    slaBreached: isBreached(row, now),
    waitingSince: toIso(row.created_at),
    lastUpdated: toIso(row.updated_at),
    sentiment: metadata.sentiment ?? null,
    unreadMessages: 0,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    requester: resolveRequester({ ...row, metadata }),
    assignee: resolveAssignee({ ...row, metadata }),
    escalationLevel: metadata.escalationLevel ?? 'L1'
  };
}

function buildBacklogTrend(rows, { now, days = 7 }) {
  if (!rows.length) {
    return [];
  }
  const trend = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    trend.set(key, 0);
  }

  rows.forEach((row) => {
    const created = row.created_at ? new Date(row.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) {
      return;
    }
    const key = created.toISOString().slice(0, 10);
    if (trend.has(key)) {
      trend.set(key, trend.get(key) + 1);
    }
  });

  return Array.from(trend.entries()).map(([date, count]) => ({ id: date, date, open: count }));
}

function derivePolicyChannels(policies) {
  const aggregate = { email: false, sms: false, push: false, inApp: true };
  policies.forEach((policy) => {
    const channels = policy.channels ?? {};
    aggregate.email = aggregate.email || Boolean(channels.email);
    aggregate.sms = aggregate.sms || Boolean(channels.sms);
    aggregate.push = aggregate.push || Boolean(channels.push);
    aggregate.inApp = aggregate.inApp || Boolean(channels.inApp ?? channels.inbox ?? true);
  });
  return aggregate;
}

function deriveResponseTargets(policies) {
  const seen = new Map();
  policies.forEach((policy) => {
    const source = policy.escalation_targets ?? policy.escalationTargets;
    const targets = Array.isArray(source) ? source : [];
    targets.forEach((target) => {
      if (!target?.id) {
        return;
      }
      if (!seen.has(target.id)) {
        seen.set(target.id, {
          id: target.id,
          name: target.name ?? target.label ?? 'Escalation target',
          type: target.type ?? 'team',
          contact: target.contact ?? target.email ?? null
        });
      }
    });
  });
  return Array.from(seen.values());
}

export default class SupportOperationsService {
  constructor({
    database = db,
    nowProvider = () => new Date(),
    loggerInstance = logger.child({ service: 'SupportOperationsService' })
  } = {}) {
    this.db = database;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
  }

  #normaliseTenantId(rawTenantId) {
    if (!rawTenantId || rawTenantId === 'default') {
      return null;
    }
    return rawTenantId;
  }

  async #findTenantScopedCase(tenantId, ticketId) {
    if (!ticketId) {
      return null;
    }
    const resolvedTenantId = await this.#resolveTenantId(tenantId);
    const record = await this.db('learner_support_cases')
      .where({ id: ticketId, tenant_id: resolvedTenantId })
      .first();
    if (!record) {
      return null;
    }
    return { tenantId: resolvedTenantId, record };
  }

  async #loadCaseWithMessages(caseId) {
    if (!caseId) {
      return null;
    }
    const row = await this.db('learner_support_cases').where({ id: caseId }).first();
    if (!row) {
      return null;
    }
    const messages = await this.db('learner_support_messages')
      .where({ case_id: caseId })
      .orderBy('created_at', 'asc');
    return SupportTicketModel.mapCase(row, messages);
  }

  #buildActorDescriptor(actor) {
    if (!actor || typeof actor !== 'object') {
      return { id: null, name: null, email: null };
    }
    const fullName = [actor.firstName, actor.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const name = actor.name ?? (fullName.length ? fullName : null);
    return {
      id: actor.id ?? null,
      name,
      email: actor.email ?? null
    };
  }

  #actorLabel(actor) {
    const descriptor = this.#buildActorDescriptor(actor);
    return descriptor.name ?? descriptor.email ?? (descriptor.id !== null ? String(descriptor.id) : 'operator');
  }

  async listTenants() {
    const rows = await this.db('support_operations_tenants').orderBy('display_order', 'asc').orderBy('name', 'asc');
    const items = rows.map((row) => ({
      id: row.tenant_id,
      name: row.name,
      status: row.status,
      region: row.region,
      timezone: row.timezone
    }));
    const defaultTenant = rows.find((row) => row.is_primary) ?? rows[0] ?? null;
    return {
      items,
      defaultTenantId: defaultTenant ? defaultTenant.tenant_id : null
    };
  }

  async #resolveTenantId(tenantId) {
    const candidate = this.#normaliseTenantId(tenantId);
    if (candidate) {
      return candidate;
    }
    const tenants = await this.listTenants();
    return tenants.defaultTenantId ?? 'global';
  }

  async getOverview({ tenantId } = {}) {
    const resolvedTenantId = await this.#resolveTenantId(tenantId);
    const now = this.nowProvider();

    const [caseRows, communicationsRows, playbookRows, workflowRows, policyRows, checklistRows, onboardingPlaybooks, articleRows] =
      await Promise.all([
        this.db('learner_support_cases as cases')
          .leftJoin('users as u', 'u.id', 'cases.user_id')
          .select('cases.*', 'u.first_name', 'u.last_name', 'u.email')
          .where('cases.tenant_id', resolvedTenantId)
          .orderBy('cases.created_at', 'desc')
          .limit(50),
        this.db('support_operations_communications').where('tenant_id', resolvedTenantId).orderBy('scheduled_at', 'desc'),
        this.db('support_operations_playbooks').where('tenant_id', resolvedTenantId).orderBy('name', 'asc'),
        this.db('support_automation_workflows').where('tenant_id', resolvedTenantId).orderBy('name', 'asc'),
        this.db('support_notification_policies').where('tenant_id', resolvedTenantId).orderBy('updated_at', 'desc'),
        this.db('support_onboarding_checklists').where('tenant_id', resolvedTenantId).orderBy('updated_at', 'desc'),
        this.db('support_onboarding_playbooks').where('tenant_id', resolvedTenantId).orderBy('name', 'asc'),
        this.db('support_articles').orderBy('helpfulness_score', 'desc')
      ]);

    const queueItems = caseRows.map((row) => buildQueueItem(row, now));
    const openCases = caseRows.filter((row) => OPEN_STATUSES.has((row.status ?? '').toLowerCase()));
    const closedCases = caseRows.filter((row) => CLOSED_STATUSES.has((row.status ?? '').toLowerCase()));
    const breachedCases = openCases.filter((row) => isBreached(row, now));
    const unassignedCases = openCases.filter((row) => !row.owner);
    const firstResponseSamples = caseRows
      .map((row) => coerceNumber(normaliseMetadata(row).firstResponseMinutes))
      .filter((value) => typeof value === 'number');
    const resolutionSamples = caseRows
      .map((row) => {
        const meta = normaliseMetadata(row);
        if (meta.resolutionMinutes !== undefined && meta.resolutionMinutes !== null) {
          return coerceNumber(meta.resolutionMinutes);
        }
        if (row.updated_at && row.created_at && CLOSED_STATUSES.has((row.status ?? '').toLowerCase())) {
          const updated = new Date(row.updated_at);
          const created = new Date(row.created_at);
          return Math.round((updated.getTime() - created.getTime()) / 60000);
        }
        return null;
      })
      .filter((value) => typeof value === 'number');

    const satisfactionSamples = caseRows
      .map((row) => coerceNumber(row.satisfaction))
      .filter((value) => typeof value === 'number');

    const promoters = satisfactionSamples.filter((score) => score >= 4).length;
    const detractors = satisfactionSamples.filter((score) => score <= 2).length;
    const npsBase = satisfactionSamples.length;

    const queueStats = {
      open: openCases.length,
      closed: closedCases.length,
      breached: breachedCases.length,
      awaitingAssignment: unassignedCases.length,
      firstResponseMinutes: average(firstResponseSamples),
      resolutionMinutes: average(resolutionSamples),
      slaAttainment:
        openCases.length > 0 ? (openCases.length - breachedCases.length) / openCases.length : null,
      csat: satisfactionSamples.length > 0 ? average(satisfactionSamples.map((score) => (score / 5) * 100)) / 100 : null,
      nps:
        npsBase > 0
          ? Math.round(((promoters - detractors) / npsBase) * 100)
          : null
    };

    const backlogTrend = buildBacklogTrend(caseRows, { now });

    const scheduledCommunications = communicationsRows.filter((row) => (row.status ?? '').toLowerCase() === 'scheduled');
    const recentCommunications = communicationsRows.filter((row) => (row.status ?? '').toLowerCase() !== 'scheduled');

    const mapCommunication = (row) => ({
      id: row.id,
      title: row.title,
      channel: row.channel,
      status: row.status,
      audienceSize: row.audience_size ?? null,
      scheduledAt: toIso(row.scheduled_at),
      createdAt: toIso(row.created_at),
      author: row.author ?? null,
      message: row.message ?? null
    });

    const knowledgeBase = {
      totalArticles: articleRows.length,
      flaggedArticles: articleRows
        .filter((row) => row.pending_review)
        .map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          lastUpdated: toIso(row.updated_at),
          pendingReview: true,
          flaggedIssues: []
        })),
      drafts: articleRows
        .filter((row) => row.is_draft)
        .map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          lastUpdated: toIso(row.updated_at),
          pendingReview: Boolean(row.pending_review)
        }))
    };

    const automation = {
      workflows: workflowRows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        successRate: row.success_rate,
        lastRunAt: toIso(row.last_run_at)
      })),
      health: {
        total: workflowRows.length,
        active: workflowRows.filter((row) => (row.status ?? '').toLowerCase() === 'active').length,
        paused: workflowRows.filter((row) => (row.status ?? '').toLowerCase() !== 'active').length
      }
    };

    const notificationPolicies = policyRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      slaMinutes: row.sla_minutes ?? null,
      channels: SupportTicketModel.parseJson(row.channels, {}),
      escalationTargets: SupportTicketModel.parseJson(row.escalation_targets, []),
      updatedAt: toIso(row.updated_at)
    }));

    const onboarding = {
      checklists: checklistRows.map((row) => ({
        id: row.id,
        name: row.name,
        progress: Number(row.progress ?? 0),
        owner: row.owner ?? null,
        updatedAt: toIso(row.updated_at)
      })),
      playbooks: onboardingPlaybooks.map((row) => ({
        id: row.id,
        name: row.name,
        link: row.link ?? null
      }))
    };

    const communications = {
      scheduled: scheduledCommunications.map(mapCommunication),
      recent: recentCommunications.map(mapCommunication),
      playbooks: playbookRows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description ?? null,
        audience: row.audience ?? null,
        link: row.link ?? null
      }))
    };

    const settings = {
      notificationPolicies,
      channels: derivePolicyChannels(notificationPolicies),
      responseTargets: deriveResponseTargets(notificationPolicies)
    };

    return {
      tenantId: resolvedTenantId,
      generatedAt: now.toISOString(),
      queue: {
        stats: queueStats,
        backlogTrend,
        items: queueItems
      },
      communications,
      knowledgeBase,
      automation,
      settings,
      onboarding
    };
  }

  async assignTicket(params = {}) {
    const { tenantId, ticketId, assigneeId, actor } = params;
    const context = await this.#findTenantScopedCase(tenantId, ticketId);
    if (!context) {
      const error = new Error('Support ticket not found');
      error.status = 404;
      throw error;
    }

    const { tenantId: resolvedTenantId, record } = context;
    const now = this.nowProvider();
    const actorDescriptor = this.#buildActorDescriptor(actor);
    const metadata = SupportTicketModel.parseJson(record.metadata, {});
    const assignmentHistory = Array.isArray(metadata.assignmentHistory) ? metadata.assignmentHistory : [];

    let nextOwner = record.owner;
    let shouldTrackHistory = false;
    if (Object.prototype.hasOwnProperty.call(params, 'assigneeId')) {
      nextOwner = assigneeId ?? null;
      shouldTrackHistory = true;
    }

    if (shouldTrackHistory) {
      assignmentHistory.push({
        assignedAt: now.toISOString(),
        assignedBy: actorDescriptor,
        assignedTo: nextOwner
      });
      metadata.assignmentHistory = assignmentHistory;
    }

    const breadcrumb = SupportTicketModel.appendBreadcrumb(record.escalation_breadcrumbs, {
      actor: this.#actorLabel(actorDescriptor),
      label: nextOwner ? 'Ticket assigned' : 'Assignment updated',
      note: nextOwner ? `Assigned to ${nextOwner}` : 'Assignment cleared',
      at: now
    });

    const updatePayload = {
      metadata: SupportTicketModel.serialiseMetadata(metadata),
      escalation_breadcrumbs: SupportTicketModel.serialiseJson(breadcrumb),
      follow_up_due_at: SupportTicketModel.calculateFollowUpDueAt(record.priority),
      updated_at: this.db.fn.now()
    };

    if (shouldTrackHistory) {
      updatePayload.owner = nextOwner;
      updatePayload.last_agent = nextOwner ?? record.last_agent;
    }

    if (record.status && OPEN_STATUSES.has(record.status.toLowerCase())) {
      updatePayload.status = 'in_progress';
    }

    await this.db('learner_support_cases').where({ id: record.id }).update(updatePayload);

    this.logger.info(
      { tenantId: resolvedTenantId, ticketId: record.id, assigneeId: nextOwner },
      'Support ticket assignment updated'
    );

    return this.#loadCaseWithMessages(record.id);
  }

  async escalateTicket({ tenantId, ticketId, reason, target, actor } = {}) {
    const context = await this.#findTenantScopedCase(tenantId, ticketId);
    if (!context) {
      const error = new Error('Support ticket not found');
      error.status = 404;
      throw error;
    }

    const { tenantId: resolvedTenantId, record } = context;
    const now = this.nowProvider();
    const actorDescriptor = this.#buildActorDescriptor(actor);
    const metadata = SupportTicketModel.parseJson(record.metadata, {});
    const history = Array.isArray(metadata.escalationHistory) ? metadata.escalationHistory : [];
    history.push({
      target: target ?? null,
      reason: reason ?? null,
      escalatedAt: now.toISOString(),
      escalatedBy: actorDescriptor
    });
    metadata.escalationHistory = history;

    const breadcrumb = SupportTicketModel.appendBreadcrumb(record.escalation_breadcrumbs, {
      actor: this.#actorLabel(actorDescriptor),
      label: 'Ticket escalated',
      note: target ? `Escalated to ${target}${reason ? ` — ${reason}` : ''}` : reason ?? 'Escalated',
      at: now
    });

    await this.db('learner_support_cases')
      .where({ id: record.id })
      .update({
        status: 'escalated',
        metadata: SupportTicketModel.serialiseMetadata(metadata),
        escalation_breadcrumbs: SupportTicketModel.serialiseJson(breadcrumb),
        updated_at: this.db.fn.now()
      });

    this.logger.info(
      { tenantId: resolvedTenantId, ticketId: record.id, target: target ?? null },
      'Support ticket escalated'
    );

    return this.#loadCaseWithMessages(record.id);
  }

  async resolveTicket({ tenantId, ticketId, resolution = {}, actor } = {}) {
    const context = await this.#findTenantScopedCase(tenantId, ticketId);
    if (!context) {
      const error = new Error('Support ticket not found');
      error.status = 404;
      throw error;
    }

    const { tenantId: resolvedTenantId, record } = context;
    const now = this.nowProvider();
    const actorDescriptor = this.#buildActorDescriptor(actor);
    const metadata = SupportTicketModel.parseJson(record.metadata, {});
    const history = Array.isArray(metadata.resolutionHistory) ? metadata.resolutionHistory : [];
    const resolvedBy = resolution.resolvedBy ?? this.#actorLabel(actorDescriptor);
    const summary = resolution.summary ?? null;
    history.push({
      resolvedAt: now.toISOString(),
      resolvedBy,
      summary
    });
    metadata.resolutionHistory = history;

    const breadcrumb = SupportTicketModel.appendBreadcrumb(record.escalation_breadcrumbs, {
      actor: resolvedBy,
      label: 'Ticket resolved',
      note: summary ?? 'Marked resolved from support hub',
      at: now
    });

    await this.db('learner_support_cases')
      .where({ id: record.id })
      .update({
        status: 'resolved',
        metadata: SupportTicketModel.serialiseMetadata(metadata),
        escalation_breadcrumbs: SupportTicketModel.serialiseJson(breadcrumb),
        follow_up_due_at: null,
        updated_at: this.db.fn.now()
      });

    this.logger.info(
      { tenantId: resolvedTenantId, ticketId: record.id },
      'Support ticket resolved from operator hub'
    );

    return this.#loadCaseWithMessages(record.id);
  }

  async scheduleBroadcast({ tenantId, payload = {}, actor } = {}) {
    if (!payload.title) {
      const error = new Error('A broadcast title is required');
      error.status = 422;
      throw error;
    }

    const resolvedTenantId = await this.#resolveTenantId(tenantId);
    const now = this.nowProvider();
    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : now;
    const rawChannel = (payload.channel ?? 'in-app').toString().toLowerCase();
    const channel = rawChannel === 'in_app' || rawChannel === 'inapp' ? 'in-app' : rawChannel;
    const audienceSize = Number.isFinite(Number(payload.audienceSize)) ? Number(payload.audienceSize) : null;
    const actorDescriptor = this.#buildActorDescriptor(actor);
    const messageInput = typeof payload.message === 'string' ? payload.message.trim() : '';
    const message = messageInput.length ? messageInput : null;

    const [inserted] = await this.db('support_operations_communications').insert(
      {
        tenant_id: resolvedTenantId,
        title: payload.title,
        channel,
        status: payload.status ?? 'scheduled',
        audience_size: audienceSize,
        scheduled_at: scheduledAt,
        author: actorDescriptor.name ?? actorDescriptor.email ?? payload.author ?? null,
        message
      },
      ['id']
    );

    const recordId = typeof inserted === 'object' ? inserted.id : inserted;
    const stored = await this.db('support_operations_communications').where({ id: recordId }).first();

    const broadcast = {
      id: stored.id,
      tenantId: stored.tenant_id,
      title: stored.title,
      channel: stored.channel,
      status: stored.status,
      audienceSize: stored.audience_size ?? null,
      scheduledAt: SupportTicketModel.toIso(stored.scheduled_at),
      createdAt: SupportTicketModel.toIso(stored.created_at),
      author: stored.author ?? null,
      message: stored.message ?? message
    };

    this.logger.info(
      { tenantId: resolvedTenantId, broadcastId: broadcast.id, channel: broadcast.channel },
      'Support broadcast scheduled'
    );

    return broadcast;
  }

  async updateNotificationPolicy({ tenantId, policyId, updates = {}, actor } = {}) {
    if (!policyId) {
      const error = new Error('Notification policy identifier is required');
      error.status = 422;
      throw error;
    }

    const resolvedTenantId = await this.#resolveTenantId(tenantId);
    const payload = {};

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      payload.name = updates.name;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      payload.description = updates.description ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'slaMinutes')) {
      payload.sla_minutes = updates.slaMinutes ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'channels')) {
      payload.channels = SupportTicketModel.serialiseJson(updates.channels ?? {});
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'escalationTargets')) {
      payload.escalation_targets = SupportTicketModel.serialiseJson(updates.escalationTargets ?? []);
    }

    if (Object.keys(payload).length === 0) {
      return this.#loadNotificationPolicy(policyId);
    }

    payload.updated_at = this.db.fn.now();

    const updated = await this.db('support_notification_policies')
      .where({ id: policyId, tenant_id: resolvedTenantId })
      .update(payload);

    if (!updated) {
      const error = new Error('Notification policy not found');
      error.status = 404;
      throw error;
    }

    this.logger.info(
      {
        tenantId: resolvedTenantId,
        policyId,
        updatedBy: this.#actorLabel(actor)
      },
      'Support notification policy updated'
    );

    return this.#loadNotificationPolicy(policyId);
  }

  async #loadNotificationPolicy(policyId) {
    if (!policyId) {
      return null;
    }
    const row = await this.db('support_notification_policies').where({ id: policyId }).first();
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description ?? null,
      slaMinutes: row.sla_minutes ?? null,
      channels: SupportTicketModel.parseJson(row.channels, {}),
      escalationTargets: SupportTicketModel.parseJson(row.escalation_targets, []),
      updatedAt: SupportTicketModel.toIso(row.updated_at)
    };
  }
}

