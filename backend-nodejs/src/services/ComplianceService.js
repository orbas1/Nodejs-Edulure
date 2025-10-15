import db from '../config/database.js';
import logger from '../config/logger.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';
import changeDataCaptureService from './ChangeDataCaptureService.js';

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
    assignee: normalizeUser(row.assignee)
  };
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
  constructor({ connection = db, loggerInstance = logger.child({ module: 'compliance-service' }) } = {}) {
    this.connection = connection;
    this.logger = loggerInstance;
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

  async assignDsrRequest({ requestId, assigneeId, actor }) {
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
      metadata: { assigneeId }
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

  async updateDsrStatus({ requestId, status, resolutionNotes, actor }) {
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
      metadata: { status, resolutionNotes }
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
    metadata = {}
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
      metadata: { consentType, policyVersion }
    });

    await changeDataCaptureService.recordEvent({
      entityName: 'consent_record',
      entityId: id,
      operation: 'GRANT',
      payload: { consentType, policyVersion, channel }
    });

    return this.connection(COMPLIANCE_TABLES.CONSENT_RECORDS).where({ id }).first();
  }

  async revokeConsent({ consentId, reason, actor }) {
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
      metadata: { reason }
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

  async #recordAuditEvent({ eventType, entityType, entityId, actor, metadata }) {
    const payload = {
      event_uuid: this.connection.raw('(UUID())'),
      tenant_id: 'global',
      actor_id: actor?.id ?? null,
      actor_type: actor?.type ?? 'system',
      actor_role: actor?.role ?? 'system',
      event_type: eventType,
      event_severity: 'info',
      entity_type: entityType,
      entity_id: String(entityId),
      payload: metadata ?? {},
      occurred_at: this.connection.fn.now(),
      ingested_at: this.connection.fn.now()
    };

    await this.connection(COMPLIANCE_TABLES.AUDIT_EVENTS).insert(payload);
  }
}
