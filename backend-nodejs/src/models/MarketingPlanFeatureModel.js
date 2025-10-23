import db from '../config/database.js';

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
    planId: record.plan_id,
    position: Number(record.position ?? 0),
    label: record.label,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class MarketingPlanFeatureModel {
  static async listByPlanIds(planIds, connection = db) {
    if (!Array.isArray(planIds) || planIds.length === 0) {
      return [];
    }
    const rows = await connection('marketing_plan_features')
      .whereIn('plan_id', planIds)
      .orderBy(['plan_id', 'position']);
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }

  static async listByPlanId(planId, connection = db) {
    if (!planId) {
      return [];
    }
    const rows = await connection('marketing_plan_features')
      .where({ plan_id: planId })
      .orderBy('position', 'asc');
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }
}
