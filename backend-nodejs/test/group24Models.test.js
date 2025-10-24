import { afterEach, describe, expect, it, vi } from 'vitest';

import ReportingCourseEnrollmentDailyView from '../src/models/ReportingCourseEnrollmentDailyView.js';
import ReportingPaymentsRevenueDailyView from '../src/models/ReportingPaymentsRevenueDailyView.js';
import RevenueAdjustmentModel from '../src/models/RevenueAdjustmentModel.js';
import SavedSearchModel from '../src/models/SavedSearchModel.js';
import ScamReportModel from '../src/models/ScamReportModel.js';
import SecurityIncidentModel from '../src/models/SecurityIncidentModel.js';
import SocialAuditLogModel from '../src/models/SocialAuditLogModel.js';
import TelemetryConsentLedgerModel from '../src/models/TelemetryConsentLedgerModel.js';
import TelemetryEventBatchModel from '../src/models/TelemetryEventBatchModel.js';
import TelemetryEventModel from '../src/models/TelemetryEventModel.js';
import TelemetryFreshnessMonitorModel from '../src/models/TelemetryFreshnessMonitorModel.js';
import TelemetryLineageRunModel from '../src/models/TelemetryLineageRunModel.js';
import TutorAvailabilitySlotModel from '../src/models/TutorAvailabilitySlotModel.js';
import TutorBookingModel from '../src/models/TutorBookingModel.js';
import TutorProfileModel from '../src/models/TutorProfileModel.js';
import UserBlockModel from '../src/models/UserBlockModel.js';
import UserFollowModel from '../src/models/UserFollowModel.js';
import UserModel from '../src/models/UserModel.js';
import UserMuteModel from '../src/models/UserMuteModel.js';
import UserPresenceSessionModel from '../src/models/UserPresenceSessionModel.js';
import { buildEnvironmentColumns, getEnvironmentDescriptor } from '../src/utils/environmentContext.js';

const { databaseMock } = vi.hoisted(() => {
  const queue = [];
  const mock = vi.fn((table) => {
    if (queue.length === 0) {
      throw new Error(`Unexpected database access: ${table}`);
    }
    const expectation = queue.shift();
    if (expectation.table && expectation.table !== table) {
      throw new Error(`Expected access to table ${expectation.table} but received ${table}`);
    }
    return createQueryBuilder(expectation);
  });

  mock.raw = vi.fn((sql, bindings) => ({ sql, bindings }));
  mock.fn = { now: vi.fn(() => new Date('2024-01-01T00:00:00.000Z')) };
  mock.transaction = vi.fn(async (handler) => {
    const transactionExpectations = queue.shift()?.transaction ?? [];
    const trx = createConnectionStub(transactionExpectations);
    trx.raw = mock.raw;
    trx.fn = mock.fn;
    return handler(trx);
  });
  mock.__setExpectations = (expectations = []) => {
    queue.length = 0;
    queue.push(...(expectations ?? []));
  };

  return { databaseMock: mock };
});

vi.mock('../src/config/database.js', () => ({
  __esModule: true,
  default: databaseMock,
  healthcheck: vi.fn()
}));

afterEach(() => {
  databaseMock.__setExpectations();
});

const environmentDescriptor = getEnvironmentDescriptor();
const environmentColumns = buildEnvironmentColumns(environmentDescriptor);
const environmentExpectation = {
  key: environmentDescriptor.key,
  name: environmentDescriptor.name,
  tier: environmentDescriptor.tier,
  region: environmentDescriptor.region,
  workspace: environmentDescriptor.workspace
};

function handleNested(expectation, type, handler) {
  const nested = createNestedBuilder();
  handler(nested);
  expectation.onNestedWhere?.(type, nested);
}

function createQueryBuilder(expectation = {}) {
  const rows = expectation.rows ?? [];
  const result = typeof expectation.result === 'function' ? expectation.result() : expectation.result ?? rows;
  const createJoin = (type) =>
    vi.fn((...args) => {
      const maybeHandler = args[args.length - 1];
      if (typeof maybeHandler === 'function') {
        const joinBuilder = createJoinBuilder();
        maybeHandler.call(joinBuilder, joinBuilder);
        expectation.onJoin?.({ type, args, builder: joinBuilder });
      } else {
        expectation.onJoin?.({ type, args });
      }
      return builder;
    });
  const builder = {
    select: vi.fn((...args) => {
      expectation.onSelect?.(args);
      return builder;
    }),
    from: vi.fn(() => builder),
    leftJoin: createJoin('leftJoin'),
    innerJoin: createJoin('innerJoin'),
    join: createJoin('join'),
    where: vi.fn((...args) => {
      if (typeof args[0] === 'function') {
        handleNested(expectation, 'where', args[0]);
      } else {
        expectation.onWhere?.(args);
      }
      return builder;
    }),
    whereBetween: vi.fn((...args) => {
      expectation.onWhereBetween?.(args);
      return builder;
    }),
    whereIn: vi.fn((...args) => {
      expectation.onWhereIn?.(args);
      return builder;
    }),
    whereNot: vi.fn((...args) => {
      if (typeof args[0] === 'function') {
        handleNested(expectation, 'whereNot', args[0]);
      } else {
        expectation.onWhereNot?.(args);
      }
      return builder;
    }),
    whereNotIn: vi.fn((...args) => {
      expectation.onWhereNotIn?.(args);
      return builder;
    }),
    whereNull: vi.fn((...args) => {
      expectation.onWhereNull?.(args);
      return builder;
    }),
    andWhere: vi.fn((arg1, arg2, arg3) => {
      if (typeof arg1 === 'function') {
        handleNested(expectation, 'andWhere', arg1);
      } else {
        expectation.onWhere?.([arg1, arg2, arg3]);
      }
      return builder;
    }),
    orWhere: vi.fn((arg1, arg2, arg3) => {
      if (typeof arg1 === 'function') {
        handleNested(expectation, 'orWhere', arg1);
      } else {
        expectation.onWhere?.([arg1, arg2, arg3]);
      }
      return builder;
    }),
    modify: vi.fn((fn) => {
      const nested = {
        andWhere: vi.fn(() => nested)
      };
      fn(nested);
      expectation.onModify?.(nested);
      return builder;
    }),
    groupBy: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    orderByRaw: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    havingRaw: vi.fn(() => builder),
    clone: vi.fn(() => {
      let cloneExpectation = expectation.clone ?? expectation;
      if (Array.isArray(expectation.clone)) {
        cloneExpectation = expectation.clone.shift() ?? {};
        if (expectation.clone.length === 0) {
          delete expectation.clone;
        }
      }
      return createQueryBuilder(cloneExpectation);
    }),
    clearSelect: vi.fn(() => builder),
    count: vi.fn(() => {
      expectation.onCount?.();
      if (expectation.countRow !== undefined) {
        builder.first = vi.fn(async () => expectation.countRow);
      }
      return builder;
    }),
    countDistinct: vi.fn((...args) => {
      expectation.onCountDistinct?.(args);
      return builder;
    }),
    whereRaw: vi.fn(() => builder),
    orWhereRaw: vi.fn(() => builder),
    onConflict: vi.fn(() => ({
      merge: vi.fn(async () => expectation.mergeResult ?? 1)
    })),
    returning: vi.fn(() => builder),
    forUpdate: vi.fn(() => {
      expectation.onForUpdate?.();
      return builder;
    }),
    first: vi.fn(async () => {
      if (expectation.first !== undefined) {
        return typeof expectation.first === 'function' ? expectation.first() : expectation.first;
      }
      return rows[0] ?? null;
    }),
    insert: vi.fn((payload) => {
      const handlerResponse = expectation.onInsert ? expectation.onInsert(payload) : undefined;
      const response = expectation.insertResponse ?? handlerResponse ?? [expectation.insertId ?? 1];
      const insertResult = {
        onConflict: vi.fn(() => ({
          merge: vi.fn(async () => expectation.mergeResult ?? 1)
        })),
        then: (resolve) => resolve(response)
      };
      return insertResult;
    }),
    update: vi.fn(async (payload) => {
      if (expectation.onUpdate) {
        return expectation.onUpdate(payload);
      }
      return expectation.updateResult ?? 1;
    }),
    del: vi.fn(async () => {
      if (expectation.onDel) {
        return expectation.onDel();
      }
      return expectation.deleteResult ?? 1;
    })
  };

  builder.delete = vi.fn(async () => builder.del());

  builder.then = (resolve) => resolve(result ?? []);
  return builder;
}

function createNestedBuilder() {
  const nested = {
    where: vi.fn(() => nested),
    whereILike: vi.fn(() => nested),
    orWhereILike: vi.fn(() => nested),
    whereRaw: vi.fn(() => nested),
    orWhereRaw: vi.fn(() => nested),
    andWhere: vi.fn(() => nested),
    whereNull: vi.fn(() => nested),
    orWhere: vi.fn(() => nested)
  };
  return nested;
}

function createJoinBuilder() {
  const join = {
    on: vi.fn(() => join),
    andOn: vi.fn(() => join),
    orOn: vi.fn(() => join)
  };
  return join;
}

