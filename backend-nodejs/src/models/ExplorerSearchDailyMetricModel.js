import db from '../config/database.js';

function toDomain(row) {
  return {
    id: row.id,
    metricDate: row.metric_date instanceof Date ? row.metric_date : new Date(row.metric_date),
    entityType: row.entity_type,
    searches: Number(row.searches ?? 0),
    zeroResults: Number(row.zero_results ?? 0),
    displayedResults: Number(row.displayed_results ?? 0),
    totalResults: Number(row.total_results ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
    averageLatencyMs: Number(row.average_latency_ms ?? 0),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: row.created_at ?? null
  };
}

function normaliseDate(value) {
  const date = value ? new Date(value) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
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
    const zeroDelta = isZeroResult ? 1 : 0;
    const displayedDelta = Number(displayedHits ?? 0);
    const totalDelta = Number(totalHits ?? 0);
    const latency = Number(latencyMs ?? 0);

    const query = `
      INSERT INTO explorer_search_daily_metrics
        (metric_date, entity_type, searches, zero_results, displayed_results, total_results, clicks, conversions, average_latency_ms, metadata)
      VALUES
        (?, ?, 1, ?, ?, ?, 0, 0, ?, '{}')
      ON CONFLICT (metric_date, entity_type) DO UPDATE SET
        searches = explorer_search_daily_metrics.searches + 1,
        zero_results = explorer_search_daily_metrics.zero_results + ?,
        displayed_results = explorer_search_daily_metrics.displayed_results + ?,
        total_results = explorer_search_daily_metrics.total_results + ?,
        average_latency_ms = CASE
          WHEN explorer_search_daily_metrics.searches + 1 = 0 THEN 0
          ELSE ROUND(((explorer_search_daily_metrics.average_latency_ms * explorer_search_daily_metrics.searches) + ?) /
            (explorer_search_daily_metrics.searches + 1))
        END
      RETURNING *
    `;

    const bindings = [
      date,
      entityType,
      zeroDelta,
      displayedDelta,
      totalDelta,
      latency,
      zeroDelta,
      displayedDelta,
      totalDelta,
      latency
    ];

    const result = await connection.raw(query, bindings);
    return toDomain(result.rows?.[0] ?? result[0]);
  }

  static async incrementClicks({ metricDate, entityType, clicks = 1, conversions = 0 }, connection = db) {
    const date = normaliseDate(metricDate);
    const query = `
      INSERT INTO explorer_search_daily_metrics
        (metric_date, entity_type, searches, zero_results, displayed_results, total_results, clicks, conversions, average_latency_ms, metadata)
      VALUES
        (?, ?, 0, 0, 0, 0, ?, ?, 0, '{}')
      ON CONFLICT (metric_date, entity_type) DO UPDATE SET
        clicks = explorer_search_daily_metrics.clicks + ?,
        conversions = explorer_search_daily_metrics.conversions + ?
      RETURNING *
    `;
    const bindings = [date, entityType, Number(clicks ?? 0), Number(conversions ?? 0), Number(clicks ?? 0), Number(conversions ?? 0)];
    const result = await connection.raw(query, bindings);
    return toDomain(result.rows?.[0] ?? result[0]);
  }

  static async listBetween({ since, until }, connection = db) {
    const query = connection('explorer_search_daily_metrics').select('*');
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
    const query = connection('explorer_search_daily_metrics')
      .select({
        entityType: 'entity_type',
        searches: connection.raw('SUM(searches)::bigint'),
        zeroResults: connection.raw('SUM(zero_results)::bigint'),
        displayedResults: connection.raw('SUM(displayed_results)::bigint'),
        totalResults: connection.raw('SUM(total_results)::bigint'),
        clicks: connection.raw('SUM(clicks)::bigint'),
        conversions: connection.raw('SUM(conversions)::bigint'),
        averageLatencyMs: connection.raw('AVG(NULLIF(average_latency_ms, 0))::float')
      })
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
      results.set(row.entityType, {
        entityType: row.entityType,
        searches: Number(row.searches ?? 0),
        zeroResults: Number(row.zeroResults ?? 0),
        displayedResults: Number(row.displayedResults ?? 0),
        totalResults: Number(row.totalResults ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversions: Number(row.conversions ?? 0),
        averageLatencyMs: row.averageLatencyMs ? Number(row.averageLatencyMs) : 0
      });
    }
    return results;
  }
}
