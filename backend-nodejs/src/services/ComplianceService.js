import db from '../config/database.js';
import logger from '../config/logger.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';
import changeDataCaptureService from './ChangeDataCaptureService.js';
import AuditEventService from './AuditEventService.js';

const defaultAuditLogger = new AuditEventService();

const POLICY_AUDIENCE_DEFAULTS = {
  'marketing.email': ['instructor', 'user'],
  'data.analytics': ['admin', 'instructor'],
  default: ['admin', 'instructor']
};

function normalizeUser(user) {
  if (!user) {
    return null;
  }
  const firstName = user.first_name ?? user.firstName ?? null;
  const lastName = user.last_name ?? user.lastName ?? null;
  return {
    id: user.id,
    email: user.email ?? null,
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(' ') || user.email || null
  };
}

function ensureJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function mapDsrRow(row) {
  const dueMetrics = calculateDueMetrics(row.due_at);
  return {
    id: row.id,
    requestUuid: row.request_uuid,
    tenantId: row.tenant_id,
    userId: row.user_id,
    requestType: row.request_type,
    status: row.status,
    submittedAt: row.submitted_at,
    dueAt: row.due_at,
    closedAt: row.closed_at,
    handledBy: row.handled_by,
    escalated: Boolean(row.escalated),
    escalatedAt: row.escalated_at,
    caseReference: row.case_reference,
    slaDays: Number(row.sla_days),
    metadata: ensureJson(row.metadata),
    reporter: normalizeUser(row.reporter),
    assignee: normalizeUser(row.assignee),
    dueInHours: dueMetrics.dueInHours,
    deadlineState: dueMetrics.deadlineState
  };
}

function calculateDueMetrics(dueAt) {
  if (!dueAt) {
    return { dueInHours: null, deadlineState: 'unknown' };
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return { dueInHours: null, deadlineState: 'unknown' };
  }

  const diffMs = dueDate.getTime() - Date.now();
  const dueInHours = Number((diffMs / (60 * 60 * 1000)).toFixed(1));

  if (diffMs < 0) {
    return { dueInHours, deadlineState: 'overdue' };
  }

  if (diffMs <= 12 * 60 * 60 * 1000) {
    return { dueInHours, deadlineState: 'due_soon' };
  }

  return { dueInHours, deadlineState: 'on_track' };
}

function mapConsentRow(row) {
  return {
    id: row.id,
    consentUuid: row.consent_uuid,
    consentType: row.consent_type,
    status: row.status,
    channel: row.channel,
    policyVersion: row.policy_version,
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    active: Boolean(row.active),
    policy: row.policy
      ? {
          id: row.policy.id,
          key: row.policy.policy_key,
          version: row.policy.version,
          status: row.policy.status,
          summary: row.policy.summary,
          effectiveAt: row.policy.effective_at
        }
      : null,
    metadata: ensureJson(row.metadata)
  };
}

export default class ComplianceService {
  constructor({
    connection = db,
    loggerInstance = logger.child({ module: 'compliance-service' }),
    auditLogger = defaultAuditLogger
  } = {}) {
    this.connection = connection;
    this.logger = loggerInstance;
    this.auditLogger = auditLogger;
  }