function createConnectionStub(expectations = []) {
  const queue = [...expectations];
  const connection = vi.fn((table) => {
    if (queue.length === 0) {
      throw new Error(`Unexpected table access: ${table}`);
    }
    const expectation = queue.shift();
    if (expectation.table && expectation.table !== table) {
      throw new Error(`Expected access to table ${expectation.table} but received ${table}`);
    }
    return createQueryBuilder(expectation);
  });
  connection.raw = vi.fn((sql, bindings) => ({ sql, bindings }));
  connection.fn = { now: vi.fn(() => new Date('2024-01-01T00:00:00.000Z')) };
  connection.client = { config: { client: 'mysql' } };
  connection.transaction = vi.fn(async (handler) => {
    const trx = createConnectionStub(queue.shift()?.transaction ?? []);
    trx.raw = connection.raw;
    trx.fn = connection.fn;
    trx.client = connection.client;
    return handler(trx);
  });
  return connection;
}

function extractLatestCall(mock) {
  const calls = mock.mock.calls;
  return calls[calls.length - 1];
}

describe('ReportingCourseEnrollmentDailyView', () => {
  it('returns normalised daily summaries', async () => {
    const summaryRows = [
      {
        date: '2024-05-01',
        enrollments: '12',
        completions: '4',
        avg_progress: 82.456,
        recognised_revenue_cents: '4500'
      }
    ];
    const breakdownRows = [
      {
        category: 'STEM',
        deliveryFormat: 'virtual',
        level: 'advanced',
        enrollments: '5',
        completions: '2',
        avg_progress: 91.22,
        recognised_revenue_cents: '2200'
      }
    ];
    const expectations = [
      { table: 'reporting_course_enrollment_daily', rows: summaryRows },
      { table: 'reporting_course_enrollment_daily', rows: breakdownRows },
      {
        table: 'reporting_course_enrollment_daily',
        first: {
          enrollments: '12',
          completions: '9',
          recognised_revenue_cents: '7500',
          avg_progress: 67.333
        }
      }
    ];
    const connection = createConnectionStub(expectations);

    const summaries = await ReportingCourseEnrollmentDailyView.fetchDailySummaries(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );
    const breakdown = await ReportingCourseEnrollmentDailyView.fetchCategoryBreakdown(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );
    const totals = await ReportingCourseEnrollmentDailyView.fetchTotals(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );

    expect(summaries).toEqual([
      {
        date: '2024-05-01',
        enrollments: 12,
        completions: 4,
        averageProgressPercent: 82.46,
        recognisedRevenueCents: 4500
      }
    ]);
    expect(breakdown).toEqual([
      {
        category: 'STEM',
        deliveryFormat: 'virtual',
        level: 'advanced',
        enrollments: 5,
        completions: 2,
        averageProgressPercent: 91.22,
        recognisedRevenueCents: 2200
      }
    ]);
    expect(totals).toEqual({
      enrollments: 12,
      completions: 9,
      recognisedRevenueCents: 7500,
      averageProgressPercent: 67.33
    });
  });

  it('returns empty set when date range invalid', async () => {
    const connection = createConnectionStub();
    const summaries = await ReportingCourseEnrollmentDailyView.fetchDailySummaries(
      { start: 'invalid', end: 'still-invalid' },
      connection
    );
    expect(summaries).toEqual([]);
  });
});

// Additional tests will be appended below.

describe('ReportingPaymentsRevenueDailyView', () => {
  it('calculates totals with number normalisation', async () => {
    const expectations = [
      {
        table: 'reporting_payments_revenue_daily',
        rows: [
          {
            date: '2024-05-01',
            currency: 'USD',
            total_intents: '12',
            succeeded_intents: '11',
            gross_volume_cents: '12000',
            discount_cents: '300',
            tax_cents: '900',
            refunded_cents: '150',
            recognised_volume_cents: '8000'
          }
        ]
      },
      {
        table: 'reporting_payments_revenue_daily',
        first: {
          gross_volume_cents: '32000',
          recognised_volume_cents: '25000',
          discount_cents: '900',
          tax_cents: '2400',
          refunded_cents: '600',
          total_intents: '44',
          succeeded_intents: '40'
        }
      }
    ];
    const connection = createConnectionStub(expectations);

    const daily = await ReportingPaymentsRevenueDailyView.fetchDailySummaries(
      { start: '2024-05-01', end: '2024-05-04' },
      connection
    );
    const totals = await ReportingPaymentsRevenueDailyView.fetchTotals(
      { start: '2024-05-01', end: '2024-05-04' },
      connection
    );

    expect(daily).toEqual([
      {
        date: '2024-05-01',
        currency: 'USD',
        totalIntents: 12,
        succeededIntents: 11,
        grossVolumeCents: 12000,
        discountCents: 300,
        taxCents: 900,
        refundedCents: 150,
        recognisedVolumeCents: 8000
      }
    ]);
    expect(totals).toEqual({
      grossVolumeCents: 32000,
      recognisedVolumeCents: 25000,
      discountCents: 900,
      taxCents: 2400,
      refundedCents: 600,
      totalIntents: 44,
      succeededIntents: 40
    });
  });

  it('returns safe defaults when date range invalid', async () => {
    const connection = createConnectionStub();
    const totals = await ReportingPaymentsRevenueDailyView.fetchTotals(
      { start: null, end: null },
      connection
    );
    expect(totals).toEqual({
      grossVolumeCents: 0,
      recognisedVolumeCents: 0,
      discountCents: 0,
      taxCents: 0,
      refundedCents: 0,
      totalIntents: 0,
      succeededIntents: 0
    });
  });

  it('fills missing days when requested', async () => {
    const expectations = [
      {
        table: 'reporting_payments_revenue_daily',
        rows: [
          {
            date: '2024-06-01',
            currency: 'usd',
            total_intents: '2',
            succeeded_intents: '1',
            gross_volume_cents: '5000',
            discount_cents: '0',
            tax_cents: '200',
            refunded_cents: '0',
            recognised_volume_cents: '3000'
          },
          {
            date: '2024-06-03',
            currency: 'USD',
            total_intents: '3',
            succeeded_intents: '3',
            gross_volume_cents: '7500',
            discount_cents: '100',
            tax_cents: '250',
            refunded_cents: '50',
            recognised_volume_cents: '5000'
          }
        ],
        onWhereIn: ([column, values]) => {
          expect(column).toBe('currency');
          expect(values).toEqual(['USD']);
        }
      }
    ];

    const connection = createConnectionStub(expectations);

    const summaries = await ReportingPaymentsRevenueDailyView.fetchDailySummaries(
      { start: '2024-06-01', end: '2024-06-03', currencies: ['usd'] },
      connection,
      { fillGaps: true }
    );

    expect(summaries).toEqual([
      {
        date: '2024-06-01',
        currency: 'USD',
        totalIntents: 2,
        succeededIntents: 1,
        grossVolumeCents: 5000,
        discountCents: 0,
        taxCents: 200,
        refundedCents: 0,
        recognisedVolumeCents: 3000
      },
      {
        date: '2024-06-02',
        currency: 'USD',
        totalIntents: 0,
        succeededIntents: 0,
        grossVolumeCents: 0,
        discountCents: 0,
        taxCents: 0,
        refundedCents: 0,
        recognisedVolumeCents: 0
      },
      {
        date: '2024-06-03',
        currency: 'USD',
        totalIntents: 3,
        succeededIntents: 3,
        grossVolumeCents: 7500,
        discountCents: 100,
        taxCents: 250,
        refundedCents: 50,
        recognisedVolumeCents: 5000
      }
    ]);
  });
});

