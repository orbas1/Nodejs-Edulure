import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'governance_contracts';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'vendor_name as vendorName',
  'contract_type as contractType',
  'status',
  'owner_email as ownerEmail',
  'risk_tier as riskTier',
  'contract_value_cents as contractValueCents',
  'currency',
  'effective_date as effectiveDate',
  'renewal_date as renewalDate',
  'termination_notice_date as terminationNoticeDate',
  'obligations',
  'metadata',
  'last_renewal_evaluated_at as lastRenewalEvaluatedAt',
  'next_governance_check_at as nextGovernanceCheckAt',
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
    row['count(*)'] ??
    row['COUNT(*)'] ??
    row['count(`*`)'] ??
    Object.values(row)[0];
  return Number(value ?? 0);
}

function toDbPayload(contract) {
  return {
    public_id: contract.publicId ?? randomUUID(),
    vendor_name: contract.vendorName,
    contract_type: contract.contractType,
    status: contract.status ?? 'active',
    owner_email: contract.ownerEmail,
    risk_tier: contract.riskTier ?? 'medium',
    contract_value_cents: Number.parseInt(contract.contractValueCents ?? 0, 10) || 0,
    currency: contract.currency ?? 'USD',
    effective_date: contract.effectiveDate,
    renewal_date: contract.renewalDate ?? null,
    termination_notice_date: contract.terminationNoticeDate ?? null,
    obligations: serialiseJson(contract.obligations ?? [], []),
    metadata: serialiseJson(contract.metadata ?? {}, {}),
    last_renewal_evaluated_at: contract.lastRenewalEvaluatedAt ?? null,
    next_governance_check_at: contract.nextGovernanceCheckAt ?? null
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    vendorName: row.vendorName,
    contractType: row.contractType,
    status: row.status,
    ownerEmail: row.ownerEmail,
    riskTier: row.riskTier,
    contractValueCents: Number.parseInt(row.contractValueCents ?? 0, 10) || 0,
    currency: row.currency,
    effectiveDate: row.effectiveDate ? new Date(row.effectiveDate).toISOString().slice(0, 10) : null,
    renewalDate: row.renewalDate ? new Date(row.renewalDate).toISOString().slice(0, 10) : null,
    terminationNoticeDate: row.terminationNoticeDate
      ? new Date(row.terminationNoticeDate).toISOString().slice(0, 10)
      : null,
    obligations: parseJson(row.obligations, []),
    metadata: parseJson(row.metadata, {}),
    lastRenewalEvaluatedAt: row.lastRenewalEvaluatedAt,
    nextGovernanceCheckAt: row.nextGovernanceCheckAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class GovernanceContractModel {
  static deserialize = deserialize;

  static async create(contract, connection = db) {
    const payload = toDbPayload(contract);
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
    if (updates.vendorName !== undefined) {
      payload.vendor_name = updates.vendorName;
    }
    if (updates.contractType !== undefined) {
      payload.contract_type = updates.contractType;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.ownerEmail !== undefined) {
      payload.owner_email = updates.ownerEmail;
    }
    if (updates.riskTier !== undefined) {
      payload.risk_tier = updates.riskTier;
    }
    if (updates.contractValueCents !== undefined) {
      payload.contract_value_cents = Number.parseInt(updates.contractValueCents, 10) || 0;
    }
    if (updates.currency !== undefined) {
      payload.currency = updates.currency;
    }
    if (updates.effectiveDate !== undefined) {
      payload.effective_date = updates.effectiveDate;
    }
    if (updates.renewalDate !== undefined) {
      payload.renewal_date = updates.renewalDate || null;
    }
    if (updates.terminationNoticeDate !== undefined) {
      payload.termination_notice_date = updates.terminationNoticeDate || null;
    }
    if (updates.obligations !== undefined) {
      payload.obligations = serialiseJson(updates.obligations, []);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata, {});
    }
    if (updates.lastRenewalEvaluatedAt !== undefined) {
      payload.last_renewal_evaluated_at = updates.lastRenewalEvaluatedAt || null;
    }
    if (updates.nextGovernanceCheckAt !== undefined) {
      payload.next_governance_check_at = updates.nextGovernanceCheckAt || null;
    }

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, connection);
    }

    await connection(TABLE).where({ public_id: publicId }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findByPublicId(publicId, connection);
  }

  static buildBaseQuery(connection = db) {
    return connection(TABLE).select(BASE_COLUMNS);
  }

  static applyFilters(query, filters = {}, connection = db) {
    const builder = query.clone();
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : String(filters.status).split(',');
      builder.whereIn('status', statuses.map((status) => status.trim()).filter(Boolean));
    }
    if (filters.vendorName) {
      builder.whereILike('vendor_name', `%${filters.vendorName}%`);
    }
    if (filters.riskTier) {
      const tiers = Array.isArray(filters.riskTier) ? filters.riskTier : [filters.riskTier];
      builder.whereIn('risk_tier', tiers.map((tier) => tier.trim()).filter(Boolean));
    }
    if (filters.ownerEmail) {
      builder.where('owner_email', filters.ownerEmail);
    }
    if (filters.renewalWithinDays) {
      const days = Number.parseInt(filters.renewalWithinDays, 10);
      if (Number.isFinite(days) && days > 0) {
        builder.whereNotNull('renewal_date');
        builder.where('renewal_date', '<=', connection.raw('DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)', [days]));
      }
    }
    if (filters.overdue === true) {
      builder.andWhere((qb) => {
        qb.where('renewal_date', '<', connection.raw('CURRENT_DATE'))
          .orWhere('status', 'pending_renewal')
          .orWhere('status', 'escalated');
      });
    }
    return builder;
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const limit = Math.max(1, Math.min(100, Number.parseInt(pagination.limit ?? '25', 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? '0', 10));

    const baseQuery = this.applyFilters(this.buildBaseQuery(connection).orderBy('renewal_date', 'asc'), filters, connection);

    const rows = await baseQuery.clone().limit(limit).offset(offset);
    const countRow = await this.applyFilters(connection(TABLE).count({ count: '*' }), filters, connection).first();

    return {
      total: extractCount(countRow),
      items: rows.map((row) => deserialize(row))
    };
  }

  static async getLifecycleSummary({ windowDays = 90 } = {}, connection = db) {
    const [totalRow, activeRow, renewalRow, overdueRow, escalatedRow] = await Promise.all([
      connection(TABLE).count({ count: '*' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'active' }).first(),
      connection(TABLE)
        .count({ count: '*' })
        .whereIn('status', ['active', 'pending_renewal'])
        .andWhere('renewal_date', '<=', connection.raw('DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)', [windowDays]))
        .first(),
      connection(TABLE)
        .count({ count: '*' })
        .where((qb) => {
          qb.where('renewal_date', '<', connection.raw('CURRENT_DATE'))
            .orWhere('status', 'pending_renewal');
        })
        .first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'escalated' }).first()
    ]);

    return {
      totalContracts: extractCount(totalRow),
      activeContracts: extractCount(activeRow),
      renewalsWithinWindow: extractCount(renewalRow),
      overdueRenewals: extractCount(overdueRow),
      escalatedContracts: extractCount(escalatedRow)
    };
  }
}
