import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityMonetizationService from '../src/services/CommunityMonetizationService.js';

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler({})));

const communityModelMock = vi.hoisted(() => ({
  findBySlug: vi.fn(),
  findById: vi.fn()
}));
const communityMemberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn(),
  create: vi.fn(),
  ensureMembership: vi.fn(),
  updateRole: vi.fn(),
  updateMetadata: vi.fn(),
  updateStatus: vi.fn(),
  listByCommunity: vi.fn()
}));
const communityRoleDefinitionModelMock = vi.hoisted(() => ({
  findByCommunityAndKey: vi.fn(),
  create: vi.fn(),
  listByCommunity: vi.fn()
}));
const communityPaywallTierModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findByCommunityAndSlug: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  listByCommunity: vi.fn()
}));
const communitySubscriptionModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  updateById: vi.fn(),
  findByPublicId: vi.fn(),
  listByUser: vi.fn()
}));
const communityAffiliateModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findByReferralCode: vi.fn(),
  listByCommunity: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  incrementEarnings: vi.fn()
}));
const communityAffiliatePayoutModelMock = vi.hoisted(() => ({
  create: vi.fn()
}));
const domainEventMock = vi.hoisted(() => ({
  record: vi.fn()
}));
const paymentIntentModelMock = vi.hoisted(() => ({
  findByPublicId: vi.fn(),
  findById: vi.fn()
}));
const paymentServiceMock = vi.hoisted(() => ({
  createPaymentIntent: vi.fn()
}));

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual('node:crypto');
  return {
    ...actual,
    randomUUID: () => 'uuid-seed'
  };
});

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));
vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));
vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: communityMemberModelMock
}));
vi.mock('../src/models/CommunityRoleDefinitionModel.js', () => ({
  default: communityRoleDefinitionModelMock
}));
vi.mock('../src/models/CommunityPaywallTierModel.js', () => ({
  default: communityPaywallTierModelMock
}));
vi.mock('../src/models/CommunitySubscriptionModel.js', () => ({
  default: communitySubscriptionModelMock
}));
vi.mock('../src/models/CommunityAffiliateModel.js', () => ({
  default: communityAffiliateModelMock
}));
vi.mock('../src/models/CommunityAffiliatePayoutModel.js', () => ({
  default: communityAffiliatePayoutModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventMock
}));
vi.mock('../src/models/PaymentIntentModel.js', () => ({
  default: paymentIntentModelMock
}));
vi.mock('../src/services/PaymentService.js', () => ({
  default: paymentServiceMock
}));

const community = {
  id: 12,
  slug: 'ops-guild',
  name: 'Ops Guild',
  visibility: 'public'
};
const tier = {
  id: 99,
  communityId: 12,
  slug: 'premium-ops',
  name: 'Premium Ops',
  description: 'Monthly simulations',
  priceCents: 9900,
  currency: 'USD',
  billingInterval: 'monthly',
  trialPeriodDays: 7,
  isActive: true,
  benefits: ['Simulations'],
  metadata: {}
};
const member = {
  id: 5,
  communityId: 12,
  userId: 44,
  role: 'admin',
  status: 'active',
  metadata: {}
};

const resetMocks = () => {
  transactionSpy.mockClear();
  [
    communityModelMock,
    communityMemberModelMock,
    communityRoleDefinitionModelMock,
    communityPaywallTierModelMock,
    communitySubscriptionModelMock,
    communityAffiliateModelMock,
    communityAffiliatePayoutModelMock,
    paymentIntentModelMock
  ].forEach((model) => {
    Object.values(model).forEach((fn) => fn?.mockReset?.());
  });
  paymentServiceMock.createPaymentIntent.mockReset();
  domainEventMock.record.mockReset();
};

beforeEach(() => {
  resetMocks();
  communityModelMock.findBySlug.mockResolvedValue(community);
  communityModelMock.findById.mockResolvedValue(community);
  communityMemberModelMock.findMembership.mockResolvedValue(member);
  communityMemberModelMock.ensureMembership.mockResolvedValue(member);
  communityRoleDefinitionModelMock.listByCommunity.mockResolvedValue([]);
  communityPaywallTierModelMock.findByCommunityAndSlug.mockResolvedValue(null);
  communityPaywallTierModelMock.listByCommunity.mockResolvedValue([tier]);
  communityPaywallTierModelMock.findById.mockResolvedValue(tier);
  paymentServiceMock.createPaymentIntent.mockResolvedValue({
    paymentId: 'pi-public',
    provider: 'stripe',
    clientSecret: 'secret'
  });
  paymentIntentModelMock.findByPublicId.mockResolvedValue({
    id: 501,
    publicId: 'pi-public',
    entityType: 'community_subscription',
    entityId: 'uuid-seed'
  });
  communitySubscriptionModelMock.create.mockResolvedValue({
    id: 321,
    publicId: 'uuid-seed',
    communityId: 12,
    userId: 55,
    tierId: 99,
    status: 'incomplete',
    provider: 'stripe',
    metadata: {}
  });
  communitySubscriptionModelMock.listByUser.mockResolvedValue([]);
  communityAffiliateModelMock.listByCommunity.mockResolvedValue([]);
});

