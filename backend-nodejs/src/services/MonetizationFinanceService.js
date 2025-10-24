import { createHash, randomUUID } from 'node:crypto';

import db from '../config/database.js';
import { env } from '../config/env.js';
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
  recordRevenueReversal,
  updateDeferredRevenueBalance
} from '../observability/metrics.js';
import MonetizationAlertNotificationService from './MonetizationAlertNotificationService.js';
import { normalizeCurrencyCode } from '../utils/currency.js';

const serviceLogger = logger.child({ module: 'monetization-finance-service' });
const alertNotifier = new MonetizationAlertNotificationService();

const RECONCILIATION_SEVERITY_RANK = Object.freeze({
  normal: 0,
  low: 1,
  medium: 2,
  high: 3
});

function resolveReconciliationThresholds() {
  const config = env.monetization?.reconciliation ?? {};
  const varianceAlertBps = Number.isFinite(config.varianceAlertBps) ? config.varianceAlertBps : 250;
  const varianceCriticalBps = Number.isFinite(config.varianceCriticalBps)
    ? config.varianceCriticalBps
    : Math.max(varianceAlertBps * 2, 400);
  const usageVarianceAlertBps = Number.isFinite(config.usageVarianceAlertBps)
    ? config.usageVarianceAlertBps
    : 200;
  const minimumInvoicedCents = Number.isFinite(config.minimumInvoicedCents) ? config.minimumInvoicedCents : 5000;
  const alertCooldownMinutes = Number.isFinite(config.alertCooldownMinutes) ? config.alertCooldownMinutes : 120;

  return {
    varianceAlertBps,
    varianceCriticalBps,
    usageVarianceAlertBps,
    minimumInvoicedCents,
    alertCooldownMinutes
  };
}

function computeAlertDigest(alerts = []) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }
  const hash = createHash('sha1');
  for (const alert of alerts) {
    hash.update(JSON.stringify({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details ?? null
    }));
  }
  return hash.digest('hex');
}

function minutesBetweenDates(start, end) {
  if (!start || !end) {
    return Number.POSITIVE_INFINITY;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(endDate.getTime() - startDate.getTime()) / 60000;
}

function shouldDispatchNotifications({ evaluation, previousRun, digest }) {
  if (!evaluation || !Array.isArray(evaluation.alerts) || evaluation.alerts.length === 0) {
    return false;
  }

  if (!previousRun) {
    return true;
  }

  const previousMetadata = previousRun.metadata ?? {};
  const previousSeverity = previousMetadata.severity ?? previousMetadata.alertSeverity ?? 'normal';
  const previousDigest = previousMetadata.alertDigest ?? previousMetadata.notifications?.lastDigest ?? null;
  const previousSentAt = previousMetadata.notifications?.lastSentAt ?? null;

  const severityRank = RECONCILIATION_SEVERITY_RANK[evaluation.severity] ?? 0;
  const previousRank = RECONCILIATION_SEVERITY_RANK[previousSeverity] ?? 0;

  if (severityRank > previousRank) {
    return true;
  }

  if (digest && digest !== previousDigest) {
    return true;
  }

  const cooldownMinutes = Number.isFinite(evaluation.thresholds?.alertCooldownMinutes)
    ? evaluation.thresholds.alertCooldownMinutes
    : resolveReconciliationThresholds().alertCooldownMinutes;

  const elapsed = minutesBetweenDates(previousSentAt, new Date().toISOString());
  return elapsed >= cooldownMinutes;
}

function normaliseCurrencyCode(value, fallback = 'GBP') {
  return normalizeCurrencyCode(value, fallback ?? env.payments?.defaultCurrency ?? 'USD');
}

async function processReconciliationNotifications({ run, evaluation, previousRun, digest, connection }) {
  if (!run || !evaluation || !Array.isArray(evaluation.alerts) || evaluation.alerts.length === 0) {
    return run;
  }

  const notifierConfig = env.monetization?.reconciliation?.notifications ?? {};
  const hasChannels =
    typeof alertNotifier.hasChannels === 'function'
      ? alertNotifier.hasChannels()
      : Boolean(notifierConfig.emailRecipients?.length);

  if (!hasChannels) {
    return run;
  }

  const dispatchRequired = shouldDispatchNotifications({ evaluation, previousRun, digest });
  if (!dispatchRequired) {
    return run;
  }

  try {
    const dispatchResult = await alertNotifier.dispatch({ run, evaluation, digest });
    if (!dispatchResult || !Array.isArray(dispatchResult.channels) || dispatchResult.channels.length === 0) {
      return run;
    }

    const sentAt = dispatchResult.sentAt ?? new Date().toISOString();
    const channels = Array.from(new Set(dispatchResult.channels));
    const recipients = dispatchResult.recipients ?? {};

    const updatedRun = await MonetizationReconciliationRunModel.updateMetadata(
      run.id,
      (metadata = {}) => ({
        ...metadata,
        alertDigest: digest ?? metadata.alertDigest ?? null,
        notifications: {
          ...(metadata.notifications ?? {}),
          lastSentAt: sentAt,
          lastDigest: digest ?? metadata.notifications?.lastDigest ?? null,
          channels,
          recipients
        }
      }),
      connection
    );

    return updatedRun ?? run;
  } catch (error) {
    serviceLogger.error({ err: error, runId: run.id }, 'Failed to dispatch monetization reconciliation alerts');
    return run;
  }
}

function sanitiseOperatorName(name) {
  if (typeof name !== 'string') {
    return null;
  }
  const trimmed = name.trim();
  return trimmed.length ? trimmed.slice(0, 120) : null;
}

function sanitiseOperatorEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }
  const trimmed = email.trim();
  return trimmed.length <= 180 ? trimmed.toLowerCase() : trimmed.slice(0, 180).toLowerCase();
}

