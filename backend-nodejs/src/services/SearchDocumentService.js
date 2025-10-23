import db from '../config/database.js';
import logger from '../config/logger.js';
import ExplorerSearchDailyMetricModel from '../models/ExplorerSearchDailyMetricModel.js';

const ENTITY_PRIORITY = {
  courses: 'high',
  communities: 'normal',
  ebooks: 'low',
  tutors: 'normal'
};

const TOKEN_SEPARATOR = ',';

function toTokenSlug(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null;
}

function normaliseCurrency(value, fallback = 'USD') {
  if (!value) {
    return fallback;
  }
  const trimmed = String(value).trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function normaliseInteger(value, defaultValue = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }
  return Math.max(0, Math.round(numeric));
}

function normaliseDecimalValue(value, precision = 4, defaultValue = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }
  const factor = 10 ** precision;
  return Math.round(numeric * factor) / factor;
}

function toMinorUnits(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round(numeric * 100));
}

function normaliseBoolean(value, defaultValue = false) {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'y'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off', 'n'].includes(normalised)) {
      return false;
    }
  }
  return defaultValue;
}

function toNormalisedTokenList(values, { slug = false } = {}) {
  const strings = toStringArray(values).map((token) => {
    if (!token) {
      return null;
    }
    if (!slug) {
      return token.trim().toLowerCase();
    }
    return toTokenSlug(token);
  });
  return dedupeStrings(strings.filter(Boolean));
}

function serialiseTokenList(values, options) {
  const tokens = toNormalisedTokenList(values, options);
  if (!tokens.length) {
    return null;
  }
  return tokens.join(TOKEN_SEPARATOR);
}

function parseTokenList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return String(value)
    .split(TOKEN_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      return JSON.parse(trimmed);
    } catch (_error) {
      return fallback;
    }
  }

  return fallback;
}

function toArray(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      const parsed = parseJson(trimmed, []);
      return Array.isArray(parsed) ? parsed : [];
    }

    return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function flattenStrings(values) {
  if (values === null || values === undefined) {
    return [];
  }

  const list = Array.isArray(values) ? values : [values];
  const output = [];

  for (const entry of list) {
    if (Array.isArray(entry)) {
      output.push(...flattenStrings(entry));
      continue;
    }

    if (entry === null || entry === undefined) {
      continue;
    }

    const stringValue = String(entry).trim();
    if (stringValue.length > 0) {
      output.push(stringValue);
    }
  }

  return output;
}

function toStringArray(value) {
  return Array.from(new Set(flattenStrings(toArray(value))));
}

function dedupeStrings(values) {
  return Array.from(new Set(flattenStrings(values)));
}

function toTitleCase(value) {
  if (!value) {
    return null;
  }
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return new Intl.NumberFormat('en-US').format(Math.round(numeric));
}

function formatMinutes(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  if (numeric < 60) {
    return `${Math.round(numeric)} min`;
  }
  const hours = numeric / 60;
  if (hours < 10) {
    return `${hours.toFixed(1)} hr`;
  }
  return `${Math.round(hours)} hr`;
}

