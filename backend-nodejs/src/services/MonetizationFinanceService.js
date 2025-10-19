import db from '../config/database.js';
import logger from '../config/logger.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';
import PaymentLedgerEntryModel from '../models/PaymentLedgerEntryModel.js';
import MonetizationCatalogItemModel from '../models/MonetizationCatalogItemModel.js';
import MonetizationUsageRecordModel from '../models/MonetizationUsageRecordModel.js';
import MonetizationRevenueScheduleModel from '../models/MonetizationRevenueScheduleModel.js';
import MonetizationReconciliationRunModel from '../models/MonetizationReconciliationRunModel.js';
import { applyTenantMetadataScope } from '../database/utils/tenantMetadataScope.js';
import {
  updateMonetizationCatalogMetrics,
  recordMonetizationUsage,
  recordRevenueRecognition,
  updateDeferredRevenueBalance
} from '../observability/metrics.js';

const serviceLogger = logger.child({ module: 'monetization-finance-service' });

function normaliseTenantId(tenantId) {
  if (!tenantId) {
    return 'global';
  }
  return String(tenantId).trim().toLowerCase() || 'global';
}

function normaliseProductCode(value, fallback) {
  const source = value ?? fallback;
  if (!source) {
    return null;
  }
  return String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '-');
}

function coercePositiveInteger(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.round(numeric);
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

function addDays(isoDate, days) {
  const base = isoDate ? new Date(isoDate) : new Date();
  const clone = new Date(base.getTime());
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone.toISOString();
}

function normalisePaymentItems(items, fallback) {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      {
        id: fallback?.entityId ?? fallback?.publicId ?? 'unclassified',
        name: fallback?.metadata?.entityName ?? fallback?.entityType ?? 'Unclassified item',
        quantity: 1,
        unitAmount: coercePositiveInteger(fallback?.amountTotal ?? 0),
        total: coercePositiveInteger(fallback?.amountTotal ?? 0),
        currency: fallback?.currency ?? 'GBP',
        metadata: fallback?.metadata ?? {}
      }
    ];
  }

  return items.map((item, index) => {
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
    const unitAmount = coercePositiveInteger(item.unitAmount ?? Math.round((item.total ?? 0) / quantity));
    const total = coercePositiveInteger(item.total ?? unitAmount * quantity);
    return {
      id: item.id ?? `line-${index + 1}`,
      name: item.name ?? `Line item ${index + 1}`,
      quantity,
      unitAmount,
      total,
      currency: item.currency ?? fallback?.currency ?? 'GBP',
      discount: coercePositiveInteger(item.discount ?? 0),
      tax: coercePositiveInteger(item.tax ?? 0),
      metadata: item.metadata ?? {}
    };
  });
}

function deriveRecognitionStrategy(catalogItem, itemMetadata = {}) {
  const method = itemMetadata.revenueRecognitionMethod ?? catalogItem?.revenueRecognitionMethod ?? 'immediate';
  const normalizedMethod = ['immediate', 'deferred', 'schedule'].includes(method) ? method : 'immediate';

  const duration = coercePositiveInteger(
    itemMetadata.recognitionDurationDays ?? catalogItem?.recognitionDurationDays ?? 0
  );

  return {
    method: normalizedMethod,
    durationDays: duration,
    recognitionStart: itemMetadata.recognitionStart ?? null,
    recognitionEnd: itemMetadata.recognitionEnd ?? null
  };
}

async function refreshCatalogMetrics(connection = db) {
  const counts = await MonetizationCatalogItemModel.touchMetrics(connection);
  updateMonetizationCatalogMetrics(counts);
}

async function refreshDeferredBalance(tenantId, connection = db) {
  const balance = await MonetizationRevenueScheduleModel.sumDeferredBalance({ tenantId }, connection);
  updateDeferredRevenueBalance({ tenantId, balanceCents: balance });
}

