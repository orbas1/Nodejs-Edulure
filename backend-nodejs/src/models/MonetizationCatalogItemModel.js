import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'monetization_catalog_items';

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

function normaliseProductCode(value) {
  if (!value) {
    throw new Error('productCode is required');
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '-');
}

function serialiseMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return JSON.stringify({});
  }
  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.public_id,
    tenantId: row.tenant_id,
    productCode: row.product_code,
    name: row.name,
    description: row.description,
    pricingModel: row.pricing_model,
    billingInterval: row.billing_interval,
    revenueRecognitionMethod: row.revenue_recognition_method,
    recognitionDurationDays: Number(row.recognition_duration_days ?? 0),
    unitAmountCents: Number(row.unit_amount_cents ?? 0),
    currency: row.currency,
    usageMetric: row.usage_metric,
    revenueAccount: row.revenue_account,
    deferredRevenueAccount: row.deferred_revenue_account,
    metadata: parseJson(row.metadata),
    status: row.status,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    retiredAt: row.retired_at
  };
}

export default class MonetizationCatalogItemModel {
  static async create(payload, connection = db) {
    const tenantId = normaliseTenantId(payload.tenantId);
    const productCode = normaliseProductCode(payload.productCode);

    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      tenant_id: tenantId,
      product_code: productCode,
      name: payload.name,
      description: payload.description ?? null,
      pricing_model: payload.pricingModel ?? 'flat_fee',
      billing_interval: payload.billingInterval ?? 'monthly',
      revenue_recognition_method: payload.revenueRecognitionMethod ?? 'immediate',
      recognition_duration_days: payload.recognitionDurationDays ?? 0,
      unit_amount_cents: payload.unitAmountCents ?? 0,
      currency: (payload.currency ?? 'GBP').toUpperCase(),
      usage_metric: payload.usageMetric ?? null,
      revenue_account: payload.revenueAccount ?? '4000-education-services',
      deferred_revenue_account: payload.deferredRevenueAccount ?? '2050-deferred-revenue',
      metadata: serialiseMetadata(payload.metadata),
      status: payload.status ?? 'active',
      effective_from: payload.effectiveFrom ?? connection.fn.now(),
      effective_to: payload.effectiveTo ?? null,
      retired_at: payload.retiredAt ?? null
    };

    const [id] = await connection(TABLE).insert(insertPayload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.name !== undefined) {
      payload.name = updates.name;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }
    if (updates.pricingModel) {
      payload.pricing_model = updates.pricingModel;
    }
    if (updates.billingInterval) {
      payload.billing_interval = updates.billingInterval;
    }
    if (updates.revenueRecognitionMethod) {
      payload.revenue_recognition_method = updates.revenueRecognitionMethod;
    }
    if (updates.recognitionDurationDays !== undefined) {
      payload.recognition_duration_days = updates.recognitionDurationDays;
    }
    if (updates.unitAmountCents !== undefined) {
      payload.unit_amount_cents = updates.unitAmountCents;
    }
    if (updates.currency) {
      payload.currency = updates.currency.toUpperCase();
    }
    if (updates.usageMetric !== undefined) {
      payload.usage_metric = updates.usageMetric;
    }
    if (updates.revenueAccount) {
      payload.revenue_account = updates.revenueAccount;
    }
    if (updates.deferredRevenueAccount) {
      payload.deferred_revenue_account = updates.deferredRevenueAccount;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseMetadata(updates.metadata);
    }
    if (updates.status) {
      payload.status = updates.status;
    }
    if (Object.hasOwn(updates, 'effectiveFrom')) {
      payload.effective_from = updates.effectiveFrom;
    }
    if (Object.hasOwn(updates, 'effectiveTo')) {
      payload.effective_to = updates.effectiveTo;
    }
    if (Object.hasOwn(updates, 'retiredAt')) {
      payload.retired_at = updates.retiredAt;
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async findByProductCode(tenantId, productCode, connection = db) {
    if (!productCode) {
      return null;
    }
    const row = await connection(TABLE)
      .where({
        tenant_id: normaliseTenantId(tenantId),
        product_code: normaliseProductCode(productCode)
      })
      .first();
    return mapRow(row);
  }

  static async list({ tenantId, status, includeRetired = false, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE)
      .select('*')
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .orderBy('name', 'asc')
      .limit(Math.min(limit, 200))
      .offset(Math.max(offset, 0));

    if (status) {
      query.andWhere({ status });
    }

    if (!includeRetired) {
      query.andWhere(function hideRetired() {
        this.whereNull('retired_at');
      });
    }

    const rows = await query;
    return rows.map(mapRow);
  }

  static async listByProductCodes(tenantId, productCodes, connection = db) {
    if (!productCodes?.length) {
      return [];
    }
    const codes = Array.from(
      new Set(
        productCodes
          .map((code) => {
            try {
              return normaliseProductCode(code);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
      )
    );
    if (!codes.length) {
      return [];
    }
    const rows = await connection(TABLE)
      .select('*')
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .whereIn('product_code', codes);
    return rows.map(mapRow);
  }

  static async touchMetrics(connection = db) {
    const rows = await connection(TABLE)
      .select('status')
      .count('* as count')
      .groupBy('status');
    return rows.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {});
  }

  static async distinctTenants(connection = db) {
    const rows = await connection(TABLE).distinct({ tenantId: 'tenant_id' });
    return rows
      .map((row) => normaliseTenantId(row.tenantId))
      .filter((tenantId, index, list) => tenantId && list.indexOf(tenantId) === index);
  }
}

