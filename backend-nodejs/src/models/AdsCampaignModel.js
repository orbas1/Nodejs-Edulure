import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'ads_campaigns';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'created_by as createdBy',
  'name',
  'objective',
  'status',
  'budget_currency as budgetCurrency',
  'budget_daily_cents as budgetDailyCents',
  'spend_currency as spendCurrency',
  'spend_total_cents as spendTotalCents',
  'performance_score as performanceScore',
  'ctr',
  'cpc_cents as cpcCents',
  'cpa_cents as cpaCents',
  'targeting_keywords as targetingKeywords',
  'targeting_audiences as targetingAudiences',
  'targeting_locations as targetingLocations',
  'targeting_languages as targetingLanguages',
  'creative_headline as creativeHeadline',
  'creative_description as creativeDescription',
  'creative_url as creativeUrl',
  'start_at as startAt',
  'end_at as endAt',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function serialiseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function serialiseObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDbPayload(campaign) {
  return {
    public_id: campaign.publicId ?? randomUUID(),
    created_by: campaign.createdBy,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status ?? 'draft',
    budget_currency: campaign.budgetCurrency ?? 'USD',
    budget_daily_cents: Number.parseInt(campaign.budgetDailyCents ?? campaign.budget?.dailyCents ?? 0, 10) || 0,
    spend_currency: campaign.spendCurrency ?? campaign.budgetCurrency ?? 'USD',
    spend_total_cents: Number.parseInt(campaign.spendTotalCents ?? campaign.spend?.totalCents ?? 0, 10) || 0,
    performance_score: Number(campaign.performanceScore ?? 0) || 0,
    ctr: Number(campaign.ctr ?? 0) || 0,
    cpc_cents: Number(campaign.cpcCents ?? campaign.metrics?.averages?.cpcCents ?? 0) || 0,
    cpa_cents: Number(campaign.cpaCents ?? campaign.metrics?.averages?.cpaCents ?? 0) || 0,
    targeting_keywords: JSON.stringify(campaign.targetingKeywords ?? campaign.targeting?.keywords ?? []),
    targeting_audiences: JSON.stringify(campaign.targetingAudiences ?? campaign.targeting?.audiences ?? []),
    targeting_locations: JSON.stringify(campaign.targetingLocations ?? campaign.targeting?.locations ?? []),
    targeting_languages: JSON.stringify(campaign.targetingLanguages ?? campaign.targeting?.languages ?? ['en']),
    creative_headline: campaign.creativeHeadline ?? campaign.creative?.headline ?? '',
    creative_description: campaign.creativeDescription ?? campaign.creative?.description ?? null,
    creative_url: campaign.creativeUrl ?? campaign.creative?.url ?? null,
    start_at: campaign.startAt ?? campaign.schedule?.startAt ?? null,
    end_at: campaign.endAt ?? campaign.schedule?.endAt ?? null,
    metadata: JSON.stringify(campaign.metadata ?? {})
  };
}

export default class AdsCampaignModel {
  static async create(campaign, connection = db) {
    const payload = toDbPayload(campaign);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByPublicIds(publicIds, connection = db) {
    if (!publicIds || publicIds.length === 0) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('public_id', publicIds);

    return rows.map((row) => this.deserialize(row));
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.objective !== undefined) payload.objective = updates.objective;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.budgetCurrency !== undefined) payload.budget_currency = updates.budgetCurrency;
    if (updates.budgetDailyCents !== undefined) payload.budget_daily_cents = updates.budgetDailyCents;
    if (updates.spendCurrency !== undefined) payload.spend_currency = updates.spendCurrency;
    if (updates.spendTotalCents !== undefined) payload.spend_total_cents = updates.spendTotalCents;
    if (updates.performanceScore !== undefined) payload.performance_score = updates.performanceScore;
    if (updates.ctr !== undefined) payload.ctr = updates.ctr;
    if (updates.cpcCents !== undefined) payload.cpc_cents = updates.cpcCents;
    if (updates.cpaCents !== undefined) payload.cpa_cents = updates.cpaCents;
    if (updates.targetingKeywords !== undefined) payload.targeting_keywords = JSON.stringify(updates.targetingKeywords);
    if (updates.targetingAudiences !== undefined) payload.targeting_audiences = JSON.stringify(updates.targetingAudiences);
    if (updates.targetingLocations !== undefined) payload.targeting_locations = JSON.stringify(updates.targetingLocations);
    if (updates.targetingLanguages !== undefined) payload.targeting_languages = JSON.stringify(updates.targetingLanguages);
    if (updates.creativeHeadline !== undefined) payload.creative_headline = updates.creativeHeadline;
    if (updates.creativeDescription !== undefined) payload.creative_description = updates.creativeDescription;
    if (updates.creativeUrl !== undefined) payload.creative_url = updates.creativeUrl;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata);

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection(TABLE).where({ id }).del();
  }

  static async lockByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).where({ public_id: publicId }).forUpdate().first();
    return record ? this.deserialize(record) : null;
  }

  static async list(
    { createdBy, status, search, limit = 20, offset = 0, orderBy = 'updated_at', orderDirection = 'desc' } = {},
    connection = db
  ) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (createdBy !== undefined) {
      query.where({ created_by: createdBy });
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (search) {
      query.andWhere((qb) => {
        qb.whereILike('name', `%${search}%`).orWhereILike('creative_headline', `%${search}%`);
      });
    }

    const rows = await query.orderBy(orderBy, orderDirection).limit(limit).offset(offset);
    return rows.map((row) => this.deserialize(row));
  }

  static async count({ createdBy, status, search } = {}, connection = db) {
    const query = connection(TABLE).count({ total: '*' });

    if (createdBy !== undefined) {
      query.where({ created_by: createdBy });
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (search) {
      query.andWhere((qb) => {
        qb.whereILike('name', `%${search}%`).orWhereILike('creative_headline', `%${search}%`);
      });
    }

    const [{ total }] = await query;
    return Number(total ?? 0);
  }

  static deserialize(record) {
    return {
      ...record,
      budgetDailyCents: Number(record.budgetDailyCents ?? 0),
      spendTotalCents: Number(record.spendTotalCents ?? 0),
      performanceScore: Number(record.performanceScore ?? 0),
      ctr: Number(record.ctr ?? 0),
      cpcCents: Number(record.cpcCents ?? 0),
      cpaCents: Number(record.cpaCents ?? 0),
      targetingKeywords: serialiseArray(record.targetingKeywords),
      targetingAudiences: serialiseArray(record.targetingAudiences),
      targetingLocations: serialiseArray(record.targetingLocations),
      targetingLanguages: serialiseArray(record.targetingLanguages),
      metadata: serialiseObject(record.metadata)
    };
  }
}
