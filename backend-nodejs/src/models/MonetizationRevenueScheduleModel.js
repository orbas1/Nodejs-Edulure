import db from '../config/database.js';

const TABLE = 'monetization_revenue_schedules';

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

function appendAdjustmentMetadata(row, adjustment = {}) {
  const metadata = parseJson(row?.metadata);
  const adjustments = Array.isArray(metadata.adjustments) ? metadata.adjustments : [];
  const appliedAt = adjustment.appliedAt ?? new Date().toISOString();

  adjustments.push({
    type: adjustment.type ?? 'refund',
    amountCents: toNumber(adjustment.amountCents ?? adjustment.amount ?? 0),
    appliedAt,
    reason: adjustment.reason ?? null,
    source: adjustment.source ?? null,
    reference: adjustment.reference ?? null
  });

  return { ...metadata, adjustments };
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    paymentIntentId: row.payment_intent_id,
    catalogItemId: row.catalog_item_id,
    usageRecordId: row.usage_record_id,
    productCode: row.product_code,
    status: row.status,
    recognitionMethod: row.recognition_method,
    recognitionStart: row.recognition_start,
    recognitionEnd: row.recognition_end,
    amountCents: toNumber(row.amount_cents),
    recognizedAmountCents: toNumber(row.recognized_amount_cents),
    currency: row.currency,
    revenueAccount: row.revenue_account,
    deferredRevenueAccount: row.deferred_revenue_account,
    recognizedAt: row.recognized_at,
    metadata: parseJson(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class MonetizationRevenueScheduleModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      tenant_id: normaliseTenantId(payload.tenantId),
      payment_intent_id: payload.paymentIntentId,
      catalog_item_id: payload.catalogItemId ?? null,
      usage_record_id: payload.usageRecordId ?? null,
      product_code: payload.productCode ?? null,
      status: payload.status ?? 'pending',
      recognition_method: payload.recognitionMethod ?? 'immediate',
      recognition_start: payload.recognitionStart ?? connection.fn.now(),
      recognition_end: payload.recognitionEnd ?? connection.fn.now(),
      amount_cents: toNumber(payload.amountCents ?? 0),
      recognized_amount_cents: toNumber(payload.recognizedAmountCents ?? 0),
      currency: (payload.currency ?? 'GBP').toUpperCase(),
      revenue_account: payload.revenueAccount ?? '4000-education-services',
      deferred_revenue_account: payload.deferredRevenueAccount ?? '2050-deferred-revenue',
      recognized_at: payload.recognizedAt ?? null,
      metadata: JSON.stringify(payload.metadata ?? {}),
      created_at: payload.createdAt ?? connection.fn.now()
    };

    const [id] = await connection(TABLE).insert(insertPayload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async markRecognized(id, { recognizedAt = new Date().toISOString(), amountCents } = {}, connection = db) {
    const current = await connection(TABLE).where({ id }).first();
    if (!current) {
      return null;
    }

    const recognizedAmount =
      amountCents !== undefined && amountCents !== null ? toNumber(amountCents) : toNumber(current.amount_cents);

    await connection(TABLE)
      .where({ id })
      .update({
        status: 'recognized',
        recognized_amount_cents: recognizedAmount,
        recognized_at: recognizedAt,
        updated_at: connection.fn.now()
      });

    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async markInProgress(id, connection = db) {
    await connection(TABLE).where({ id }).update({ status: 'in_progress', updated_at: connection.fn.now() });
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async listDueForRecognition({ tenantId, asOf = new Date().toISOString(), limit = 200 } = {}, connection = db) {
    const rows = await connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .whereIn('status', ['pending', 'in_progress'])
      .andWhere('recognition_end', '<=', asOf)
      .orderBy('recognition_end', 'asc')
      .limit(Math.min(limit, 500));
    return rows.map(mapRow);
  }

  static async listByPaymentIntent(paymentIntentId, connection = db) {
    const rows = await connection(TABLE)
      .where({ payment_intent_id: paymentIntentId })
      .orderBy('recognition_start', 'asc');
    return rows.map(mapRow);
  }

  static async reduceRecognizedAmount(id, reductionCents, adjustment = {}, connection = db) {
    const amountToReduce = toNumber(reductionCents);
    if (amountToReduce <= 0) {
      const row = await connection(TABLE).where({ id }).first();
      return mapRow(row);
    }

    const row = await connection(TABLE).where({ id }).first();
    if (!row) {
      return null;
    }

    const currentRecognized = toNumber(row.recognized_amount_cents);
    if (currentRecognized <= 0) {
      return mapRow(row);
    }

    const applied = Math.min(currentRecognized, amountToReduce);
    if (applied <= 0) {
      return mapRow(row);
    }

    const updatedMetadata = appendAdjustmentMetadata(row, {
      ...adjustment,
      type: adjustment.type ?? 'refund.recognized',
      amountCents: applied
    });

    const currentTotal = toNumber(row.amount_cents);
    const updatedTotal = Math.max(0, currentTotal - applied);
    const updatedRecognized = Math.max(0, currentRecognized - applied);

    await connection(TABLE)
      .where({ id })
      .update({
        amount_cents: updatedTotal,
        recognized_amount_cents: updatedRecognized,
        recognized_at: updatedRecognized > 0 ? row.recognized_at : null,
        status: updatedTotal > 0 ? row.status : 'recognized',
        metadata: JSON.stringify(updatedMetadata),
        updated_at: connection.fn.now()
      });

    const updatedRow = await connection(TABLE).where({ id }).first();
    return mapRow(updatedRow);
  }

  static async reducePendingAmount(id, reductionCents, adjustment = {}, connection = db) {
    const amountToReduce = toNumber(reductionCents);
    if (amountToReduce <= 0) {
      const row = await connection(TABLE).where({ id }).first();
      return mapRow(row);
    }

    const row = await connection(TABLE).where({ id }).first();
    if (!row) {
      return null;
    }

    const currentTotal = toNumber(row.amount_cents);
    const currentRecognized = toNumber(row.recognized_amount_cents);
    const available = Math.max(0, currentTotal - currentRecognized);
    if (available <= 0) {
      return mapRow(row);
    }

    const applied = Math.min(available, amountToReduce);
    if (applied <= 0) {
      return mapRow(row);
    }

    const updatedMetadata = appendAdjustmentMetadata(row, {
      ...adjustment,
      type: adjustment.type ?? 'refund.deferred',
      amountCents: applied
    });

    const updatedTotal = Math.max(0, currentTotal - applied);
    const updatedRecognized = Math.min(currentRecognized, updatedTotal);
    const updatedStatus = updatedTotal === 0 ? 'recognized' : row.status;

    await connection(TABLE)
      .where({ id })
      .update({
        amount_cents: updatedTotal,
        recognized_amount_cents: updatedRecognized,
        status: updatedStatus,
        metadata: JSON.stringify(updatedMetadata),
        updated_at: connection.fn.now()
      });

    const updatedRow = await connection(TABLE).where({ id }).first();
    return mapRow(updatedRow);
  }

  static async sumDeferredBalance({ tenantId }, connection = db) {
    const rows = await connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .andWhere('status', '!=', 'recognized')
      .sum({ total: 'amount_cents' })
      .sum({ recognized: 'recognized_amount_cents' });
    const deferred = toNumber(rows?.[0]?.total ?? 0) - toNumber(rows?.[0]?.recognized ?? 0);
    return deferred < 0 ? 0 : deferred;
  }

  static async sumDeferredBalanceByCurrency({ tenantId }, connection = db) {
    const rows = await connection(TABLE)
      .select('currency')
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global') })
      .andWhere('status', '!=', 'recognized')
      .sum({ total: 'amount_cents' })
      .sum({ recognized: 'recognized_amount_cents' })
      .groupBy('currency');

    return rows.reduce((accumulator, row) => {
      if (!row) {
        return accumulator;
      }

      const currency = (row.currency ?? '').toString().trim().toUpperCase() || 'GBP';
      const total = toNumber(row.total ?? row.amount_cents ?? 0);
      const recognized = toNumber(row.recognized ?? row.recognized_amount_cents ?? 0);
      const deferred = Math.max(0, total - recognized);
      accumulator[currency] = deferred;
      return accumulator;
    }, {});
  }

  static async sumRecognizedForWindow({ tenantId, start, end }, connection = db) {
    const query = connection(TABLE)
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global'), status: 'recognized' })
      .sum({ total: 'recognized_amount_cents' });

    if (start) {
      query.andWhere('recognized_at', '>=', start);
    }
    if (end) {
      query.andWhere('recognized_at', '<=', end);
    }

    const [row] = await query;
    return toNumber(row?.total ?? 0);
  }

  static async sumRecognizedForWindowByCurrency({ tenantId, start, end }, connection = db) {
    const query = connection(TABLE)
      .select('currency')
      .where({ tenant_id: normaliseTenantId(tenantId ?? 'global'), status: 'recognized' })
      .sum({ total: 'recognized_amount_cents' })
      .groupBy('currency');

    if (start) {
      query.andWhere('recognized_at', '>=', start);
    }
    if (end) {
      query.andWhere('recognized_at', '<=', end);
    }

    const rows = await query;
    return rows.reduce((accumulator, row) => {
      if (!row) {
        return accumulator;
      }
      const currency = (row.currency ?? '').toString().trim().toUpperCase() || 'GBP';
      accumulator[currency] = toNumber(row.total ?? row.recognized_amount_cents ?? 0);
      return accumulator;
    }, {});
  }

  static toDomain(row) {
    return mapRow(row);
  }

  static hydrate(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    return rows.map(mapRow);
  }

  static async distinctTenants(connection = db) {
    const rows = await connection(TABLE).distinct({ tenantId: 'tenant_id' });
    return rows
      .map((row) => normaliseTenantId(row.tenantId))
      .filter((tenantId, index, list) => tenantId && list.indexOf(tenantId) === index);
  }
}