describe('RevenueAdjustmentModel', () => {
  it('creates adjustments with sanitised payloads', async () => {
    const inserts = [];
    const auditInserts = [];
    const createdRow = {
      id: 77,
      publicId: 'adj-1',
      reference: 'REF-001',
      category: 'promotion',
      status: 'approved',
      currency: 'USD',
      amountCents: 1501,
      effectiveAt: '2024-05-01T00:00:00.000Z',
      notes: 'Approved by finance',
      metadata: JSON.stringify({ comment: 'ok' }),
      createdBy: 'ops-user',
      updatedBy: 'ops-user',
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-05-01T00:00:00.000Z'
    };

    const connection = createConnectionStub([
      {
        table: 'revenue_adjustments',
        onInsert: (payload) => {
          inserts.push(payload);
          return [77];
        }
      },
      {
        table: 'revenue_adjustments',
        first: createdRow
      },
      {
        table: 'revenue_adjustment_audit_logs',
        onInsert: (payload) => {
          auditInserts.push(payload);
          return [1];
        }
      }
    ]);

    const adjustment = await RevenueAdjustmentModel.create(
      {
        publicId: 'adj-1',
        reference: 'REF-001',
        category: 'promotion',
        status: 'approved',
        currency: 'usd',
        amountCents: '1500.6',
        effectiveAt: new Date('2024-05-01T00:00:00.000Z'),
        notes: 'Approved by finance',
        metadata: { comment: 'ok' },
        createdBy: 'ops-user'
      },
      connection
    );

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      public_id: 'adj-1',
      amount_cents: 1501,
      metadata: JSON.stringify({ comment: 'ok' })
    });
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({
      adjustment_id: 77,
      action: 'created',
      performed_by: 'ops-user'
    });
    expect(JSON.parse(auditInserts[0].changed_fields)).toEqual(
      expect.arrayContaining(['status', 'amountCents', 'currency', 'effectiveAt', 'notes', 'metadata'])
    );
    expect(adjustment).toEqual({
      id: 77,
      publicId: 'adj-1',
      reference: 'REF-001',
      category: 'promotion',
      status: 'approved',
      currency: 'USD',
      amountCents: 1501,
      effectiveAt: new Date('2024-05-01T00:00:00.000Z'),
      notes: 'Approved by finance',
      metadata: { comment: 'ok' },
      createdBy: 'ops-user',
      updatedBy: 'ops-user',
      createdAt: new Date('2024-05-01T00:00:00.000Z'),
      updatedAt: new Date('2024-05-01T00:00:00.000Z')
    });
  });

  it('summarises totals within a window', async () => {
    const connection = createConnectionStub([
      {
        table: 'revenue_adjustments',
        first: {
          totalAmountCents: '4200',
          scheduledAmountCents: '1200',
          approvedAmountCents: '2000',
          settledAmountCents: '1000'
        }
      }
    ]);

    const summary = await RevenueAdjustmentModel.summariseWindow(
      {
        since: new Date('2024-04-01T00:00:00.000Z'),
        until: new Date('2024-05-01T00:00:00.000Z')
      },
      connection
    );

    expect(summary).toEqual({
      totalAmountCents: 4200,
      scheduledAmountCents: 1200,
      approvedAmountCents: 2000,
      settledAmountCents: 1000
    });
  });
});

describe('SavedSearchModel', () => {
  it('creates and serialises saved searches', async () => {
    const inserts = [];
    const savedRow = {
      id: 10,
      user_id: 5,
      name: 'My Search',
      search_query: 'node',
      entity_types: JSON.stringify(['course']),
      filters: JSON.stringify({ level: 'advanced' }),
      global_filters: JSON.stringify({ locale: 'en' }),
      sort_preferences: JSON.stringify({ sort: 'recent' }),
      is_pinned: 1,
      last_used_at: '2024-04-01T00:00:00.000Z',
      created_at: '2024-03-01T00:00:00.000Z',
      updated_at: '2024-04-01T00:00:00.000Z'
    };

    const connection = createConnectionStub([
      {
        table: 'saved_searches',
        onInsert: (payload) => {
          inserts.push(payload);
          return [10];
        }
      },
      {
        table: 'saved_searches',
        first: savedRow
      }
    ]);

    const result = await SavedSearchModel.create(
      {
        userId: 5,
        name: 'My Search',
        query: 'node',
        entityTypes: ['course'],
        filters: { level: 'advanced' },
        globalFilters: { locale: 'en' },
        sortPreferences: { sort: 'recent' },
        isPinned: true,
        lastUsedAt: '2024-04-01T00:00:00.000Z'
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      user_id: 5,
      entity_types: JSON.stringify(['course']),
      filters: JSON.stringify({ level: 'advanced' }),
      is_pinned: true
    });
    expect(result).toEqual({
      id: 10,
      userId: 5,
      name: 'My Search',
      query: 'node',
      entityTypes: ['course'],
      filters: { level: 'advanced' },
      globalFilters: { locale: 'en' },
      deliveryChannels: [],
      sortPreferences: { sort: 'recent' },
      isPinned: true,
      lastUsedAt: '2024-04-01T00:00:00.000Z',
      createdAt: '2024-03-01T00:00:00.000Z',
      updatedAt: '2024-04-01T00:00:00.000Z'
    });
  });

  it('updates targeted fields only when provided', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'saved_searches',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'saved_searches',
        first: {
          id: 10,
          user_id: 5,
          name: 'Renamed',
          search_query: 'node',
          entity_types: JSON.stringify(['course']),
          filters: JSON.stringify({ level: 'advanced' }),
          global_filters: JSON.stringify({ locale: 'en' }),
          sort_preferences: JSON.stringify({ sort: 'recent' }),
          is_pinned: 0,
          last_used_at: null,
          created_at: '2024-03-01T00:00:00.000Z',
          updated_at: '2024-04-02T00:00:00.000Z'
        }
      }
    ]);

    const result = await SavedSearchModel.update(
      10,
      { name: 'Renamed', isPinned: false },
      connection
    );

    expect(updates[0]).toEqual({ name: 'Renamed', is_pinned: false });
    expect(result.name).toBe('Renamed');
    expect(result.isPinned).toBe(false);
  });
});

describe('ScamReportModel', () => {
  it('creates reports with defensively parsed metadata', async () => {
    const inserts = [];
    const createdRow = {
      id: 21,
      publicId: 'scr-1',
      reporterId: 9,
      entityType: 'course',
      entityId: 'course-10',
      communityId: 'community-1',
      status: 'pending',
      riskScore: 80,
      reason: 'suspicious behaviour',
      description: 'spam links',
      metadata: JSON.stringify({ riskSignals: ['spam'], attachments: 2 }),
      handledBy: null,
      resolvedAt: null,
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-05-01T00:00:00.000Z'
    };

    const connection = createConnectionStub([
      {
        table: 'scam_reports',
        onInsert: (payload) => {
          inserts.push(payload);
          return [21];
        }
      },
      {
        table: 'scam_reports',
        first: createdRow
      }
    ]);

    const result = await ScamReportModel.create(
      {
        publicId: 'scr-1',
        reporterId: 9,
        entityType: 'course',
        entityId: 'course-10',
        communityId: 'community-1',
        status: 'pending',
        riskScore: '80',
        reason: 'suspicious behaviour',
        description: 'spam links',
        metadata: { riskSignals: ['spam'], attachments: 2 }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      metadata: JSON.stringify({ riskSignals: ['spam'], attachments: 2 })
    });
    expect(result).toMatchObject({
      publicId: 'scr-1',
      metadata: { riskSignals: ['spam'], attachments: 2 },
      riskScore: 80
    });
  });

  it('updates reports and preserves structured metadata', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'scam_reports',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'scam_reports',
        first: {
          id: 21,
          publicId: 'scr-1',
          reporterId: 9,
          entityType: 'course',
          entityId: 'course-10',
          communityId: 'community-1',
          status: 'resolved',
          riskScore: 40,
          reason: 'investigated',
          description: 'spam links',
          metadata: JSON.stringify({ audit: 'complete' }),
          handledBy: 'moderator-1',
          resolvedAt: '2024-05-02T00:00:00.000Z',
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-02T00:00:00.000Z'
        }
      }
    ]);

    const result = await ScamReportModel.updateById(
      21,
      {
        status: 'resolved',
        riskScore: 40,
        metadata: { audit: 'complete' },
        handledBy: 'moderator-1',
        resolvedAt: '2024-05-02T00:00:00.000Z'
      },
      connection
    );

    expect(updates[0].metadata).toBe(JSON.stringify({ audit: 'complete' }));
    expect(result).toMatchObject({ status: 'resolved', metadata: { audit: 'complete' } });
  });
});

describe('SecurityIncidentModel', () => {
  it('hydrates acknowledgement and resolution metadata', async () => {
    const rows = [
      {
        id: 1,
        incidentUuid: 'inc-1',
        tenantId: 'global',
        reporterId: 3,
        assignedTo: 'analyst-1',
        category: 'auth',
        severity: 'high',
        status: 'new',
        source: 'siem',
        externalCaseId: null,
        reportedAt: '2024-05-01T00:00:00.000Z',
        triagedAt: '2024-05-01T00:05:00.000Z',
        resolvedAt: null,
        metadata: JSON.stringify({
          ack: { acknowledgedAt: '2024-05-01T00:05:00.000Z', ackSlaMinutes: 15, ackBreached: false },
          resolution: { resolutionSlaMinutes: 60 }
        })
      }
    ];
    const builder = createQueryBuilder({ rows });
    const connection = {
      select: vi.fn(() => builder),
      fn: { now: vi.fn(() => new Date('2024-05-01T00:00:00.000Z')) }
    };

    const incidents = await SecurityIncidentModel.listActive({}, connection);

    expect(incidents).toEqual([
      expect.objectContaining({
        acknowledgement: expect.objectContaining({ ackSlaMinutes: 15, ackBreached: false }),
        resolution: expect.objectContaining({ resolutionSlaMinutes: 60 })
      })
    ]);
  });

  it('aggregates counts across statuses', async () => {
    const rows = [{ total: '5', open: '3', resolved: '2' }];
    const builder = createQueryBuilder({ rows });
    const connection = {
      from: vi.fn(() => builder),
      fn: { now: vi.fn(() => new Date('2024-05-01T00:00:00.000Z')) }
    };

    const totals = await SecurityIncidentModel.aggregateCounts({}, connection);
    expect(totals).toEqual({ total: 5, open: 3, resolved: 2 });
  });
});

