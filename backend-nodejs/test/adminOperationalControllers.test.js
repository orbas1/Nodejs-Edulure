import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/httpResponse.js', () => {
  const respond = (res, { data, message, meta, status = 200 } = {}) =>
    res.status(status).json({ success: true, data: data ?? null, message: message ?? null, meta });

  return {
    __esModule: true,
    success: vi.fn(respond),
    paginated: vi.fn((res, options) =>
      respond(res, {
        ...options,
        status: options?.status ?? 200,
        meta: {
          ...(options?.meta ?? {}),
          pagination: options?.pagination
        }
      })
    ),
    created: vi.fn((res, options) =>
      respond(res, {
        ...options,
        status: 201
      })
    )
  };
});

import AdminBookingController from '../src/controllers/AdminBookingController.js';
import AdminGrowthController from '../src/controllers/AdminGrowthController.js';
import AdminRevenueManagementController from '../src/controllers/AdminRevenueManagementController.js';
import AdminAdsController from '../src/controllers/AdminAdsController.js';
import TutorBookingModel from '../src/models/TutorBookingModel.js';
import GrowthExperimentModel from '../src/models/GrowthExperimentModel.js';
import RevenueAdjustmentModel from '../src/models/RevenueAdjustmentModel.js';
import AdsCampaignModel from '../src/models/AdsCampaignModel.js';
import db from '../src/config/database.js';

vi.mock('../src/models/TutorBookingModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn()
  }
}));

vi.mock('../src/models/GrowthExperimentModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    countByStatus: vi.fn()
  }
}));

vi.mock('../src/models/RevenueAdjustmentModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    summariseWindow: vi.fn()
  }
}));

vi.mock('../src/models/AdsCampaignModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn()
  }
}));

vi.mock('../src/config/database.js', () => {
  const chainMethods = [
    'select',
    'count',
    'avg',
    'where',
    'andWhere',
    'whereNotNull',
    'whereILike',
    'countDistinct',
    'innerJoin',
    'leftJoin',
    'rightJoin',
    'groupBy',
    'orderBy',
    'orderByRaw',
    'limit',
    'offset',
    'having'
  ];

  const createChainable = (result) => {
    const chain = {
      then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
      catch: (onRejected) => Promise.resolve(result).catch(onRejected),
      first: vi.fn().mockResolvedValue(result)
    };

    chainMethods.forEach((method) => {
      chain[method] = vi.fn().mockReturnValue(chain);
    });

    return chain;
  };

  let responses = [];

  const mockDb = vi.fn(() => {
    const next = responses.length > 0 ? responses.shift() : null;
    return createChainable(next);
  });

  mockDb.raw = vi.fn((value) => ({ __raw: value }));
  mockDb.__setResponses = (next) => {
    responses = Array.isArray(next) ? [...next] : [];
    mockDb.mockClear();
  };
  mockDb.__getPendingResponses = () => [...responses];

  return {
    __esModule: true,
    default: mockDb
  };
});

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res;
}

function createMockReq({ user, body, query, params } = {}) {
  return {
    user: user ?? { id: 42, role: 'admin' },
    body: body ?? {},
    query: query ?? {},
    params: params ?? {}
  };
}

const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  db.__setResponses([]);
});

function expectSuccessfulResponse(res, status = 200) {
  if (status !== undefined && res.status.mock.calls.length > 0) {
    expect(res.status).toHaveBeenCalledWith(status);
  }
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ success: true })
  );
}

