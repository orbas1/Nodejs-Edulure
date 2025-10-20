import { randomUUID } from 'node:crypto';

import slugify from 'slugify';

import db from '../config/database.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityRoleDefinitionModel from '../models/CommunityRoleDefinitionModel.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import CommunityAffiliateModel from '../models/CommunityAffiliateModel.js';
import CommunityAffiliatePayoutModel from '../models/CommunityAffiliatePayoutModel.js';
import CommunityDonationModel from '../models/CommunityDonationModel.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';
import PaymentService from './PaymentService.js';
import UserModel from '../models/UserModel.js';

const ADMIN_ROLES = new Set(['owner', 'admin']);

const DAY_IN_MS = 86_400_000;

function normalizeSlug(value, fallback) {
  const base = value?.trim() || fallback;
  return slugify(base, { lower: true, strict: true });
}

function buildTierMap(tiers = []) {
  const map = new Map();
  tiers.forEach((tier) => {
    if (tier?.id) {
      map.set(tier.id, tier);
    }
  });
  return map;
}

function toUserSummary(user) {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    email: user.email,
    name: name || user.email
  };
}

function toTierSummary(tier) {
  if (!tier) return null;
  return {
    id: tier.id,
    name: tier.name,
    priceCents: Number(tier.priceCents ?? 0),
    currency: tier.currency ?? 'USD',
    interval: tier.billingInterval ?? 'monthly',
    isActive: Boolean(tier.isActive)
  };
}

function hydrateSubscription(subscription, tierMap, userMap) {
  const tier = toTierSummary(tierMap.get(subscription.tierId));
  const user = toUserSummary(userMap.get(subscription.userId));
  return {
    ...subscription,
    tier,
    user,
    metadata: subscription.metadata ?? {}
  };
}

function buildUserMap(users = []) {
  const map = new Map();
  users.forEach((user) => {
    if (user?.id) {
      map.set(user.id, user);
    }
  });
  return map;
}

async function resolveCommunity(identifier, connection = db) {
  if (!identifier) {
    return null;
  }
  if (Number.isInteger(Number(identifier))) {
    return CommunityModel.findById(Number(identifier), connection);
  }
  return CommunityModel.findBySlug(String(identifier), connection);
}

async function assertCommunity(identifier, connection = db) {
  const community = await resolveCommunity(identifier, connection);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }
  return community;
}

async function requireMembership(communityId, userId, connection = db) {
  const membership = await CommunityMemberModel.findMembership(communityId, userId, connection);
  if (!membership) {
    const error = new Error('Membership not found');
    error.status = 404;
    throw error;
  }
  if (membership.status === 'banned') {
    const error = new Error('Member is banned from this community');
    error.status = 403;
    throw error;
  }
  return membership;
}

async function requireAdmin(communityId, userId, connection = db) {
  const membership = await requireMembership(communityId, userId, connection);
  if (!ADMIN_ROLES.has(membership.role)) {
    const error = new Error('You do not have permission to manage this community');
    error.status = 403;
    throw error;
  }
  return membership;
}