describe('SocialAuditLogModel', () => {
  it('persists audit entries with structured metadata', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'social_audit_logs',
        onInsert: (payload) => {
          inserts.push(payload);
          return [33];
        }
      },
      {
        table: 'social_audit_logs',
        first: {
          id: 33,
          user_id: 5,
          target_user_id: 7,
          action: 'block',
          source: 'moderation',
          ip_address: '127.0.0.1',
          metadata: JSON.stringify({ reason: 'spam' }),
          created_at: '2024-05-02T00:00:00.000Z'
        }
      }
    ]);

    const record = await SocialAuditLogModel.record(
      {
        userId: 5,
        targetUserId: 7,
        action: 'block',
        source: 'moderation',
        ipAddress: '127.0.0.1',
        metadata: { reason: 'spam' }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({ metadata: JSON.stringify({ reason: 'spam' }) });
    expect(record.metadata).toEqual({ reason: 'spam' });
  });
});

describe('TelemetryConsentLedgerModel', () => {
  it('records decisions while deactivating older grants', async () => {
    const updates = [];
    const inserts = [];
    const transactionExpectations = [
      {
        table: 'telemetry_consent_ledger',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'telemetry_consent_ledger',
        onInsert: (payload) => {
          inserts.push(payload);
          return [99];
        }
      },
      {
        table: 'telemetry_consent_ledger',
        first: {
          id: 99,
          user_id: 45,
          tenant_id: 'global',
          environment_key: environmentColumns.environment_key,
          environment_name: environmentColumns.environment_name,
          environment_tier: environmentColumns.environment_tier,
          environment_region: environmentColumns.environment_region,
          environment_workspace: environmentColumns.environment_workspace,
          consent_scope: 'telemetry',
          consent_version: 'v2',
          status: 'granted',
          is_active: 1,
          recorded_at: '2024-05-01T00:00:00.000Z',
          effective_at: '2024-05-01T00:00:00.000Z',
          expires_at: null,
          revoked_at: null,
          recorded_by: 'auditor',
          evidence: JSON.stringify({ ip: '1.1.1.1' }),
          metadata: JSON.stringify({ region: 'eu' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ];

    const connection = createConnectionStub([{ transaction: transactionExpectations }]);

    const result = await TelemetryConsentLedgerModel.recordDecision(
      {
        userId: 45,
        consentScope: 'telemetry',
        consentVersion: 'v2',
        status: 'granted',
        recordedBy: 'auditor',
        evidence: { ip: '1.1.1.1' },
        metadata: { region: 'eu' },
        recordedAt: new Date('2024-05-01T00:00:00.000Z')
      },
      connection
    );

    expect(updates[0]).toMatchObject({ is_active: false });
    expect(updates[0].revoked_at).toBeDefined();
    expect(inserts[0]).toMatchObject({
      user_id: 45,
      consent_scope: 'telemetry',
      consent_version: 'v2',
      evidence: JSON.stringify({ ip: '1.1.1.1' }),
      ...environmentColumns
    });
    expect(result).toMatchObject({
      userId: 45,
      consentScope: 'telemetry',
      metadata: { region: 'eu' },
      environment: environmentExpectation
    });
  });

  it('retrieves the latest active consent', async () => {
    const connection = createConnectionStub([
      {
        table: 'telemetry_consent_ledger',
        first: {
          id: 12,
          user_id: 45,
          tenant_id: 'global',
          environment_key: environmentColumns.environment_key,
          environment_name: environmentColumns.environment_name,
          environment_tier: environmentColumns.environment_tier,
          environment_region: environmentColumns.environment_region,
          environment_workspace: environmentColumns.environment_workspace,
          consent_scope: 'telemetry',
          consent_version: 'v2',
          status: 'granted',
          is_active: 1,
          recorded_at: '2024-05-01T00:00:00.000Z',
          effective_at: '2024-05-01T00:00:00.000Z',
          expires_at: null,
          revoked_at: null,
          recorded_by: null,
          evidence: JSON.stringify({}),
          metadata: JSON.stringify({})
        }
      }
    ]);

    const consent = await TelemetryConsentLedgerModel.getActiveConsent(
      { userId: 45, consentScope: 'telemetry' },
      connection
    );

    expect(consent).toMatchObject({ userId: 45, consentVersion: 'v2' });
    expect(consent.environment).toMatchObject(environmentExpectation);
  });
});

describe('TelemetryEventBatchModel', () => {
  it('creates batches with defaults and returns domain object', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_event_batches',
        onInsert: (payload) => {
          inserts.push(payload);
          return [11];
        }
      },
      {
        table: 'telemetry_event_batches',
        first: {
          id: 11,
          batch_uuid: 'uuid-1',
          status: 'exporting',
          destination: 's3',
          events_count: 0,
          started_at: '2024-05-01T00:00:00.000Z',
          completed_at: null,
          file_key: null,
          checksum: null,
          error_message: null,
          metadata: JSON.stringify({ priority: 'standard' }),
          environment_key: environmentColumns.environment_key,
          environment_name: environmentColumns.environment_name,
          environment_tier: environmentColumns.environment_tier,
          environment_region: environmentColumns.environment_region,
          environment_workspace: environmentColumns.environment_workspace,
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const batch = await TelemetryEventBatchModel.create(
      { metadata: { priority: 'standard' }, startedAt: new Date('2024-05-01T00:00:00.000Z') },
      connection
    );

    expect(inserts[0]).toMatchObject({
      destination: 's3',
      status: 'exporting',
      metadata: JSON.stringify({ priority: 'standard' }),
      ...environmentColumns
    });
    expect(batch.metadata).toEqual({ priority: 'standard' });
    expect(batch.environment).toMatchObject(environmentExpectation);
  });

  it('marks failures and enriches metadata safely', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_event_batches',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'telemetry_event_batches',
        first: {
          id: 11,
          batch_uuid: 'uuid-1',
          status: 'failed',
          destination: 's3',
          events_count: 0,
          started_at: '2024-05-01T00:00:00.000Z',
          completed_at: '2024-05-01T01:00:00.000Z',
          file_key: null,
          checksum: null,
          error_message: 'Export failed',
          metadata: JSON.stringify({ lastError: 'Export failed' })
        }
      }
    ]);

    const result = await TelemetryEventBatchModel.markFailed(
      11,
      new Error('Export failed'),
      connection
    );

    expect(updates[0]).toMatchObject({ status: 'failed', error_message: 'Export failed' });
    expect(result.metadata.lastError).toBe('Export failed');
  });
});

