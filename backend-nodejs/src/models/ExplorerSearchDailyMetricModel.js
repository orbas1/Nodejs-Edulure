import db from '../config/database.js';

const TABLE = 'explorer_search_daily_metrics';
const EMPTY_METADATA = '{}';
const DEFAULT_PREVIEW_LIMIT = 8;

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

function toTimestamp(value, { label = 'timestamp' } = {}) {
  if (!value) {
    const fallback = new Date();
    return Number.isNaN(fallback.valueOf()) ? new Date() : fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`Invalid ${label} provided to ExplorerSearchDailyMetricModel`);
  }
  return date;
}

function describeDeltaSeconds(refreshedAt) {
  const reference = toTimestamp(refreshedAt, { label: 'refresh timestamp' });
  const deltaMs = Date.now() - reference.getTime();
  const deltaSeconds = Math.max(0, Math.round(deltaMs / 1000));
  return { reference, deltaSeconds };
}

function normaliseBadge(badge) {
  if (!badge) {
    return null;
  }
  if (typeof badge === 'string') {
    const trimmed = badge.trim();
    return trimmed ? { label: trimmed } : null;
  }
  if (typeof badge !== 'object') {
    return null;
  }
  const label = badge.label ?? badge.name ?? badge.type ?? null;
  if (!label) {
    return null;
  }
  const trimmed = String(label).trim();
  if (!trimmed) {
    return null;
  }
  const tone = badge.tone ?? badge.variant ?? null;
  return tone ? { label: trimmed, tone: String(tone) } : { label: trimmed };
}

function normalisePreviewDigest(preview, entityType) {
  if (!preview) {
    return null;
  }

  const identifier =
    preview.entityId ?? preview.entityPublicId ?? preview.id ?? preview.slug ?? null;
  if (!identifier) {
    return null;
  }

  const titleCandidate =
    preview.title ?? preview.name ?? preview.headline ?? preview.label ?? null;
  if (!titleCandidate) {
    return null;
  }
  const title = String(titleCandidate).trim();
  if (!title) {
    return null;
  }

  const subtitleCandidate =
    preview.subtitle ?? preview.description ?? preview.previewSummary ?? null;
  const subtitle = subtitleCandidate ? String(subtitleCandidate).trim() : null;
  const thumbnailUrl =
    preview.previewImageUrl ??
    preview.thumbnailUrl ??
    preview.avatarUrl ??
    preview.coverImageUrl ??
    preview.media?.[0]?.url ??
    preview.assets?.[0]?.url ??
    null;

  const ratingAverage =
    preview.rating?.average ?? preview.metrics?.rating?.average ?? null;
  const ratingCount = preview.rating?.count ?? preview.metrics?.rating?.count ?? null;
  const priceCurrency = preview.price?.currency ?? preview.metrics?.price?.currency ?? null;
  const priceAmountMinor =
    preview.price?.amountMinor ?? preview.metrics?.price?.amountMinor ?? null;
  const monetisationTag =
    preview.monetisationTag ?? preview.monetisation?.tag ?? preview.sponsorshipTag ?? null;

  const badges = Array.isArray(preview.badges)
    ? preview.badges.map(normaliseBadge).filter(Boolean).slice(0, 3)
    : [];

  return {
    id: String(identifier),
    entityType: entityType ?? preview.entityType ?? null,
    title,
    subtitle: subtitle && subtitle.length ? subtitle : null,
    thumbnailUrl: thumbnailUrl ?? null,
    ratingAverage: ratingAverage !== undefined && ratingAverage !== null ? Number(ratingAverage) : null,
    ratingCount: ratingCount !== undefined && ratingCount !== null ? Number(ratingCount) : null,
    priceCurrency: priceCurrency ?? null,
    priceAmountMinor:
      priceAmountMinor !== undefined && priceAmountMinor !== null
        ? Number(priceAmountMinor)
        : null,
    monetisationTag: monetisationTag ?? null,
    badges,
    updatedAt: new Date().toISOString()
  };
}

