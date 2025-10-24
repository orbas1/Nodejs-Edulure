import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import { normalizeCurrencyCode } from '../utils/currency.js';

const TABLE = 'monetization_usage_records';

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

function normaliseProductCode(code) {
  if (!code) {
    throw new Error('productCode is required');
  }
  return String(code)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '-');
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDecimal(value) {
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
    publicId: row.public_id,
    tenantId: row.tenant_id,
    catalogItemId: row.catalog_item_id,
    productCode: row.product_code,
    accountReference: row.account_reference,
    userId: row.user_id,
    usageDate: row.usage_date,
    quantity: toDecimal(row.quantity),
    unitAmountCents: toNumber(row.unit_amount_cents),
    amountCents: toNumber(row.amount_cents),
    currency: row.currency,
    source: row.source,
    externalReference: row.external_reference,
    paymentIntentId: row.payment_intent_id,
    metadata: parseJson(row.metadata),
    recordedAt: row.recorded_at,
    processedAt: row.processed_at
  };
}

export default class MonetizationUsageRecordModel {
  static async create(event, connection = db) {
    const quantity = toDecimal(event.quantity ?? 0);
    const unitAmountCents = toNumber(event.unitAmountCents ?? 0);
    const calculatedAmount =
      event.amountCents !== undefined && event.amountCents !== null
        ? toNumber(event.amountCents)
        : Math.round(quantity * unitAmountCents);

    const payload = {
      public_id: event.publicId ?? randomUUID(),
      tenant_id: normaliseTenantId(event.tenantId),
      catalog_item_id: event.catalogItemId ?? null,
      product_code: normaliseProductCode(event.productCode),
      account_reference: event.accountReference,
      user_id: event.userId ?? null,
      usage_date: event.usageDate ?? connection.fn.now(),
      quantity,
      unit_amount_cents: unitAmountCents,
      amount_cents: calculatedAmount,
      currency: normalizeCurrencyCode(event.currency, 'GBP'),
      source: event.source ?? 'manual',
      external_reference: event.externalReference ?? null,
      payment_intent_id: event.paymentIntentId ?? null,
      metadata: JSON.stringify(event.metadata ?? {}),
      recorded_at: event.recordedAt ?? connection.fn.now(),
      processed_at: event.processedAt ?? null
    };

    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async upsertByExternalReference(event, connection = db) {
    if (!event.externalReference) {
      return this.create(event, connection);
    }

    const existing = await connection(TABLE)
      .where({
        tenant_id: normaliseTenantId(event.tenantId),
        external_reference: event.externalReference
      })
      .first();

    if (!existing) {
      return this.create(event, connection);
    }

    const quantity = event.quantity ?? existing.quantity;
    const unitAmountCents =
      event.unitAmountCents !== undefined && event.unitAmountCents !== null
        ? toNumber(event.unitAmountCents)
        : toNumber(existing.unit_amount_cents);
    const amount =
      event.amountCents !== undefined && event.amountCents !== null
        ? toNumber(event.amountCents)
        : Math.round(toDecimal(quantity) * unitAmountCents);

    await connection(TABLE)
      .where({ id: existing.id })
      .update({
        quantity: toDecimal(quantity),
        unit_amount_cents: unitAmountCents,
        amount_cents: amount,
        currency: normalizeCurrencyCode(event.currency ?? existing.currency, 'GBP'),
        metadata: JSON.stringify(event.metadata ?? parseJson(existing.metadata)),
        usage_date: event.usageDate ?? existing.usage_date,
        catalog_item_id: event.catalogItemId ?? existing.catalog_item_id,
        product_code: normaliseProductCode(event.productCode ?? existing.product_code),
        account_reference: event.accountReference ?? existing.account_reference,
        user_id: event.userId ?? existing.user_id,
        source: event.source ?? existing.source,
        processed_at: event.processedAt ?? existing.processed_at,
        payment_intent_id: event.paymentIntentId ?? existing.payment_intent_id
      });

    const row = await connection(TABLE).where({ id: existing.id }).first();
    return mapRow(row);
  }

  static async markProcessed(id, paymentIntentId, connection = db) {
    await connection(TABLE)
      .where({ id })
      .update({ processed_at: connection.fn.now(), payment_intent_id: paymentIntentId ?? null });
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async listUnprocessed({ tenantId, limit = 100 } = {}, connection = db) {
    const rows = await connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .andWhereNull('processed_at')
      .orderBy('usage_date', 'asc')
      .limit(Math.min(limit, 500));
    return rows.map(mapRow);
  }

  static async sumForWindow({ tenantId, start, end }, connection = db) {
    const query = connection(TABLE)
      .sum({ total: 'amount_cents' })
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') });

    if (start) {
      query.andWhere('usage_date', '>=', start);
    }
    if (end) {
      query.andWhere('usage_date', '<=', end);
    }

    const [row] = await query;
    return toNumber(row?.total ?? 0);
  }

  static async distinctTenants(connection = db) {
    const rows = await connection(TABLE).distinct({ tenantId: 'tenant_id' });
    return rows
      .map((row) => normaliseTenantId(row.tenantId))
      .filter((tenantId, index, list) => tenantId && list.indexOf(tenantId) === index);
  }
}