describe('AdminBookingController', () => {
  beforeEach(() => {
    Object.values(TutorBookingModel).forEach((fn) => fn.mockReset?.());
  });

  it('lists bookings with pagination and filters applied', async () => {
    const items = [{ id: 1, status: 'confirmed' }];
    TutorBookingModel.list.mockResolvedValue(items);
    TutorBookingModel.count.mockResolvedValue(12);

    const req = createMockReq({
      query: { page: '2', perPage: '5', status: 'confirmed', search: 'ops' }
    });
    const res = createMockRes();

    await AdminBookingController.list(req, res, next);

    expect(TutorBookingModel.list).toHaveBeenCalledWith({
      search: 'ops',
      status: 'confirmed',
      tutorId: undefined,
      learnerId: undefined,
      from: undefined,
      to: undefined,
      limit: 5,
      offset: 5
    });
    expect(TutorBookingModel.count).toHaveBeenCalledWith({
      search: 'ops',
      status: 'confirmed',
      tutorId: undefined,
      learnerId: undefined,
      from: undefined,
      to: undefined
    });
    expectSuccessfulResponse(res);
    expect(res.json.mock.calls[0][0].data).toEqual(items);
    expect(res.json.mock.calls[0][0].meta.pagination).toEqual(
      expect.objectContaining({ page: 2, perPage: 5, total: 12 })
    );
  });

  it('creates a booking with metadata stamped', async () => {
    const createdRecord = { id: 10 };
    TutorBookingModel.create.mockResolvedValue(createdRecord);

    const req = createMockReq({
      body: {
        tutorId: 7,
        learnerId: 55,
        scheduledStart: '2025-02-01T15:00:00.000Z',
        scheduledEnd: '2025-02-01T16:00:00.000Z',
        durationMinutes: 60,
        hourlyRateAmount: 7500,
        status: 'confirmed',
        metadata: { notes: 'Discovery call' }
      }
    });
    const res = createMockRes();

    await AdminBookingController.create(req, res, next);

    expect(TutorBookingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorId: 7,
        learnerId: 55,
        status: 'confirmed',
        metadata: expect.objectContaining({
          notes: 'Discovery call',
          lastUpdatedBy: 42
        })
      })
    );
    expectSuccessfulResponse(res, 201);
  });

  it('updates an existing booking by identifier', async () => {
    TutorBookingModel.updateById.mockResolvedValue({ id: 4, status: 'completed' });
    const req = createMockReq({
      params: { bookingId: '4' },
      body: { status: 'completed', metadata: { survey: true } }
    });
    const res = createMockRes();

    await AdminBookingController.update(req, res, next);

    expect(TutorBookingModel.updateById).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        status: 'completed',
        metadata: expect.objectContaining({ survey: true, lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res);
  });

  it('removes a booking and returns 204', async () => {
    TutorBookingModel.deleteById.mockResolvedValue();
    const req = createMockReq({ params: { bookingId: '9' } });
    const res = createMockRes();

    await AdminBookingController.remove(req, res, next);

    expect(TutorBookingModel.deleteById).toHaveBeenCalledWith(9);
    expectSuccessfulResponse(res, 204);
  });
});