  async summarisePolicyAttestations({
    tenantId = 'global',
    audienceOverrides = {},
    now = new Date()
  } = {}) {
    const policyRows = await this.connection(COMPLIANCE_TABLES.CONSENT_POLICIES)
      .select(
        'id',
        'policy_key as policyKey',
        'version',
        'status',
        'title',
        'summary',
        'effective_at as effectiveAt',
        'metadata'
      )
      .orderBy('effective_at', 'desc');

    const policies = new Map(
      policyRows
        .map((row) => {
          const policyKey = row.policyKey ?? row.policy_key ?? row.key ?? null;
          if (!policyKey) {
            return null;
          }
          return [
            policyKey,
            {
              ...row,
              policyKey,
              metadata: ensureJson(row.metadata ?? row.policy_metadata)
            }
          ];
        })
        .filter(Boolean)
    );

    const roleRows = await this.connection('users').select('role');

    const roleTotals = roleRows.reduce((acc, row) => {
      const roleKey = row.role ?? 'user';
      const precomputedTotal = Number(row.total);
      if (Number.isFinite(precomputedTotal) && precomputedTotal > 0) {
        acc[roleKey] = (acc[roleKey] ?? 0) + precomputedTotal;
      } else {
        acc[roleKey] = (acc[roleKey] ?? 0) + 1;
      }
      return acc;
    }, {});

    const consentQuery = this.connection({ cr: COMPLIANCE_TABLES.CONSENT_RECORDS })
      .select(
        'cr.*',
        'users.role as user_role',
        'cp.policy_key as policy_key',
        'cp.title as policy_title',
        'cp.version as policy_version',
        'cp.status as policy_status',
        'cp.summary as policy_summary',
        'cp.effective_at as policy_effective_at',
        'cp.metadata as policy_metadata'
      )
      .leftJoin('users', 'cr.user_id', 'users.id')
      .leftJoin({ cp: COMPLIANCE_TABLES.CONSENT_POLICIES }, 'cr.policy_id', 'cp.id')
      .orderBy('cr.granted_at', 'desc');

    if (tenantId && tenantId !== 'global') {
      consentQuery.where('cr.tenant_id', tenantId);
    } else {
      consentQuery.andWhere((builder) => {
        builder.whereNull('cr.tenant_id');
        if (tenantId) {
          builder.orWhere('cr.tenant_id', tenantId);
        }
      });
    }

    const consentRows = await consentQuery;

    const summaryByPolicy = new Map();

    consentRows.forEach((row) => {
      const key = row.consent_type ?? row.policy_key ?? 'unknown';
      if (!summaryByPolicy.has(key)) {
        const policy = policies.get(key) ?? {
          policyKey: key,
          title: row.policy_title ?? key,
          version: row.policy_version ?? 'current',
          status: row.policy_status ?? 'published',
          summary: row.policy_summary ?? '',
          effectiveAt: row.policy_effective_at,
          metadata: ensureJson(row.policy_metadata)
        };
        summaryByPolicy.set(key, {
          policy,
          granted: 0,
          revoked: 0,
          expired: 0,
          active: 0,
          channels: new Map(),
          roles: new Map(),
          lastGrantedAt: null,
          lastRevokedAt: null,
          expiringSoon: 0
        });
      }

      const summary = summaryByPolicy.get(key);
      const status = row.status ?? 'granted';
      const isActive = row.active !== undefined ? Boolean(row.active) : status === 'granted';

      if (status === 'granted') {
        summary.granted += 1;
        if (!summary.lastGrantedAt || new Date(row.granted_at) > new Date(summary.lastGrantedAt)) {
          summary.lastGrantedAt = row.granted_at;
        }
      } else if (status === 'revoked') {
        summary.revoked += 1;
        if (!summary.lastRevokedAt || new Date(row.revoked_at) > new Date(summary.lastRevokedAt)) {
          summary.lastRevokedAt = row.revoked_at;
        }
      } else if (status === 'expired') {
        summary.expired += 1;
      }

      if (isActive) {
        summary.active += 1;
      }

      const channel = row.channel ?? 'web';
      summary.channels.set(channel, (summary.channels.get(channel) ?? 0) + 1);

      const role = row.user_role ?? 'user';
      summary.roles.set(role, (summary.roles.get(role) ?? 0) + 1);

      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at);
        const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays <= 30) {
          summary.expiringSoon += 1;
        }
      }
    });

    const attestationSummaries = Array.from(summaryByPolicy.entries()).map(([key, summary]) => {
      const policy = summary.policy;
      const metadata = policy.metadata ?? {};
      const explicitRoles = Array.isArray(audienceOverrides[key]) && audienceOverrides[key].length
        ? audienceOverrides[key]
        : Array.isArray(metadata.requiredRoles) && metadata.requiredRoles.length
          ? metadata.requiredRoles
          : POLICY_AUDIENCE_DEFAULTS[key] ?? POLICY_AUDIENCE_DEFAULTS.default;

      const uniqueRoles = Array.from(new Set(explicitRoles));
      const required = uniqueRoles.reduce((acc, role) => acc + (roleTotals[role] ?? 0), 0);
      const coverage = required > 0 ? Number(((summary.active / required) * 100).toFixed(1)) : 100;
      const outstanding = Math.max(0, required - summary.active);

      const channels = Array.from(summary.channels.entries()).map(([channel, count]) => ({ channel, count }));
      const roles = Array.from(summary.roles.entries()).map(([role, count]) => ({ role, count }));

      return {
        consentType: key,
        policy,
        required,
        granted: summary.granted,
        revoked: summary.revoked,
        expired: summary.expired,
        active: summary.active,
        outstanding,
        coverage,
        channels,
        roles,
        lastGrantedAt: summary.lastGrantedAt,
        lastRevokedAt: summary.lastRevokedAt,
        expiringSoon: summary.expiringSoon,
        audience: uniqueRoles
      };
    });

    attestationSummaries.sort((a, b) => b.coverage - a.coverage);

    const totals = attestationSummaries.reduce(
      (acc, item) => {
        acc.required += item.required;
        acc.granted += item.active;
        acc.outstanding += item.outstanding;
        return acc;
      },
      { required: 0, granted: 0, outstanding: 0 }
    );

    const overallCoverage = totals.required > 0 ? Number(((totals.granted / totals.required) * 100).toFixed(1)) : 100;

    return {
      policies: attestationSummaries,
      totals: {
        ...totals,
        coverage: overallCoverage
      }
    };
  }

  async listDsrRequests({ status, dueBefore, limit = 25, offset = 0 } = {}) {
    const query = this.connection({ dr: COMPLIANCE_TABLES.DSR_REQUESTS })
      .select(
        'dr.*',
        'users.id as reporter_id',
        'users.email as reporter_email',
        'users.first_name as reporter_first_name',
        'users.last_name as reporter_last_name',
        'assignees.id as assignee_id',
        'assignees.email as assignee_email',
        'assignees.first_name as assignee_first_name',
        'assignees.last_name as assignee_last_name'
      )
      .leftJoin('users', 'dr.user_id', 'users.id')
      .leftJoin({ assignees: 'users' }, 'dr.handled_by', 'assignees.id')
      .orderBy('dr.due_at', 'asc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query.where('dr.status', status);
    }

    if (dueBefore) {
      query.andWhere('dr.due_at', '<=', dueBefore);
    }

    const rows = await query;
    const mapped = rows.map((row) =>
      mapDsrRow({
        ...row,
        reporter: {
          id: row.reporter_id,
          email: row.reporter_email,
          first_name: row.reporter_first_name,
          last_name: row.reporter_last_name
        },
        assignee: {
          id: row.assignee_id,
          email: row.assignee_email,
          first_name: row.assignee_first_name,
          last_name: row.assignee_last_name
        }
      })
    );

    const [{ total }] = await this.connection(COMPLIANCE_TABLES.DSR_REQUESTS)
      .modify((builder) => {
        if (status) {
          builder.where('status', status);
        }
      })
      .count({ total: '*' });

    const [{ overdue }] = await this.connection(COMPLIANCE_TABLES.DSR_REQUESTS)
      .where('status', '!=', 'completed')
      .andWhere('due_at', '<', this.connection.fn.now())
      .count({ overdue: '*' });

    return {
      data: mapped,
      total: Number(total ?? 0),
      overdue: Number(overdue ?? 0)
    };
  }

  async assignDsrRequest({ requestId, assigneeId, actor, requestContext }) {
    const updated = await this.connection(COMPLIANCE_TABLES.DSR_REQUESTS)
      .where({ id: requestId })
      .update({ handled_by: assigneeId, updated_at: this.connection.fn.now() });

    if (!updated) {
      throw new Error(`DSR request ${requestId} not found`);
    }

    await this.#recordAuditEvent({
      eventType: 'dsr.assigned',
      entityType: 'dsr_request',
      entityId: requestId,
      actor,
      metadata: { assigneeId },
      requestContext
    });

    await changeDataCaptureService.recordEvent({
      entityName: 'dsr_request',
      entityId: requestId,
      operation: 'ASSIGN',
      payload: { assigneeId }
    });

    return this.getDsrRequestById(requestId);
  }

  async getDsrRequestById(requestId) {
    const row = await this.connection({ dr: COMPLIANCE_TABLES.DSR_REQUESTS })
      .select('dr.*')
      .where('dr.id', requestId)
      .first();

    if (!row) {
      return null;
    }

    return mapDsrRow(row);
  }

  async updateDsrStatus({ requestId, status, resolutionNotes, actor, requestContext }) {
    const now = this.connection.fn.now();
    const updates = { status, updated_at: now };

    if (status === 'completed') {
      updates.closed_at = now;
    }

    if (status === 'escalated') {
      updates.escalated = true;
      updates.escalated_at = now;
    }

    const updated = await this.connection(COMPLIANCE_TABLES.DSR_REQUESTS).where({ id: requestId }).update(updates);
    if (!updated) {
      throw new Error(`DSR request ${requestId} not found`);
    }

    await this.#recordAuditEvent({
      eventType: 'dsr.status_changed',
      entityType: 'dsr_request',
      entityId: requestId,
      actor,
      metadata: { status, resolutionNotes },
      requestContext
    });

    await changeDataCaptureService.recordEvent({
      entityName: 'dsr_request',
      entityId: requestId,
      operation: 'STATUS',
      payload: { status, resolutionNotes }
    });

    return this.getDsrRequestById(requestId);
  }

  async listConsentRecords(userId) {
    const rows = await this.connection({ cr: COMPLIANCE_TABLES.CONSENT_RECORDS })
      .select(
        'cr.*',
        'cp.id as policy_id',
        'cp.policy_key as policy_key',
        'cp.version as policy_version',
        'cp.status as policy_status',
        'cp.summary as policy_summary',
        'cp.effective_at as policy_effective_at'
      )
      .leftJoin({ cp: COMPLIANCE_TABLES.CONSENT_POLICIES }, 'cr.policy_id', 'cp.id')
      .where('cr.user_id', userId)
      .orderBy('cr.granted_at', 'desc');

    return rows.map((row) =>
      mapConsentRow({
        ...row,
        policy: row.policy_id
          ? {
              id: row.policy_id,
              policy_key: row.policy_key,
              version: row.policy_version,
              status: row.policy_status,
              summary: row.policy_summary,
              effective_at: row.policy_effective_at
            }
          : null
      })
    );
  }

  async createConsentRecord({
    userId,
    consentType,
    policyVersion,
    channel = 'web',
    actor,
    evidenceCiphertext,
    metadata = {},
    requestContext
  }) {
    const policy = await this.connection(COMPLIANCE_TABLES.CONSENT_POLICIES)
      .where({ policy_key: consentType, version: policyVersion })
      .first();

    const now = this.connection.fn.now();
    const [id] = await this.connection(COMPLIANCE_TABLES.CONSENT_RECORDS).insert({
      user_id: userId,
      consent_type: consentType,
      policy_version: policyVersion,
      policy_id: policy?.id ?? null,
      channel,
      granted_at: now,
      metadata,
      evidence_ciphertext: evidenceCiphertext ?? null
    });

    await this.#recordAuditEvent({
      eventType: 'consent.granted',
      entityType: 'consent_record',
      entityId: id,
      actor,
      metadata: {
        userId,
        consentType,
        policyVersion,
        channel,
        evidenceAttached: Boolean(evidenceCiphertext)
      },
      requestContext
    });

    await changeDataCaptureService.recordEvent({
      entityName: 'consent_record',
      entityId: id,
      operation: 'GRANT',
      payload: { consentType, policyVersion, channel }
    });

    return this.connection(COMPLIANCE_TABLES.CONSENT_RECORDS).where({ id }).first();
  }

  async revokeConsent({ consentId, reason, actor, requestContext }) {
    const now = this.connection.fn.now();
    const updated = await this.connection(COMPLIANCE_TABLES.CONSENT_RECORDS)
      .where({ id: consentId })
      .update({ status: 'revoked', revoked_at: now, active: false, metadata: this.connection.raw('JSON_SET(IFNULL(metadata, JSON_OBJECT()), "$.revocationReason", ?)', [reason ?? 'revoked']) });

    if (!updated) {
      throw new Error(`Consent record ${consentId} not found`);
    }

    await this.#recordAuditEvent({
      eventType: 'consent.revoked',
      entityType: 'consent_record',
      entityId: consentId,
      actor,
      metadata: { reason },
      requestContext
    });

    await changeDataCaptureService.recordEvent({
      entityName: 'consent_record',
      entityId: consentId,
      operation: 'REVOKE',
      payload: { reason }
    });

    return this.connection(COMPLIANCE_TABLES.CONSENT_RECORDS).where({ id: consentId }).first();
  }

  async fetchPolicyTimeline({ policyKey } = {}) {
    const query = this.connection(COMPLIANCE_TABLES.CONSENT_POLICIES).orderBy('effective_at', 'desc');
    if (policyKey) {
      query.where({ policy_key: policyKey });
    }
    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      key: row.policy_key,
      version: row.version,
      status: row.status,
      title: row.title,
      summary: row.summary,
      effectiveAt: row.effective_at,
      supersedesVersion: row.supersedes_version,
      contentHash: row.content_hash
    }));
  }

  async #recordAuditEvent({ eventType, entityType, entityId, actor, metadata, requestContext }) {
    await this.auditLogger.record({
      eventType,
      entityType,
      entityId: String(entityId),
      actor,
      metadata: metadata ?? {},
      requestContext,
      tenantId: 'global'
    });
  }
}
