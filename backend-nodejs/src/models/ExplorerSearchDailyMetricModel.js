import db from '../config/database.js';

const TABLE = 'explorer_search_daily_metrics';
const EMPTY_METADATA = '{}';

function parseMetadata(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  return typeof value === 'object' && value !== null ? value : {};
}

function toDomain(row) {
  if (!row) {
    return null;
  }

  const metricDate = row.metric_date ?? row.metricDate;
  return {
    id: row.id,
    metricDate: metricDate instanceof Date ? metricDate : new Date(metricDate),
    entityType: row.entity_type ?? row.entityType,
    searches: Number(row.searches ?? 0),
    zeroResults: Number(row.zero_results ?? row.zeroResults ?? 0),
    displayedResults: Number(row.displayed_results ?? row.displayedResults ?? 0),
    totalResults: Number(row.total_results ?? row.totalResults ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
    averageLatencyMs: Number(row.average_latency_ms ?? row.averageLatencyMs ?? 0),
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at) : row.createdAt ?? null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : row.updatedAt ?? null
  };
}

function normaliseDate(value) {
  const candidate = value ? new Date(value) : new Date();
  if (Number.isNaN(candidate.valueOf())) {
    throw new TypeError('Invalid metric date provided to ExplorerSearchDailyMetricModel');
  }
  return new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate()));
}

function withTransaction(connection, handler) {
  if (connection?.isTransaction) {
    return handler(connection);
  }
  return connection.transaction(async (trx) => {
    trx.isTransaction = true;
    const result = await handler(trx);
    return result;
  });
}

function applyForUpdate(builder) {
  const client = builder?.client?.config?.client;
  if (client === 'sqlite3' || client === 'better-sqlite3') {
    return builder;
  }
  if (typeof builder.forUpdate === 'function') {
    return builder.forUpdate();
  }
  return builder;
}

function normaliseEntityType(entityType) {
  if (typeof entityType !== 'string') {
    throw new TypeError('Explorer search metrics require a valid entity type');
  }
  const trimmed = entityType.trim();
  if (!trimmed) {
    throw new TypeError('Explorer search metrics require a non-empty entity type');
  }
  return trimmed;
}

function toNonNegativeInteger(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }
  return Math.floor(number);
}

function toLatency(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }
  return Math.round(number);
}

export default class ExplorerSearchDailyMetricModel {
  static async incrementForEvent(
    {
      metricDate,
      entityType,
      isZeroResult,
      displayedHits,
      totalHits,
      latencyMs
    },
    connection = db
  ) {
    const date = normaliseDate(metricDate);
    const normalisedEntityType = normaliseEntityType(entityType);
    const zeroDelta = isZeroResult ? 1 : 0;
    const displayedDelta = toNonNegativeInteger(displayedHits);
    const totalDelta = toNonNegativeInteger(totalHits);
    const latency = toLatency(latencyMs);

    return withTransaction(connection, async (trx) => {
      const existingQuery = trx(TABLE).where({ metric_date: date, entity_type: normalisedEntityType });
      const existing = await applyForUpdate(existingQuery).first();

      if (existing) {
        const currentSearches = Math.max(0, Number(existing.searches ?? 0));
        const searches = currentSearches + 1;
        const zeroResults = Math.max(0, Number(existing.zero_results ?? 0)) + zeroDelta;
        const displayedResults = Math.max(0, Number(existing.displayed_results ?? 0)) + displayedDelta;
        const totalResults = Math.max(0, Number(existing.total_results ?? 0)) + totalDelta;
        const currentAverage = Math.max(0, Number(existing.average_latency_ms ?? 0));
        const totalLatency = currentAverage * currentSearches + latency;
        const averageLatencyMs = searches > 0 ? Math.round(totalLatency / searches) : 0;

        await trx(TABLE)
          .where({ id: existing.id })
          .update({
            searches,
            zero_results: zeroResults,
            displayed_results: displayedResults,
            total_results: totalResults,
            average_latency_ms: averageLatencyMs,
            updated_at: trx.fn.now()
          });

        const row = await trx(TABLE).where({ id: existing.id }).first();
        return toDomain(row);
      }

      const payload = {
        metric_date: date,
        entity_type: normalisedEntityType,
        searches: 1,
        zero_results: zeroDelta,
        displayed_results: displayedDelta,
        total_results: totalDelta,
        clicks: 0,
        conversions: 0,
        average_latency_ms: latency,
        metadata: EMPTY_METADATA
      };

      const [id] = await trx(TABLE).insert(payload);
      const row = await trx(TABLE).where({ id }).first();
      return toDomain(row);
    });
  }

