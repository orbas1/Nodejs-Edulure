import db from '../config/database.js';

function parseJson(value, fallback = {}) {
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

function toDomain(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    eventUuid: row.event_uuid,
    userId: row.user_id ?? null,
    sessionId: row.session_id,
    traceId: row.trace_id ?? null,
    query: row.query,
    resultTotal: Number(row.result_total ?? 0),
    isZeroResult: Boolean(row.is_zero_result),
    latencyMs: Number(row.latency_ms ?? 0),
    filters: parseJson(row.filters, {}),
    globalFilters: parseJson(row.global_filters, {}),
    sortPreferences: parseJson(row.sort_preferences, {}),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at
  };
}

export default class ExplorerSearchEventModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      event_uuid: payload.eventUuid,
      user_id: payload.userId ?? null,
      session_id: payload.sessionId,
      trace_id: payload.traceId ?? null,
      query: payload.query,
      result_total: Number(payload.resultTotal ?? 0),
      is_zero_result: Boolean(payload.isZeroResult),
      latency_ms: Number(payload.latencyMs ?? 0),
      filters: JSON.stringify(payload.filters ?? {}),
      global_filters: JSON.stringify(payload.globalFilters ?? {}),
      sort_preferences: JSON.stringify(payload.sortPreferences ?? {}),
      metadata: JSON.stringify(payload.metadata ?? {})
    };

    const [id] = await connection('explorer_search_events').insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('explorer_search_events').where({ id }).first();
    return toDomain(row);
  }

  static async findByUuid(eventUuid, connection = db) {
    const row = await connection('explorer_search_events').where({ event_uuid: eventUuid }).first();
    return toDomain(row);
  }

  static async listBetween({ since, until }, connection = db) {
    const query = connection('explorer_search_events').select('*');
    if (since) {
      query.andWhere('created_at', '>=', since);
    }
    if (until) {
      query.andWhere('created_at', '<=', until);
    }
    query.orderBy('created_at', 'desc');
    const rows = await query;
    return rows.map(toDomain);
  }

  static async topQueries({ since, limit = 5, zeroResultOnly = false }, connection = db) {
    const query = connection('explorer_search_events')
      .select(
        connection.raw('LOWER(TRIM(query)) AS normalized_query'),
        connection.raw('COUNT(*) AS searches')
      )
      .whereNotNull('query')
      .groupByRaw('LOWER(TRIM(query))')
      .orderBy('searches', 'desc')
      .limit(limit);

    if (since) {
      query.andWhere('created_at', '>=', since);
    }
    if (zeroResultOnly) {
      query.andWhere('is_zero_result', true);
    }

    const rows = await query;
    return rows
      .filter((row) => row.normalized_query)
      .map((row) => ({ query: row.normalized_query, searches: Number(row.searches ?? 0) }));
  }

  static async aggregateRange({ since }, connection = db) {
    const query = connection('explorer_search_events').select(
      connection.raw('COUNT(*) AS searches'),
      connection.raw('SUM(CASE WHEN is_zero_result THEN 1 ELSE 0 END) AS zeroResults'),
      connection.raw('SUM(result_total) AS totalResults'),
      connection.raw('AVG(latency_ms) AS averageLatencyMs'),
      connection.raw('COUNT(DISTINCT user_id) AS uniqueUsers')
    );
    if (since) {
      query.andWhere('created_at', '>=', since);
    }
    const row = await query.first();
    return {
      searches: Number(row?.searches ?? 0),
      zeroResults: Number(row?.zeroResults ?? 0),
      totalResults: Number(row?.totalResults ?? 0),
      averageLatencyMs: row?.averageLatencyMs ? Number(row.averageLatencyMs) : 0,
      uniqueUsers: Number(row?.uniqueUsers ?? 0)
    };
  }
}