describe('AdminGrowthController', () => {
  beforeEach(() => {
    Object.values(GrowthExperimentModel).forEach((fn) => fn.mockReset?.());
  });

  it('lists growth experiments with pagination', async () => {
    const experiments = [{ id: 1, name: 'Cohort onboarding' }];
    GrowthExperimentModel.list.mockResolvedValue(experiments);
    GrowthExperimentModel.count.mockResolvedValue(3);

    const req = createMockReq({ query: { page: '1', perPage: '25', status: 'running' } });
    const res = createMockRes();

    await AdminGrowthController.list(req, res, next);

    expect(GrowthExperimentModel.list).toHaveBeenCalledWith({
      search: undefined,
      status: 'running',
      limit: 25,
      offset: 0
    });
    expect(GrowthExperimentModel.count).toHaveBeenCalledWith({ search: undefined, status: 'running' });
    expectSuccessfulResponse(res);
  });

  it('creates a growth experiment with actor metadata', async () => {
    GrowthExperimentModel.create.mockResolvedValue({ id: 5 });

    const req = createMockReq({
      body: {
        name: 'New funnel experiment',
        status: 'draft',
        segments: ['enterprise'],
        metadata: { priority: 'high' }
      }
    });
    const res = createMockRes();

    await AdminGrowthController.create(req, res, next);

    expect(GrowthExperimentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New funnel experiment',
        metadata: expect.objectContaining({ priority: 'high', lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res, 201);
  });

  it('updates a growth experiment', async () => {
    GrowthExperimentModel.updateById.mockResolvedValue({ id: 8, status: 'running' });
    const req = createMockReq({
      params: { experimentId: '8' },
      body: { status: 'running', metadata: { velocity: 'fast' } }
    });
    const res = createMockRes();

    await AdminGrowthController.update(req, res, next);

    expect(GrowthExperimentModel.updateById).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        status: 'running',
        metadata: expect.objectContaining({ velocity: 'fast', lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res);
  });

  it('compiles aggregate growth metrics from the warehouse', async () => {
    GrowthExperimentModel.countByStatus.mockResolvedValue({ running: 2, draft: 1 });

    db.__setResponses([
      { total: 150 },
      { total: 90 },
      { total: 60 },
      { avgProgress: 72 },
      { total: 48 },
      { total: 30 },
      { total: 40, confirmed: 28, completed: 18 },
      { total: 75 },
      { total: 55 },
      { total: 45 }
    ]);

    const req = createMockReq();
    const res = createMockRes();

    await AdminGrowthController.metrics(req, res, next);

    expect(GrowthExperimentModel.countByStatus).toHaveBeenCalled();
    expectSuccessfulResponse(res);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.activeExperiments).toBe(2);
    expect(payload.learningVelocity.enrollmentsCurrent).toBe(150);
    expect(payload.learningVelocity.growthRate).toBeCloseTo(66.67, 2);
    expect(payload.ebookEngagement.averageProgress).toBeCloseTo(72, 1);
    expect(payload.bookings).toEqual({ total: 40, confirmed: 28, completed: 18 });
    expect(payload.retentionRate).toBeCloseTo(100 * (55 / 45), 2);
    expect(payload.conversionRate).toBeCloseTo(40, 2);
  });
});

describe('AdminRevenueManagementController', () => {
  beforeEach(() => {
    Object.values(RevenueAdjustmentModel).forEach((fn) => fn.mockReset?.());
  });

  it('summarises revenue performance and schedules', async () => {
    RevenueAdjustmentModel.summariseWindow.mockResolvedValue({ totalAdjustments: 3, netCents: 1200 });
    db.__setResponses([
      { capturedCents: 50000, pendingCents: 10000, refundedCents: 2000, totalIntents: 5 },
      { scheduledCents: 30000, recognisedCents: 20000, inFlight: 5000, totalSchedules: 7 },
      [
        { date: '2024-11-01', grossCents: 4000, recognisedCents: 2000 },
        { date: '2024-11-02', grossCents: 6000, recognisedCents: 3000 }
      ]
    ]);

    const res = createMockRes();
    await AdminRevenueManagementController.summary(createMockReq(), res, next);

    expect(RevenueAdjustmentModel.summariseWindow).toHaveBeenCalled();
    expectSuccessfulResponse(res);
    const { payments, revenueSchedules, revenueTrend } = res.json.mock.calls[0][0].data;
    expect(payments).toEqual({
      capturedCents: 50000,
      pendingCents: 10000,
      refundedCents: 2000,
      averageOrderCents: 10000
    });
    expect(revenueSchedules).toEqual({
      scheduledCents: 30000,
      recognisedCents: 20000,
      inFlightCents: 5000,
      totalSchedules: 7
    });
    expect(revenueTrend).toHaveLength(2);
  });

  it('lists revenue adjustments with filters', async () => {
    RevenueAdjustmentModel.list.mockResolvedValue([{ id: 1 }]);
    RevenueAdjustmentModel.count.mockResolvedValue(1);

    const res = createMockRes();
    await AdminRevenueManagementController.listAdjustments(
      createMockReq({ query: { category: 'promo', status: 'approved', page: '3', perPage: '10' } }),
      res,
      next
    );

    expect(RevenueAdjustmentModel.list).toHaveBeenCalledWith({
      search: undefined,
      status: 'approved',
      category: ['promo'],
      limit: 10,
      offset: 20
    });
    expectSuccessfulResponse(res);
  });

  it('creates a revenue adjustment converting amounts to cents', async () => {
    RevenueAdjustmentModel.create.mockResolvedValue({ id: 2 });
    const res = createMockRes();
    await AdminRevenueManagementController.createAdjustment(
      createMockReq({
        body: {
          reference: 'REV-1001',
          amount: 123.45,
          effectiveAt: '2025-01-15T00:00:00.000Z',
          metadata: { reason: 'Partner true-up' }
        }
      }),
      res,
      next
    );

    expect(RevenueAdjustmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'REV-1001',
        amountCents: 12345,
        metadata: expect.objectContaining({ reason: 'Partner true-up', lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res, 201);
  });

  it('updates an adjustment and preserves metadata auditing', async () => {
    RevenueAdjustmentModel.updateById.mockResolvedValue({ id: 9, status: 'settled' });
    const res = createMockRes();
    await AdminRevenueManagementController.updateAdjustment(
      createMockReq({ params: { adjustmentId: '9' }, body: { status: 'settled', metadata: { audit: 'reviewed' } } }),
      res,
      next
    );

    expect(RevenueAdjustmentModel.updateById).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: 'settled',
        metadata: expect.objectContaining({ audit: 'reviewed', lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res);
  });

  it('deletes an adjustment by id', async () => {
    RevenueAdjustmentModel.deleteById.mockResolvedValue();
    const res = createMockRes();
    await AdminRevenueManagementController.deleteAdjustment(createMockReq({ params: { adjustmentId: '11' } }), res, next);

    expect(RevenueAdjustmentModel.deleteById).toHaveBeenCalledWith(11);
    expectSuccessfulResponse(res, 204);
  });
});

describe('AdminAdsController', () => {
  beforeEach(() => {
    Object.values(AdsCampaignModel).forEach((fn) => fn.mockReset?.());
  });

  it('lists ad campaigns', async () => {
    AdsCampaignModel.list.mockResolvedValue([{ id: 1, name: 'Spring Launch' }]);
    AdsCampaignModel.count.mockResolvedValue(4);

    const res = createMockRes();
    await AdminAdsController.listCampaigns(createMockReq({ query: { page: '1', perPage: '20', status: 'draft' } }), res, next);

    expect(AdsCampaignModel.list).toHaveBeenCalledWith({
      search: undefined,
      status: 'draft',
      limit: 20,
      offset: 0
    });
    expectSuccessfulResponse(res);
  });

  it('creates a campaign converting budget amounts', async () => {
    AdsCampaignModel.create.mockResolvedValue({ id: 33 });

    const res = createMockRes();
    await AdminAdsController.createCampaign(
      createMockReq({
        body: {
          name: 'Awareness Boost',
          objective: 'awareness',
          budgetDaily: 150.25,
          spendTotal: 99.5,
          cpc: 1.23,
          metadata: { flight: 'Q1' }
        }
      }),
      res,
      next
    );

    expect(AdsCampaignModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Awareness Boost',
        budgetDailyCents: 15025,
        spendTotalCents: 9950,
        cpcCents: 123,
        metadata: expect.objectContaining({ flight: 'Q1', lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res, 201);
  });

  it('updates a campaign with transformed arrays', async () => {
    AdsCampaignModel.updateById.mockResolvedValue({ id: 55, status: 'active' });
    const res = createMockRes();
    await AdminAdsController.updateCampaign(
      createMockReq({
        params: { campaignId: '55' },
        body: { status: 'active', targetingKeywords: 'automation, onboarding' }
      }),
      res,
      next
    );

    expect(AdsCampaignModel.updateById).toHaveBeenCalledWith(
      55,
      expect.objectContaining({
        status: 'active',
        targetingKeywords: ['automation', 'onboarding'],
        metadata: expect.objectContaining({ lastUpdatedBy: 42 })
      })
    );
    expectSuccessfulResponse(res);
  });

  it('deletes a campaign by identifier', async () => {
    AdsCampaignModel.deleteById.mockResolvedValue();
    const res = createMockRes();
    await AdminAdsController.deleteCampaign(createMockReq({ params: { campaignId: '21' } }), res, next);

    expect(AdsCampaignModel.deleteById).toHaveBeenCalledWith(21);
    expectSuccessfulResponse(res, 204);
  });

  it('summarises campaign performance across the portfolio', async () => {
    db.__setResponses([
      { total: 6, active: 4 },
      { impressions: 1200, clicks: 240, conversions: 30, spendCents: 50000, revenueCents: 120000 },
      [
        {
          campaignId: 3,
          name: 'Lifecycle nurture',
          status: 'active',
          impressions: 600,
          clicks: 120,
          conversions: 18,
          spendCents: 20000,
          revenueCents: 60000
        }
      ],
      [
        {
          metricDate: '2024-11-01',
          impressions: 100,
          clicks: 20,
          conversions: 3,
          spendCents: 4000,
          revenueCents: 9000
        }
      ]
    ]);

    const res = createMockRes();
    await AdminAdsController.summary(createMockReq(), res, next);

    expectSuccessfulResponse(res);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.totalCampaigns).toBe(6);
    expect(payload.activeCampaigns).toBe(4);
    expect(payload.metrics30d).toEqual({
      impressions: 1200,
      clicks: 240,
      conversions: 30,
      spendCents: 50000,
      revenueCents: 120000
    });
    expect(payload.topCampaigns[0]).toEqual(
      expect.objectContaining({ id: 3, roas: 3 })
    );
    expect(payload.performanceTrend).toHaveLength(1);
  });
});
