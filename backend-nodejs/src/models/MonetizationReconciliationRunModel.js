import db from '../config/database.js';

const TABLE = 'monetization_reconciliation_runs';

function parseJson(value) {
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

function normaliseTenantId(tenantId) {
  if (!tenantId) {
    return 'global';
  }
  return String(tenantId).trim().toLowerCase() || 'global';
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toRatio(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(4));
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    status: row.status,
    invoicedCents: toNumber(row.invoiced_cents),
    usageCents: toNumber(row.usage_cents),
    recognizedCents: toNumber(row.recognized_cents),
    deferredCents: toNumber(row.deferred_cents),
    varianceCents: toNumber(row.variance_cents),
    varianceRatio: toRatio(row.variance_ratio),
    metadata: parseJson(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class MonetizationReconciliationRunModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      tenant_id: normaliseTenantId(payload.tenantId),
      window_start: payload.windowStart,
      window_end: payload.windowEnd,
      status: payload.status ?? 'completed',
      invoiced_cents: toNumber(payload.invoicedCents ?? 0),
      usage_cents: toNumber(payload.usageCents ?? 0),
      recognized_cents: toNumber(payload.recognizedCents ?? 0),
      deferred_cents: toNumber(payload.deferredCents ?? 0),
      variance_cents: toNumber(payload.varianceCents ?? 0),
      variance_ratio: toRatio(payload.varianceRatio ?? 0),
      metadata: JSON.stringify(payload.metadata ?? {}),
      created_at: payload.createdAt ?? connection.fn.now()
    };

    const [id] = await connection(TABLE).insert(insertPayload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async latest({ tenantId } = {}, connection = db) {
    const row = await connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .orderBy('created_at', 'desc')
      .first();
    return mapRow(row);
  }

  static async list({ tenantId, limit = 20 } = {}, connection = db) {
    const rows = await connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 100));
    return rows.map(mapRow);
  }

  static async distinctTenants(connection = db) {
    const rows = await connection(TABLE).distinct({ tenantId: 'tenant_id' });
    return rows
      .map((row) => normaliseTenantId(row.tenantId))
      .filter((tenantId, index, list) => tenantId && list.indexOf(tenantId) === index);
  }
}