describe('TelemetryEventModel', () => {
  it('creates telemetry events and returns hydrated domain', async () => {
    const inserts = [];
    const row = {
      id: 50,
      event_uuid: 'uuid-1',
      tenant_id: 'global',
      environment_key: environmentColumns.environment_key,
      environment_name: environmentColumns.environment_name,
      environment_tier: environmentColumns.environment_tier,
      environment_region: environmentColumns.environment_region,
      environment_workspace: environmentColumns.environment_workspace,
      schema_version: 'v1',
      event_name: 'course.created',
      event_version: '1',
      event_source: 'backend',
      occurred_at: '2024-05-01T00:00:00.000Z',
      received_at: '2024-05-01T00:00:01.000Z',
      user_id: 99,
      session_id: 'session-1',
      device_id: 'device-1',
      correlation_id: 'corr-1',
      consent_scope: 'analytics',
      consent_status: 'granted',
      ingestion_status: 'pending',
      ingestion_attempts: 0,
      last_ingestion_attempt: null,
      export_batch_id: null,
      dedupe_hash: 'hash-1',
      payload: JSON.stringify({ foo: 'bar' }),
      context: JSON.stringify({ ip: '127.0.0.1' }),
      metadata: JSON.stringify({ region: 'eu' }),
      tags: JSON.stringify(['alpha']),
      created_at: '2024-05-01T00:00:00.000Z',
      updated_at: '2024-05-01T00:00:00.000Z'
    };

    const connection = createConnectionStub([
      {
        table: 'telemetry_events',
        onInsert: (payload) => {
          inserts.push(payload);
          return [50];
        }
      },
      {
        table: 'telemetry_events',
        first: row
      }
    ]);

    const { event, duplicate } = await TelemetryEventModel.create(
      {
        eventName: 'course.created',
        eventVersion: '1',
        eventSource: 'backend',
        occurredAt: new Date('2024-05-01T00:00:00.000Z'),
        receivedAt: new Date('2024-05-01T00:00:01.000Z'),
        userId: 99,
        sessionId: 'session-1',
        deviceId: 'device-1',
        correlationId: 'corr-1',
        consentScope: 'analytics',
        payload: { foo: 'bar' },
        context: { ip: '127.0.0.1' },
        metadata: { region: 'eu' },
        tags: ['alpha'],
        dedupeHash: 'hash-1'
      },
      connection
    );

    expect(duplicate).toBe(false);
    expect(inserts[0]).toMatchObject({
      event_name: 'course.created',
      payload: JSON.stringify({ foo: 'bar' }),
      tags: JSON.stringify(['alpha']),
      ...environmentColumns
    });
    expect(event.metadata).toEqual({ region: 'eu' });
    expect(event.environment).toMatchObject(environmentExpectation);
  });

  it('returns duplicate marker when dedupe hash already exists', async () => {
    const row = {
      id: 50,
      event_uuid: 'uuid-1',
      tenant_id: 'global',
      environment_key: environmentColumns.environment_key,
      environment_name: environmentColumns.environment_name,
      environment_tier: environmentColumns.environment_tier,
      environment_region: environmentColumns.environment_region,
      environment_workspace: environmentColumns.environment_workspace,
      schema_version: 'v1',
      event_name: 'course.created',
      event_version: '1',
      event_source: 'backend',
      occurred_at: '2024-05-01T00:00:00.000Z',
      received_at: '2024-05-01T00:00:01.000Z',
      user_id: 99,
      session_id: 'session-1',
      device_id: 'device-1',
      correlation_id: 'corr-1',
      consent_scope: 'analytics',
      consent_status: 'granted',
      ingestion_status: 'pending',
      ingestion_attempts: 1,
      last_ingestion_attempt: null,
      export_batch_id: null,
      dedupe_hash: 'hash-1',
      payload: JSON.stringify({ foo: 'bar' }),
      context: JSON.stringify({}),
      metadata: JSON.stringify({ region: 'eu' }),
      tags: JSON.stringify([]),
      created_at: '2024-05-01T00:00:00.000Z',
      updated_at: '2024-05-01T00:00:00.000Z'
    };

    const connection = createConnectionStub([
      {
        table: 'telemetry_events',
        onInsert: () => {
          const error = new Error('duplicate');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }
      },
      {
        table: 'telemetry_events',
        first: row
      }
    ]);

    const result = await TelemetryEventModel.create(
      {
        eventName: 'course.created',
        consentScope: 'analytics',
        dedupeHash: 'hash-1'
      },
      connection
    );

    expect(result.duplicate).toBe(true);
    expect(result.event?.dedupeHash).toBe('hash-1');
  });

  it('marks events as exported and patches metadata', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_events',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'telemetry_events',
        rows: [
          {
            id: 50,
            event_uuid: 'uuid-1',
            tenant_id: 'global',
            schema_version: 'v1',
            event_name: 'course.created',
            event_version: '1',
            event_source: 'backend',
            occurred_at: '2024-05-01T00:00:00.000Z',
            received_at: '2024-05-01T00:00:01.000Z',
            user_id: 99,
            session_id: 'session-1',
            device_id: 'device-1',
            correlation_id: 'corr-1',
            consent_scope: 'analytics',
            consent_status: 'granted',
            ingestion_status: 'exported',
            ingestion_attempts: 2,
            last_ingestion_attempt: '2024-05-01T02:00:00.000Z',
            export_batch_id: 17,
            dedupe_hash: 'hash-1',
            payload: JSON.stringify({ foo: 'bar' }),
            context: JSON.stringify({}),
            metadata: JSON.stringify({ region: 'eu' }),
            tags: JSON.stringify([]),
            created_at: '2024-05-01T00:00:00.000Z',
            updated_at: '2024-05-01T02:00:00.000Z'
          }
        ]
      }
    ]);

    const updatedCount = await TelemetryEventModel.markExported(
      [50],
      { batchId: 17, metadata: { exportedBy: 'job-1' } },
      connection
    );

    expect(updatedCount).toBe(1);
    expect(updates[0]).toMatchObject({
      ingestion_status: 'exported',
      export_batch_id: 17
    });
    const [rawSql, rawBindings] = extractLatestCall(connection.raw);
    expect(rawSql).toEqual('JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), CAST(? AS JSON))');
    expect(rawBindings).toEqual([JSON.stringify({ exportedBy: 'job-1' })]);
  });
});

describe('TelemetryFreshnessMonitorModel', () => {
  it('upserts checkpoint information and returns computed snapshot', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_freshness_monitors',
        onInsert: (payload) => {
          inserts.push(payload);
          return [1];
        },
        mergeResult: 1
      },
      {
        table: 'telemetry_freshness_monitors',
        first: {
          id: 1,
          pipeline_key: 'ingest-primary',
          status: 'healthy',
          threshold_minutes: 15,
          last_event_at: '2024-05-01T00:00:00.000Z',
          lag_seconds: 30,
          metadata: JSON.stringify({ component: 'etl' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const snapshot = await TelemetryFreshnessMonitorModel.touchCheckpoint(
      'ingest-primary',
      {
        lastEventAt: new Date('2024-05-01T00:00:00.000Z'),
        metadata: { component: 'etl' }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      pipeline_key: 'ingest-primary',
      metadata: JSON.stringify({ component: 'etl' })
    });
    expect(snapshot.metadata).toEqual({ component: 'etl' });
  });

  it('lists snapshots respecting limits', async () => {
    const connection = createConnectionStub([
      {
        table: 'telemetry_freshness_monitors',
        rows: [
          {
            id: 1,
            pipeline_key: 'a',
            status: 'healthy',
            threshold_minutes: 15,
            last_event_at: '2024-05-01T00:00:00.000Z',
            lag_seconds: 30,
            metadata: JSON.stringify({})
          }
        ]
      }
    ]);

    const rows = await TelemetryFreshnessMonitorModel.listSnapshots({ limit: 1 }, connection);
    expect(rows).toHaveLength(1);
  });
});

describe('TelemetryLineageRunModel', () => {
  it('starts runs with JSON serialised payloads', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_lineage_runs',
        onInsert: (payload) => {
          inserts.push(payload);
          return [5];
        }
      },
      {
        table: 'telemetry_lineage_runs',
        first: {
          id: 5,
          run_uuid: 'uuid-5',
          tool: 'langsmith',
          model_name: 'gpt-5',
          status: 'running',
          started_at: '2024-05-01T00:00:00.000Z',
          completed_at: null,
          input: JSON.stringify({ prompt: 'hello' }),
          output: JSON.stringify({}),
          error_message: null,
          metadata: JSON.stringify({ tenant: 'edu' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const run = await TelemetryLineageRunModel.startRun(
      {
        tool: 'langsmith',
        modelName: 'gpt-5',
        input: { prompt: 'hello' },
        metadata: { tenant: 'edu' },
        startedAt: new Date('2024-05-01T00:00:00.000Z')
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      tool: 'langsmith',
      model_name: 'gpt-5',
      input: JSON.stringify({ prompt: 'hello' })
    });
    expect(run.metadata).toEqual({ tenant: 'edu' });
  });

  it('completes runs and merges metadata', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'telemetry_lineage_runs',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'telemetry_lineage_runs',
        first: {
          id: 5,
          run_uuid: 'uuid-5',
          tool: 'langsmith',
          model_name: 'gpt-5',
          status: 'success',
          started_at: '2024-05-01T00:00:00.000Z',
          completed_at: '2024-05-01T00:05:00.000Z',
          input: JSON.stringify({ prompt: 'hello' }),
          output: JSON.stringify({ result: 'ok' }),
          error_message: null,
          metadata: JSON.stringify({ tenant: 'edu' })
        }
      }
    ]);

    const completed = await TelemetryLineageRunModel.completeRun(
      5,
      {
        status: 'success',
        output: { result: 'ok' },
        metadata: { durationMs: 300000 },
        completedAt: new Date('2024-05-01T00:05:00.000Z')
      },
      connection
    );

    expect(updates[0]).toMatchObject({ status: 'success' });
    const [sql, bindings] = extractLatestCall(connection.raw);
    expect(sql).toEqual('JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), CAST(? AS JSON))');
    expect(bindings).toEqual([JSON.stringify({ durationMs: 300000 })]);
    expect(completed.output).toEqual({ result: 'ok' });
  });
});

describe('TutorAvailabilitySlotModel', () => {
  it('creates slots with serialised metadata and returns hydrated result', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'tutor_availability_slots',
        onInsert: (payload) => {
          inserts.push(payload);
          return [7];
        }
      },
      {
        table: 'tutor_availability_slots',
        first: {
          id: 7,
          tutorId: 3,
          startAt: '2024-05-10T09:00:00.000Z',
          endAt: '2024-05-10T10:00:00.000Z',
          status: 'open',
          isRecurring: 0,
          recurrenceRule: null,
          metadata: JSON.stringify({ channel: 'video' }),
          createdAt: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const slot = await TutorAvailabilitySlotModel.create(
      {
        tutorId: 3,
        startAt: new Date('2024-05-10T09:00:00.000Z'),
        endAt: new Date('2024-05-10T10:00:00.000Z'),
        metadata: { channel: 'video' }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      metadata: JSON.stringify({ channel: 'video' })
    });
    expect(slot.metadata).toEqual({ channel: 'video' });
  });

  it('lists slots ordered by start time', async () => {
    const connection = createConnectionStub([
      {
        table: 'tutor_availability_slots',
        rows: [
          {
            id: 7,
            tutorId: 3,
            startAt: '2024-05-10T09:00:00.000Z',
            endAt: '2024-05-10T10:00:00.000Z',
            status: 'open',
            isRecurring: 0,
            recurrenceRule: null,
            metadata: JSON.stringify({})
          }
        ]
      }
    ]);

    const results = await TutorAvailabilitySlotModel.listByTutorId(3, {}, connection);
    expect(results).toHaveLength(1);
  });
});

