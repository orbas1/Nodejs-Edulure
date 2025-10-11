import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    publicId: record.public_id,
    communityId: record.community_id,
    userId: record.user_id,
    tierId: record.tier_id,
    status: record.status,
    startedAt: record.started_at,
    currentPeriodStart: record.current_period_start,
    currentPeriodEnd: record.current_period_end,
    cancelAtPeriodEnd: Boolean(record.cancel_at_period_end),
    canceledAt: record.canceled_at,
    expiresAt: record.expires_at,
    provider: record.provider,
    providerCustomerId: record.provider_customer_id,
    providerSubscriptionId: record.provider_subscription_id,
    providerStatus: record.provider_status,
    latestPaymentIntentId: record.latest_payment_intent_id,
    affiliateId: record.affiliate_id,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunitySubscriptionModel {
  static async create(subscription, connection = db) {
    const payload = {
      public_id: subscription.publicId,
      community_id: subscription.communityId,
      user_id: subscription.userId,
      tier_id: subscription.tierId,
      status: subscription.status ?? 'incomplete',
      started_at: subscription.startedAt ?? null,
      current_period_start: subscription.currentPeriodStart ?? null,
      current_period_end: subscription.currentPeriodEnd ?? null,
      cancel_at_period_end: subscription.cancelAtPeriodEnd ?? false,
      canceled_at: subscription.canceledAt ?? null,
      expires_at: subscription.expiresAt ?? null,
      provider: subscription.provider,
      provider_customer_id: subscription.providerCustomerId ?? null,
      provider_subscription_id: subscription.providerSubscriptionId ?? null,
      provider_status: subscription.providerStatus ?? null,
      latest_payment_intent_id: subscription.latestPaymentIntentId ?? null,
      affiliate_id: subscription.affiliateId ?? null,
      metadata: JSON.stringify(subscription.metadata ?? {})
    };
    const [id] = await connection('community_subscriptions').insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.startedAt !== undefined) payload.started_at = updates.startedAt;
    if (updates.currentPeriodStart !== undefined) payload.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) payload.current_period_end = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) payload.cancel_at_period_end = updates.cancelAtPeriodEnd ? 1 : 0;
    if (updates.canceledAt !== undefined) payload.canceled_at = updates.canceledAt;
    if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;
    if (updates.providerStatus !== undefined) payload.provider_status = updates.providerStatus;
    if (updates.providerSubscriptionId !== undefined)
      payload.provider_subscription_id = updates.providerSubscriptionId ?? null;
    if (updates.providerCustomerId !== undefined) payload.provider_customer_id = updates.providerCustomerId ?? null;
    if (updates.latestPaymentIntentId !== undefined)
      payload.latest_payment_intent_id = updates.latestPaymentIntentId ?? null;
    if (updates.affiliateId !== undefined) payload.affiliate_id = updates.affiliateId ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_subscriptions')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const record = await connection('community_subscriptions').select('id').where({ public_id: publicId }).first();
    if (!record) {
      return null;
    }
    return this.updateById(record.id, updates, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_subscriptions').where({ id }).first();
    return mapRecord(record);
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection('community_subscriptions').where({ public_id: publicId }).first();
    return mapRecord(record);
  }

  static async findLatestForUser(communityId, userId, connection = db) {
    const record = await connection('community_subscriptions')
      .where({ community_id: communityId, user_id: userId })
      .orderBy('created_at', 'desc')
      .first();
    return mapRecord(record);
  }

  static async listByCommunity(communityId, { status } = {}, connection = db) {
    const query = connection('community_subscriptions').where({ community_id: communityId });
    if (status) {
      query.andWhere({ status });
    }
    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }

  static async listByUser(userId, connection = db) {
    const rows = await connection('community_subscriptions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