describe('CommunityMonetizationService', () => {
  it('creates paywall tier with slugified key and records event', async () => {
    communityPaywallTierModelMock.create.mockResolvedValue({ ...tier, slug: 'premium-ops' });

    const result = await CommunityMonetizationService.createTier('ops-guild', 44, {
      name: 'Premium Ops',
      priceCents: 9900,
      currency: 'USD',
      billingInterval: 'monthly',
      benefits: ['Simulations']
    });

    expect(communityPaywallTierModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: 12,
        slug: 'premium-ops'
      })
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.paywall.tier.created' })
    );
    expect(result.slug).toBe('premium-ops');
  });

  it('starts subscription checkout and updates membership metadata', async () => {
    const membership = { ...member, userId: 55, metadata: { dashboard: true } };
    communityMemberModelMock.findMembership.mockResolvedValue(membership);

    const result = await CommunityMonetizationService.startSubscriptionCheckout('ops-guild', 55, {
      tierId: 99,
      provider: 'stripe'
    });

    expect(paymentServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 55,
        provider: 'stripe',
        entity: expect.objectContaining({ id: 'uuid-seed', type: 'community_subscription' })
      })
    );
    expect(communitySubscriptionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: 'uuid-seed',
        communityId: 12,
        latestPaymentIntentId: 501
      }),
      expect.any(Object)
    );
    expect(communityMemberModelMock.updateMetadata).toHaveBeenCalledWith(
      12,
      55,
      expect.objectContaining({ pendingSubscription: 'uuid-seed', dashboard: true }),
      expect.any(Object)
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.subscription.checkout-started' }),
      expect.any(Object)
    );
    expect(result.subscription.publicId).toBe('uuid-seed');
    expect(result.payment.paymentId).toBe('pi-public');
  });

  it('records affiliate payout and increments totals', async () => {
    communityAffiliateModelMock.findById.mockResolvedValue({
      id: 88,
      communityId: 12,
      status: 'approved'
    });
    communityAffiliatePayoutModelMock.create.mockResolvedValue({
      id: 55,
      affiliateId: 88,
      amountCents: 2500,
      status: 'processing'
    });

    const payout = await CommunityMonetizationService.recordAffiliatePayout('ops-guild', 44, 88, {
      amountCents: 2500,
      status: 'processing'
    });

    expect(communityAffiliatePayoutModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ affiliateId: 88, amountCents: 2500, status: 'processing' })
    );
    expect(communityAffiliateModelMock.incrementEarnings).toHaveBeenCalledWith(
      88,
      { amountEarnedCents: 0, amountPaidCents: 2500 }
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.affiliate.payout-recorded' })
    );
    expect(payout.amountCents).toBe(2500);
  });

  it('assigns role using definition catalogue', async () => {
    communityRoleDefinitionModelMock.findByCommunityAndKey.mockResolvedValue({
      id: 7,
      communityId: 12,
      roleKey: 'ops-strategist'
    });
    const targetMembership = { id: 999, communityId: 12, userId: 77, role: 'member', status: 'active', metadata: {} };
    communityMemberModelMock.ensureMembership.mockResolvedValueOnce(targetMembership);
    communityMemberModelMock.updateRole.mockResolvedValue({ ...targetMembership, role: 'ops-strategist' });

    const assignment = await CommunityMonetizationService.assignRole('ops-guild', 44, 77, 'ops-strategist');

    expect(communityMemberModelMock.ensureMembership).toHaveBeenCalledWith(
      12,
      77,
      { role: 'ops-strategist' },
      expect.objectContaining({ transaction: expect.any(Function) })
    );
    expect(communityMemberModelMock.updateRole).toHaveBeenCalledWith(12, 77, 'ops-strategist');
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.member.role-updated' })
    );
    expect(assignment.role).toBe('ops-strategist');
  });
});
