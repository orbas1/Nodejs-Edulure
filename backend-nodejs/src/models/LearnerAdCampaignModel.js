import db from '../config/database.js';

const TABLE = 'learner_ad_campaigns';

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    objective: row.objective ?? null,
    dailyBudgetCents: Number(row.daily_budget_cents ?? 0),
    totalSpendCents: Number(row.total_spend_cents ?? 0),
    startAt: row.start_at,
    endAt: row.end_at,
    lastSyncedAt: row.last_synced_at,
    metrics: parseJson(row.metrics, {}),
    targeting: parseJson(row.targeting, {}),
    creative: parseJson(row.creative, {}),
    placements: parseJson(row.placements, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerAdCampaignModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'name',
        'status',
        'objective',
        'daily_budget_cents',
        'total_spend_cents',
        'start_at',
        'end_at',
        'last_synced_at',
        'metrics',
        'targeting',
        'creative',
        'placements',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ id, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async create(campaign, connection = db) {
    const payload = {
      user_id: campaign.userId,
      name: campaign.name,
      status: campaign.status ?? 'draft',
      objective: campaign.objective ?? null,
      daily_budget_cents: campaign.dailyBudgetCents ?? 0,
      total_spend_cents: campaign.totalSpendCents ?? 0,
      start_at: campaign.startAt ?? null,
      end_at: campaign.endAt ?? null,
      last_synced_at: campaign.lastSyncedAt ?? null,
      metrics: JSON.stringify(campaign.metrics ?? {}),
      targeting: JSON.stringify(campaign.targeting ?? {}),
      creative: JSON.stringify(campaign.creative ?? {}),
      placements: JSON.stringify(campaign.placements ?? []),
      metadata: JSON.stringify(campaign.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(campaign.userId, id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.objective !== undefined) payload.objective = updates.objective ?? null;
    if (updates.dailyBudgetCents !== undefined) payload.daily_budget_cents = updates.dailyBudgetCents ?? 0;
    if (updates.totalSpendCents !== undefined) payload.total_spend_cents = updates.totalSpendCents ?? 0;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt ?? null;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt ?? null;
    if (updates.lastSyncedAt !== undefined) payload.last_synced_at = updates.lastSyncedAt ?? null;
    if (updates.metrics !== undefined) payload.metrics = JSON.stringify(updates.metrics ?? {});
    if (updates.targeting !== undefined) payload.targeting = JSON.stringify(updates.targeting ?? {});
    if (updates.creative !== undefined) payload.creative = JSON.stringify(updates.creative ?? {});
    if (updates.placements !== undefined) payload.placements = JSON.stringify(updates.placements ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length) {
      await connection(TABLE).where({ id }).update(payload);
    }
    if (updates.userId) {
      return this.findByIdForUser(updates.userId, id, connection);
    }
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return 0;
    return connection(TABLE).where({ id, user_id: userId }).del();
  }
}
