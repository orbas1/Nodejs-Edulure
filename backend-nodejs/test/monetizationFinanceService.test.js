import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('knex', () => ({
  default: () => ({
    client: { config: { client: 'mysql2' } },
    transaction: async (handler) => handler({}),
    raw: vi.fn(),
    fn: { now: () => new Date().toISOString() }
  })
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    monetization: {
      reconciliation: {
        enabled: true,
        cronExpression: '5 * * * *',
        timezone: 'Etc/UTC',
        runOnStartup: false,
        recognitionWindowDays: 30,
        tenants: [],
        tenantCacheMinutes: 10
      }
    },
    database: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      name: 'test',
      poolMin: 1,
      poolMax: 1
    },
    security: {
      dataEncryption: {
        activeKeyId: 'test-key',
        keys: { 'test-key': 'local-secret' },
        defaultClassification: 'general'
      }
    }
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import MonetizationFinanceService from '../src/services/MonetizationFinanceService.js';
import MonetizationCatalogItemModel from '../src/models/MonetizationCatalogItemModel.js';
import MonetizationUsageRecordModel from '../src/models/MonetizationUsageRecordModel.js';
import MonetizationRevenueScheduleModel from '../src/models/MonetizationRevenueScheduleModel.js';
import MonetizationReconciliationRunModel from '../src/models/MonetizationReconciliationRunModel.js';
import PaymentLedgerEntryModel from '../src/models/PaymentLedgerEntryModel.js';
import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import {
  updateMonetizationCatalogMetrics,
  recordMonetizationUsage,
  recordRevenueRecognition,
  recordRevenueReversal,
  updateDeferredRevenueBalance
} from '../src/observability/metrics.js';

vi.mock('../src/observability/metrics.js', () => ({
  updateMonetizationCatalogMetrics: vi.fn(),
  recordMonetizationUsage: vi.fn(),
  recordRevenueRecognition: vi.fn(),
  recordRevenueReversal: vi.fn(),
  updateDeferredRevenueBalance: vi.fn()
}));

describe('MonetizationFinanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates new catalog item when product is missing', async () => {
    const fakeTrx = {};
    const fakeDb = {
      transaction: async (handler) => handler(fakeTrx)
    };

    vi.spyOn(MonetizationCatalogItemModel, 'findByProductCode').mockResolvedValue(null);
    vi.spyOn(MonetizationCatalogItemModel, 'create').mockResolvedValue({
      id: 44,
      productCode: 'insiders-pro',
      revenueAccount: '4000-education-services',
      deferredRevenueAccount: '2050-deferred-revenue'
    });
    vi.spyOn(MonetizationCatalogItemModel, 'touchMetrics').mockResolvedValue({ active: 1 });

    const payload = {
      tenantId: 'global',
      productCode: 'insiders-pro',
      name: 'Insiders Pro',
      unitAmountCents: 9900,
      currency: 'USD'
    };

    const created = await MonetizationFinanceService.upsertCatalogItem(payload, fakeDb);

    expect(MonetizationCatalogItemModel.create).toHaveBeenCalledWith(expect.objectContaining({ productCode: 'insiders-pro' }), fakeTrx);
    expect(created.productCode).toBe('insiders-pro');
    expect(updateMonetizationCatalogMetrics).toHaveBeenCalledWith({ active: 1 });
  });

  it('records usage and emits metrics', async () => {
    const usageRecord = {
      publicId: 'usage-1',
      productCode: 'growth',
      amountCents: 1500,
      source: 'api'
    };

    vi.spyOn(MonetizationUsageRecordModel, 'upsertByExternalReference').mockResolvedValue(usageRecord);

    const result = await MonetizationFinanceService.recordUsageEvent({
      productCode: 'growth',
      accountReference: 'tenant-demo',
      tenantId: 'global',
      quantity: 3,
      unitAmountCents: 500,
      currency: 'USD',
      source: 'api'
    });

    expect(result).toEqual(usageRecord);
    expect(recordMonetizationUsage).toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'growth', amountCents: 1500 })
    );
  });

  it('captures payment into deferred schedule when catalog exists', async () => {
    const payment = {
      id: 12,
      publicId: 'pay_1',
      metadata: {
        tenantId: 'global',
        items: [
          {
            id: 'growth',
            name: 'Growth Annual',
            unitAmount: 1000,
            quantity: 1,
            total: 1000,
            metadata: {}
          }
        ]
      },
      currency: 'USD',
      capturedAt: '2025-03-01T00:00:00.000Z'
    };

    const fakeTrx = {};
    const fakeDb = { transaction: async (handler) => handler(fakeTrx) };

    vi.spyOn(MonetizationCatalogItemModel, 'findByProductCode').mockResolvedValue({
      id: 77,
      productCode: 'growth',
      revenueAccount: '4000-education-services',
      deferredRevenueAccount: '2050-deferred-revenue'
    });
    vi.spyOn(MonetizationRevenueScheduleModel, 'create').mockResolvedValue({
      id: 88,
      productCode: 'growth',
      recognitionMethod: 'immediate',
      recognizedAmountCents: 1000,
      amountCents: 1000,
      currency: 'USD'
    });
    vi.spyOn(MonetizationRevenueScheduleModel, 'sumDeferredBalance').mockResolvedValue(1000);
    vi.spyOn(MonetizationCatalogItemModel, 'touchMetrics').mockResolvedValue({ active: 1 });
    vi.spyOn(PaymentLedgerEntryModel, 'record').mockResolvedValue();

    const result = await MonetizationFinanceService.handlePaymentCaptured(payment, fakeDb);

    expect(MonetizationRevenueScheduleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: 12, recognitionMethod: 'immediate', recognizedAmountCents: 1000 }),
      fakeTrx
    );
    expect(PaymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({ entryType: 'revenue.recognized', amount: 1000 }),
      fakeTrx
    );
    expect(result.schedules).toHaveLength(1);
    expect(updateDeferredRevenueBalance).toHaveBeenCalledWith({ tenantId: 'global', balanceCents: 1000 });
  });

  it('recognizes deferred revenue and records ledger entries', async () => {
    const schedule = {
      id: 501,
      paymentIntentId: 12,
      productCode: 'growth',
      recognitionMethod: 'deferred',
      amountCents: 5000,
      recognizedAmountCents: 0,
      currency: 'USD'
    };

    vi.spyOn(MonetizationRevenueScheduleModel, 'listDueForRecognition').mockResolvedValue([schedule]);
    vi.spyOn(MonetizationRevenueScheduleModel, 'markInProgress').mockResolvedValue(schedule);
    vi.spyOn(MonetizationRevenueScheduleModel, 'markRecognized').mockResolvedValue({
      ...schedule,
      recognizedAmountCents: 5000,
      recognizedAt: '2025-03-01T10:00:00.000Z'
    });
    vi.spyOn(MonetizationRevenueScheduleModel, 'sumDeferredBalance').mockResolvedValue(2000);
    vi.spyOn(PaymentLedgerEntryModel, 'record').mockResolvedValue();

    const summary = await MonetizationFinanceService.recognizeDeferredRevenue({ tenantId: 'global' });

    expect(summary).toEqual({ status: 'recognized', processed: 1, amount: 5000 });
    expect(PaymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({ entryType: 'revenue.deferred-release', amount: 5000 }),
      expect.anything()
    );
    expect(recordRevenueRecognition).toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'growth', amountCents: 5000 })
    );
    expect(updateDeferredRevenueBalance).toHaveBeenCalledWith({ tenantId: 'global', balanceCents: 2000 });
  });

  it('processes refunds across recognized and deferred schedules', async () => {
    const fakeTrx = {};
    const recognizedSchedule = {
      id: 41,
      status: 'recognized',
      recognizedAmountCents: 6000,
      amountCents: 6000,
      productCode: 'growth',
      recognizedAt: '2025-03-04T00:00:00.000Z'
    };
    const pendingSchedule = {
      id: 42,
      status: 'pending',
      recognizedAmountCents: 0,
      amountCents: 4000,
      productCode: 'starter',
      recognitionStart: '2025-03-05T00:00:00.000Z'
    };

    vi.spyOn(MonetizationRevenueScheduleModel, 'listByPaymentIntent').mockResolvedValue([
      recognizedSchedule,
      pendingSchedule
    ]);
    vi.spyOn(MonetizationRevenueScheduleModel, 'reduceRecognizedAmount').mockResolvedValue({
      ...recognizedSchedule,
      amountCents: 0,
      recognizedAmountCents: 0
    });
    vi.spyOn(MonetizationRevenueScheduleModel, 'reducePendingAmount').mockResolvedValue({
      ...pendingSchedule,
      amountCents: 3000
    });
    vi.spyOn(MonetizationRevenueScheduleModel, 'sumDeferredBalance').mockResolvedValue(3000);
    vi.spyOn(PaymentLedgerEntryModel, 'record').mockResolvedValue();

    const result = await MonetizationFinanceService.handleRefundProcessed(
      {
        paymentIntentId: 77,
        amountCents: 7000,
        currency: 'USD',
        tenantId: 'tenant-a',
        processedAt: '2025-03-10T00:00:00.000Z',
        reason: 'customer_request',
        refundReference: 're_123',
        source: 'stripe-webhook'
      },
      fakeTrx
    );

    expect(MonetizationRevenueScheduleModel.reduceRecognizedAmount).toHaveBeenCalledWith(
      41,
      6000,
      expect.objectContaining({ reason: 'customer_request', source: 'stripe-webhook' }),
      fakeTrx
    );
    expect(MonetizationRevenueScheduleModel.reducePendingAmount).toHaveBeenCalledWith(
      42,
      1000,
      expect.objectContaining({ reference: 're_123' }),
      fakeTrx
    );
    expect(PaymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({ entryType: 'revenue.refund-recognized', amount: 6000 }),
      fakeTrx
    );
    expect(PaymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({ entryType: 'revenue.refund-deferred', amount: 1000 }),
      fakeTrx
    );
    expect(recordRevenueReversal).toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'growth', amountCents: 6000 })
    );
    expect(updateDeferredRevenueBalance).toHaveBeenCalledWith({ tenantId: 'tenant-a', balanceCents: 3000 });
    expect(result).toEqual({
      status: 'processed',
      adjustments: {
        recognized: [{ scheduleId: 41, productCode: 'growth', amountCents: 6000 }],
        deferred: [{ scheduleId: 42, productCode: 'starter', amountCents: 1000 }]
      },
      unappliedCents: 0
    });
  });

  it('aggregates active tenants across monetization tables', async () => {
    vi.spyOn(MonetizationCatalogItemModel, 'distinctTenants').mockResolvedValue(['global', 'tenant-a']);
    vi.spyOn(MonetizationUsageRecordModel, 'distinctTenants').mockResolvedValue(['tenant-b']);
    vi.spyOn(MonetizationRevenueScheduleModel, 'distinctTenants').mockResolvedValue(['tenant-b', 'tenant-c']);
    vi.spyOn(MonetizationReconciliationRunModel, 'distinctTenants').mockResolvedValue([]);

    const tenants = await MonetizationFinanceService.listActiveTenants();

    expect(tenants).toEqual(['global', 'tenant-a', 'tenant-b', 'tenant-c']);
  });

  it('falls back to global when no tenants discovered', async () => {
    vi.spyOn(MonetizationCatalogItemModel, 'distinctTenants').mockResolvedValue([]);
    vi.spyOn(MonetizationUsageRecordModel, 'distinctTenants').mockResolvedValue([]);
    vi.spyOn(MonetizationRevenueScheduleModel, 'distinctTenants').mockResolvedValue([]);
    vi.spyOn(MonetizationReconciliationRunModel, 'distinctTenants').mockResolvedValue([]);

    const tenants = await MonetizationFinanceService.listActiveTenants();

    expect(tenants).toEqual(['global']);
  });
});