describe('TutorBookingModel', () => {
  it('creates bookings and hydrates related tutor data', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'tutor_bookings',
        onInsert: (payload) => {
          inserts.push(payload);
          return [17];
        }
      },
      {
        table: 'tutor_bookings',
        first: { publicId: 'booking-1' }
      },
      {
        table: 'tutor_bookings as tb',
        first: {
          id: 17,
          publicId: 'booking-1',
          tutorId: 8,
          learnerId: 5,
          requestedAt: '2024-05-01T00:00:00.000Z',
          confirmedAt: null,
          cancelledAt: null,
          completedAt: null,
          scheduledStart: '2024-05-10T10:00:00.000Z',
          scheduledEnd: '2024-05-10T11:00:00.000Z',
          durationMinutes: 60,
          hourlyRateAmount: 150,
          hourlyRateCurrency: 'USD',
          meetingUrl: 'https://meet',
          status: 'requested',
          metadata: JSON.stringify({ channel: 'video' }),
          tutorDisplayName: 'Jane Tutor',
          tutorHeadline: 'STEM Expert',
          tutorMetadata: JSON.stringify({ experience: 5 }),
          tutorFirstName: 'Jane',
          tutorLastName: 'Doe',
          tutorEmail: 'jane@example.com',
          learnerFirstName: 'John',
          learnerLastName: 'Student',
          learnerEmail: 'john@example.com'
        }
      }
    ]);

    const booking = await TutorBookingModel.create(
      {
        publicId: 'booking-1',
        tutorId: 8,
        learnerId: 5,
        scheduledStart: new Date('2024-05-10T10:00:00.000Z'),
        scheduledEnd: new Date('2024-05-10T11:00:00.000Z'),
        metadata: { channel: 'video' }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      tutor_id: 8,
      metadata: JSON.stringify({ channel: 'video' })
    });
    expect(booking.tutorProfile?.displayName).toBe('Jane Tutor');
    expect(booking.learner?.email).toBe('john@example.com');
  });

  it('returns empty list when learner id missing', async () => {
    const connection = createConnectionStub();
    const bookings = await TutorBookingModel.listByLearnerId(null, {}, connection);
    expect(bookings).toEqual([]);
  });
});

describe('TutorProfileModel', () => {
  it('creates profiles and parses structured fields', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'tutor_profiles',
        onInsert: (payload) => {
          inserts.push(payload);
          return [4];
        }
      },
      {
        table: 'tutor_profiles',
        first: {
          id: 4,
          userId: 9,
          displayName: 'Jane Tutor',
          headline: 'STEM Expert',
          bio: 'Experienced teacher',
          skills: JSON.stringify(['math', 'science']),
          languages: JSON.stringify(['en', 'es']),
          country: 'US',
          timezones: JSON.stringify(['America/New_York']),
          availabilityPreferences: JSON.stringify({ weekdays: ['mon'] }),
          hourlyRateAmount: 125,
          hourlyRateCurrency: 'USD',
          ratingAverage: 4.9,
          ratingCount: 120,
          completedSessions: 400,
          responseTimeMinutes: 15,
          isVerified: 1,
          metadata: JSON.stringify({ timezoneCertified: true }),
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const profile = await TutorProfileModel.create(
      {
        userId: 9,
        displayName: 'Jane Tutor',
        skills: ['math', 'science'],
        languages: ['en', 'es'],
        timezones: ['America/New_York'],
        availabilityPreferences: { weekdays: ['mon'] },
        isVerified: true,
        metadata: { timezoneCertified: true }
      },
      connection
    );

    expect(inserts[0]).toMatchObject({
      languages: JSON.stringify(['en', 'es']),
      metadata: JSON.stringify({ timezoneCertified: true })
    });
    expect(profile.skills).toEqual(['math', 'science']);
    expect(profile.isVerified).toBe(true);
  });

  it('counts verified tutors using numeric conversion', async () => {
    const connection = createConnectionStub([
      {
        table: 'tutor_profiles',
        first: { total: '3' }
      }
    ]);

    const total = await TutorProfileModel.countVerified({}, connection);
    expect(total).toBe(3);
  });
});

describe('UserBlockModel', () => {
  it('blocks users and returns mapped record', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'user_block_list',
        onInsert: (payload) => {
          inserts.push(payload);
          return [1];
        },
        mergeResult: 1
      },
      {
        table: 'user_block_list',
        first: {
          id: 1,
          user_id: 5,
          blocked_user_id: 9,
          reason: 'spam',
          metadata: JSON.stringify({ moderator: 'alice' }),
          blocked_at: '2024-05-01T00:00:00.000Z',
          expires_at: null
        }
      }
    ]);

    const record = await UserBlockModel.block(
      5,
      9,
      { reason: 'spam', metadata: { moderator: 'alice' } },
      connection
    );

    expect(inserts[0]).toMatchObject({
      user_id: 5,
      blocked_user_id: 9,
      metadata: JSON.stringify({ moderator: 'alice' })
    });
    expect(record.metadata).toEqual({ moderator: 'alice' });
  });

  it('checks active block respecting expiration', async () => {
    const connection = createConnectionStub([
      {
        table: 'user_block_list',
        first: {
          id: 1,
          user_id: 5,
          blocked_user_id: 9,
          expires_at: new Date(Date.now() + 60_000).toISOString()
        }
      }
    ]);

    const isBlocked = await UserBlockModel.isBlocked(5, 9, connection);
    expect(isBlocked).toBe(true);
  });
});

