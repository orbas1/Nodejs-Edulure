import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default class AcquisitionPlanModel {
  static tableName = 'acquisition_plans';

  static addonTableName = 'acquisition_plan_addons';

  static mapPlan(row) {
    if (!row) {
      return null;
    }
    return {
      internalId: row.id,
      id: row.public_id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      amountCents: row.amount_cents != null ? Number(row.amount_cents) : null,
      currency: row.currency ?? 'USD',
      interval: row.billing_interval ?? 'monthly',
      bestValue: Boolean(row.best_value),
      badge: row.badge ?? null,
      features: parseJson(row.features, []),
      metadata: parseJson(row.metadata, {})
    };
  }

  static mapAddon(row) {
    if (!row) {
      return null;
    }
    return {
      id: row.public_id,
      planInternalId: row.plan_id ?? null,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      amountCents: row.amount_cents != null ? Number(row.amount_cents) : null,
      currency: row.currency ?? 'USD',
      interval: row.billing_interval ?? 'one_time',
      optional: Boolean(row.optional),
      upsellDescriptor: row.upsell_descriptor ?? null,
      metadata: parseJson(row.metadata, {})
    };
  }

  static async listPlans(connection = db) {
    const rows = await connection.select('*').from(this.tableName).orderBy('amount_cents', 'asc');
    return rows.map((row) => this.mapPlan(row)).filter(Boolean);
  }

  static async listAddons(connection = db) {
    const rows = await connection.select('*').from(this.addonTableName).orderBy('amount_cents', 'asc');
    return rows.map((row) => this.mapAddon(row)).filter(Boolean);
  }
}
