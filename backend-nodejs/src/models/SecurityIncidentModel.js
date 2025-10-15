import db from '../config/database.js';

const BASE_COLUMNS = [
  'id',
  'incident_uuid as incidentUuid',
  'tenant_id as tenantId',
  'reporter_id as reporterId',
  'assigned_to as assignedTo',
  'category',
  'severity',
  'status',
  'source',
  'external_case_id as externalCaseId',
  'reported_at as reportedAt',
  'triaged_at as triagedAt',
  'resolved_at as resolvedAt',
  'metadata'
];

const ACTIVE_STATUSES = new Set(['new', 'triaged', 'mitigating']);
const RESOLVED_STATUSES = new Set(['resolved', 'dismissed']);

function normaliseRow(row) {
  if (!row) {
    return null;
  }

  let metadata;
  try {
    metadata = row.metadata ? JSON.parse(row.metadata) : {};
  } catch (error) {
    metadata = { parseError: error.message, raw: row.metadata };
  }

  const acknowledgement = metadata.ack ?? {};
  const resolution = metadata.resolution ?? {};

  return {
    id: row.id,
    incidentUuid: row.incidentUuid,
    tenantId: row.tenantId ?? 'global',
    reporterId: row.reporterId ?? null,
    assignedTo: row.assignedTo ?? null,
    category: row.category,
    severity: row.severity,
    status: row.status,
    source: row.source,
    externalCaseId: row.externalCaseId ?? null,
    reportedAt: row.reportedAt,
    triagedAt: row.triagedAt ?? null,
    resolvedAt: row.resolvedAt ?? resolution.resolvedAt ?? null,
    metadata,
    acknowledgement: {
      acknowledgedAt: acknowledgement.acknowledgedAt ?? row.triagedAt ?? null,
      ackSlaMinutes: acknowledgement.ackSlaMinutes ?? null,
      ackBreached: Boolean(acknowledgement.ackBreached),
      responder: acknowledgement.responder ?? null
    },
    resolution: {
      targetAt: resolution.targetAt ?? null,
      resolvedAt: row.resolvedAt ?? resolution.resolvedAt ?? null,
      resolutionSlaMinutes: resolution.resolutionSlaMinutes ?? null,
      resolutionBreached: Boolean(resolution.resolutionBreached),
      followUp: resolution.followUp ?? null
    }
  };
}

function ensureConnection(connection) {
  return connection ?? db;
}

export default class SecurityIncidentModel {
  static async listActive({ tenantId = 'global', limit = 25 } = {}, connection = db) {
    const rows = await ensureConnection(connection)
      .select(BASE_COLUMNS)
      .from('security_incidents')
      .where({ tenant_id: tenantId })
      .whereIn('status', Array.from(ACTIVE_STATUSES))
      .orderBy('reported_at', 'desc')
      .limit(limit);

    return rows.map(normaliseRow).filter(Boolean);
  }

  static async listRecentlyResolved({ tenantId = 'global', limit = 10 } = {}, connection = db) {
    const rows = await ensureConnection(connection)
      .select(BASE_COLUMNS)
      .from('security_incidents')
      .where({ tenant_id: tenantId })
      .whereIn('status', Array.from(RESOLVED_STATUSES))
      .orderBy('resolved_at', 'desc')
      .limit(limit);

    return rows.map(normaliseRow).filter(Boolean);
  }

  static async aggregateCounts({ tenantId = 'global' } = {}, connection = db) {
    const [totals] = await ensureConnection(connection)
      .from('security_incidents')
      .where({ tenant_id: tenantId })
      .count('* as total')
      .count({ open: this.#countWhereStatus(Array.from(ACTIVE_STATUSES)) })
      .count({ resolved: this.#countWhereStatus(Array.from(RESOLVED_STATUSES)) });

    return {
      total: Number(totals?.total ?? 0),
      open: Number(totals?.open ?? 0),
      resolved: Number(totals?.resolved ?? 0)
    };
  }

  static #countWhereStatus(statuses) {
    return function countWhereStatus() {
      this.whereIn('status', statuses);
    };
  }
}