describe('UserFollowModel', () => {
  it('finds relationships with parsed metadata fields', async () => {
    const connection = createConnectionStub([
      {
        table: 'user_follows',
        first: {
          id: 21,
          follower_id: 4,
          following_id: 9,
          status: 'pending',
          source: 'import',
          reason: 'sync',
          accepted_at: null,
          metadata: JSON.stringify({ note: 'hello' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const record = await UserFollowModel.findRelationship(4, 9, connection);
    expect(record).toEqual({
      id: 21,
      followerId: 4,
      followingId: 9,
      status: 'pending',
      source: 'import',
      reason: 'sync',
      acceptedAt: null,
      metadata: { note: 'hello' },
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-05-01T00:00:00.000Z'
    });
  });

  it('updates relationship status and returns latest projection', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'user_follows',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'user_follows',
        first: {
          id: 21,
          follower_id: 4,
          following_id: 9,
          status: 'accepted',
          source: 'invite',
          reason: 'approved',
          accepted_at: '2024-05-02T00:00:00.000Z',
          metadata: JSON.stringify({ context: 'class' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-02T00:00:00.000Z'
        }
      }
    ]);

    const relationship = await UserFollowModel.updateStatus(
      4,
      9,
      'accepted',
      { acceptedAt: '2024-05-02T00:00:00.000Z', reason: 'approved' },
      connection
    );

    expect(updates[0]).toMatchObject({
      status: 'accepted',
      accepted_at: '2024-05-02T00:00:00.000Z',
      reason: 'approved'
    });
    expect(updates[0].updated_at).toBeInstanceOf(Date);
    expect(relationship.status).toBe('accepted');
    expect(relationship.metadata).toEqual({ context: 'class' });
  });

  it('determines following status and removes relationships when requested', async () => {
    const followConnection = createConnectionStub([
      {
        table: 'user_follows',
        first: { id: 1 }
      }
    ]);
    await expect(UserFollowModel.isFollowing(4, 9, followConnection)).resolves.toBe(true);

    const deleteConnection = createConnectionStub([
      {
        table: 'user_follows',
        deleteResult: 1
      }
    ]);
    await expect(UserFollowModel.deleteRelationship(4, 9, deleteConnection)).resolves.toBe(1);

    const whereInCalls = [];
    const removeConnection = createConnectionStub([
      {
        table: 'user_follows',
        onWhereIn: (args) => whereInCalls.push(args),
        deleteResult: 2
      }
    ]);
    const removed = await UserFollowModel.removeBetween(4, 9, removeConnection);
    expect(removed).toBe(2);
    expect(whereInCalls).toEqual([
      ['follower_id', [4, 9]],
      ['following_id', [4, 9]]
    ]);
  });

  it('counts following relationships independently of followers', async () => {
    const connection = createConnectionStub([
      {
        table: 'user_follows',
        rows: [{ count: '7' }]
      }
    ]);

    const total = await UserFollowModel.countFollowing(4, connection);
    expect(total).toBe(7);
  });

  it('lists mutual followers with aggregated counts', async () => {
    const rows = [
      {
        user_id: 7,
        first_name: 'Casey',
        last_name: 'Stone',
        role: 'learner',
        email: 'casey@example.com',
        mutual_followers: '3'
      }
    ];

    const connection = createConnectionStub([
      {
        table: 'user_follows as uf',
        rows
      }
    ]);

    const mutuals = await UserFollowModel.listMutualFollowers(4, 9, connection);
    expect(mutuals).toEqual([
      {
        id: 7,
        firstName: 'Casey',
        lastName: 'Stone',
        role: 'learner',
        email: 'casey@example.com',
        mutualFollowers: 3
      }
    ]);
  });

  it('finds mutual follow candidates while respecting exclusions', async () => {
    const onWhereNotIn = vi.fn();
    const onCountDistinct = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'user_follows as uf',
        rows: [
          {
            user_id: 11,
            first_name: 'Taylor',
            last_name: 'Ray',
            role: 'creator',
            email: 'taylor@example.com',
            mutual_followers: '4'
          }
        ],
        onWhereNotIn,
        onCountDistinct
      }
    ]);

    const suggestions = await UserFollowModel.findMutualCandidates(
      4,
      { limit: 5, excludeIds: [9, 10] },
      connection
    );

    expect(suggestions).toEqual([
      {
        id: 11,
        firstName: 'Taylor',
        lastName: 'Ray',
        role: 'creator',
        email: 'taylor@example.com',
        mutualFollowers: 4
      }
    ]);
    expect(onWhereNotIn).toHaveBeenCalledWith(['uf.follower_id', [9, 10]]);
    expect(onCountDistinct).toHaveBeenCalled();
  });

  it('upserts relationships with metadata', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'user_follows',
        onInsert: (payload) => {
          inserts.push(payload);
          return [1];
        },
        mergeResult: 1
      },
      {
        table: 'user_follows',
        first: {
          id: 1,
          follower_id: 4,
          following_id: 9,
          status: 'accepted',
          source: 'invite',
          reason: null,
          accepted_at: '2024-05-01T00:00:00.000Z',
          metadata: JSON.stringify({ context: 'class' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const relationship = await UserFollowModel.upsertRelationship(
      4,
      9,
      { status: 'accepted', source: 'invite', acceptedAt: new Date('2024-05-01T00:00:00.000Z'), metadata: { context: 'class' } },
      connection
    );

    expect(inserts[0]).toMatchObject({ metadata: JSON.stringify({ context: 'class' }) });
    expect(relationship.metadata).toEqual({ context: 'class' });
  });

  it('counts followers accurately', async () => {
    const connection = createConnectionStub([
      {
        table: 'user_follows',
        rows: [{ count: '5' }]
      }
    ]);

    const total = await UserFollowModel.countFollowers(9, connection);
    expect(total).toBe(5);
  });

  it('lists followers with pagination metadata', async () => {
    const followerRows = [
      {
        id: 11,
        follower_id: 4,
        following_id: 9,
        status: 'accepted',
        source: 'invite',
        reason: null,
        accepted_at: '2024-05-03T10:00:00.000Z',
        metadata: JSON.stringify({ pinned: true }),
        created_at: '2024-05-03T10:00:00.000Z',
        updated_at: '2024-05-03T10:00:00.000Z',
        user_id: 4,
        first_name: 'Alex',
        last_name: 'Rivers',
        role: 'learner',
        email: 'alex@example.com'
      }
    ];

    const connection = createConnectionStub([
      {
        table: 'user_follows as uf',
        rows: followerRows,
        clone: [
          { rows: followerRows },
          { rows: [{ count: '1' }] }
        ]
      }
    ]);

    const result = await UserFollowModel.listFollowers(
      9,
      { limit: 10, offset: 0, status: 'accepted', search: 'alex' },
      connection
    );

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      {
        relationship: {
          id: 11,
          followerId: 4,
          followingId: 9,
          status: 'accepted',
          source: 'invite',
          reason: null,
          acceptedAt: '2024-05-03T10:00:00.000Z',
          metadata: { pinned: true },
          createdAt: '2024-05-03T10:00:00.000Z',
          updatedAt: '2024-05-03T10:00:00.000Z'
        },
        user: {
          id: 4,
          firstName: 'Alex',
          lastName: 'Rivers',
          role: 'learner',
          email: 'alex@example.com',
          mutualFollowers: 0
        }
      }
    ]);
  });

  it('lists following relationships with filters', async () => {
    const followingRows = [
      {
        id: 18,
        follower_id: 9,
        following_id: 12,
        status: 'pending',
        source: 'discovery',
        reason: 'collaboration',
        accepted_at: null,
        metadata: JSON.stringify({ topic: 'ai' }),
        created_at: '2024-05-04T11:00:00.000Z',
        updated_at: '2024-05-04T11:00:00.000Z',
        user_id: 12,
        first_name: 'Jamie',
        last_name: 'Cole',
        role: 'tutor',
        email: 'jamie@example.com'
      }
    ];

    const connection = createConnectionStub([
      {
        table: 'user_follows as uf',
        rows: followingRows,
        clone: [
          { rows: followingRows },
          { rows: [{ count: '1' }] }
        ]
      }
    ]);

    const result = await UserFollowModel.listFollowing(
      9,
      { status: 'pending', limit: 5, search: 'jamie' },
      connection
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({
      relationship: {
        id: 18,
        followerId: 9,
        followingId: 12,
        status: 'pending',
        source: 'discovery',
        reason: 'collaboration',
        acceptedAt: null,
        metadata: { topic: 'ai' },
        createdAt: '2024-05-04T11:00:00.000Z',
        updatedAt: '2024-05-04T11:00:00.000Z'
      },
      user: {
        id: 12,
        firstName: 'Jamie',
        lastName: 'Cole',
        role: 'tutor',
        email: 'jamie@example.com',
        mutualFollowers: 0
      }
    });
  });
});

describe('UserModel', () => {
  it('finds users by email using provided connection', async () => {
    const connection = createConnectionStub([
      {
        table: 'users',
        first: { id: 9, email: 'learner@example.com' }
      }
    ]);

    const user = await UserModel.findByEmail('learner@example.com', connection);
    expect(user).toEqual({ id: 9, email: 'learner@example.com' });
  });

  it('locks rows when fetching for update by email', async () => {
    const onForUpdate = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'users',
        onForUpdate,
        first: { id: 12, email: 'locked@example.com' }
      }
    ]);

    await UserModel.forUpdateByEmail('locked@example.com', connection);
    expect(onForUpdate).toHaveBeenCalled();
  });

  it('selects base projection when finding by id', async () => {
    const onSelect = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'users',
        onSelect,
        first: {
          id: 5,
          firstName: 'Sam',
          lastName: 'Lee',
          email: 'sam@example.com',
          role: 'admin',
          age: 29,
          address: JSON.stringify({ city: 'LA' }),
          twoFactorEnabled: 0,
          twoFactorEnrolledAt: null,
          twoFactorLastVerifiedAt: null,
          emailVerifiedAt: null,
          lastLoginAt: null,
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const user = await UserModel.findById(5, connection);
    const callArgs = onSelect.mock.calls[0][0];
    const columns = Array.isArray(callArgs[0]) ? callArgs[0] : callArgs;
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'first_name as firstName', 'last_name as lastName'])
    );
    expect(user.firstName).toBe('Sam');
  });

  it('hydrates multiple ids and short circuits empty requests', async () => {
    const noopConnection = vi.fn();
    await expect(UserModel.findByIds([], noopConnection)).resolves.toEqual([]);
    expect(noopConnection).not.toHaveBeenCalled();

    const onWhereIn = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'users',
        rows: [
          { id: 1, firstName: 'Alex' },
          { id: 2, firstName: 'Taylor' }
        ],
        onWhereIn
      }
    ]);

    const users = await UserModel.findByIds([1, 2], connection);
    expect(onWhereIn).toHaveBeenCalledWith(['id', [1, 2]]);
    expect(users).toHaveLength(2);
  });

  it('lists users with consistent ordering and pagination', async () => {
    const onSelect = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'users',
        rows: [
          { id: 1, firstName: 'Alex' },
          { id: 2, firstName: 'Taylor' }
        ],
        onSelect
      }
    ]);

    const result = await UserModel.list({ limit: 2, offset: 1 }, connection);
    expect(onSelect).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('updates provided fields and returns the latest row', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      },
      {
        table: 'users',
        first: {
          id: 5,
          firstName: 'Sam',
          lastName: 'Lee',
          email: 'sam@example.com',
          role: 'admin',
          age: 29,
          address: JSON.stringify({ city: 'LA' }),
          twoFactorEnabled: 0,
          twoFactorEnrolledAt: null,
          twoFactorLastVerifiedAt: null,
          emailVerifiedAt: null,
          lastLoginAt: null,
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-02T00:00:00.000Z'
        }
      }
    ]);

    const updated = await UserModel.updateById(
      5,
      { firstName: 'Sam', address: { city: 'LA' } },
      connection
    );

    expect(updates[0]).toMatchObject({
      first_name: 'Sam',
      address: JSON.stringify({ city: 'LA' })
    });
    expect(updated.updatedAt).toBe('2024-05-02T00:00:00.000Z');
  });

  it('resets login failure counters and timestamps', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      }
    ]);

    await UserModel.clearLoginFailures(5, connection);
    expect(updates[0]).toMatchObject({
      failed_login_attempts: 0,
      last_failed_login_at: null,
      locked_until: null
    });
    expect(updates[0].last_login_at).toBeInstanceOf(Date);
  });

  it('marks verification states with consistent timestamps', async () => {
    const twoFactorUpdates = [];
    const connection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          twoFactorUpdates.push(payload);
          return 1;
        }
      }
    ]);

    await UserModel.markTwoFactorVerified(5, connection);
    expect(twoFactorUpdates[0].two_factor_last_verified_at).toBeInstanceOf(Date);

    const emailUpdates = [];
    const emailConnection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          emailUpdates.push(payload);
          return 1;
        }
      },
      {
        table: 'users',
        first: {
          id: 5,
          firstName: 'Sam',
          lastName: 'Lee',
          email: 'sam@example.com',
          role: 'admin',
          age: 29,
          address: JSON.stringify({ city: 'LA' }),
          twoFactorEnabled: 0,
          twoFactorEnrolledAt: null,
          twoFactorLastVerifiedAt: null,
          emailVerifiedAt: '2024-05-02T00:00:00.000Z',
          lastLoginAt: null,
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-02T00:00:00.000Z'
        }
      }
    ]);

    const verified = await UserModel.markEmailVerified(5, emailConnection);
    expect(emailUpdates[0]).toMatchObject({
      email_verified_at: expect.any(Date),
      failed_login_attempts: 0,
      last_failed_login_at: null,
      locked_until: null
    });
    expect(verified.emailVerifiedAt).toBe('2024-05-02T00:00:00.000Z');

    const verificationUpdates = [];
    const verifyConnection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          verificationUpdates.push(payload);
          return 1;
        }
      }
    ]);

    await UserModel.touchVerificationSentAt(5, verifyConnection);
    expect(verificationUpdates[0].last_verification_sent_at).toBeInstanceOf(Date);
  });

  it('creates users and serialises structured address', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'users',
        onInsert: (payload) => {
          inserts.push(payload);
          return [3];
        }
      },
      {
        table: 'users',
        first: {
          id: 3,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          role: 'user',
          age: 32,
          address: JSON.stringify({ city: 'NYC' }),
          twoFactorEnabled: 1,
          twoFactorEnrolledAt: null,
          twoFactorLastVerifiedAt: null,
          emailVerifiedAt: null,
          lastLoginAt: null,
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const user = await UserModel.create(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        passwordHash: 'hash',
        age: 32,
        address: { city: 'NYC' },
        twoFactorEnabled: true
      },
      connection
    );

    expect(inserts[0]).toMatchObject({ address: JSON.stringify({ city: 'NYC' }) });
    expect(user.firstName).toBe('Jane');
  });

  it('records login failures with thresholds', async () => {
    const updates = [];
    const connection = createConnectionStub([
      {
        table: 'users',
        onUpdate: (payload) => {
          updates.push(payload);
          return 1;
        }
      }
    ]);

    const result = await UserModel.recordLoginFailure(
      {
        id: 3,
        failed_login_attempts: 1,
        last_failed_login_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      { windowMinutes: 15, threshold: 3, lockoutDurationMinutes: 30 },
      connection
    );

    expect(result.failureCount).toBe(2);
    expect(updates[0]).toHaveProperty('failed_login_attempts', 2);
  });
});