  static async incrementClicks({ metricDate, entityType, clicks = 1, conversions = 0 }, connection = db) {
    const date = normaliseDate(metricDate);
    const normalisedEntityType = normaliseEntityType(entityType);
    const clicksDelta = toNonNegativeInteger(clicks);
    const conversionsDelta = toNonNegativeInteger(conversions);

    return withTransaction(connection, async (trx) => {
      const existingQuery = trx(TABLE).where({ metric_date: date, entity_type: normalisedEntityType });
      const existing = await applyForUpdate(existingQuery).first();

      if (existing) {
        const updatedClicks = Math.max(0, Number(existing.clicks ?? 0)) + clicksDelta;
        const updatedConversions = Math.max(0, Number(existing.conversions ?? 0)) + conversionsDelta;

        await trx(TABLE)
          .where({ id: existing.id })
          .update({
            clicks: updatedClicks,
            conversions: updatedConversions,
            updated_at: trx.fn.now()
          });

        const row = await trx(TABLE).where({ id: existing.id }).first();
        return toDomain(row);
      }

      const payload = {
        metric_date: date,
        entity_type: normalisedEntityType,
        searches: 0,
        zero_results: 0,
        displayed_results: 0,
        total_results: 0,
        clicks: clicksDelta,
        conversions: conversionsDelta,
        average_latency_ms: 0,
        metadata: EMPTY_METADATA
      };

      const [id] = await trx(TABLE).insert(payload);
      const row = await trx(TABLE).where({ id }).first();
      return toDomain(row);
    });
  }

  static async listBetween({ since, until }, connection = db) {
    const query = connection(TABLE).select('*');
    if (since) {
      query.andWhere('metric_date', '>=', normaliseDate(since));
    }
    if (until) {
      query.andWhere('metric_date', '<=', normaliseDate(until));
    }
    query.orderBy('metric_date', 'asc');
    const rows = await query;
    return rows.map(toDomain);
  }

  static async aggregateRange({ since, until }, connection = db) {
    const query = connection(TABLE)
      .select(
        'entity_type as entityType',
        connection.raw('SUM(searches) AS searches'),
        connection.raw('SUM(zero_results) AS zeroResults'),
        connection.raw('SUM(displayed_results) AS displayedResults'),
        connection.raw('SUM(total_results) AS totalResults'),
        connection.raw('SUM(clicks) AS clicks'),
        connection.raw('SUM(conversions) AS conversions'),
        connection.raw('SUM(average_latency_ms * searches) AS latencyTotal')
      )
      .groupBy('entity_type');

    if (since) {
      query.andWhere('metric_date', '>=', normaliseDate(since));
    }
    if (until) {
      query.andWhere('metric_date', '<=', normaliseDate(until));
    }

    const rows = await query;
    const results = new Map();
    for (const row of rows) {
      const searches = Number(row.searches ?? 0);
      const latencyTotal = Number(row.latencyTotal ?? 0);
      results.set(row.entityType, {
        entityType: row.entityType,
        searches,
        zeroResults: Number(row.zeroResults ?? 0),
        displayedResults: Number(row.displayedResults ?? 0),
        totalResults: Number(row.totalResults ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversions: Number(row.conversions ?? 0),
        averageLatencyMs: searches > 0 ? Math.round(latencyTotal / searches) : 0
      });
    }
    return results;
  }
}
