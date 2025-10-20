import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }
  return fallback;
}

function serialiseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify(fallback);
  }
}

function toNonEmptyString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be provided as a non-empty string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new TypeError(`${fieldName} must not be empty`);
  }
  return trimmed;
}

function toOptionalString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return String(value);
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

function normaliseDateBoundary(value, label) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`Invalid ${label} boundary supplied to ExplorerSearchEventModel`);
  }
  return date;
}

function toOptionalInteger(value, fieldName) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError(`${fieldName} must be a non-negative integer`);
  }
  return number;
}

function normaliseLimit(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(number), 50);
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
    const eventUuid = toNonEmptyString(payload.eventUuid, 'eventUuid');
    const sessionId = toNonEmptyString(payload.sessionId, 'sessionId');
    const query = toOptionalString(payload.query) ?? '';
    const userId = toOptionalInteger(payload.userId, 'userId');
    const traceId = toOptionalString(payload.traceId);
    const resultTotal = toNonNegativeInteger(payload.resultTotal);
    const latency = toLatency(payload.latencyMs);

    const insertPayload = {
      event_uuid: eventUuid,
      user_id: userId,
      session_id: sessionId,
      trace_id: traceId,
      query,
      result_total: resultTotal,
      is_zero_result: Boolean(payload.isZeroResult),
      latency_ms: latency,
      filters: serialiseJson(payload.filters ?? {}),
      global_filters: serialiseJson(payload.globalFilters ?? {}),
      sort_preferences: serialiseJson(payload.sortPreferences ?? {}),
      metadata: serialiseJson(payload.metadata ?? {})
    };

    const [id] = await connection('explorer_search_events').insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('explorer_search_events').where({ id }).first();
    return toDomain(row);
  }

  static async findByUuid(eventUuid, connection = db) {
    const uuid = toNonEmptyString(eventUuid, 'eventUuid');
    const row = await connection('explorer_search_events').where({ event_uuid: uuid }).first();
    return toDomain(row);
  }

  static async listBetween({ since, until }, connection = db) {
    const query = connection('explorer_search_events').select('*');
    const sinceDate = normaliseDateBoundary(since, 'since');
    const untilDate = normaliseDateBoundary(until, 'until');
    if (sinceDate && untilDate && sinceDate > untilDate) {
      throw new RangeError('since must be before or equal to until when listing explorer search events');
    }
    if (sinceDate) {
      query.andWhere('created_at', '>=', sinceDate);
    }
    if (untilDate) {
      query.andWhere('created_at', '<=', untilDate);
    }
    query.orderBy('created_at', 'desc');
    const rows = await query;
    return rows.map(toDomain);
  }

  static async topQueries({ since, limit = 5, zeroResultOnly = false }, connection = db) {
    const safeLimit = normaliseLimit(limit, 5);
    const query = connection('explorer_search_events')
      .select(
        connection.raw('LOWER(TRIM(query)) AS normalized_query'),
        connection.raw('COUNT(*) AS searches')
      )
      .whereNotNull('query')
      .groupByRaw('LOWER(TRIM(query))')
      .orderBy('searches', 'desc')
      .limit(safeLimit);

    const sinceDate = normaliseDateBoundary(since, 'since');
    if (sinceDate) {
      query.andWhere('created_at', '>=', sinceDate);
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
    const sinceDate = normaliseDateBoundary(since, 'since');
    if (sinceDate) {
      query.andWhere('created_at', '>=', sinceDate);
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
