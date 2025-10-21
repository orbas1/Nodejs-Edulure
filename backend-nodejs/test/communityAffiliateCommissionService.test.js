import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityAffiliateCommissionService from '../src/services/CommunityAffiliateCommissionService.js';

const communityAffiliateModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findByReferralCode: vi.fn(),
  incrementEarnings: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const paymentIntentModelMock = vi.hoisted(() => ({
  findByPublicId: vi.fn(),
  updateById: vi.fn()
}));

const platformSettingsServiceMock = vi.hoisted(() => ({
  getMonetizationSettings: vi.fn(),
  calculateCommission: vi.fn()
}));

vi.mock('../src/models/CommunityAffiliateModel.js', () => ({
  default: communityAffiliateModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

vi.mock('../src/models/PaymentIntentModel.js', () => ({
  default: paymentIntentModelMock
}));

vi.mock('../src/services/PlatformSettingsService.js', () => ({
  default: platformSettingsServiceMock
}));

vi.mock('../src/config/database.js', () => ({
  default: 'mockConnection'
}));

const resetMocks = () => {
  [
    communityAffiliateModelMock.findById,
    communityAffiliateModelMock.findByReferralCode,
    communityAffiliateModelMock.incrementEarnings,
    domainEventModelMock.record,
    paymentIntentModelMock.findByPublicId,
    paymentIntentModelMock.updateById,
    platformSettingsServiceMock.getMonetizationSettings,
    platformSettingsServiceMock.calculateCommission
  ].forEach((mockFn) => mockFn.mockReset());
};

describe('CommunityAffiliateCommissionService', () => {
  beforeEach(() => {
    resetMocks();
    platformSettingsServiceMock.getMonetizationSettings.mockResolvedValue({
      commissions: {
        enabled: true,
        default: { rateBps: 1500, affiliateShare: 0.4 }
      }
    });
    platformSettingsServiceMock.calculateCommission.mockReturnValue({
      affiliateAmountCents: 1800,
      platformAmountCents: 2700,
      category: 'course_sale'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when affiliate metadata is missing', async () => {
    const result = await CommunityAffiliateCommissionService.handlePaymentCaptured({
      id: 11,
      entityType: 'course_sale',
      metadata: {}
    });

    expect(result).toBeNull();
    expect(communityAffiliateModelMock.findById).not.toHaveBeenCalled();
  });

  it('returns null when affiliate is not approved', async () => {
    const paymentIntent = {
      id: 45,
      publicId: 'pi_mock',
      entityType: 'course_sale',
      amountTotal: 9000,
      metadata: { affiliateId: 7, communityId: 4 }
    };

    communityAffiliateModelMock.findById.mockResolvedValue({
      id: 7,
      communityId: 4,
      status: 'pending'
    });

    const result = await CommunityAffiliateCommissionService.handlePaymentCaptured(paymentIntent);

    expect(result).toBeNull();
    expect(communityAffiliateModelMock.incrementEarnings).not.toHaveBeenCalled();
    expect(paymentIntentModelMock.updateById).not.toHaveBeenCalled();
  });

  it('credits affiliate earnings and records event when commission applies', async () => {
    const paymentIntent = {
      id: 81,
      publicId: 'pi_live',
      entityType: 'course_sale',
      entityId: 901,
      amountTotal: 9000,
      metadata: { affiliateId: 5, communityId: 2 }
    };

    communityAffiliateModelMock.findById.mockResolvedValue({
      id: 5,
      communityId: 2,
      status: 'approved',
      referralCode: 'ALLY-123'
    });

    const result = await CommunityAffiliateCommissionService.handlePaymentCaptured(paymentIntent);

    expect(platformSettingsServiceMock.calculateCommission).toHaveBeenCalledWith(
      paymentIntent.amountTotal,
      { enabled: true, default: { rateBps: 1500, affiliateShare: 0.4 } },
      { category: 'course_sale' }
    );

    expect(communityAffiliateModelMock.incrementEarnings).toHaveBeenCalledWith(
      5,
      { amountEarnedCents: 1800, amountPaidCents: 0 },
      'mockConnection'
    );

    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_affiliate',
        eventType: 'community.affiliate.earning-recorded',
        payload: expect.objectContaining({ amountCents: 1800, paymentIntentId: paymentIntent.id })
      }),
      'mockConnection'
    );

    expect(paymentIntentModelMock.updateById).toHaveBeenCalledWith(
      paymentIntent.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          monetization: expect.objectContaining({
            commission: expect.objectContaining({
              affiliateAmountCredited: 1800,
              affiliateId: 5,
              affiliateCreditedAt: expect.any(String)
            })
          })
        })
      }),
      'mockConnection'
    );

    expect(result).toEqual({ affiliateId: 5, amountCents: 1800, category: 'course_sale' });
  });

  it('fetches intent by public id when an id object is not provided', async () => {
    const storedIntent = {
      id: 93,
      publicId: 'pi_ref',
      entityType: 'course_sale',
      amountTotal: 6000,
      metadata: { referralCode: 'ALLY', communityId: 10 }
    };

    paymentIntentModelMock.findByPublicId.mockResolvedValue(storedIntent);
    communityAffiliateModelMock.findByReferralCode.mockResolvedValue({
      id: 44,
      communityId: 10,
      status: 'approved'
    });

    platformSettingsServiceMock.calculateCommission.mockReturnValue({
      affiliateAmountCents: 600,
      platformAmountCents: 1200,
      category: null
    });

    const result = await CommunityAffiliateCommissionService.handlePaymentCaptured('pi_ref');

    expect(paymentIntentModelMock.findByPublicId).toHaveBeenCalledWith('pi_ref', 'mockConnection');
    expect(communityAffiliateModelMock.findByReferralCode).toHaveBeenCalledWith('ALLY', 'mockConnection');
    expect(result).toEqual({ affiliateId: 44, amountCents: 600, category: 'course_sale' });
  });
});