function sanitiseBadgeList(value) {
  const list = toArray(value);
  const badges = [];
  const seen = new Set();
  for (const entry of list) {
    if (!entry) {
      continue;
    }
    if (typeof entry === 'string') {
      const label = entry.trim();
      if (!label) {
        continue;
      }
      const key = `info|${label.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      badges.push({ type: 'info', label });
      continue;
    }
    if (typeof entry === 'object') {
      const labelCandidate =
        entry.label ?? entry.title ?? entry.name ?? entry.text ?? entry.value ?? null;
      const label = typeof labelCandidate === 'string' ? labelCandidate.trim() : labelCandidate;
      if (!label) {
        continue;
      }
      const typeValue = entry.type ?? entry.key ?? 'info';
      const type = typeof typeValue === 'string' ? typeValue.trim() : 'info';
      const key = `${type.toLowerCase()}|${String(label).toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const badge = { type, label: String(label).trim() };
      if (entry.tone && typeof entry.tone === 'string') {
        badge.tone = entry.tone;
      }
      badges.push(badge);
    }
  }
  return badges;
}

function sanitiseCtaLinks(value, fallbackHref = null) {
  const list = toArray(value);
  const links = [];
  const seen = new Set();
  for (const entry of list) {
    if (!entry) {
      continue;
    }
    if (typeof entry === 'string') {
      const label = entry.trim();
      if (!label) {
        continue;
      }
      const key = `${label.toLowerCase()}|${fallbackHref ?? ''}|secondary`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      links.push({ label, href: fallbackHref, type: 'secondary' });
      continue;
    }
    if (typeof entry === 'object') {
      const labelCandidate =
        entry.label ?? entry.title ?? entry.text ?? entry.name ?? entry.value ?? null;
      const label = typeof labelCandidate === 'string' ? labelCandidate.trim() : null;
      if (!label) {
        continue;
      }
      const hrefCandidate = entry.href ?? entry.url ?? entry.link ?? null;
      const href = hrefCandidate ? String(hrefCandidate).trim() : fallbackHref ?? null;
      const typeCandidate = entry.type ?? entry.variant ?? entry.intent ?? 'secondary';
      const type = typeof typeCandidate === 'string' ? typeCandidate.trim().toLowerCase() : 'secondary';
      const normalizedType = ['primary', 'secondary', 'tertiary'].includes(type) ? type : 'secondary';
      const key = `${label.toLowerCase()}|${href ?? ''}|${normalizedType}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const link = {
        label,
        href,
        type: normalizedType
      };
      if (entry.id !== undefined && entry.id !== null) {
        link.id = entry.id;
      }
      links.push(link);
    }
  }
  return links;
}

function normaliseScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(4));
}

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function computeFreshness(publishedAt, updatedAt) {
  const referenceDate = toDateOrNull(updatedAt) ?? toDateOrNull(publishedAt);
  if (!referenceDate) {
    return normaliseScore(80);
  }

  const now = Date.now();
  const ageInDays = Math.max(0, (now - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const horizonDays = 180;
  const freshness = Math.max(0, 100 - (ageInDays / horizonDays) * 100);
  return normaliseScore(freshness);
}

function computeCoursePopularity(row) {
  const enrolmentCount = Number(row.enrolment_count ?? 0);
  const ratingAverage = Number(row.rating_average ?? 0);
  const ratingCount = Number(row.rating_count ?? 0);
  const enrolmentScore = Math.log1p(Math.max(0, enrolmentCount)) * 28;
  const ratingScore = Math.max(0, ratingAverage) * Math.log1p(Math.max(0, ratingCount)) * 6;
  const releaseBoost = toDateOrNull(row.release_at)
    ? Math.max(0, 12 - (Math.max(0, Date.now() - new Date(row.release_at).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 6;
  return normaliseScore(enrolmentScore + ratingScore + releaseBoost);
}

function computeCommunityPopularity(memberCount, postCount) {
  const memberScore = Math.log1p(Math.max(0, memberCount)) * 32;
  const postScore = Math.log1p(Math.max(0, postCount)) * 18;
  return normaliseScore(memberScore + postScore);
}

function computeEbookPopularity(row) {
  const ratingAverage = Number(row.rating_average ?? 0);
  const ratingCount = Number(row.rating_count ?? 0);
  const readingTime = Number(row.reading_time_minutes ?? 0);
  const ratingScore = Math.max(0, ratingAverage) * Math.log1p(Math.max(0, ratingCount)) * 8;
  const readingScore = Math.min(20, Math.max(0, readingTime) / 15);
  return normaliseScore(ratingScore + readingScore);
}

function computeTutorPopularity(row) {
  const completedSessions = Number(row.completed_sessions ?? 0);
  const ratingAverage = Number(row.rating_average ?? 0);
  const ratingCount = Number(row.rating_count ?? 0);
  const responseTime = Number(row.response_time_minutes ?? 0);
  const sessionScore = Math.log1p(Math.max(0, completedSessions)) * 30;
  const ratingScore = Math.max(0, ratingAverage) * Math.log1p(Math.max(0, ratingCount)) * 6;
  const responseBonus = responseTime > 0 ? Math.max(0, 14 - Math.log1p(responseTime)) : 14;
  const verificationBoost = row.is_verified ? 5 : 0;
  return normaliseScore(sessionScore + ratingScore + responseBonus + verificationBoost);
}

function buildQueueKey(entityType, entityId) {
  return `${entityType}::${entityId}`;
}

export class SearchDocumentService {
  constructor({ dbClient = db, loggerInstance = logger, loaders = {} } = {}) {
    const defaultLoaders = {
      courses: this.buildCourseDocuments.bind(this),
      communities: this.buildCommunityDocuments.bind(this),
      ebooks: this.buildEbookDocuments.bind(this),
      tutors: this.buildTutorDocuments.bind(this)
    };

    this.db = dbClient;
    this.logger = loggerInstance;
    this.loaders = { ...defaultLoaders, ...loaders };
  }

  async rebuild({ entityTypes = Object.keys(this.loaders), reason = 'rebuild', runAt = new Date(), trx = null } = {}) {
    const types = Array.isArray(entityTypes)
      ? entityTypes.filter((type) => typeof this.loaders[type] === 'function')
      : Object.keys(this.loaders);

    if (!types.length) {
      return { processed: 0 };
    }

    if (trx) {
      return this.#rebuildWithin(trx, { types, reason, runAt });
    }

    return this.db.transaction(async (transaction) => this.#rebuildWithin(transaction, { types, reason, runAt }));
  }

  async #rebuildWithin(connection, { types, reason, runAt }) {
    let processed = 0;

    for (const type of types) {
      const loader = this.loaders[type];
      if (typeof loader !== 'function') {
        continue;
      }

      const rawDocuments = await loader(connection);
      if (!Array.isArray(rawDocuments) || rawDocuments.length === 0) {
        continue;
      }

      const normalisedDocuments = this.normaliseDocuments(rawDocuments, type);
      if (!normalisedDocuments.length) {
        continue;
      }

      await this.upsertDocuments(normalisedDocuments, connection);

      await this.queueRefreshBatch(
        normalisedDocuments.map((document) => ({ entityType: document.entity_type, entityId: document.entity_id })),
        {
          trx: connection,
          priority: this.resolvePriority(type),
          reason,
          runAt
        }
      );

      try {
        await ExplorerSearchDailyMetricModel.recordRefreshSummary(
          {
            metricDate: runAt,
            entityType: type,
            refreshedAt: runAt,
            documentCount: normalisedDocuments.length
          },
          connection
        );
      } catch (error) {
        this.logger?.warn?.(
          { err: error, entityType: type },
          'Failed to record explorer search refresh summary metadata'
        );
      }

      processed += normalisedDocuments.length;
    }

    return { processed };
  }

  normaliseDocuments(documents, fallbackEntityType) {
    const now = new Date();
    return documents
      .map((document) => this.normaliseDocument(document, { entityType: fallbackEntityType, timestamp: now }))
      .filter((document) => document !== null);
  }

  normaliseDocument(document, { entityType, timestamp = new Date() } = {}) {
    if (!document) {
      return null;
    }

    const resolvedEntityType = String(document.entityType ?? document.entity_type ?? entityType ?? '').trim();
    if (!resolvedEntityType) {
      this.logger?.warn?.({ document }, 'Skipping search document because entity type is missing');
      return null;
    }

    const rawEntityId = document.entityId ?? document.entity_id;
    if (rawEntityId === null || rawEntityId === undefined) {
      this.logger?.warn?.({ document }, 'Skipping search document because entity id is missing');
      return null;
    }

    const title = document.title ?? document.name ?? null;
    if (!title) {
      this.logger?.warn?.({ document }, 'Skipping search document because title is missing');
      return null;
    }

    const keywords = Array.isArray(document.keywords)
      ? dedupeStrings(document.keywords)
      : dedupeStrings(document.keywordList ?? document.tags ?? []);

    const metadata = parseJson(document.metadata, {});
    const popularityScore = normaliseScore(document.popularityScore ?? document.popularity_score);
    const freshnessScore = normaliseScore(document.freshnessScore ?? document.freshness_score);
    const publishedAt = toDateOrNull(document.publishedAt ?? document.published_at);
    const indexedAt = toDateOrNull(document.indexedAt ?? document.indexed_at) ?? timestamp;
    const refreshedAt = toDateOrNull(document.refreshedAt ?? document.refreshed_at) ?? timestamp;

    const resolvedCategory = document.category ?? metadata.category ?? metadata.categories?.[0] ?? null;
    const resolvedLevel = document.level ?? metadata.level ?? null;
    const languageCodes = serialiseTokenList(
      document.languageCodes ?? document.languages ?? metadata.languages ?? [],
      { slug: false }
    );
    const tagSlugs = serialiseTokenList(document.tagSlugs ?? document.tags ?? metadata.tags ?? [], { slug: true });
    const resolvedCountry = (document.country ?? metadata.country ?? '').trim() || null;

    const resolvedPrice = document.price ?? metadata.price ?? {};
    const priceCurrency = normaliseCurrency(document.priceCurrency ?? resolvedPrice.currency);
    const priceAmountMinor = normaliseInteger(
      document.priceAmountMinor ?? document.price_amount_minor ?? toMinorUnits(resolvedPrice.amount),
      0
    );

    const rating = document.rating ?? metadata.rating ?? {};
    const ratingAverage = normaliseDecimalValue(
      document.ratingAverage ?? document.rating_average ?? rating.average ?? 0,
      4,
      0
    );
    const ratingCount = normaliseInteger(document.ratingCount ?? document.rating_count ?? rating.count ?? 0, 0);

    const memberCount = normaliseInteger(
      document.memberCount ?? document.member_count ?? metadata.memberCount ?? 0,
      0
    );
    const postCount = normaliseInteger(document.postCount ?? document.post_count ?? metadata.postCount ?? 0, 0);
    const completedSessions = normaliseInteger(
      document.completedSessions ?? document.completed_sessions ?? metadata.completedSessions ?? 0,
      0
    );
    const responseTimeMinutes = normaliseInteger(
      document.responseTimeMinutes ?? document.response_time_minutes ?? metadata.responseTimeMinutes ?? 0,
      0
    );
    const isVerified = normaliseBoolean(
      document.isVerified ?? document.is_verified ?? metadata.isVerified ?? metadata.verified,
      false
    );

    const previewCandidate = document.preview ?? metadata.preview ?? {};
    const previewSummary =
      document.previewSummary ??
      previewCandidate.summary ??
      metadata.summary ??
      document.subtitle ??
      document.description ??
      null;
    const previewImageUrl =
      document.previewImageUrl ??
      previewCandidate.image ??
      previewCandidate.imageUrl ??
      document.thumbnailUrl ??
      document.thumbnail_url ??
      metadata.thumbnailUrl ??
      null;
    const previewHighlights = toStringArray(
      document.previewHighlights ?? previewCandidate.highlights ?? metadata.highlights ?? []
    );
    const defaultActionHref =
      document.url ?? document.href ?? previewCandidate.href ?? metadata.href ?? metadata.url ?? null;
    const ctaLinks = sanitiseCtaLinks(
      document.ctaLinks ?? previewCandidate.ctaLinks ?? metadata.ctaLinks ?? metadata.actions ?? [],
      defaultActionHref
    );
    const badges = sanitiseBadgeList(document.badges ?? previewCandidate.badges ?? metadata.badges ?? []);
    const monetisationTag =
      document.monetisationTag ??
      document.monetisation?.tag ??
      metadata.monetisationTag ??
      metadata.monetisation?.tag ??
      null;

    return {
      entity_type: resolvedEntityType.toLowerCase(),
      entity_id: String(rawEntityId),
      entity_public_id: document.entityPublicId ?? document.entity_public_id ?? null,
      slug: document.slug ?? null,
      title: String(title).trim(),
      subtitle: document.subtitle ?? document.sub_title ?? null,
      description: document.description ?? null,
      thumbnail_url: document.thumbnailUrl ?? document.thumbnail_url ?? null,
      keywords: JSON.stringify(keywords),
      metadata: JSON.stringify(metadata),
      category: resolvedCategory ?? null,
      level: resolvedLevel ?? null,
      country: resolvedCountry,
      language_codes: languageCodes,
      tag_slugs: tagSlugs,
      price_currency: priceCurrency,
      price_amount_minor: priceAmountMinor,
      rating_average: ratingAverage,
      rating_count: ratingCount,
      member_count: memberCount,
      post_count: postCount,
      completed_sessions: completedSessions,
      response_time_minutes: responseTimeMinutes,
      is_verified: isVerified,
      popularity_score: popularityScore,
      freshness_score: freshnessScore,
      is_active: document.isActive ?? document.is_active ?? true,
      published_at: publishedAt,
      indexed_at: indexedAt,
      refreshed_at: refreshedAt,
      updated_at: timestamp,
      preview_summary: previewSummary ?? null,
      preview_image_url: previewImageUrl ?? null,
      preview_highlights: JSON.stringify(previewHighlights),
      cta_links: JSON.stringify(ctaLinks),
      badges: JSON.stringify(badges),
      monetisation_tag: monetisationTag ?? null
    };
  }

  async upsertDocuments(documents, connection = this.db) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return;
    }

    const hasDocumentsTable = await this.hasTable('search_documents', connection);
    if (!hasDocumentsTable) {
      this.logger?.warn?.('search_documents table is missing – skipping document upsert');
      return;
    }

    const chunkSize = 100;
    for (let index = 0; index < documents.length; index += chunkSize) {
      const chunk = documents.slice(index, index + chunkSize);
      await connection('search_documents').insert(chunk).onConflict(['entity_type', 'entity_id']).merge();
    }
  }

  async queueRefresh(entityType, entityId, options = {}) {
    return this.queueRefreshBatch([{ entityType, entityId }], options);
  }

  async queueRefreshBatch(entries, { priority = 'normal', reason = 'rebuild', runAt = new Date(), trx = null } = {}) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    const connection = trx ?? this.db;
    const hasQueueTable = await this.hasTable('search_document_refresh_queue', connection);
    if (!hasQueueTable) {
      this.logger?.warn?.('search_document_refresh_queue table is missing – skipping refresh scheduling');
      return;
    }

    const timestamp = new Date();
    const deduped = new Map();

    for (const entry of entries) {
      if (!entry) {
        continue;
      }

      const entityType = String(entry.entityType ?? entry.entity_type ?? '').trim().toLowerCase();
      const entityId = entry.entityId ?? entry.entity_id;
      if (!entityType || entityId === null || entityId === undefined) {
        continue;
      }

      const key = buildQueueKey(entityType, entityId);
      if (deduped.has(key)) {
        continue;
      }

      deduped.set(key, {
        entity_type: entityType,
        entity_id: String(entityId),
        priority: entry.priority ?? priority ?? 'normal',
        reason: entry.reason ?? reason ?? 'rebuild',
        run_at: entry.runAt ? toDateOrNull(entry.runAt) ?? runAt : runAt,
        attempts: 0,
        last_attempt_at: null,
        last_error: null,
        processed_at: null,
        updated_at: timestamp
      });
    }

    if (!deduped.size) {
      return;
    }

    const rows = Array.from(deduped.values());
    const chunkSize = 100;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      await connection('search_document_refresh_queue')
        .insert(chunk)
        .onConflict(['entity_type', 'entity_id'])
        .merge();
    }
  }

  resolvePriority(entityType) {
    return ENTITY_PRIORITY[entityType] ?? 'normal';
  }

  async hasTable(tableName, connection = this.db) {
    const schema = connection?.schema ?? this.db?.schema;
    if (!schema || typeof schema.hasTable !== 'function') {
      return false;
    }

    try {
      return await schema.hasTable(tableName);
    } catch (error) {
      this.logger?.warn?.({ tableName, error }, 'Failed to verify table existence');
      return false;
    }
  }

  async buildCourseDocuments(connection = this.db) {
    const executor = connection ?? this.db;
    if (!(await this.hasTable('courses', executor))) {
      return [];
    }

    const rows = await executor('courses')
      .select(
        'id',
        'public_id',
        'slug',
        'title',
        'summary',
        'description',
        'thumbnail_url',
        'category',
        'level',
        'tags',
        'languages',
        'delivery_format',
        'price_currency',
        'price_amount',
        'rating_average',
        'rating_count',
        'enrolment_count',
        'release_at',
        'status',
        'is_published',
        'created_at',
        'updated_at'
      )
      .orderBy('id', 'asc');

    if (!rows.length) {
      return [];
    }

    return rows.map((row) => {
      const tags = toStringArray(row.tags);
      const languages = toStringArray(row.languages);
      const keywords = dedupeStrings([
        row.title,
        row.slug,
        row.category,
        row.level,
        tags,
        languages
      ]);
      const enrolmentCount = Number(row.enrolment_count ?? 0);
      const highlightEntries = dedupeStrings([
        row.level ? `Level: ${toTitleCase(row.level)}` : null,
        row.delivery_format ? `${toTitleCase(row.delivery_format)} format` : null,
        enrolmentCount ? `${formatInteger(enrolmentCount)} learners` : null,
        languages[0] ? `Language: ${languages[0].toUpperCase()}` : null
      ]);
      const monetisationTag = Number(row.price_amount ?? 0) > 0 ? 'Premium course' : 'Free course';
      const ctaLinks = [
        {
          type: 'primary',
          label: 'View course',
          href: `/courses/${row.slug ?? row.id}`
        }
      ];
      const badges = sanitiseBadgeList([
        row.level ? { type: 'level', label: toTitleCase(row.level) } : null,
        row.delivery_format ? { type: 'format', label: toTitleCase(row.delivery_format) } : null
      ]);

      return {
        entityType: 'courses',
        entityId: row.id,
        entityPublicId: row.public_id ?? null,
        slug: row.slug ?? null,
        title: row.title,
        subtitle: row.summary ?? null,
        description: row.description ?? null,
        thumbnailUrl: row.thumbnail_url ?? null,
        keywords,
        category: row.category ?? null,
        level: row.level ?? null,
        languageCodes: languages,
        tagSlugs: tags,
        priceCurrency: row.price_currency ?? 'USD',
        priceAmountMinor: toMinorUnits(row.price_amount ?? 0),
        ratingAverage: Number(row.rating_average ?? 0),
        ratingCount: Number(row.rating_count ?? 0),
        previewSummary: row.summary ?? row.description ?? null,
        previewImageUrl: row.thumbnail_url ?? null,
        previewHighlights: highlightEntries,
        ctaLinks,
        badges,
        monetisationTag,
        metadata: {
          type: 'course',
          category: row.category ?? null,
          level: row.level ?? null,
          deliveryFormat: row.delivery_format ?? null,
          languages,
          tags,
          rating: {
            average: Number(row.rating_average ?? 0),
            count: Number(row.rating_count ?? 0)
          },
          enrolmentCount: Number(row.enrolment_count ?? 0),
          price: {
            currency: row.price_currency ?? 'USD',
            amount: Number(row.price_amount ?? 0)
          },
          releaseAt: row.release_at,
          updatedAt: row.updated_at,
          preview: {
            summary: row.summary ?? row.description ?? null,
            imageUrl: row.thumbnail_url ?? null,
            highlights: highlightEntries,
            ctaLinks
          },
          badges,
          monetisation: { tag: monetisationTag }
        },
        popularityScore: computeCoursePopularity(row),
        freshnessScore: computeFreshness(row.release_at, row.updated_at),
        isActive: row.status !== 'archived' && row.is_published !== false,
        publishedAt: row.release_at ?? row.created_at,
        indexedAt: row.updated_at ?? new Date(),
        refreshedAt: row.updated_at ?? new Date()
      };
    });
  }

  async buildCommunityDocuments(connection = this.db) {
    const executor = connection ?? this.db;
    if (!(await this.hasTable('communities', executor))) {
      return [];
    }

    const communities = await executor('communities')
      .select('id', 'owner_id', 'slug', 'name', 'description', 'cover_image_url', 'metadata', 'visibility', 'created_at', 'updated_at', 'deleted_at')
      .orderBy('id', 'asc');

    if (!communities.length) {
      return [];
    }

    let memberCounts = new Map();
    if (await this.hasTable('community_members', executor)) {
      const rows = await executor('community_members')
        .select('community_id')
        .count({ count: '*' })
        .groupBy('community_id');
      memberCounts = new Map(rows.map((row) => [String(row.community_id), Number(row.count ?? row['count(*)'] ?? 0)]));
    }

    let postCounts = new Map();
    if (await this.hasTable('community_posts', executor)) {
      const rows = await executor('community_posts')
        .whereNull('deleted_at')
        .select('community_id')
        .count({ count: '*' })
        .groupBy('community_id');
      postCounts = new Map(rows.map((row) => [String(row.community_id), Number(row.count ?? row['count(*)'] ?? 0)]));
    }

    return communities.map((community) => {
      const metadata = parseJson(community.metadata, {});
      const topics = toStringArray(metadata.topics ?? metadata.topic ?? []);
      const tags = toStringArray(metadata.tags ?? []);
      const languages = toStringArray(metadata.languages ?? []);
      const memberCount = memberCounts.get(String(community.id)) ?? 0;
      const postCount = postCounts.get(String(community.id)) ?? 0;
      const keywords = dedupeStrings([
        community.name,
        community.slug,
        community.visibility,
        topics,
        tags,
        languages
      ]);
      const highlightEntries = dedupeStrings([
        memberCount ? `${formatInteger(memberCount)} members` : null,
        postCount ? `${formatInteger(postCount)} posts` : null,
        topics[0] ? `Focus: ${toTitleCase(topics[0])}` : null,
        metadata.country ? `Region: ${metadata.country}` : null
      ]);
      const monetisationTag = community.visibility === 'private' ? 'Private community' : 'Open community';
      const ctaLinks = [
        {
          type: 'primary',
          label: 'View community',
          href: `/communities/${community.slug ?? community.id}`
        }
      ];
      const badges = sanitiseBadgeList([
        community.visibility ? { type: 'visibility', label: toTitleCase(community.visibility) } : null,
        metadata.country ? { type: 'region', label: metadata.country } : null
      ]);

      return {
        entityType: 'communities',
        entityId: community.id,
        slug: community.slug ?? null,
        title: community.name,
        subtitle: metadata.tagline ?? metadata.subtitle ?? null,
        description: community.description ?? null,
        thumbnailUrl: metadata.avatarUrl ?? metadata.coverImageUrl ?? community.cover_image_url ?? null,
        keywords,
        languageCodes: languages,
        tagSlugs: dedupeStrings([...topics, ...tags]),
        country: metadata.country ?? null,
        memberCount,
        postCount,
        previewSummary: community.description ?? metadata.summary ?? null,
        previewImageUrl: metadata.coverImageUrl ?? community.cover_image_url ?? null,
        previewHighlights: highlightEntries,
        ctaLinks,
        badges,
        monetisationTag,
        metadata: {
          visibility: community.visibility,
          topics,
          tags,
          languages,
          memberCount,
          postCount,
          ownerId: community.owner_id ?? null,
          preview: {
            summary: community.description ?? metadata.summary ?? null,
            imageUrl: metadata.coverImageUrl ?? community.cover_image_url ?? null,
            highlights: highlightEntries,
            ctaLinks
          },
          badges,
          monetisation: { tag: monetisationTag }
        },
        popularityScore: computeCommunityPopularity(memberCount, postCount),
        freshnessScore: computeFreshness(community.created_at, community.updated_at),
        isActive: !community.deleted_at,
        publishedAt: community.created_at,
        indexedAt: community.updated_at ?? new Date(),
        refreshedAt: community.updated_at ?? new Date()
      };
    });
  }

  async buildEbookDocuments(connection = this.db) {
    const executor = connection ?? this.db;
    if (!(await this.hasTable('ebooks', executor))) {
      return [];
    }

    const ebooks = await executor('ebooks')
      .select(
        'id',
        'public_id',
        'asset_id',
        'slug',
        'title',
        'subtitle',
        'description',
        'authors',
        'tags',
        'categories',
        'languages',
        'reading_time_minutes',
        'price_currency',
        'price_amount',
        'rating_average',
        'rating_count',
        'status',
        'is_public',
        'release_at',
        'created_at',
        'updated_at'
      )
      .orderBy('id', 'asc');

    if (!ebooks.length) {
      return [];
    }

    let assetMetadataById = new Map();
    if (await this.hasTable('content_assets', executor)) {
      const assetIds = ebooks.map((ebook) => ebook.asset_id).filter(Boolean);
      if (assetIds.length) {
        const rows = await executor('content_assets')
          .whereIn('id', assetIds)
          .select('id', 'metadata');
        assetMetadataById = new Map(rows.map((row) => [Number(row.id), parseJson(row.metadata, {})]));
      }
    }

    return ebooks.map((ebook) => {
      const authors = toStringArray(ebook.authors);
      const tags = toStringArray(ebook.tags);
      const categories = toStringArray(ebook.categories);
      const languages = toStringArray(ebook.languages);
      const assetMetadata = assetMetadataById.get(Number(ebook.asset_id)) ?? {};
      const coverImage = assetMetadata.coverImageUrl ?? assetMetadata.thumbnailUrl ?? assetMetadata.previewUrl ?? null;
      const keywords = dedupeStrings([ebook.title, ebook.subtitle, tags, categories, authors, languages]);
      const highlightEntries = dedupeStrings([
        authors[0] ? `By ${authors[0]}` : null,
        languages[0] ? `Language: ${languages[0].toUpperCase()}` : null,
        ebook.reading_time_minutes ? formatMinutes(ebook.reading_time_minutes) : null
      ]);
      const monetisationTag = Number(ebook.price_amount ?? 0) > 0 ? 'Premium ebook' : 'Free ebook';
      const ctaLinks = [
        {
          type: 'primary',
          label: 'Open ebook',
          href: `/ebooks/${ebook.slug ?? ebook.id}`
        }
      ];
      const badges = sanitiseBadgeList([
        categories[0] ? { type: 'category', label: toTitleCase(categories[0]) } : null,
        languages[0] ? { type: 'language', label: languages[0].toUpperCase() } : null
      ]);

      return {
        entityType: 'ebooks',
        entityId: ebook.id,
        entityPublicId: ebook.public_id ?? null,
        slug: ebook.slug ?? null,
        title: ebook.title,
        subtitle: ebook.subtitle ?? null,
        description: ebook.description ?? null,
        thumbnailUrl: coverImage,
        keywords,
        category: categories[0] ?? null,
        languageCodes: languages,
        tagSlugs: tags,
        priceCurrency: ebook.price_currency ?? 'USD',
        priceAmountMinor: toMinorUnits(ebook.price_amount ?? 0),
        ratingAverage: Number(ebook.rating_average ?? 0),
        ratingCount: Number(ebook.rating_count ?? 0),
        previewSummary: ebook.subtitle ?? ebook.description ?? null,
        previewImageUrl: coverImage,
        previewHighlights: highlightEntries,
        ctaLinks,
        badges,
        monetisationTag,
        metadata: {
          authors,
          tags,
          categories,
          languages,
          readingTimeMinutes: Number(ebook.reading_time_minutes ?? 0),
          price: {
            currency: ebook.price_currency ?? 'USD',
            amount: Number(ebook.price_amount ?? 0)
          },
          rating: {
            average: Number(ebook.rating_average ?? 0),
            count: Number(ebook.rating_count ?? 0)
          },
          isPublic: Boolean(ebook.is_public),
          preview: {
            summary: ebook.subtitle ?? ebook.description ?? null,
            imageUrl: coverImage,
            highlights: highlightEntries,
            ctaLinks
          },
          badges,
          monetisation: { tag: monetisationTag }
        },
        popularityScore: computeEbookPopularity(ebook),
        freshnessScore: computeFreshness(ebook.release_at, ebook.updated_at),
        isActive: ebook.status !== 'archived',
        publishedAt: ebook.release_at ?? ebook.created_at,
        indexedAt: ebook.updated_at ?? new Date(),
        refreshedAt: ebook.updated_at ?? new Date()
      };
    });
  }

  async buildTutorDocuments(connection = this.db) {
    const executor = connection ?? this.db;
    if (!(await this.hasTable('tutor_profiles', executor))) {
      return [];
    }

    const tutors = await executor('tutor_profiles')
      .select(
        'id',
        'user_id',
        'display_name',
        'headline',
        'bio',
        'skills',
        'languages',
        'country',
        'timezones',
        'hourly_rate_amount',
        'hourly_rate_currency',
        'rating_average',
        'rating_count',
        'completed_sessions',
        'response_time_minutes',
        'is_verified',
        'metadata',
        'created_at',
        'updated_at'
      )
      .orderBy('id', 'asc');

    if (!tutors.length) {
      return [];
    }

    return tutors.map((tutor) => {
      const skills = toStringArray(tutor.skills);
      const languages = toStringArray(tutor.languages);
      const timezones = toStringArray(tutor.timezones);
      const metadata = parseJson(tutor.metadata, {});
      const keywords = dedupeStrings([tutor.display_name, tutor.headline, tutor.country, skills, languages]);
      const highlightEntries = dedupeStrings([
        skills[0] ? `Focus: ${toTitleCase(skills[0])}` : null,
        languages[0] ? `Speaks ${languages[0].toUpperCase()}` : null,
        tutor.response_time_minutes ? `Responds in ${formatMinutes(tutor.response_time_minutes)}` : null,
        tutor.completed_sessions ? `${formatInteger(tutor.completed_sessions)} sessions` : null
      ]);
      const monetisationTag = tutor.is_verified ? 'Verified tutor' : 'Expert tutor';
      const ctaLinks = [
        {
          type: 'primary',
          label: 'Hire tutor',
          href: `/tutors/${metadata.profileSlug ?? tutor.id}`
        }
      ];
      const badges = sanitiseBadgeList([
        tutor.is_verified ? { type: 'verified', label: 'Verified' } : null,
        ...skills.slice(0, 2).map((skill) => ({ type: 'skill', label: toTitleCase(skill) }))
      ]);

      return {
        entityType: 'tutors',
        entityId: tutor.id,
        slug: metadata.profileSlug ?? null,
        title: tutor.display_name,
        subtitle: tutor.headline ?? null,
        description: tutor.bio ?? null,
        thumbnailUrl: metadata.avatarUrl ?? null,
        keywords,
        languageCodes: languages,
        tagSlugs: skills,
        priceCurrency: tutor.hourly_rate_currency ?? 'USD',
        priceAmountMinor: Number(tutor.hourly_rate_amount ?? 0),
        ratingAverage: Number(tutor.rating_average ?? 0),
        ratingCount: Number(tutor.rating_count ?? 0),
        completedSessions: Number(tutor.completed_sessions ?? 0),
        responseTimeMinutes: Number(tutor.response_time_minutes ?? 0),
        isVerified: Boolean(tutor.is_verified),
        country: tutor.country ?? null,
        previewSummary: tutor.headline ?? tutor.bio ?? null,
        previewImageUrl: metadata.avatarUrl ?? null,
        previewHighlights: highlightEntries,
        ctaLinks,
        badges,
        monetisationTag,
        metadata: {
          userId: tutor.user_id,
          skills,
          languages,
          timezones,
          country: tutor.country ?? null,
          hourlyRate: {
            currency: tutor.hourly_rate_currency ?? 'USD',
            amount: Number(tutor.hourly_rate_amount ?? 0)
          },
          rating: {
            average: Number(tutor.rating_average ?? 0),
            count: Number(tutor.rating_count ?? 0)
          },
          completedSessions: Number(tutor.completed_sessions ?? 0),
          responseTimeMinutes: Number(tutor.response_time_minutes ?? 0),
          isVerified: Boolean(tutor.is_verified),
          preview: {
            summary: tutor.headline ?? tutor.bio ?? null,
            imageUrl: metadata.avatarUrl ?? null,
            highlights: highlightEntries,
            ctaLinks
          },
          badges,
          monetisation: { tag: monetisationTag }
        },
        popularityScore: computeTutorPopularity(tutor),
        freshnessScore: computeFreshness(tutor.created_at, tutor.updated_at),
        isActive: true,
        publishedAt: tutor.created_at,
        indexedAt: tutor.updated_at ?? new Date(),
        refreshedAt: tutor.updated_at ?? new Date()
      };
    });
  }
}

export default SearchDocumentService;