function sanitiseChannel(channel) {
  if (typeof channel !== 'string') {
    return 'manual';
  }
  const trimmed = channel.trim().toLowerCase();
  return trimmed.length ? trimmed.slice(0, 40) : 'manual';
}

function sanitiseNote(note) {
  if (typeof note !== 'string') {
    return null;
  }
  const trimmed = note.trim();
  if (!trimmed.length) {
    return null;
  }
  return trimmed.slice(0, 500);
}

function buildAcknowledgement(payload = {}) {
  return {
    id: payload.id ?? randomUUID(),
    acknowledgedAt: payload.acknowledgedAt ?? new Date().toISOString(),
    operatorId: payload.operatorId ?? null,
    operatorName: sanitiseOperatorName(payload.operatorName ?? payload.operator?.name),
    operatorEmail: sanitiseOperatorEmail(payload.operatorEmail ?? payload.operator?.email),
    channel: sanitiseChannel(payload.channel),
    note: sanitiseNote(payload.note)
  };
}

function formatAcknowledgements(metadata = {}) {
  const entries = Array.isArray(metadata.acknowledgements) ? metadata.acknowledgements : [];
  return entries
    .map((entry) => ({
      id: entry.id ?? null,
      acknowledgedAt: entry.acknowledgedAt ?? null,
      operatorId: entry.operatorId ?? null,
      operatorName: entry.operatorName ?? null,
      operatorEmail: entry.operatorEmail ?? null,
      channel: entry.channel ?? 'manual',
      note: entry.note ?? null
    }))
    .filter((entry) => entry.acknowledgedAt);
}

function formatNotificationMetadata(metadata = {}) {
  const notifications = metadata.notifications ?? null;
  if (!notifications) {
    return null;
  }

  return {
    lastSentAt: notifications.lastSentAt ?? null,
    lastDigest: notifications.lastDigest ?? null,
    channels: Array.isArray(notifications.channels) ? notifications.channels : [],
    recipients: notifications.recipients ?? {}
  };
}

function calculateBps(delta, denominator, minimum) {
  const base = Math.max(Math.abs(Number(denominator ?? 0)), minimum ?? 1);
  if (!Number.isFinite(base) || base <= 0) {
    return 0;
  }
  const ratio = Number(delta ?? 0) / base;
  if (!Number.isFinite(ratio)) {
    return 0;
  }
  return Math.round(ratio * 10_000);
}

function elevateSeverity(current, candidate) {
  const currentRank = RECONCILIATION_SEVERITY_RANK[current] ?? 0;
  const candidateRank = RECONCILIATION_SEVERITY_RANK[candidate] ?? 0;
  return candidateRank > currentRank ? candidate : current;
}

function buildVarianceMessage(bps, direction) {
  const percentage = Math.abs(bps) / 100;
  const descriptor = direction === 'above' ? 'above' : 'below';
  return `Recognized revenue is ${descriptor} invoiced totals by ${percentage.toFixed(2)}%.`;
}

function evaluateReconciliationOutcome({ invoicedCents, recognizedCents, usageCents, deferredCents }) {
  const thresholds = resolveReconciliationThresholds();
  const alerts = [];
  const varianceCents = Number(recognizedCents ?? 0) - Number(invoicedCents ?? 0);
  const usageVarianceCents = Number(usageCents ?? 0) - Number(invoicedCents ?? 0);
  const varianceBps = calculateBps(varianceCents, invoicedCents, thresholds.minimumInvoicedCents);
  const usageVarianceBps = calculateBps(usageVarianceCents, invoicedCents, thresholds.minimumInvoicedCents);

  let severity = 'normal';

  if (Math.abs(varianceBps) >= thresholds.varianceAlertBps) {
    const direction = varianceCents >= 0 ? 'above' : 'below';
    const alertSeverity = Math.abs(varianceBps) >= thresholds.varianceCriticalBps ? 'high' : 'medium';
    severity = elevateSeverity(severity, alertSeverity);
    alerts.push({
      type: 'recognized_vs_invoiced',
      severity: alertSeverity,
      message: buildVarianceMessage(varianceBps, direction),
      suggestedAction:
        direction === 'above'
          ? 'Review revenue recognition schedules and confirm duplicate captures were not recorded.'
          : 'Investigate missing revenue schedules or delayed recognition for captured invoices.',
      details: {
        varianceCents,
        varianceBps
      }
    });
  }

  if (Math.abs(usageVarianceBps) >= thresholds.usageVarianceAlertBps) {
    const usageSeverity = Math.abs(usageVarianceBps) >= thresholds.varianceCriticalBps ? 'high' : 'medium';
    severity = elevateSeverity(severity, usageSeverity);
    alerts.push({
      type: 'usage_vs_invoiced',
      severity: usageSeverity,
      message:
        usageVarianceCents >= 0
          ? 'Usage billing exceeds captured invoices within the window.'
          : 'Captured invoices exceed recorded usage within the window.',
      suggestedAction:
        usageVarianceCents >= 0
          ? 'Verify usage aggregation and ensure invoices are generated for the recorded consumption.'
          : 'Check whether usage events failed to ingest or were reconciled late.',
      details: {
        varianceCents: usageVarianceCents,
        varianceBps: usageVarianceBps
      }
    });
  }

  if (Number(deferredCents ?? 0) < 0) {
    severity = elevateSeverity(severity, 'high');
    alerts.push({
      type: 'deferred_balance_negative',
      severity: 'high',
      message: 'Deferred revenue balance is negative; schedules may have been reversed incorrectly.',
      suggestedAction: 'Audit recent manual adjustments and ensure reversal entries are applied to the correct period.',
      details: {
        deferredCents: Number(deferredCents ?? 0)
      }
    });
  }

  return {
    status: alerts.length > 0 ? 'attention' : 'completed',
    severity,
    varianceBps,
    usageVarianceBps,
    usageVarianceCents,
    alerts,
    thresholds
  };
}

