import db from '../config/database.js';
import { castAsBigInt } from '../database/utils/casts.js';

const TABLE = 'ads_campaign_metrics_daily';

const BASE_COLUMNS = [
  'id',
  'campaign_id as campaignId',
  'metric_date as metricDate',
  'impressions',
  'clicks',
  'conversions',
  'spend_cents as spendCents',
  'revenue_cents as revenueCents',
  'metadata'
];

function parseJson(value) {
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

export default class AdsCampaignMetricModel {
  static async upsertDaily(campaignId, metricDate, metrics, connection = db) {
    const payload = {
      campaign_id: campaignId,
      metric_date: metricDate,
      impressions: Number(metrics.impressions ?? 0),
      clicks: Number(metrics.clicks ?? 0),
      conversions: Number(metrics.conversions ?? 0),
      spend_cents: Number(metrics.spendCents ?? 0),
      revenue_cents: Number(metrics.revenueCents ?? 0),
      metadata: JSON.stringify(metrics.metadata ?? {})
    };

    await connection(TABLE)
      .insert(payload)
      .onConflict(['campaign_id', 'metric_date'])
      .merge({
        impressions: payload.impressions,
        clicks: payload.clicks,
        conversions: payload.conversions,
        spend_cents: payload.spend_cents,
        revenue_cents: payload.revenue_cents,
        metadata: payload.metadata
      });

    return this.findByCampaignAndDate(campaignId, metricDate, connection);
  }

  static async findByCampaignAndDate(campaignId, metricDate, connection = db) {
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ campaign_id: campaignId, metric_date: metricDate })
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async listByCampaign(campaignId, { limit = 30, since, until } = {}, connection = db) {
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ campaign_id: campaignId })
      .orderBy('metric_date', 'desc')
      .limit(limit);

    if (since) {
      query.andWhere('metric_date', '>=', since);
    }
    if (until) {
      query.andWhere('metric_date', '<=', until);
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static async summariseByCampaignIds(campaignIds, { since, until } = {}, connection = db) {
    if (!campaignIds?.length) {
      return new Map();
    }

    const query = connection(TABLE)
      .select({
        campaignId: 'campaign_id',
        impressions: castAsBigInt(connection, 'SUM(impressions)'),
        clicks: castAsBigInt(connection, 'SUM(clicks)'),
        conversions: castAsBigInt(connection, 'SUM(conversions)'),
        spendCents: castAsBigInt(connection, 'SUM(spend_cents)'),
        revenueCents: castAsBigInt(connection, 'SUM(revenue_cents)'),
        lastMetricDate: connection.raw('MAX(metric_date)')
      })
      .whereIn('campaign_id', campaignIds)
      .groupBy('campaign_id');

    if (since) {
      query.andWhere('metric_date', '>=', since);
    }
    if (until) {
      query.andWhere('metric_date', '<=', until);
    }

    const rows = await query;
    const results = new Map();
    for (const row of rows) {
      results.set(Number(row.campaignId), {
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversions: Number(row.conversions ?? 0),
        spendCents: Number(row.spendCents ?? 0),
        revenueCents: Number(row.revenueCents ?? 0),
        lastMetricDate: row.lastMetricDate ? new Date(row.lastMetricDate) : null
      });
    }
    return results;
  }

  static async summariseWindow(campaignId, { windowDays = 7 } = {}, connection = db) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays + 1);
    since.setUTCHours(0, 0, 0, 0);

    const rows = await connection(TABLE)
      .select({
        impressions: castAsBigInt(connection, 'SUM(impressions)'),
        clicks: castAsBigInt(connection, 'SUM(clicks)'),
        conversions: castAsBigInt(connection, 'SUM(conversions)'),
        spendCents: castAsBigInt(connection, 'SUM(spend_cents)'),
        revenueCents: castAsBigInt(connection, 'SUM(revenue_cents)')
      })
      .where({ campaign_id: campaignId })
      .andWhere('metric_date', '>=', since)
      .first();

    return {
      impressions: Number(rows?.impressions ?? 0),
      clicks: Number(rows?.clicks ?? 0),
      conversions: Number(rows?.conversions ?? 0),
      spendCents: Number(rows?.spendCents ?? 0),
      revenueCents: Number(rows?.revenueCents ?? 0)
    };
  }

  static deserialize(record) {
    return {
      ...record,
      impressions: Number(record.impressions ?? 0),
      clicks: Number(record.clicks ?? 0),
      conversions: Number(record.conversions ?? 0),
      spendCents: Number(record.spendCents ?? 0),
      revenueCents: Number(record.revenueCents ?? 0),
      metadata: parseJson(record.metadata),
      metricDate: record.metricDate instanceof Date ? record.metricDate : new Date(record.metricDate)
    };
  }
}