async function resolveUsageRecords({
  tenantId,
  usageRecordIds = [],
  usageExternalRefs = [],
  paymentIntentId,
  connection
}) {
  const resolved = [];

  for (const id of usageRecordIds) {
    if (!id) continue; // eslint-disable-line no-continue
    try {
      const updated = await MonetizationUsageRecordModel.markProcessed(id, paymentIntentId, connection);
      if (updated) {
        resolved.push(updated);
      }
    } catch (error) {
      serviceLogger.warn({ err: error, usageRecordId: id }, 'Failed to mark usage record as processed');
    }
  }

  if (usageExternalRefs.length > 0) {
    const rows = await connection('monetization_usage_records')
      .where({ tenant_id: tenantId })
      .whereIn('external_reference', usageExternalRefs);
    // eslint-disable-next-line no-restricted-syntax
    for (const row of rows) {
      const updated = await MonetizationUsageRecordModel.markProcessed(row.id, paymentIntentId, connection);
      if (updated) {
        resolved.push(updated);
      }
    }
  }

  return resolved;
}

class MonetizationFinanceService {
  static async upsertCatalogItem(payload, connection = db) {
    if (!payload?.productCode) {
      throw new Error('productCode is required to create or update a catalog item');
    }

    const tenantId = normaliseTenantId(payload.tenantId);
    const productCode = normaliseProductCode(payload.productCode);
    return connection.transaction(async (trx) => {
      const existing = await MonetizationCatalogItemModel.findByProductCode(tenantId, productCode, trx);
      let record;
      if (existing) {
        record = await MonetizationCatalogItemModel.updateById(existing.id, { ...payload, tenantId }, trx);
      } else {
        record = await MonetizationCatalogItemModel.create({ ...payload, tenantId, productCode }, trx);
      }

      await refreshCatalogMetrics(trx);
      return record;
    });
  }

  static async listCatalogItems(params = {}, connection = db) {
    return MonetizationCatalogItemModel.list(params, connection);
  }

  static async recordUsageEvent(event, connection = db) {
    if (!event?.accountReference) {
      throw new Error('accountReference is required to record usage');
    }

    if (!event?.productCode && !event?.metadata?.productCode) {
      throw new Error('productCode is required to record usage');
    }

    const tenantId = normaliseTenantId(event.tenantId);
    const productCode = normaliseProductCode(event.productCode ?? event.metadata?.productCode);

    const payload = {
      ...event,
      tenantId,
      productCode,
      catalogItemId: event.catalogItemId ?? null
    };

    const record = await MonetizationUsageRecordModel.upsertByExternalReference(payload, connection);
    recordMonetizationUsage({
      productCode,
      source: event.source ?? 'manual',
      currency: event.currency ?? 'GBP',
      amountCents: record.amountCents
    });
    return record;
  }

  static async ensureCatalogItem({ tenantId, item, connection }) {
    const candidateCodes = [
      item.metadata?.catalogItemCode,
      item.metadata?.productCode,
      item.id,
      item.name
    ].map((code) => normaliseProductCode(code)).filter(Boolean);

    let catalogItem = null;
    // eslint-disable-next-line no-restricted-syntax
    for (const code of candidateCodes) {
      catalogItem = await MonetizationCatalogItemModel.findByProductCode(tenantId, code, connection);
      if (catalogItem) {
        break;
      }
    }

    if (catalogItem) {
      return catalogItem;
    }

    const autoCode = candidateCodes[0] ?? normaliseProductCode(`auto-${item.id ?? item.name}`);
    const recognitionMethod = item.metadata?.revenueRecognitionMethod ?? 'deferred';
    const duration = coercePositiveInteger(
      item.metadata?.recognitionDurationDays ?? (item.metadata?.billingInterval === 'annual' ? 365 : 30)
    );

    const created = await MonetizationCatalogItemModel.create(
      {
        tenantId,
        productCode: autoCode,
        name: item.name ?? 'Unclassified item',
        description:
          item.metadata?.description ??
          'Auto-provisioned from payment capture. Review configuration for accurate revenue policies.',
        pricingModel: item.metadata?.pricingModel ?? 'flat_fee',
        billingInterval: item.metadata?.billingInterval ?? 'monthly',
        revenueRecognitionMethod: recognitionMethod,
        recognitionDurationDays: recognitionMethod === 'deferred' ? duration : 0,
        unitAmountCents: coercePositiveInteger(item.unitAmount ?? 0),
        currency: item.currency ?? 'GBP',
        usageMetric: item.metadata?.usageMetric ?? null,
        status: item.metadata?.autoActivate === false ? 'draft' : 'active',
        metadata: {
          ...item.metadata,
          provisionedFromPayment: true,
          originalLineItemId: item.id
        }
      },
      connection
    );

    serviceLogger.info({ tenantId, productCode: created.productCode }, 'Auto-provisioned catalog item');
    return created;
  }

