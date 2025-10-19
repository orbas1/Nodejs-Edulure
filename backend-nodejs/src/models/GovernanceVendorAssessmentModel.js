import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'governance_vendor_assessments';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'contract_id as contractId',
  'vendor_name as vendorName',
  'assessment_type as assessmentType',
  'risk_score as riskScore',
  'risk_level as riskLevel',
  'status',
  'last_assessed_at as lastAssessedAt',
  'next_review_at as nextReviewAt',
  'owner_email as ownerEmail',
  'findings',
  'remediation_plan as remediationPlan',
  'evidence_links as evidenceLinks',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function extractCount(row) {
  if (!row) {
    return 0;
  }
  const value =
    row.count ??
    row['count'] ??
    row['count(*)'] ??
    row['COUNT(*)'] ??
    row['count(`*`)'] ??
    Object.values(row)[0];
  return Number(value ?? 0);
}

function toDbPayload(assessment) {
  return {
    public_id: assessment.publicId ?? randomUUID(),
    contract_id: assessment.contractId ?? null,
    vendor_name: assessment.vendorName,
    assessment_type: assessment.assessmentType,
    risk_score: Number(assessment.riskScore ?? 0) || 0,
    risk_level: assessment.riskLevel ?? 'medium',
    status: assessment.status ?? 'scheduled',
    last_assessed_at: assessment.lastAssessedAt ?? null,
    next_review_at: assessment.nextReviewAt ?? null,
    owner_email: assessment.ownerEmail,
    findings: serialiseJson(assessment.findings ?? [], []),
    remediation_plan: serialiseJson(assessment.remediationPlan ?? {}, {}),
    evidence_links: serialiseJson(assessment.evidenceLinks ?? [], []),
    metadata: serialiseJson(assessment.metadata ?? {}, {})
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    contractId: row.contractId,
    vendorName: row.vendorName,
    assessmentType: row.assessmentType,
    riskScore: Number(row.riskScore ?? 0),
    riskLevel: row.riskLevel,
    status: row.status,
    lastAssessedAt: row.lastAssessedAt,
    nextReviewAt: row.nextReviewAt,
    ownerEmail: row.ownerEmail,
    findings: parseJson(row.findings, []),
    remediationPlan: parseJson(row.remediationPlan, {}),
    evidenceLinks: parseJson(row.evidenceLinks, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class GovernanceVendorAssessmentModel {
  static deserialize = deserialize;

  static async create(assessment, connection = db) {
    const payload = toDbPayload(assessment);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? deserialize(row) : null;
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const payload = {};
    if (updates.contractId !== undefined) payload.contract_id = updates.contractId;
    if (updates.vendorName !== undefined) payload.vendor_name = updates.vendorName;
    if (updates.assessmentType !== undefined) payload.assessment_type = updates.assessmentType;
    if (updates.riskScore !== undefined) payload.risk_score = Number(updates.riskScore) || 0;
    if (updates.riskLevel !== undefined) payload.risk_level = updates.riskLevel;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.lastAssessedAt !== undefined) payload.last_assessed_at = updates.lastAssessedAt || null;
    if (updates.nextReviewAt !== undefined) payload.next_review_at = updates.nextReviewAt || null;
    if (updates.ownerEmail !== undefined) payload.owner_email = updates.ownerEmail;
    if (updates.findings !== undefined) payload.findings = serialiseJson(updates.findings, []);
    if (updates.remediationPlan !== undefined) payload.remediation_plan = serialiseJson(updates.remediationPlan, {});
    if (updates.evidenceLinks !== undefined) payload.evidence_links = serialiseJson(updates.evidenceLinks, []);
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata, {});

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, connection);
    }

    await connection(TABLE).where({ public_id: publicId }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findByPublicId(publicId, connection);
  }

  static applyFilters(query, filters = {}, connection = db) {
    const builder = query.clone();
    if (filters.vendorName) {
      builder.whereILike('vendor_name', `%${filters.vendorName}%`);
    }
    if (filters.assessmentType) {
      const types = Array.isArray(filters.assessmentType) ? filters.assessmentType : [filters.assessmentType];
      builder.whereIn(
        'assessment_type',
        types.map((type) => type.trim()).filter(Boolean)
      );
    }
    if (filters.riskLevel) {
      const levels = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
      builder.whereIn('risk_level', levels.map((level) => level.trim()).filter(Boolean));
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      builder.whereIn('status', statuses.map((status) => status.trim()).filter(Boolean));
    }
    if (filters.nextReviewBefore) {
      builder.whereNotNull('next_review_at');
      builder.where('next_review_at', '<=', filters.nextReviewBefore);
    }
    if (filters.overdue === true) {
      builder.where((qb) => {
        qb.where('next_review_at', '<', connection.raw('CURRENT_DATE')).orWhere('status', 'remediation');
      });
    }
    return builder;
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const limit = Math.max(1, Math.min(100, Number.parseInt(pagination.limit ?? '25', 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? '0', 10));

    const baseQuery = this.applyFilters(connection(TABLE).select(BASE_COLUMNS).orderBy('next_review_at', 'asc'), filters, connection);
    const rows = await baseQuery.clone().limit(limit).offset(offset);
    const countRow = await this.applyFilters(connection(TABLE).count({ count: '*' }), filters, connection).first();

    return {
      total: extractCount(countRow),
      items: rows.map((row) => deserialize(row))
    };
  }

  static async getRiskSummary(connection = db) {
    const [totalRow, highRow, criticalRow, remediationRow] = await Promise.all([
      connection(TABLE).count({ count: '*' }).first(),
      connection(TABLE).count({ count: '*' }).where({ risk_level: 'high' }).first(),
      connection(TABLE).count({ count: '*' }).where({ risk_level: 'critical' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'remediation' }).first()
    ]);

    return {
      totalAssessments: extractCount(totalRow),
      highRiskAssessments: extractCount(highRow),
      criticalRiskAssessments: extractCount(criticalRow),
      remediationInProgress: extractCount(remediationRow)
    };
  }
}
