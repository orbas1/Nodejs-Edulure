import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityMonetizationController from '../src/controllers/CommunityMonetizationController.js';

const successSpy = vi.hoisted(() => vi.fn((res, { data, message, meta, status = 200 }) =>
  res.status(status).json({ success: true, data, message, meta })
));
const paginatedSpy = vi.hoisted(() =>
  vi.fn((res, options) =>
    successSpy(res, {
      ...options,
      status: options?.status ?? 200,
      meta: { ...(options?.meta ?? {}), pagination: options?.pagination }
    })
  )
);

const serviceMock = vi.hoisted(() => ({
  listRoles: vi.fn(),
  createRole: vi.fn(),
  assignRole: vi.fn(),
  listTiers: vi.fn(),
  getRevenueSummary: vi.fn(),
  listSubscriptionsForCommunity: vi.fn(),
  updateSubscription: vi.fn(),
  createTier: vi.fn(),
  updateTier: vi.fn(),
  startSubscriptionCheckout: vi.fn(),
  listSubscriptionsForUser: vi.fn(),
  createLiveDonation: vi.fn(),
  cancelSubscription: vi.fn(),
  listAffiliates: vi.fn(),
  applyAffiliate: vi.fn(),
  updateAffiliate: vi.fn(),
  recordAffiliatePayout: vi.fn()
}));

vi.mock('../src/utils/httpResponse.js', () => ({
  success: successSpy,
  paginated: paginatedSpy
}));

vi.mock('../src/services/CommunityMonetizationService.js', () => ({
  __esModule: true,
  default: serviceMock
}));

function createReq({ body, params, query, user } = {}) {
  return {
    body: body ?? {},
    params: params ?? { communityId: 'ops-guild' },
    query: query ?? {},
    user: user ?? { id: 44, role: 'admin' }
  };
}

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

const nextSpy = vi.fn();

describe('CommunityMonetizationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRole', () => {
    it('validates payloads and forwards to the service', async () => {
      const req = createReq({
        body: {
          name: 'Operations Strategist',
          description: 'Runs simulations',
          permissions: { canRunSimulations: true },
          isDefaultAssignable: false
        }
      });
      const res = createRes();
      const role = { id: 99, roleKey: 'operations-strategist' };
      serviceMock.createRole.mockResolvedValue(role);

      await CommunityMonetizationController.createRole(req, res, nextSpy);

      expect(serviceMock.createRole).toHaveBeenCalledWith(
        'ops-guild',
        44,
        expect.objectContaining({
          name: 'Operations Strategist',
          description: 'Runs simulations',
          permissions: { canRunSimulations: true },
          isDefaultAssignable: false
        })
      );
      expect(successSpy).toHaveBeenCalledWith(res, {
        data: role,
        message: 'Role created',
        status: 201
      });
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('surfaces validation errors as 422 responses', async () => {
      const req = createReq({ body: { description: 'Missing name' } });
      const res = createRes();

      await CommunityMonetizationController.createRole(req, res, nextSpy);

      expect(successSpy).not.toHaveBeenCalled();
      expect(nextSpy).toHaveBeenCalledTimes(1);
      const error = nextSpy.mock.calls[0][0];
      expect(error.status).toBe(422);
      expect(Array.isArray(error.details)).toBe(true);
    });
  });

  describe('listSubscriptions', () => {
    it('normalises query filters and returns paginated results', async () => {
      const subscriptions = [{ id: 1 }, { id: 2 }];
      serviceMock.listSubscriptionsForCommunity.mockResolvedValue(subscriptions);
      const req = createReq({ query: { status: 'active', search: 'ops' } });
      const res = createRes();

      await CommunityMonetizationController.listSubscriptions(req, res, nextSpy);

      expect(serviceMock.listSubscriptionsForCommunity).toHaveBeenCalledWith('ops-guild', 44, {
        status: 'active',
        search: 'ops'
      });
      expect(successSpy).toHaveBeenCalledWith(res, {
        data: subscriptions,
        message: 'Community subscriptions fetched'
      });
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('propagates validation errors for invalid queries', async () => {
      const req = createReq({ query: { status: 'not-valid' } });
      const res = createRes();

      await CommunityMonetizationController.listSubscriptions(req, res, nextSpy);

      expect(serviceMock.listSubscriptionsForCommunity).not.toHaveBeenCalled();
      expect(successSpy).not.toHaveBeenCalled();
      const error = nextSpy.mock.calls[0][0];
      expect(error.status).toBe(422);
      expect(error.details).toContain('"status" must be one of [active, paused, canceled, pending, incomplete, trialing]');
    });
  });

  describe('cancelSubscription', () => {
    it('defaults cancelAtPeriodEnd to false when omitted', async () => {
      const req = createReq({ params: { communityId: 'ops-guild', subscriptionId: 'sub_1' }, body: {} });
      const res = createRes();
      serviceMock.cancelSubscription.mockResolvedValue({ id: 'sub_1', status: 'active' });

      await CommunityMonetizationController.cancelSubscription(req, res, nextSpy);

      expect(serviceMock.cancelSubscription).toHaveBeenCalledWith('ops-guild', 44, 'sub_1', {
        cancelAtPeriodEnd: false
      });
      expect(successSpy).toHaveBeenCalledWith(res, {
        data: { id: 'sub_1', status: 'active' },
        message: 'Subscription cancellation scheduled'
      });
      expect(nextSpy).not.toHaveBeenCalled();
    });
  });
});