function resolveConnection(connection) {
  return connection ?? db;
}

function isQueryableConnection(connection) {
  return (
    typeof connection === 'function' ||
    typeof connection?.select === 'function' ||
    typeof connection?.from === 'function' ||
    typeof connection?.queryBuilder === 'function'
  );
}

async function runWithTransaction(connection, handler) {
  const resolved = resolveConnection(connection);
  if (resolved?.isTransaction?.()) {
    const connectionLike = typeof resolved === 'function' ? resolved : null;
    return handler(connectionLike);
  }
  if (typeof resolved?.transaction === 'function') {
    return resolved.transaction(async (trx) => handler(trx));
  }
  return handler(resolved);
}

function getQueryConnection(connection) {
  const resolved = resolveConnection(connection);
  if (!resolved) {
    return null;
  }

  if (isQueryableConnection(resolved)) {
    return resolved;
  }

  if (resolved?.isTransaction?.() && typeof resolved !== 'function') {
    const fallback = resolveConnection();
    return isQueryableConnection(fallback) ? fallback : null;
  }

  if (typeof resolved?.transaction === 'function') {
    const fallback = resolveConnection();
    return isQueryableConnection(fallback) ? fallback : null;
  }

  return null;
}

function resolveModelConnection(connection) {
  const queryConnection = getQueryConnection(connection);
  if (queryConnection) {
    return { connection: queryConnection, isQueryable: true };
  }

  const resolved = resolveConnection(connection);
  if (!resolved) {
    return { connection: null, isQueryable: false };
  }

  return { connection: resolved, isQueryable: isQueryableConnection(resolved) };
}

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

function normaliseCurrency(value) {
  return normalizeCurrencyCode(value, env.payments?.defaultCurrency ?? 'USD');
}

function toCentInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric);
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

function calculateRevenueSummary(entries = []) {
  const summary = {
    grossCents: 0,
    netCents: 0,
    discountsCents: 0,
    refundsCents: 0,
    taxesCents: 0,
    feesCents: 0
  };

  for (const entry of entries) {
    const amount = coercePositiveInteger(entry.amountCents ?? entry.amount ?? 0);
    switch (entry.type) {
      case 'charge':
      case 'invoice':
        summary.grossCents += amount;
        break;
      case 'discount':
        summary.discountsCents += amount;
        break;
      case 'tax':
        summary.taxesCents += amount;
        break;
      case 'fee':
        summary.feesCents += amount;
        break;
      case 'refund':
        summary.refundsCents += amount;
        break;
      default:
        summary.netCents += entry.direction === 'credit' ? amount : -amount;
    }
  }

  summary.netCents += summary.grossCents - summary.discountsCents - summary.refundsCents - summary.feesCents;
  return summary;
}

async function refreshCatalogMetrics(connection = db) {
  const { connection: targetConnection } = resolveModelConnection(connection);
  if (!targetConnection) {
    return;
  }

  try {
    const counts = await MonetizationCatalogItemModel.touchMetrics(targetConnection);
    updateMonetizationCatalogMetrics(counts);
  } catch (error) {
    serviceLogger.warn({ err: error }, 'Failed to refresh monetization catalog metrics');
  }
}

async function refreshDeferredBalance(tenantId, connection = db) {
  const { connection: targetConnection } = resolveModelConnection(connection);
  if (!targetConnection) {
    return;
  }

  try {
    const balance = await MonetizationRevenueScheduleModel.sumDeferredBalance({ tenantId }, targetConnection);
    updateDeferredRevenueBalance({ tenantId, balanceCents: balance });
  } catch (error) {
    serviceLogger.warn({ err: error, tenantId }, 'Failed to refresh deferred revenue balance');
  }
}