export default class CommunityMonetizationService {
  static async listRoles(communityIdentifier, actorId) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);
    const [definitions, members] = await Promise.all([
      CommunityRoleDefinitionModel.listByCommunity(community.id),
      CommunityMemberModel.listByCommunity(community.id)
    ]);
    return {
      definitions,
      assignments: members.map((member) => ({
        userId: member.userId,
        role: member.role,
        status: member.status,
        metadata: member.metadata
      }))
    };
  }

  static async createRole(communityIdentifier, actorId, payload) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const roleKey = normalizeSlug(payload.roleKey ?? payload.name, payload.name);
    const existing = await CommunityRoleDefinitionModel.findByCommunityAndKey(community.id, roleKey);
    if (existing) {
      const error = new Error('Role key already exists for this community');
      error.status = 409;
      throw error;
    }

    const definition = await CommunityRoleDefinitionModel.create({
      communityId: community.id,
      roleKey,
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions ?? {},
      isDefaultAssignable: payload.isDefaultAssignable ?? true,
      createdBy: actorId
    });

    await DomainEventModel.record({
      entityType: 'community_role_definition',
      entityId: String(definition.id),
      eventType: 'community.role.created',
      payload: { communityId: community.id, roleKey },
      performedBy: actorId
    });

    return definition;
  }

  static async assignRole(communityIdentifier, actorId, targetUserId, roleKey) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    if (ADMIN_ROLES.has(roleKey) && roleKey !== 'admin') {
      const error = new Error('Protected roles can only be assigned through governance workflows');
      error.status = 422;
      throw error;
    }

    if (!ADMIN_ROLES.has(roleKey) && !['moderator', 'member'].includes(roleKey)) {
      const definition = await CommunityRoleDefinitionModel.findByCommunityAndKey(community.id, roleKey);
      if (!definition) {
        const error = new Error('Role definition not found');
        error.status = 404;
        throw error;
      }
    }

    const membership = await CommunityMemberModel.ensureMembership(
      community.id,
      targetUserId,
      { role: roleKey },
      db
    );

    const updated = await CommunityMemberModel.updateRole(community.id, targetUserId, roleKey);

    await DomainEventModel.record({
      entityType: 'community_member',
      entityId: String(membership.id),
      eventType: 'community.member.role-updated',
      payload: { communityId: community.id, userId: targetUserId, role: roleKey },
      performedBy: actorId
    });

    return updated;
  }

  static async listTiers(communityIdentifier, userId, { includeInactive = false } = {}) {
    const community = await assertCommunity(communityIdentifier);
    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (community.visibility === 'private' && !membership) {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }
    const tiers = await CommunityPaywallTierModel.listByCommunity(community.id, { includeInactive });
    return tiers;
  }

  static async createTier(communityIdentifier, actorId, payload) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const slug = normalizeSlug(payload.slug ?? payload.name, payload.name);
    const existing = await CommunityPaywallTierModel.findByCommunityAndSlug(community.id, slug);
    if (existing) {
      const error = new Error('Paywall tier slug already exists');
      error.status = 409;
      throw error;
    }

    const tier = await CommunityPaywallTierModel.create({
      communityId: community.id,
      slug,
      name: payload.name,
      description: payload.description,
      priceCents: payload.priceCents,
      currency: payload.currency,
      billingInterval: payload.billingInterval,
      trialPeriodDays: payload.trialPeriodDays ?? 0,
      isActive: payload.isActive ?? true,
      benefits: payload.benefits ?? [],
      metadata: payload.metadata ?? {},
      stripePriceId: payload.stripePriceId,
      paypalPlanId: payload.paypalPlanId
    });

    await DomainEventModel.record({
      entityType: 'community_paywall_tier',
      entityId: String(tier.id),
      eventType: 'community.paywall.tier.created',
      payload: { communityId: community.id, tierId: tier.id },
      performedBy: actorId
    });

    return tier;
  }

  static async updateTier(communityIdentifier, actorId, tierId, updates) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const tier = await CommunityPaywallTierModel.findById(tierId);
    if (!tier || tier.communityId !== community.id) {
      const error = new Error('Paywall tier not found');
      error.status = 404;
      throw error;
    }

    const nextSlug = updates.slug ? normalizeSlug(updates.slug, updates.slug) : null;
    if (nextSlug && nextSlug !== tier.slug) {
      const slugExists = await CommunityPaywallTierModel.findByCommunityAndSlug(community.id, nextSlug);
      if (slugExists) {
        const error = new Error('Another tier already uses this slug');
        error.status = 409;
        throw error;
      }
      updates.slug = nextSlug;
    }

    const updated = await CommunityPaywallTierModel.updateById(tierId, updates);

    await DomainEventModel.record({
      entityType: 'community_paywall_tier',
      entityId: String(updated.id),
      eventType: 'community.paywall.tier.updated',
      payload: { communityId: community.id, tierId: updated.id, updates },
      performedBy: actorId
    });

    return updated;
  }

  static async startSubscriptionCheckout(communityIdentifier, userId, payload) {
    const community = await assertCommunity(communityIdentifier);
    const tier = await CommunityPaywallTierModel.findById(payload.tierId);
    if (!tier || tier.communityId !== community.id || !tier.isActive) {
      const error = new Error('Paywall tier unavailable');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (community.visibility === 'private' && !membership) {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }

    let affiliate = null;
    if (payload.affiliateCode) {
      affiliate = await CommunityAffiliateModel.findByReferralCode(payload.affiliateCode);
      if (!affiliate || affiliate.communityId !== community.id || affiliate.status !== 'approved') {
        const error = new Error('Affiliate code is invalid or inactive');
        error.status = 422;
        throw error;
      }
    }

    const subscriptionPublicId = randomUUID();

    const payment = await PaymentService.createPaymentIntent({
      userId,
      provider: payload.provider,
      currency: tier.currency,
      items: [
        {
          id: tier.slug,
          name: tier.name,
          description: tier.description,
          unitAmount: tier.priceCents,
          quantity: 1,
          metadata: { communityId: community.id, tierId: tier.id }
        }
      ],
      couponCode: payload.couponCode,
      tax: payload.tax,
      metadata: {
        communityId: community.id,
        tierId: tier.id,
        referralCode: affiliate?.referralCode ?? null,
        affiliateId: affiliate?.id ?? null
      },
      entity: {
        id: subscriptionPublicId,
        type: 'community_subscription',
        name: tier.name,
        description: `${community.name} • ${tier.name}`
      },
      receiptEmail: payload.receiptEmail
    });

    const intent = await PaymentIntentModel.findByPublicId(payment.paymentId);

    const subscription = await db.transaction(async (trx) => {
      const created = await CommunitySubscriptionModel.create(
        {
          publicId: subscriptionPublicId,
          communityId: community.id,
          userId,
          tierId: tier.id,
          status: 'incomplete',
          provider: payload.provider,
          latestPaymentIntentId: intent.id,
          affiliateId: affiliate?.id ?? null,
          metadata: {
            referralCode: affiliate?.referralCode ?? null,
            couponCode: payload.couponCode ?? null
          }
        },
        trx
      );

      if (membership) {
        const mergedMetadata = {
          ...(membership.metadata ?? {}),
          pendingSubscription: subscriptionPublicId
        };
        await CommunityMemberModel.updateMetadata(community.id, userId, mergedMetadata, trx);
        if (membership.status !== 'active') {
          await CommunityMemberModel.updateStatus(community.id, userId, 'active', trx);
        }
      } else {
        await CommunityMemberModel.create(
          {
            communityId: community.id,
            userId,
            role: 'member',
            status: 'active',
            metadata: { pendingSubscription: subscriptionPublicId }
          },
          trx
        );
      }

      await DomainEventModel.record(
        {
          entityType: 'community_subscription',
          entityId: subscriptionPublicId,
          eventType: 'community.subscription.checkout-started',
          payload: {
            communityId: community.id,
            tierId: tier.id,
            paymentIntentId: intent.id,
            affiliateId: affiliate?.id ?? null
          },
          performedBy: userId
        },
        trx
      );

      return created;
    });

    return { payment, subscription };
  }

  static async createLiveDonation(communityIdentifier, userId, payload = {}) {
    const community = await assertCommunity(communityIdentifier);
    const membership = userId ? await CommunityMemberModel.findMembership(community.id, userId) : null;
    if (community.visibility === 'private' && !membership) {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }

    const provider = String(payload.provider ?? 'stripe').toLowerCase();
    if (!['stripe', 'paypal'].includes(provider)) {
      const error = new Error('Donations currently support Stripe or PayPal only');
      error.status = 422;
      throw error;
    }

    const amountCents = Number(payload.amountCents ?? payload.amount ?? 0);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      const error = new Error('A minimum donation of 100 cents is required');
      error.status = 422;
      throw error;
    }

    const currency = String(payload.currency ?? payload.currencyCode ?? 'USD').toUpperCase();

    let event = null;
    if (payload.eventId) {
      event = await CommunityEventModel.findById(payload.eventId);
      if (!event || event.communityId !== community.id) {
        const error = new Error('Live event not found for this community');
        error.status = 404;
        throw error;
      }
    }

    let affiliate = null;
    if (payload.affiliateCode) {
      affiliate = await CommunityAffiliateModel.findByReferralCode(payload.affiliateCode);
      if (!affiliate || affiliate.communityId !== community.id || affiliate.status !== 'approved') {
        const error = new Error('Affiliate code is invalid or inactive for this community');
        error.status = 422;
        throw error;
      }
    }

    const donationReference = randomUUID();
    const itemLabel = event ? `${event.title} Live Donation` : `${community.name} Live Donation`;
    const description = event
      ? `${community.name} • ${event.title}`
      : `${community.name} community support`;
    const donorName = payload.donorName ? String(payload.donorName).trim().slice(0, 120) : null;
    const message = payload.message ? String(payload.message).trim().slice(0, 500) : null;

    const payment = await PaymentService.createPaymentIntent({
      userId,
      provider,
      currency,
      items: [
        {
          id: `community-${community.id}-donation`,
          name: itemLabel,
          description,
          unitAmount: amountCents,
          quantity: 1,
          metadata: {
            communityId: community.id,
            eventId: event?.id ?? null,
            donationReference
          }
        }
      ],
      metadata: {
        communityId: community.id,
        eventId: event?.id ?? null,
        referralCode: affiliate?.referralCode ?? null,
        affiliateId: affiliate?.id ?? null,
        donorId: userId ?? null,
        donorName,
        message,
        donationReference
      },
      entity: {
        id: donationReference,
        type: 'community_live_donation',
        name: itemLabel,
        description
      },
      receiptEmail: payload.receiptEmail ?? null
    });

    const intent = await PaymentIntentModel.findByPublicId(payment.paymentId);

    const donation = await CommunityDonationModel.create({
      communityId: community.id,
      eventId: event?.id ?? null,
      paymentIntentId: intent.id,
      userId: userId ?? null,
      affiliateId: affiliate?.id ?? null,
      amountCents,
      currency,
      status: 'pending',
      referralCode: affiliate?.referralCode ?? (payload.affiliateCode ? String(payload.affiliateCode).toUpperCase() : null),
      donorName,
      message,
      metadata: {
        donationReference,
        provider,
        initiatedBy: userId ?? null
      }
    });

    await DomainEventModel.record({
      entityType: 'community_donation',
      entityId: String(donation.id),
      eventType: 'community.donation.initiated',
      payload: {
        communityId: community.id,
        eventId: event?.id ?? null,
        paymentIntentId: intent.id,
        amountCents,
        currency,
        provider,
        referralCode: donation.referralCode
      },
      performedBy: userId ?? null
    });

    return {
      payment,
      intent: intent ? PaymentService.toApiIntent(intent) : null,
      donation
    };
  }

  static async listSubscriptionsForUser(communityIdentifier, userId) {
    const community = await assertCommunity(communityIdentifier);
    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership) {
      const error = new Error('Membership not found');
      error.status = 404;
      throw error;
    }
    return CommunitySubscriptionModel.listByUser(userId).then((records) =>
      records.filter((record) => record.communityId === community.id)
    );
  }

  static async cancelSubscription(communityIdentifier, userId, subscriptionPublicId, { cancelAtPeriodEnd } = {}) {
    const community = await assertCommunity(communityIdentifier);
    const subscription = await CommunitySubscriptionModel.findByPublicId(subscriptionPublicId);
    if (!subscription || subscription.communityId !== community.id) {
      const error = new Error('Subscription not found');
      error.status = 404;
      throw error;
    }
    if (subscription.userId !== userId) {
      const error = new Error('You do not have permission to manage this subscription');
      error.status = 403;
      throw error;
    }

    const updates = cancelAtPeriodEnd
      ? { cancelAtPeriodEnd: true, providerStatus: 'canceled' }
      : { status: 'canceled', canceledAt: new Date().toISOString(), providerStatus: 'canceled' };

    const updated = await CommunitySubscriptionModel.updateByPublicId(subscriptionPublicId, updates);

    await DomainEventModel.record({
      entityType: 'community_subscription',
      entityId: subscriptionPublicId,
      eventType: 'community.subscription.canceled',
      payload: { communityId: community.id, cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd) },
      performedBy: userId
    });

    return updated;
  }

  static async getRevenueSummary(communityIdentifier, actorId) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const [tiers, subscriptions] = await Promise.all([
      CommunityPaywallTierModel.listByCommunity(community.id, { includeInactive: true }),
      CommunitySubscriptionModel.listByCommunity(community.id)
    ]);

    const tierMap = buildTierMap(tiers);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_IN_MS);

    let monthlyRecurringCents = 0;
    let activeSubscriptions = 0;
    let pausedSubscriptions = 0;
    let trailingThirtyDayCents = 0;
    let previousThirtyDayCents = 0;
    let churnedThirtyDay = 0;

    const tierActiveCounts = new Map();

    subscriptions.forEach((subscription) => {
      const tier = tierMap.get(subscription.tierId);
      const price = tier ? Number(tier.priceCents ?? 0) : 0;
      const status = subscription.status ?? 'inactive';
      const currentStart = subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null;
      const canceledAt = subscription.canceledAt ? new Date(subscription.canceledAt) : null;

      const isActive =
        status === 'active' ||
        status === 'trialing' ||
        (status === 'incomplete' && subscription.cancelAtPeriodEnd === false);

      if (isActive || (subscription.cancelAtPeriodEnd && status === 'active')) {
        activeSubscriptions += 1;
        monthlyRecurringCents += price;
        tierActiveCounts.set(
          subscription.tierId,
          (tierActiveCounts.get(subscription.tierId) ?? 0) + 1
        );
      }

      if (status === 'paused') {
        pausedSubscriptions += 1;
      }

      if (currentStart) {
        if (currentStart >= thirtyDaysAgo) {
          trailingThirtyDayCents += price;
        } else if (currentStart >= sixtyDaysAgo) {
          previousThirtyDayCents += price;
        }
      }

      if (canceledAt && canceledAt >= thirtyDaysAgo) {
        churnedThirtyDay += 1;
      }
    });

    const tiersSummary = tiers.map((tier) => ({
      ...toTierSummary(tier),
      activeSubscribers: tierActiveCounts.get(tier.id) ?? 0
    }));

    const churnRate = activeSubscriptions
      ? Number(((churnedThirtyDay / activeSubscriptions) * 100).toFixed(2))
      : 0;

    return {
      totals: {
        monthlyRecurringCents,
        activeSubscriptions,
        pausedSubscriptions,
        churnRate
      },
      trailingThirtyDayCents,
      previousThirtyDayCents,
      currency: tiers[0]?.currency ?? 'USD',
      tiers: tiersSummary
    };
  }

  static async listSubscriptionsForCommunity(communityIdentifier, actorId, { status, search } = {}) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const subscriptions = await CommunitySubscriptionModel.listByCommunity(community.id, { status });
    const [tiers, users] = await Promise.all([
      CommunityPaywallTierModel.listByCommunity(community.id, { includeInactive: true }),
      subscriptions.length ? UserModel.findByIds(subscriptions.map((subscription) => subscription.userId)) : []
    ]);

    const tierMap = buildTierMap(tiers);
    const userMap = buildUserMap(users);

    let hydrated = subscriptions.map((subscription) => hydrateSubscription(subscription, tierMap, userMap));

    if (search) {
      const term = search.toLowerCase();
      hydrated = hydrated.filter((subscription) => {
        const userMatch =
          subscription.user?.email?.toLowerCase().includes(term) ||
          subscription.user?.name?.toLowerCase().includes(term);
        const tierMatch = subscription.tier?.name?.toLowerCase().includes(term);
        return userMatch || tierMatch || String(subscription.publicId ?? '').includes(term);
      });
    }

    return hydrated;
  }

  static async updateSubscription(communityIdentifier, actorId, subscriptionPublicId, updates = {}) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const subscription = await CommunitySubscriptionModel.findByPublicId(subscriptionPublicId);
    if (!subscription || subscription.communityId !== community.id) {
      const error = new Error('Subscription not found');
      error.status = 404;
      throw error;
    }

    const payload = {};
    if (updates.status) {
      const nextStatus = updates.status;
      if (!['active', 'paused', 'canceled'].includes(nextStatus)) {
        const error = new Error('Unsupported subscription status update');
        error.status = 422;
        throw error;
      }
      payload.status = nextStatus;
      if (nextStatus === 'canceled') {
        payload.canceledAt = new Date().toISOString();
        payload.cancelAtPeriodEnd = false;
      }
      if (nextStatus === 'active') {
        payload.canceledAt = null;
        payload.cancelAtPeriodEnd = false;
      }
    }

    if (updates.cancelAtPeriodEnd !== undefined) {
      payload.cancelAtPeriodEnd = Boolean(updates.cancelAtPeriodEnd);
      if (!payload.cancelAtPeriodEnd && updates.status !== 'canceled') {
        payload.canceledAt = null;
      }
    }

    if (Object.keys(payload).length === 0) {
      const error = new Error('No updates provided for subscription');
      error.status = 422;
      throw error;
    }

    const updated = await CommunitySubscriptionModel.updateByPublicId(subscriptionPublicId, payload);

    await DomainEventModel.record({
      entityType: 'community_subscription',
      entityId: subscriptionPublicId,
      eventType: 'community.subscription.updated',
      payload: {
        communityId: community.id,
        status: updated.status,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd
      },
      performedBy: actorId
    });

    const [tier, user] = await Promise.all([
      updated.tierId ? CommunityPaywallTierModel.findById(updated.tierId) : Promise.resolve(null),
      updated.userId ? UserModel.findById(updated.userId) : Promise.resolve(null)
    ]);

    return hydrateSubscription(updated, buildTierMap(tier ? [tier] : []), buildUserMap(user ? [user] : []));
  }

  static async listAffiliates(communityIdentifier, actorId, filters = {}) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);
    return CommunityAffiliateModel.listByCommunity(community.id, filters);
  }

  static async applyAffiliate(communityIdentifier, userId, payload = {}) {
    const community = await assertCommunity(communityIdentifier);
    const membership = await requireMembership(community.id, userId);
    if (membership.status !== 'active') {
      const error = new Error('Only active members can join the affiliate program');
      error.status = 403;
      throw error;
    }

    const existing = await CommunityAffiliateModel.listByCommunity(community.id).then((affiliates) =>
      affiliates.find((affiliate) => affiliate.userId === userId)
    );

    const referralCode = payload.referralCode
      ? normalizeSlug(payload.referralCode, payload.referralCode).toUpperCase()
      : `AFF-${community.slug}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const referralOwner = await CommunityAffiliateModel.findByReferralCode(referralCode);
    if (referralOwner && referralOwner.userId !== userId) {
      const error = new Error('Referral code already in use');
      error.status = 409;
      throw error;
    }

    if (existing) {
      const status = payload.status ?? (existing.status === 'revoked' ? 'pending' : existing.status);
      return CommunityAffiliateModel.updateById(existing.id, {
        status,
        referralCode,
        metadata: { ...existing.metadata, ...payload.metadata }
      });
    }

    const affiliate = await CommunityAffiliateModel.create({
      communityId: community.id,
      userId,
      status: 'pending',
      referralCode,
      commissionRateBasisPoints: payload.commissionRateBasisPoints ?? 250,
      metadata: payload.metadata ?? {}
    });

    await DomainEventModel.record({
      entityType: 'community_affiliate',
      entityId: String(affiliate.id),
      eventType: 'community.affiliate.applied',
      payload: { communityId: community.id, userId, referralCode },
      performedBy: userId
    });

    return affiliate;
  }

  static async updateAffiliate(communityIdentifier, actorId, affiliateId, updates) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const affiliate = await CommunityAffiliateModel.findById(affiliateId);
    if (!affiliate || affiliate.communityId !== community.id) {
      const error = new Error('Affiliate not found');
      error.status = 404;
      throw error;
    }

    if (updates.status === 'approved') {
      updates.approvedAt = updates.approvedAt ?? new Date().toISOString();
      updates.suspendedAt = null;
      updates.revokedAt = null;
    }
    if (updates.status === 'suspended') {
      updates.suspendedAt = new Date().toISOString();
    }
    if (updates.status === 'revoked') {
      updates.revokedAt = new Date().toISOString();
    }

    const updated = await CommunityAffiliateModel.updateById(affiliateId, updates);

    await DomainEventModel.record({
      entityType: 'community_affiliate',
      entityId: String(updated.id),
      eventType: 'community.affiliate.updated',
      payload: { communityId: community.id, updates },
      performedBy: actorId
    });

    return updated;
  }

  static async recordAffiliatePayout(communityIdentifier, actorId, affiliateId, payload) {
    const community = await assertCommunity(communityIdentifier);
    await requireAdmin(community.id, actorId);

    const affiliate = await CommunityAffiliateModel.findById(affiliateId);
    if (!affiliate || affiliate.communityId !== community.id) {
      const error = new Error('Affiliate not found');
      error.status = 404;
      throw error;
    }

    const payout = await CommunityAffiliatePayoutModel.create({
      affiliateId: affiliate.id,
      amountCents: payload.amountCents,
      status: payload.status ?? 'pending',
      payoutReference: payload.payoutReference,
      scheduledAt: payload.scheduledAt ?? new Date().toISOString(),
      processedAt: payload.processedAt ?? null,
      failureReason: payload.failureReason,
      metadata: payload.metadata ?? {}
    });

    await CommunityAffiliateModel.incrementEarnings(affiliate.id, {
      amountEarnedCents: 0,
      amountPaidCents: payout.amountCents
    });

    await DomainEventModel.record({
      entityType: 'community_affiliate',
      entityId: String(affiliate.id),
      eventType: 'community.affiliate.payout-recorded',
      payload: {
        communityId: community.id,
        payoutId: payout.id,
        amountCents: payout.amountCents,
        status: payout.status
      },
      performedBy: actorId
    });

    return payout;
  }
}