function mergePreviewDigests(existing = [], incoming = [], limit = DEFAULT_PREVIEW_LIMIT) {
  const merged = new Map();

  for (const preview of incoming) {
    if (!preview?.id) {
      continue;
    }
    merged.set(preview.id, preview);
  }

  for (const preview of existing) {
    if (!preview?.id || merged.has(preview.id)) {
      continue;
    }
    merged.set(preview.id, preview);
  }

  return Array.from(merged.values()).slice(0, limit);
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

  static async recordRefreshSummary(
    { metricDate, entityType, refreshedAt = new Date(), documentCount = 0 },
    connection = db
  ) {
    const date = normaliseDate(metricDate ?? refreshedAt);
    const normalisedEntityType = normaliseEntityType(entityType);
    const { reference, deltaSeconds } = describeDeltaSeconds(refreshedAt);
    const refreshedIso = reference.toISOString();
    const safeDocumentCount = toNonNegativeInteger(documentCount);

    return withTransaction(connection, async (trx) => {
      const existingQuery = trx(TABLE).where({ metric_date: date, entity_type: normalisedEntityType });
      const existing = await applyForUpdate(existingQuery).first();
      const nowIso = new Date().toISOString();

      if (!existing) {
        const metadata = {
          refreshSummary: {
            refreshedAt: refreshedIso,
            deltaSeconds,
            documentCount: safeDocumentCount,
            deltaCount: safeDocumentCount,
            updatedAt: nowIso
          }
        };

        const payload = {
          metric_date: date,
          entity_type: normalisedEntityType,
          searches: 0,
          zero_results: 0,
          displayed_results: 0,
          total_results: 0,
          clicks: 0,
          conversions: 0,
          average_latency_ms: 0,
          metadata: JSON.stringify(metadata)
        };

        const [id] = await trx(TABLE).insert(payload);
        const row = await trx(TABLE).where({ id }).first();
        return toDomain(row);
      }

      const metadata = parseMetadata(existing.metadata);
      const previousSummary = metadata.refreshSummary ?? {};
      const previousCount = Number(previousSummary.documentCount ?? 0);
      const deltaCount = safeDocumentCount - (Number.isFinite(previousCount) ? previousCount : 0);

      metadata.refreshSummary = {
        ...previousSummary,
        refreshedAt: refreshedIso,
        deltaSeconds,
        documentCount: safeDocumentCount,
        deltaCount,
        updatedAt: nowIso
      };

      await trx(TABLE)
        .where({ id: existing.id })
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: trx.fn.now()
        });

      const row = await trx(TABLE).where({ id: existing.id }).first();
      return toDomain(row);
    });
  }

  static async appendPreviewDigests(
    { metricDate, entityType, previews, limit = DEFAULT_PREVIEW_LIMIT },
    connection = db
  ) {
    if (!Array.isArray(previews) || !previews.length) {
      return null;
    }

    const date = normaliseDate(metricDate);
    const normalisedEntityType = normaliseEntityType(entityType);
    const sanitisedPreviews = previews
      .map((preview) => normalisePreviewDigest(preview, normalisedEntityType))
      .filter(Boolean);

    if (!sanitisedPreviews.length) {
      return null;
    }

    return withTransaction(connection, async (trx) => {
      const existingQuery = trx(TABLE).where({ metric_date: date, entity_type: normalisedEntityType });
      const existing = await applyForUpdate(existingQuery).first();

      if (!existing) {
        const payload = {
          metric_date: date,
          entity_type: normalisedEntityType,
          searches: 0,
          zero_results: 0,
          displayed_results: 0,
          total_results: 0,
          clicks: 0,
          conversions: 0,
          average_latency_ms: 0,
          metadata: JSON.stringify({ previewDigests: sanitisedPreviews.slice(0, limit) })
        };

        const [id] = await trx(TABLE).insert(payload);
        const row = await trx(TABLE).where({ id }).first();
        return toDomain(row);
      }

      const metadata = parseMetadata(existing.metadata);
      const stored = Array.isArray(metadata.previewDigests) ? metadata.previewDigests : [];
      const merged = mergePreviewDigests(stored, sanitisedPreviews, limit);
      const nextMetadata = { ...metadata, previewDigests: merged };

      await trx(TABLE)
        .where({ id: existing.id })
        .update({ metadata: JSON.stringify(nextMetadata) });

      return toDomain({ ...existing, metadata: JSON.stringify(nextMetadata) });
    });
  }

  static async listPreviewDigests(
    { since, entityTypes, limit = DEFAULT_PREVIEW_LIMIT } = {},
    connection = db
  ) {
    const query = connection(TABLE).select('*');
    const sinceDate = since ? normaliseDate(since) : null;
    if (sinceDate) {
      query.andWhere('metric_date', '>=', sinceDate);
    }
    if (Array.isArray(entityTypes) && entityTypes.length) {
      query.whereIn('entity_type', entityTypes.map((type) => normaliseEntityType(type)));
    }
    query.orderBy('searches', 'desc');

    const rows = await query.limit(Math.max(limit * 2, limit + 4));

    const collected = [];
    for (const row of rows) {
      const metadata = parseMetadata(row.metadata);
      const digests = Array.isArray(metadata.previewDigests) ? metadata.previewDigests : [];
      for (const digest of digests) {
        if (!digest?.id) {
          continue;
        }
        collected.push({
          entityType: row.entity_type,
          metricDate: row.metric_date,
          searches: Number(row.searches ?? 0),
          digest
        });
        if (collected.length >= limit) {
          return collected.slice(0, limit);
        }
      }
    }

    return collected.slice(0, limit);
  }
}