describe('UserMuteModel', () => {
  it('mutes users and returns hydrated record', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'user_mute_list',
        onInsert: (payload) => {
          inserts.push(payload);
          return [2];
        },
        mergeResult: 1
      },
      {
        table: 'user_mute_list',
        first: {
          id: 2,
          user_id: 5,
          muted_user_id: 8,
          muted_until: '2024-05-02T00:00:00.000Z',
          reason: 'cool down',
          metadata: JSON.stringify({ moderator: 'alice' }),
          created_at: '2024-05-01T00:00:00.000Z',
          updated_at: '2024-05-01T00:00:00.000Z'
        }
      }
    ]);

    const record = await UserMuteModel.mute(
      5,
      8,
      { mutedUntil: '2024-05-02T00:00:00.000Z', reason: 'cool down', metadata: { moderator: 'alice' } },
      connection
    );

    expect(inserts[0]).toMatchObject({ metadata: JSON.stringify({ moderator: 'alice' }) });
    expect(record.metadata).toEqual({ moderator: 'alice' });
  });
});

describe('UserPresenceSessionModel', () => {
  it('clears sessions by identifier', async () => {
    const onDel = vi.fn(() => 1);
    const connection = createConnectionStub([
      {
        table: 'user_presence_sessions',
        onDel
      }
    ]);

    await UserPresenceSessionModel.clear('sess-1', connection);
    expect(onDel).toHaveBeenCalled();
  });

  it('short circuits when no user ids are provided', async () => {
    const connection = vi.fn();
    await expect(UserPresenceSessionModel.listActiveByUserIds([], connection)).resolves.toEqual([]);
    expect(connection).not.toHaveBeenCalled();
  });

  it('filters active sessions by expiration window', async () => {
    const onNestedWhere = vi.fn();
    const onWhereIn = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'user_presence_sessions',
        rows: [
          {
            id: 1,
            user_id: 5,
            session_id: 'sess-1',
            client: 'web',
            status: 'online',
            connected_at: '2024-05-01T00:00:00.000Z',
            last_seen_at: '2024-05-01T00:05:00.000Z',
            expires_at: null,
            metadata: JSON.stringify({})
          }
        ],
        onNestedWhere,
        onWhereIn
      }
    ]);

    const sessions = await UserPresenceSessionModel.listActiveByUserIds([5], connection);
    expect(onWhereIn).toHaveBeenCalledWith(['user_id', [5]]);
    const nested = onNestedWhere.mock.calls[0][1];
    expect(nested.whereNull).toHaveBeenCalledWith('expires_at');
    expect(nested.orWhere).toHaveBeenCalledWith('expires_at', '>', expect.any(Date));
    expect(sessions).toHaveLength(1);
  });

  it('upserts sessions and returns mapped record', async () => {
    const inserts = [];
    const connection = createConnectionStub([
      {
        table: 'user_presence_sessions',
        onInsert: (payload) => {
          inserts.push(payload);
          return [1];
        },
        mergeResult: 1
      },
      {
        table: 'user_presence_sessions',
        first: {
          id: 1,
          user_id: 5,
          session_id: 'sess-1',
          client: 'web',
          status: 'online',
          connected_at: '2024-05-01T00:00:00.000Z',
          last_seen_at: '2024-05-01T00:00:00.000Z',
          expires_at: null,
          metadata: JSON.stringify({ tab: 'home' })
        }
      }
    ]);

    const record = await UserPresenceSessionModel.upsert(
      { userId: 5, sessionId: 'sess-1', metadata: { tab: 'home' } },
      connection
    );

    expect(inserts[0]).toMatchObject({ metadata: JSON.stringify({ tab: 'home' }) });
    expect(record.metadata).toEqual({ tab: 'home' });
  });

  it('lists active sessions for user ids', async () => {
    const connection = createConnectionStub([
      {
        table: 'user_presence_sessions',
        rows: [
          {
            id: 1,
            user_id: 5,
            session_id: 'sess-1',
            client: 'web',
            status: 'online',
            connected_at: '2024-05-01T00:00:00.000Z',
            last_seen_at: '2024-05-01T00:00:00.000Z',
            expires_at: null,
            metadata: JSON.stringify({})
          }
        ]
      }
    ]);

    const sessions = await UserPresenceSessionModel.listActiveByUserIds([5], connection);
    expect(sessions).toHaveLength(1);
  });

  it('lists active sessions for a community with membership filter', async () => {
    const rows = [
      {
        id: 21,
        user_id: 7,
        session_id: 'sess-77',
        client: 'mobile',
        status: 'online',
        connected_at: new Date('2024-05-05T09:00:00.000Z'),
        last_seen_at: new Date('2024-05-05T09:05:00.000Z'),
        expires_at: new Date('2024-05-05T10:00:00.000Z'),
        metadata: JSON.stringify({ device: 'ios' })
      }
    ];

    const onNestedWhere = vi.fn();
    const connection = createConnectionStub([
      {
        table: 'user_presence_sessions as ups',
        rows,
        onNestedWhere
      }
    ]);

    const result = await UserPresenceSessionModel.listActiveForCommunity(91, connection);
    expect(result).toEqual([
      {
        id: 21,
        userId: 7,
        sessionId: 'sess-77',
        client: 'mobile',
        status: 'online',
        connectedAt: new Date('2024-05-05T09:00:00.000Z'),
        lastSeenAt: new Date('2024-05-05T09:05:00.000Z'),
        expiresAt: new Date('2024-05-05T10:00:00.000Z'),
        metadata: { device: 'ios' }
      }
    ]);
    const nested = onNestedWhere.mock.calls[0][1];
    expect(nested.whereNull).toHaveBeenCalledWith('ups.expires_at');
    expect(nested.orWhere).toHaveBeenCalledWith('ups.expires_at', '>', expect.any(Date));
  });
});