async function resolveUsageRecords({
  tenantId,
  usageRecordIds = [],
  usageExternalRefs = [],
  paymentIntentId,
  connection
}) {
  const resolved = [];
  const queryConnection = getQueryConnection(connection);

  if (!queryConnection) {
    return resolved;
  }

  for (const id of usageRecordIds) {
    if (!id) continue;
    try {
      const updated = await MonetizationUsageRecordModel.markProcessed(
        id,
        paymentIntentId,
        queryConnection
      );
      if (updated) {
        resolved.push(updated);
      }
    } catch (error) {
      serviceLogger.warn({ err: error, usageRecordId: id }, 'Failed to mark usage record as processed');
    }
  }

  if (usageExternalRefs.length > 0) {
    const rows = await queryConnection('monetization_usage_records')
      .where({ tenant_id: tenantId })
      .whereIn('external_reference', usageExternalRefs);
    for (const row of rows) {
      const updated = await MonetizationUsageRecordModel.markProcessed(
        row.id,
        paymentIntentId,
        queryConnection
      );
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
    return runWithTransaction(connection, async (trx) => {
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
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return [];
    }
    return MonetizationCatalogItemModel.list(params, targetConnection);
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

    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return {
        id: null,
        tenantId,
        productCode,
        accountReference: event.accountReference,
        userId: event.userId ?? null,
        usageDate: event.usageDate ?? new Date().toISOString(),
        quantity: coercePositiveInteger(event.quantity ?? 0),
        unitAmountCents: coercePositiveInteger(event.unitAmountCents ?? 0),
        amountCents: coercePositiveInteger(event.amountCents ?? 0),
        currency: normaliseCurrencyCode(event.currency, 'GBP'),
        source: event.source ?? 'manual',
        externalReference: event.externalReference ?? null,
        paymentIntentId: event.paymentIntentId ?? null,
        metadata: event.metadata ?? {},
        recordedAt: new Date().toISOString(),
        processedAt: null
      };
    }

    const record = await MonetizationUsageRecordModel.upsertByExternalReference(payload, targetConnection);
    recordMonetizationUsage({
      productCode,
      source: event.source ?? 'manual',
      currency: normaliseCurrencyCode(event.currency, 'GBP'),
      amountCents: record.amountCents
    });
    return record;
  }

  static async ensureCatalogItem({ tenantId, item, connection }) {
    const { connection: modelConnection, isQueryable } = resolveModelConnection(connection);
    const candidateCodes = [
      item.metadata?.catalogItemCode,
      item.metadata?.productCode,
      item.id,
      item.name
    ]
      .map((code) => normaliseProductCode(code))
      .filter(Boolean);

    let catalogItem = null;
    if (modelConnection) {
      for (const code of candidateCodes) {
        try {
          catalogItem = await MonetizationCatalogItemModel.findByProductCode(tenantId, code, modelConnection);
        } catch (error) {
          if (isQueryable) {
            throw error;
          }

          serviceLogger.warn(
            { err: error, tenantId, code },
            'Failed to resolve catalog item with provided connection'
          );
          break;
        }

        if (catalogItem) {
          break;
        }
      }
    }

    if (catalogItem) {
      return catalogItem;
    }

    const autoCode = normaliseProductCode(candidateCodes[0] ?? item.id ?? item.name ?? 'auto-item');
    const recognitionMethod = item.metadata?.revenueRecognitionMethod ?? 'deferred';
    const duration = coercePositiveInteger(
      item.metadata?.recognitionDurationDays ?? (item.metadata?.billingInterval === 'annual' ? 365 : 30)
    );

    if (!modelConnection) {
      return {
        id: null,
        tenantId,
        productCode: autoCode,
        name: item.name ?? 'Unclassified item',
        description: item.metadata?.description ?? null,
        pricingModel: item.metadata?.pricingModel ?? 'flat_fee',
        billingInterval: item.metadata?.billingInterval ?? 'monthly',
        revenueRecognitionMethod: recognitionMethod,
        recognitionDurationDays: recognitionMethod === 'deferred' ? duration : 0,
        unitAmountCents: coercePositiveInteger(item.unitAmount ?? 0),
        currency: normaliseCurrencyCode(item.currency, 'GBP'),
        usageMetric: item.metadata?.usageMetric ?? null,
        revenueAccount: item.metadata?.revenueAccount ?? '4000-education-services',
        deferredRevenueAccount:
          item.metadata?.deferredRevenueAccount ?? '2050-deferred-revenue',
        metadata: {
          ...item.metadata,
          provisionedFromPayment: true,
          originalLineItemId: item.id
        },
        status: item.metadata?.autoActivate === false ? 'draft' : 'active'
      };
    }

    try {
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
        modelConnection
      );

      serviceLogger.info({ tenantId, productCode: created.productCode }, 'Auto-provisioned catalog item');
      return created;
    } catch (error) {
      if (isQueryable) {
        throw error;
      }

      serviceLogger.warn(
        { err: error, tenantId, productCode: autoCode },
        'Failed to create catalog item with provided connection, returning fallback'
      );

      return {
        id: null,
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
        currency: normaliseCurrencyCode(item.currency, 'GBP'),
        usageMetric: item.metadata?.usageMetric ?? null,
        revenueAccount: item.metadata?.revenueAccount ?? '4000-education-services',
        deferredRevenueAccount:
          item.metadata?.deferredRevenueAccount ?? '2050-deferred-revenue',
        metadata: {
          ...item.metadata,
          provisionedFromPayment: true,
          originalLineItemId: item.id
        },
        status: item.metadata?.autoActivate === false ? 'draft' : 'active'
      };
    }
  }

  static buildRecognitionPlan({ catalogItem, item, capturedAt }) {
    const strategy = deriveRecognitionStrategy(catalogItem, item.metadata);
    const computedTotal =
      item.total ??
      (Number.isFinite(Number(item.unitAmount)) && Number.isFinite(Number(item.quantity))
        ? Number(item.unitAmount) * Number(item.quantity)
        : 0);
    const amount = coercePositiveInteger(computedTotal ?? 0);
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

    await runWithTransaction(connection, async (trx) => {
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

        const schedulePayload = {
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
        };

        const scheduleConnection = getQueryConnection(trx);
        const { connection: ledgerConnection } = resolveModelConnection(trx);
        const writeConnection = scheduleConnection ??
          (typeof trx === 'function' || typeof trx?.select === 'function' || typeof trx?.from === 'function'
            ? trx
            : typeof trx === 'object' && trx !== null
              ? trx
              : null);

        let schedule;
        if (writeConnection) {
          try {
            schedule = await MonetizationRevenueScheduleModel.create(schedulePayload, writeConnection);
          } catch (error) {
            serviceLogger.warn(
              { err: error, tenantId, paymentIntentId: payment.id },
              'Failed to persist monetization schedule with provided connection'
            );
          }
        }

        if (!schedule) {
          schedule = {
            id: null,
            ...schedulePayload,
            metadata: schedulePayload.metadata,
            recognizedAmountCents: plan.recognizedAmount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }

        schedules.push(schedule);

        if (plan.deferredAmount > 0 && ledgerConnection) {
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
            ledgerConnection
          );
        }

        if (plan.recognizedAmount > 0 && ledgerConnection) {
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
            ledgerConnection
          );
        }

        if (plan.recognizedAmount > 0) {
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

  static async handleRefundProcessed(
    {
      paymentIntentId,
      amountCents,
      currency,
      tenantId,
      processedAt,
      reason,
      refundReference,
      source = 'unknown'
    } = {},
    connection = db
  ) {
    if (!paymentIntentId) {
      throw new Error('paymentIntentId is required to process a monetization refund');
    }

    const refundAmount = coercePositiveInteger(amountCents ?? 0);
    if (refundAmount <= 0) {
      return { status: 'ignored', adjustments: { recognized: [], deferred: [] }, unappliedCents: 0 };
    }

    const { connection: modelConnection } = resolveModelConnection(connection);
    if (!modelConnection) {
      serviceLogger.debug({ paymentIntentId }, 'Skipping monetization refund processing without queryable connection');
      return {
        status: 'connection-unavailable',
        adjustments: { recognized: [], deferred: [] },
        unappliedCents: refundAmount
      };
    }

    const normalizedTenant = normaliseTenantId(tenantId ?? 'global');
    const normalizedCurrency = normaliseCurrencyCode(currency, 'GBP');
    const appliedAt = toIsoDate(processedAt ?? new Date());

    const schedules = await MonetizationRevenueScheduleModel.listByPaymentIntent(
      paymentIntentId,
      modelConnection
    );

    if (!Array.isArray(schedules) || schedules.length === 0) {
      serviceLogger.warn({ paymentIntentId }, 'Refund processed without associated monetization schedules');
      return {
        status: 'no-schedules',
        adjustments: { recognized: [], deferred: [] },
        unappliedCents: refundAmount
      };
    }

    let remaining = refundAmount;
    const recognizedAdjustments = [];
    const deferredAdjustments = [];
    const adjustmentContext = {
      appliedAt,
      reason: reason ?? null,
      source: source ?? null,
      reference: refundReference ?? null
    };

    const recognizedSchedules = schedules
      .filter((schedule) => schedule.status === 'recognized' && schedule.recognizedAmountCents > 0)
      .sort((a, b) => {
        const aTime = a.recognizedAt ? new Date(a.recognizedAt).getTime() : 0;
        const bTime = b.recognizedAt ? new Date(b.recognizedAt).getTime() : 0;
        return bTime - aTime;
      });

    for (const schedule of recognizedSchedules) {
      if (remaining <= 0) {
        break;
      }

      const reduction = Math.min(coercePositiveInteger(schedule.recognizedAmountCents), remaining);
      if (reduction <= 0) {
        continue;
      }

      await MonetizationRevenueScheduleModel.reduceRecognizedAmount(
        schedule.id,
        reduction,
        adjustmentContext,
        modelConnection
      );

      recognizedAdjustments.push({
        scheduleId: schedule.id,
        productCode: schedule.productCode,
        amountCents: reduction
      });

      remaining -= reduction;

      await PaymentLedgerEntryModel.record(
        {
          paymentIntentId,
          entryType: 'revenue.refund-recognized',
          amount: reduction,
          currency: normalizedCurrency,
          details: {
            scheduleId: schedule.id,
            productCode: schedule.productCode,
            reason: reason ?? null,
            processedAt: appliedAt,
            refundReference: refundReference ?? null,
            source: source ?? null
          }
        },
        modelConnection
      );

      recordRevenueReversal({
        productCode: schedule.productCode,
        currency: normalizedCurrency,
        reason: reason ?? 'refund',
        amountCents: reduction
      });
    }

    const processedRecognizedIds = new Set(recognizedAdjustments.map((item) => item.scheduleId));

    if (remaining > 0) {
      const pendingSchedules = schedules
        .filter((schedule) => !processedRecognizedIds.has(schedule.id))
        .sort((a, b) => {
          const aTime = a.recognitionStart ? new Date(a.recognitionStart).getTime() : 0;
          const bTime = b.recognitionStart ? new Date(b.recognitionStart).getTime() : 0;
          return aTime - bTime;
        });

      for (const schedule of pendingSchedules) {
        if (remaining <= 0) {
          break;
        }

        const openAmount = Math.max(
          0,
          coercePositiveInteger(schedule.amountCents) - coercePositiveInteger(schedule.recognizedAmountCents)
        );
        if (openAmount <= 0) {
          continue;
        }

        const reduction = Math.min(openAmount, remaining);

        await MonetizationRevenueScheduleModel.reducePendingAmount(
          schedule.id,
          reduction,
          adjustmentContext,
          modelConnection
        );

        deferredAdjustments.push({
          scheduleId: schedule.id,
          productCode: schedule.productCode,
          amountCents: reduction
        });

        remaining -= reduction;

        await PaymentLedgerEntryModel.record(
          {
            paymentIntentId,
            entryType: 'revenue.refund-deferred',
            amount: reduction,
            currency: normalizedCurrency,
            details: {
              scheduleId: schedule.id,
              productCode: schedule.productCode,
              reason: reason ?? null,
              processedAt: appliedAt,
              refundReference: refundReference ?? null,
              source: source ?? null
            }
          },
          modelConnection
        );
      }
    }

    if (remaining > 0) {
      serviceLogger.warn(
        { paymentIntentId, refundAmountCents: refundAmount, unappliedCents: remaining },
        'Refund amount exceeded available monetization schedules'
      );
    }

    await refreshDeferredBalance(normalizedTenant, connection);

    serviceLogger.info(
      {
        paymentIntentId,
        tenantId: normalizedTenant,
        refundAmountCents: refundAmount,
        recognizedAdjustments,
        deferredAdjustments,
        unappliedCents: remaining
      },
      'Processed monetization refund adjustments'
    );

    return {
      status: 'processed',
      adjustments: {
        recognized: recognizedAdjustments,
        deferred: deferredAdjustments
      },
      unappliedCents: remaining
    };
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

  static async #buildCurrencyBreakdown({ tenantId, windowStart, windowEnd }, connection = db) {
    const queryConnection = getQueryConnection(connection);
    if (!queryConnection) {
      return [];
    }

    const normalizedTenant = normaliseTenantId(tenantId ?? 'global');
    const accumulators = new Map();

    const getAccumulator = (currency) => {
      const key = normaliseCurrency(currency);
      if (!accumulators.has(key)) {
        accumulators.set(key, {
          currency: key,
          invoicedCents: 0,
          recognizedCents: 0,
          usageCents: 0,
          deferredCents: 0
        });
      }
      return accumulators.get(key);
    };

    const paymentQuery = queryConnection('payment_intents as pi')
      .select({ currency: 'pi.currency' })
      .where({ 'pi.status': 'succeeded' })
      .andWhereNotNull('pi.captured_at')
      .groupBy('pi.currency')
      .sum({ total: 'pi.amount_total' });

    if (windowStart) {
      paymentQuery.andWhere('pi.captured_at', '>=', windowStart);
    }
    if (windowEnd) {
      paymentQuery.andWhere('pi.captured_at', '<=', windowEnd);
    }

    applyTenantMetadataScope(paymentQuery, normalizedTenant, queryConnection);

    const [paymentRows, usageRows, recognizedRows, deferredRows] = await Promise.all([
      paymentQuery,
      queryConnection('monetization_usage_records as mur')
        .select({ currency: 'mur.currency' })
        .where({ 'mur.tenant_id': normalizedTenant })
        .modify((builder) => {
          if (windowStart) {
            builder.andWhere('mur.usage_date', '>=', windowStart);
          }
          if (windowEnd) {
            builder.andWhere('mur.usage_date', '<=', windowEnd);
          }
        })
        .groupBy('mur.currency')
        .sum({ total: 'mur.amount_cents' }),
      queryConnection('monetization_revenue_schedules as mrs')
        .select({ currency: 'mrs.currency' })
        .where({ 'mrs.tenant_id': normalizedTenant, 'mrs.status': 'recognized' })
        .modify((builder) => {
          if (windowStart) {
            builder.andWhere('mrs.recognized_at', '>=', windowStart);
          }
          if (windowEnd) {
            builder.andWhere('mrs.recognized_at', '<=', windowEnd);
          }
        })
        .groupBy('mrs.currency')
        .sum({ total: 'mrs.recognized_amount_cents' }),
      queryConnection('monetization_revenue_schedules as mrs')
        .select({ currency: 'mrs.currency' })
        .where({ 'mrs.tenant_id': normalizedTenant })
        .andWhere('mrs.status', '!=', 'recognized')
        .groupBy('mrs.currency')
        .sum({ total: 'mrs.amount_cents' })
        .sum({ recognized: 'mrs.recognized_amount_cents' })
    ]);

    for (const row of paymentRows ?? []) {
      const accumulator = getAccumulator(row?.currency);
      accumulator.invoicedCents = toCentInteger(row?.total ?? 0);
    }

    for (const row of usageRows ?? []) {
      const accumulator = getAccumulator(row?.currency);
      accumulator.usageCents = toCentInteger(row?.total ?? 0);
    }

    for (const row of recognizedRows ?? []) {
      const accumulator = getAccumulator(row?.currency);
      accumulator.recognizedCents = toCentInteger(row?.total ?? 0);
    }

    for (const row of deferredRows ?? []) {
      const accumulator = getAccumulator(row?.currency);
      const total = toCentInteger(row?.total ?? 0);
      const recognized = toCentInteger(row?.recognized ?? 0);
      const deferred = Math.max(0, total - recognized);
      accumulator.deferredCents = deferred;
    }

    const breakdown = Array.from(accumulators.values()).map((entry) => {
      const varianceCents = entry.recognizedCents - entry.invoicedCents;
      const usageVarianceCents = entry.recognizedCents - entry.usageCents;
      const varianceBps = entry.invoicedCents
        ? Number(((varianceCents / entry.invoicedCents) * 10000).toFixed(2))
        : 0;
      const usageVarianceBps = entry.usageCents
        ? Number(((usageVarianceCents / entry.usageCents) * 10000).toFixed(2))
        : 0;

      return {
        ...entry,
        varianceCents,
        varianceBps,
        usageVarianceCents,
        usageVarianceBps
      };
    });

    breakdown.sort((a, b) => Math.abs(b.varianceCents) - Math.abs(a.varianceCents));
    return breakdown;
  }

  static async runReconciliation({ tenantId = 'global', start, end } = {}, connection = db) {
    const normalizedTenant = normaliseTenantId(tenantId);
    const windowStart = toIsoDate(start ?? new Date(new Date().setUTCHours(0, 0, 0, 0)));
    const windowEnd = toIsoDate(end ?? new Date());
    const queryConnection = getQueryConnection(connection);

    if (!queryConnection) {
      return {
        id: null,
        tenantId: normalizedTenant,
        windowStart,
        windowEnd,
        status: 'skipped',
        invoicedCents: 0,
        usageCents: 0,
        recognizedCents: 0,
        deferredCents: 0,
        varianceCents: 0,
        varianceRatio: 0,
        metadata: {
          reconciliationMethod: 'automated',
          generatedAt: new Date().toISOString(),
          reason: 'connection-unavailable'
        }
      };
    }

    const previousRun = await MonetizationReconciliationRunModel.latest(
      { tenantId: normalizedTenant },
      connection
    );

    const paymentsQuery = queryConnection('payment_intents')
      .where({ status: 'succeeded' })
      .andWhereNotNull('captured_at')
      .andWhere('captured_at', '>=', windowStart)
      .andWhere('captured_at', '<=', windowEnd)
      .sum({ total: 'amount_total' });

    applyTenantMetadataScope(paymentsQuery, normalizedTenant, queryConnection);

    const [paymentsRow] = await paymentsQuery;
    const invoicedCents = coercePositiveInteger(paymentsRow?.total ?? 0);

    const usageCents = await MonetizationUsageRecordModel.sumForWindow(
      { tenantId: normalizedTenant, start: windowStart, end: windowEnd },
      queryConnection
    );
    const recognizedCents = await MonetizationRevenueScheduleModel.sumRecognizedForWindow(
      { tenantId: normalizedTenant, start: windowStart, end: windowEnd },
      queryConnection
    );
    const deferredCents = await MonetizationRevenueScheduleModel.sumDeferredBalance(
      { tenantId: normalizedTenant },
      queryConnection
    );

    const varianceCents = recognizedCents - invoicedCents;
    const varianceRatio = invoicedCents > 0 ? Number((varianceCents / invoicedCents).toFixed(4)) : 0;
    const evaluation = evaluateReconciliationOutcome({
      invoicedCents,
      recognizedCents,
      usageCents,
      deferredCents
    });
    const alertDigest = computeAlertDigest(evaluation.alerts);
    const currencyBreakdown = await this.#buildCurrencyBreakdown(
      { tenantId: normalizedTenant, windowStart, windowEnd },
      connection
    );

    const run = await MonetizationReconciliationRunModel.create(
      {
        tenantId: normalizedTenant,
        windowStart,
        windowEnd,
        status: evaluation.status,
        invoicedCents,
        usageCents,
        recognizedCents,
        deferredCents,
        varianceCents,
        varianceRatio,
        metadata: {
          reconciliationMethod: 'automated',
          generatedAt: new Date().toISOString(),
          varianceBps: evaluation.varianceBps,
          usageVarianceCents: evaluation.usageVarianceCents,
          usageVarianceBps: evaluation.usageVarianceBps,
          severity: evaluation.severity,
          alerts: evaluation.alerts,
          thresholds: evaluation.thresholds,
          alertCooldownMinutes: evaluation.thresholds.alertCooldownMinutes,
          alertDigest,
          currencyBreakdown
        }
      },
      connection
    );

    updateDeferredRevenueBalance({ tenantId: normalizedTenant, balanceCents: deferredCents });

    const processedRun = await processReconciliationNotifications({
      run,
      evaluation,
      previousRun,
      digest: alertDigest,
      connection
    });

    return processedRun;
  }

  static async getRevenueOverview({ tenantId = 'global', since, until, connection } = {}) {
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return {
        tenantId: normaliseTenantId(tenantId),
        summary: calculateRevenueSummary(),
        deferredRevenueCents: 0,
        recognizedRevenueCents: 0,
        generatedAt: new Date().toISOString()
      };
    }

    const ledgerQuery = targetConnection('payment_ledger_entries as ple')
      .leftJoin('payment_intents as pi', 'pi.id', 'ple.payment_intent_id')
      .select({
        type: 'ple.entry_type',
        amountCents: 'ple.amount_cents',
        recordedAt: 'ple.recorded_at',
        currency: 'ple.currency',
        metadata: 'pi.metadata'
      });

    if (since) {
      ledgerQuery.where('ple.recorded_at', '>=', since);
    }
    if (until) {
      ledgerQuery.where('ple.recorded_at', '<=', until);
    }

    applyTenantMetadataScope(ledgerQuery, tenantId, targetConnection);

    const ledgerRows = await ledgerQuery;
    const summary = calculateRevenueSummary(ledgerRows);

    const [deferredRevenueCents, recognizedRevenueCents] = await Promise.all([
      MonetizationRevenueScheduleModel.sumDeferredBalance({ tenantId }, targetConnection),
      MonetizationRevenueScheduleModel.sumRecognizedForWindow(
        { tenantId, start: since ?? null, end: until ?? null },
        targetConnection
      )
    ]);

    return {
      tenantId: normaliseTenantId(tenantId),
      summary,
      deferredRevenueCents,
      recognizedRevenueCents,
      generatedAt: new Date().toISOString()
    };
  }

  static async listRevenueSchedules({ paymentIntentId, tenantId, status, limit = 50, offset = 0 } = {}) {
    const normalizedTenant = normaliseTenantId(tenantId ?? 'global');
    const { connection: modelConnection, isQueryable } = resolveModelConnection(db);
    if (!modelConnection || !isQueryable) {
      return [];
    }

    const query = modelConnection('monetization_revenue_schedules')
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
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return [];
    }
    return MonetizationReconciliationRunModel.list(params, targetConnection);
  }

  static async latestReconciliation(params = {}, connection = db) {
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return null;
    }
    return MonetizationReconciliationRunModel.latest(params, targetConnection);
  }

  static async listReconciliationAlerts({ tenantId = 'global', limit = 10, since } = {}, connection = db) {
    const normalizedTenant = normaliseTenantId(tenantId);
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return [];
    }

    const fetchLimit = Math.min(Math.max(limit, 1) * 3, 100);
    const runs = await MonetizationReconciliationRunModel.list(
      { tenantId: normalizedTenant, limit: fetchLimit },
      targetConnection
    );

    const sinceDate = since ? new Date(since) : null;
    const results = [];

    for (const run of runs) {
      const alerts = Array.isArray(run.metadata?.alerts) ? run.metadata.alerts : [];
      if (!alerts.length) {
        continue;
      }

      if (sinceDate && run.createdAt) {
        const createdAt = new Date(run.createdAt);
        if (Number.isFinite(createdAt.getTime()) && createdAt < sinceDate) {
          continue;
        }
      }

      const metadata = run.metadata ?? {};
      results.push({
        id: run.id,
        tenantId: run.tenantId,
        windowStart: run.windowStart,
        windowEnd: run.windowEnd,
        severity: metadata.severity ?? 'medium',
        varianceCents: run.varianceCents,
        varianceRatio: run.varianceRatio,
        usageVarianceCents: metadata.usageVarianceCents ?? null,
        varianceBps: metadata.varianceBps ?? null,
        usageVarianceBps: metadata.usageVarianceBps ?? null,
        alerts,
        acknowledgements: formatAcknowledgements(metadata),
        notifications: formatNotificationMetadata(metadata),
        createdAt: run.createdAt,
        updatedAt: run.updatedAt
      });

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  static async acknowledgeReconciliationAlert(
    { runId, operatorId, operatorName, operatorEmail, channel, note } = {},
    connection = db
  ) {
    if (!runId) {
      const error = new Error('runId is required to acknowledge a reconciliation alert');
      error.status = 422;
      throw error;
    }

    const acknowledgement = buildAcknowledgement({
      operatorId: operatorId ?? null,
      operatorName,
      operatorEmail,
      channel,
      note
    });

    const updatedRun = await MonetizationReconciliationRunModel.appendAcknowledgement(
      { id: runId, acknowledgement },
      connection
    );

    if (!updatedRun) {
      const notFound = new Error('Reconciliation run not found');
      notFound.status = 404;
      throw notFound;
    }

    const metadata = updatedRun.metadata ?? {};

    return {
      id: updatedRun.id,
      tenantId: updatedRun.tenantId,
      acknowledgement,
      acknowledgements: formatAcknowledgements(metadata),
      notifications: formatNotificationMetadata(metadata),
      updatedAt: updatedRun.updatedAt
    };
  }

  static async listActiveTenants(connection = db) {
    const { connection: targetConnection } = resolveModelConnection(connection);
    if (!targetConnection) {
      return ['global'];
    }

    const [catalogTenants, usageTenants, scheduleTenants, reconciliationTenants] = await Promise.all([
      MonetizationCatalogItemModel.distinctTenants(targetConnection),
      MonetizationUsageRecordModel.distinctTenants(targetConnection),
      MonetizationRevenueScheduleModel.distinctTenants(targetConnection),
      MonetizationReconciliationRunModel.distinctTenants(targetConnection)
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

