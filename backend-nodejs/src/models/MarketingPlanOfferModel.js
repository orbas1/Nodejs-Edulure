import db from '../config/database.js';
import MarketingPlanFeatureModel from './MarketingPlanFeatureModel.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    publicId: record.public_id,
    name: record.name,
    headline: record.headline,
    tagline: record.tagline ?? null,
    priceCents: Number(record.price_cents ?? 0),
    currency: record.currency,
    billingInterval: record.billing_interval,
    isFeatured: Boolean(record.is_featured),
    badge: parseJson(record.badge, {}),
    metadata: parseJson(record.metadata, {}),
    upsell: parseJson(record.upsell, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class MarketingPlanOfferModel {
  static async list({ includeFeatures = true } = {}, connection = db) {
    const rows = await connection('marketing_plan_offers')
      .select('*')
      .orderBy('is_featured', 'desc')
      .orderBy('price_cents', 'asc');
    const plans = rows.map((row) => mapRecord(row)).filter(Boolean);
    if (!includeFeatures || plans.length === 0) {
      return plans.map((plan) => ({ ...plan, features: [] }));
    }
    const features = await MarketingPlanFeatureModel.listByPlanIds(
      plans.map((plan) => plan.id),
      connection
    );
    const grouped = features.reduce((acc, feature) => {
      if (!acc.has(feature.planId)) {
        acc.set(feature.planId, []);
      }
      acc.get(feature.planId).push(feature);
      return acc;
    }, new Map());
    return plans.map((plan) => ({ ...plan, features: grouped.get(plan.id) ?? [] }));
  }

  static async findByPublicId(publicId, { includeFeatures = true } = {}, connection = db) {
    if (!publicId) {
      return null;
    }
    const record = await connection('marketing_plan_offers').where({ public_id: publicId }).first();
    const plan = mapRecord(record);
    if (!plan) {
      return null;
    }
    if (!includeFeatures) {
      return { ...plan, features: [] };
    }
    const features = await MarketingPlanFeatureModel.listByPlanId(plan.id, connection);
    return { ...plan, features };
  }
}
