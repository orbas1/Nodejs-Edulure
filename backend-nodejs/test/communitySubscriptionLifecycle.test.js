import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  onPaymentFailed,
  onPaymentRefunded,
  onPaymentSucceeded
} from '../src/services/CommunitySubscriptionLifecycle.js';

const subscriptionModelMock = vi.hoisted(() => ({
  findByPublicId: vi.fn(),
  updateById: vi.fn()
}));

const paywallTierModelMock = vi.hoisted(() => ({
  findById: vi.fn()
}));

const memberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn(),
  updateMetadata: vi.fn(),
  updateStatus: vi.fn()
}));

const domainEventMock = vi.hoisted(() => ({
  record: vi.fn()
}));

vi.mock('../src/models/CommunitySubscriptionModel.js', () => ({
  default: subscriptionModelMock
}));

vi.mock('../src/models/CommunityPaywallTierModel.js', () => ({
  default: paywallTierModelMock
}));

vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: memberModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventMock
}));

afterEach(() => {
  subscriptionModelMock.findByPublicId.mockReset();
  subscriptionModelMock.updateById.mockReset();
  paywallTierModelMock.findById.mockReset();
  memberModelMock.findMembership.mockReset();
  memberModelMock.updateMetadata.mockReset();
  memberModelMock.updateStatus.mockReset();
  domainEventMock.record.mockReset();
});

describe('CommunitySubscriptionLifecycle', () => {
  it('ignores payment intents that are unrelated to community subscriptions', async () => {
    await onPaymentSucceeded({ entityType: 'order', entityId: 'abc' });
    expect(subscriptionModelMock.findByPublicId).not.toHaveBeenCalled();
  });

  it('activates subscriptions and updates member records on payment success', async () => {
    const subscription = {
      id: 1,
      publicId: 'sub_123',
      communityId: 42,
      userId: 77,
      tierId: 10,
      status: 'pending',
      metadata: { completedPayments: [] }
    };
    const intent = {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      publicId: 'pi_123',
      id: 11,
      amountTotal: 4500
    };

    subscriptionModelMock.findByPublicId.mockResolvedValue(subscription);
    paywallTierModelMock.findById.mockResolvedValue({ billingInterval: 'monthly' });
    memberModelMock.findMembership.mockResolvedValue({
      communityId: 42,
      userId: 77,
      status: 'invited',
      metadata: { pendingSubscription: true }
    });

    await onPaymentSucceeded(intent);

    expect(subscriptionModelMock.updateById).toHaveBeenCalledWith(
      subscription.id,
      expect.objectContaining({
        status: 'active',
        providerStatus: 'active',
        latestPaymentIntentId: intent.id,
        metadata: expect.objectContaining({
          lastCapturedTotal: 4500,
          completedPayments: expect.arrayContaining(['pi_123'])
        })
      }),
      expect.anything()
    );
    expect(memberModelMock.updateMetadata).toHaveBeenCalledWith(
      42,
      77,
      expect.objectContaining({
        activeSubscription: expect.objectContaining({
          subscriptionId: 'sub_123',
          tierId: 10
        })
      }),
      expect.anything()
    );
    expect(memberModelMock.updateStatus).toHaveBeenCalledWith(42, 77, 'active', expect.anything());
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.subscription.activated' }),
      expect.anything()
    );
  });

  it('records past-due status and audit events on payment failure', async () => {
    const subscription = {
      id: 1,
      publicId: 'sub_123',
      communityId: 42,
      userId: 77,
      tierId: 10,
      metadata: {}
    };
    subscriptionModelMock.findByPublicId.mockResolvedValue(subscription);

    const intent = {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      id: 22,
      publicId: 'pi_456',
      status: 'requires_payment_method',
      failureCode: 'card_declined',
      failureMessage: 'Card declined'
    };

    await onPaymentFailed(intent);

    expect(subscriptionModelMock.updateById).toHaveBeenCalledWith(
      subscription.id,
      expect.objectContaining({
        status: 'past_due',
        providerStatus: 'requires_payment_method',
        metadata: expect.objectContaining({
          lastFailedPayment: 'pi_456',
          failure: expect.objectContaining({ code: 'card_declined' })
        })
      }),
      expect.anything()
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.subscription.payment-failed' }),
      expect.anything()
    );
  });

  it('records refunds without mutating subscription status', async () => {
    const subscription = {
      id: 1,
      publicId: 'sub_123',
      communityId: 42,
      userId: 77,
      metadata: {}
    };
    subscriptionModelMock.findByPublicId.mockResolvedValue(subscription);

    const intent = {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      id: 33,
      publicId: 'pi_789'
    };

    await onPaymentRefunded(intent, 2500);

    expect(subscriptionModelMock.updateById).toHaveBeenCalledWith(
      subscription.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          lastRefund: expect.objectContaining({
            amount: 2500,
            paymentIntentId: 33
          })
        })
      }),
      expect.anything()
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.subscription.refunded' }),
      expect.anything()
    );
  });
});
