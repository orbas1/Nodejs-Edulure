import db from '../config/database.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import CommunityAffiliateModel from '../models/CommunityAffiliateModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import PlatformSettingsService from './PlatformSettingsService.js';

function addInterval(startDate, interval) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const result = new Date(start.getTime());
  switch (interval) {
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'quarterly':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'annual':
      result.setFullYear(result.getFullYear() + 1);
      break;
    case 'lifetime':
      return null;
    default:
      result.setMonth(result.getMonth() + 1);
  }
  return result.toISOString();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

async function updateAffiliateEarnings(subscription, intent, connection) {
  if (!subscription.affiliateId) {
    return;
  }
  const affiliate = await CommunityAffiliateModel.findById(subscription.affiliateId, connection);
  if (!affiliate || affiliate.status !== 'approved') {
    return;
  }
  const monetizationSettings = await PlatformSettingsService.getMonetizationSettings(connection);
  const breakdown = PlatformSettingsService.calculateCommission(
    intent.amountTotal ?? 0,
    monetizationSettings.commissions,
    { category: 'community_subscription' }
  );
  const commission = breakdown.affiliateAmountCents;
  if (commission <= 0) {
    return;
  }
  await CommunityAffiliateModel.incrementEarnings(
    affiliate.id,
    { amountEarnedCents: commission, amountPaidCents: 0 },
    connection
  );
  await DomainEventModel.record(
    {
      entityType: 'community_affiliate',
      entityId: String(affiliate.id),
      eventType: 'community.affiliate.earning-recorded',
      payload: {
        subscriptionId: subscription.id,
        paymentIntentId: intent.id,
        amountCents: commission,
        platformShareCents: breakdown.platformAmountCents,
        commissionCategory: breakdown.category ?? 'community_subscription'
      }
    },
    connection
  );
}

export async function onPaymentSucceeded(intent, connection = db) {
  if (intent.entityType !== 'community_subscription') {
    return;
  }
  const subscription = await CommunitySubscriptionModel.findByPublicId(intent.entityId, connection);
  if (!subscription) {
    return;
  }
  const tier = await CommunityPaywallTierModel.findById(subscription.tierId, connection);
  const nowIso = new Date().toISOString();
  const periodEnd = tier ? addInterval(nowIso, tier.billingInterval) : null;
  const metadata = {
    ...subscription.metadata,
    completedPayments: Array.from(
      new Set([...ensureArray(subscription.metadata?.completedPayments), intent.publicId])
    ),
    lastCapturedTotal: intent.amountTotal
  };

  await CommunitySubscriptionModel.updateById(
    subscription.id,
    {
      status: 'active',
      startedAt: subscription.startedAt ?? nowIso,
      currentPeriodStart: nowIso,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      providerStatus: 'active',
      latestPaymentIntentId: intent.id,
      metadata
    },
    connection
  );

  const membership = await CommunityMemberModel.findMembership(subscription.communityId, subscription.userId, connection);
  if (membership) {
    const updatedMeta = { ...membership.metadata };
    delete updatedMeta.pendingSubscription;
    updatedMeta.activeSubscription = {
      subscriptionId: subscription.publicId,
      tierId: subscription.tierId,
      renewedAt: nowIso
    };
    await CommunityMemberModel.updateMetadata(subscription.communityId, subscription.userId, updatedMeta, connection);
    if (membership.status !== 'active') {
      await CommunityMemberModel.updateStatus(subscription.communityId, subscription.userId, 'active', connection);
    }
  }

  await updateAffiliateEarnings(subscription, intent, connection);

  await DomainEventModel.record(
    {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      eventType: 'community.subscription.activated',
      payload: {
        communityId: subscription.communityId,
        tierId: subscription.tierId,
        paymentIntentId: intent.id,
        currentPeriodEnd: periodEnd
      },
      performedBy: subscription.userId
    },
    connection
  );
}

export async function onPaymentFailed(intent, connection = db) {
  if (intent.entityType !== 'community_subscription') {
    return;
  }
  const subscription = await CommunitySubscriptionModel.findByPublicId(intent.entityId, connection);
  if (!subscription) {
    return;
  }
  await CommunitySubscriptionModel.updateById(
    subscription.id,
    {
      status: 'past_due',
      providerStatus: intent.status,
      metadata: {
        ...subscription.metadata,
        lastFailedPayment: intent.publicId,
        failure: {
          code: intent.failureCode,
          message: intent.failureMessage,
          occurredAt: new Date().toISOString()
        }
      }
    },
    connection
  );

  await DomainEventModel.record(
    {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      eventType: 'community.subscription.payment-failed',
      payload: {
        communityId: subscription.communityId,
        paymentIntentId: intent.id,
        failureCode: intent.failureCode,
        failureMessage: intent.failureMessage
      },
      performedBy: subscription.userId
    },
    connection
  );
}

export async function onPaymentRefunded(intent, amount, connection = db) {
  if (intent.entityType !== 'community_subscription') {
    return;
  }
  const subscription = await CommunitySubscriptionModel.findByPublicId(intent.entityId, connection);
  if (!subscription) {
    return;
  }
  await CommunitySubscriptionModel.updateById(
    subscription.id,
    {
      metadata: {
        ...subscription.metadata,
        lastRefund: {
          amount,
          processedAt: new Date().toISOString(),
          paymentIntentId: intent.id
        }
      }
    },
    connection
  );

  await DomainEventModel.record(
    {
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      eventType: 'community.subscription.refunded',
      payload: {
        communityId: subscription.communityId,
        amount,
        paymentIntentId: intent.id
      },
      performedBy: null
    },
    connection
  );
}
