import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.community_id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    priceCents: Number(record.price_cents),
    currency: record.currency,
    billingInterval: record.billing_interval,
    trialPeriodDays: Number(record.trial_period_days ?? 0),
    isActive: Boolean(record.is_active),
    benefits: parseJson(record.benefits, []),
    metadata: parseJson(record.metadata, {}),
    stripePriceId: record.stripe_price_id,
    paypalPlanId: record.paypal_plan_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunityPaywallTierModel {
  static async create(tier, connection = db) {
    const payload = {
      community_id: tier.communityId,
      slug: tier.slug,
      name: tier.name,
      description: tier.description ?? null,
      price_cents: tier.priceCents,
      currency: tier.currency,
      billing_interval: tier.billingInterval,
      trial_period_days: tier.trialPeriodDays ?? 0,
      is_active: tier.isActive ?? true,
      benefits: JSON.stringify(tier.benefits ?? []),
      metadata: JSON.stringify(tier.metadata ?? {}),
      stripe_price_id: tier.stripePriceId ?? null,
      paypal_plan_id: tier.paypalPlanId ?? null
    };
    const [id] = await connection('community_paywall_tiers').insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.priceCents !== undefined) payload.price_cents = updates.priceCents;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.billingInterval !== undefined) payload.billing_interval = updates.billingInterval;
    if (updates.trialPeriodDays !== undefined) payload.trial_period_days = updates.trialPeriodDays;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive ? 1 : 0;
    if (updates.benefits !== undefined) payload.benefits = JSON.stringify(updates.benefits ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.stripePriceId !== undefined) payload.stripe_price_id = updates.stripePriceId ?? null;
    if (updates.paypalPlanId !== undefined) payload.paypal_plan_id = updates.paypalPlanId ?? null;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_paywall_tiers')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_paywall_tiers').where({ id }).first();
    return mapRecord(record);
  }

  static async findByCommunityAndSlug(communityId, slug, connection = db) {
    const record = await connection('community_paywall_tiers')
      .where({ community_id: communityId, slug })
      .first();
    return mapRecord(record);
  }

  static async listByCommunity(communityId, { includeInactive = false } = {}, connection = db) {
    const query = connection('community_paywall_tiers').where({ community_id: communityId });
    if (!includeInactive) {
      query.andWhere({ is_active: 1 });
    }
    const rows = await query.orderBy('price_cents', 'asc');
    return rows.map((row) => mapRecord(row));
  }
}