  static buildRecognitionPlan({ catalogItem, item, capturedAt }) {
    const strategy = deriveRecognitionStrategy(catalogItem, item.metadata);
    const amount = coercePositiveInteger(item.total ?? item.unitAmount * item.quantity ?? 0);
    const start = toIsoDate(strategy.recognitionStart ?? capturedAt);

    if (strategy.method === 'immediate') {
      return {
        method: 'immediate',
        status: 'recognized',
        amount,
        recognizedAmount: amount,
        deferredAmount: 0,
        recognitionStart: start,
        recognitionEnd: start,
        recognizedAt: start
      };
    }

    const end = toIsoDate(strategy.recognitionEnd ?? addDays(start, strategy.durationDays || 30));

    if (strategy.method === 'schedule' && item.metadata?.recognitionEnd) {
      return {
        method: 'schedule',
        status: 'pending',
        amount,
        recognizedAmount: 0,
        deferredAmount: amount,
        recognitionStart: start,
        recognitionEnd: toIsoDate(item.metadata.recognitionEnd)
      };
    }

    return {
      method: 'deferred',
      status: 'pending',
      amount,
      recognizedAmount: 0,
      deferredAmount: amount,
      recognitionStart: start,
      recognitionEnd: end
    };
  }

  static async handlePaymentCaptured(intentLike, connection = db) {
    const payment =
      typeof intentLike === 'string'
        ? await PaymentIntentModel.findByPublicId(intentLike, connection)
        : intentLike;

    if (!payment) {
      throw new Error('Payment intent not found for monetization capture handling');
    }

    const tenantId = normaliseTenantId(payment.metadata?.tenantId ?? payment.metadata?.tenant ?? 'global');
    const items = normalisePaymentItems(payment.metadata?.items, payment);
    const capturedAt = payment.capturedAt ?? new Date().toISOString();
    const schedules = [];

    await connection.transaction(async (trx) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const item of items) {
        const catalogItem = await this.ensureCatalogItem({ tenantId, item, connection: trx });
        const plan = this.buildRecognitionPlan({ catalogItem, item, capturedAt });

        const usageRecords = await resolveUsageRecords({
          tenantId,
          usageRecordIds: item.metadata?.usageRecordIds ?? [],
          usageExternalRefs: item.metadata?.usageExternalReferences ?? [],
          paymentIntentId: payment.id,
          connection: trx
        });

        const schedule = await MonetizationRevenueScheduleModel.create(
          {
            tenantId,
            paymentIntentId: payment.id,
            catalogItemId: catalogItem?.id ?? null,
            usageRecordId: usageRecords[0]?.id ?? null,
            productCode: catalogItem?.productCode ?? normaliseProductCode(item.id ?? item.name),
            status: plan.status,
            recognitionMethod: plan.method,
            recognitionStart: plan.recognitionStart,
            recognitionEnd: plan.recognitionEnd,
            amountCents: plan.amount,
            recognizedAmountCents: plan.recognizedAmount,
            currency: payment.currency,
            revenueAccount: catalogItem?.revenueAccount ?? '4000-education-services',
            deferredRevenueAccount: catalogItem?.deferredRevenueAccount ?? '2050-deferred-revenue',
            recognizedAt: plan.recognizedAt ?? null,
            metadata: {
              source: 'payment-capture',
              paymentPublicId: payment.publicId,
              lineItemId: item.id,
              quantity: item.quantity,
              autoProvisionedCatalog: !catalogItem,
              usageRecordIds: usageRecords.map((record) => record.id)
            }
          },
          trx
        );

        schedules.push(schedule);

        if (plan.deferredAmount > 0) {
          await PaymentLedgerEntryModel.record(
            {
              paymentIntentId: payment.id,
              entryType: 'revenue.deferred',
              amount: plan.deferredAmount,
              currency: payment.currency,
              details: {
                scheduleId: schedule.id,
                productCode: schedule.productCode,
                method: plan.method,
                capturedAt
              }
            },
            trx
          );
        }

        if (plan.recognizedAmount > 0) {
          await PaymentLedgerEntryModel.record(
            {
              paymentIntentId: payment.id,
              entryType: 'revenue.recognized',
              amount: plan.recognizedAmount,
              currency: payment.currency,
              details: {
                scheduleId: schedule.id,
                productCode: schedule.productCode,
                method: plan.method,
                capturedAt
              }
            },
            trx
          );
          recordRevenueRecognition({
            productCode: schedule.productCode,
            currency: payment.currency,
            method: plan.method,
            amountCents: plan.recognizedAmount
          });
        }
      }

      await refreshDeferredBalance(tenantId, trx);
    });

    await refreshCatalogMetrics(connection);
    return { schedules };
  }

  static async recognizeDeferredRevenue({ tenantId = 'global', asOf = new Date().toISOString(), limit = 200 } = {}) {
    const normalizedTenant = normaliseTenantId(tenantId);
    const dueSchedules = await MonetizationRevenueScheduleModel.listDueForRecognition(
      { tenantId: normalizedTenant, asOf, limit },
      db
    );

    if (dueSchedules.length === 0) {
      return { status: 'idle', processed: 0, amount: 0 };
    }

    let recognizedTotal = 0;

    await db.transaction(async (trx) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const schedule of dueSchedules) {
        await MonetizationRevenueScheduleModel.markInProgress(schedule.id, trx);
        const recognized = await MonetizationRevenueScheduleModel.markRecognized(
          schedule.id,
          { recognizedAt: asOf, amountCents: schedule.amountCents },
          trx
        );

        recognizedTotal += recognized.recognizedAmountCents;

        await PaymentLedgerEntryModel.record(
          {
            paymentIntentId: recognized.paymentIntentId,
            entryType: 'revenue.deferred-release',
            amount: recognized.recognizedAmountCents,
            currency: recognized.currency,
            details: {
              scheduleId: recognized.id,
              productCode: recognized.productCode,
              method: recognized.recognitionMethod,
              recognizedAt: recognized.recognizedAt
            }
          },
          trx
        );

        await PaymentLedgerEntryModel.record(
          {
            paymentIntentId: recognized.paymentIntentId,
            entryType: 'revenue.recognized',
            amount: recognized.recognizedAmountCents,
            currency: recognized.currency,
            details: {
              scheduleId: recognized.id,
              productCode: recognized.productCode,
              method: recognized.recognitionMethod,
              recognizedAt: recognized.recognizedAt
            }
          },
          trx
        );

        recordRevenueRecognition({
          productCode: recognized.productCode,
          currency: recognized.currency,
          method: recognized.recognitionMethod,
          amountCents: recognized.recognizedAmountCents
        });
      }

      await refreshDeferredBalance(normalizedTenant, trx);
    });

    return { status: 'recognized', processed: dueSchedules.length, amount: recognizedTotal };
  }

  static async runReconciliation({ tenantId = 'global', start, end } = {}, connection = db) {
    const normalizedTenant = normaliseTenantId(tenantId);
    const windowStart = toIsoDate(start ?? new Date(new Date().setUTCHours(0, 0, 0, 0)));
    const windowEnd = toIsoDate(end ?? new Date());

    const paymentsQuery = connection('payment_intents')
      .where({ status: 'succeeded' })
      .andWhereNotNull('captured_at')
      .andWhere('captured_at', '>=', windowStart)
      .andWhere('captured_at', '<=', windowEnd)
      .sum({ total: 'amount_total' });

    applyTenantMetadataScope(paymentsQuery, normalizedTenant, connection);

    const [paymentsRow] = await paymentsQuery;
    const invoicedCents = coercePositiveInteger(paymentsRow?.total ?? 0);

    const usageCents = await MonetizationUsageRecordModel.sumForWindow(
      { tenantId: normalizedTenant, start: windowStart, end: windowEnd },
      connection
    );
    const recognizedCents = await MonetizationRevenueScheduleModel.sumRecognizedForWindow(
      { tenantId: normalizedTenant, start: windowStart, end: windowEnd },
      connection
    );
    const deferredCents = await MonetizationRevenueScheduleModel.sumDeferredBalance(
      { tenantId: normalizedTenant },
      connection
    );

    const varianceCents = recognizedCents - invoicedCents;
    const varianceRatio = invoicedCents > 0 ? Number((varianceCents / invoicedCents).toFixed(4)) : 0;

    const run = await MonetizationReconciliationRunModel.create(
      {
        tenantId: normalizedTenant,
        windowStart,
        windowEnd,
        status: 'completed',
        invoicedCents,
        usageCents,
        recognizedCents,
        deferredCents,
        varianceCents,
        varianceRatio,
        metadata: {
          reconciliationMethod: 'automated',
          generatedAt: new Date().toISOString()
        }
      },
      connection
    );

    updateDeferredRevenueBalance({ tenantId: normalizedTenant, balanceCents: deferredCents });

    return run;
  }

  static async listRevenueSchedules({ paymentIntentId, tenantId, status, limit = 50, offset = 0 } = {}) {
    const normalizedTenant = normaliseTenantId(tenantId ?? 'global');
    const query = db('monetization_revenue_schedules')
      .where({ tenant_id: normalizedTenant })
      .orderBy('recognition_start', 'desc')
      .limit(Math.min(limit, 200))
      .offset(Math.max(offset, 0));

    if (paymentIntentId) {
      query.andWhere({ payment_intent_id: paymentIntentId });
    }
    if (status) {
      query.andWhere({ status });
    }

    const rows = await query;
    return MonetizationRevenueScheduleModel.hydrate(rows);
  }

  static async listReconciliationRuns(params = {}, connection = db) {
    return MonetizationReconciliationRunModel.list(params, connection);
  }

  static async latestReconciliation(params = {}, connection = db) {
    return MonetizationReconciliationRunModel.latest(params, connection);
  }

  static async listActiveTenants(connection = db) {
    const [catalogTenants, usageTenants, scheduleTenants, reconciliationTenants] = await Promise.all([
      MonetizationCatalogItemModel.distinctTenants(connection),
      MonetizationUsageRecordModel.distinctTenants(connection),
      MonetizationRevenueScheduleModel.distinctTenants(connection),
      MonetizationReconciliationRunModel.distinctTenants(connection)
    ]);

    const tenants = new Set([
      ...catalogTenants,
      ...usageTenants,
      ...scheduleTenants,
      ...reconciliationTenants
    ]);

    if (tenants.size === 0) {
      tenants.add('global');
    }

    return Array.from(tenants)
      .filter(Boolean)
      .map(normaliseTenantId)
      .sort();
  }
}

export default MonetizationFinanceService;

