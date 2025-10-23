import db from '../config/database.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import ExplorerSearchDocumentModel from '../models/ExplorerSearchDocumentModel.js';
import { resolveCountryCoordinates } from '../utils/geo.js';
import { recordSearchIngestionRun } from '../observability/metrics.js';

const DEFAULT_BATCH_SIZE = Math.max(50, Number(env.search?.ingestion?.batchSize ?? 200));

function clone(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return clone(fallback);
  }
  if (typeof value === 'object') {
    if (Array.isArray(fallback)) {
      return Array.isArray(value) ? [...value] : clone(fallback);
    }
    const base = fallback && typeof fallback === 'object' ? clone(fallback) : {};
    return { ...base, ...value };
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : clone(fallback);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const base = fallback && typeof fallback === 'object' ? clone(fallback) : {};
      return { ...base, ...parsed };
    }
    return clone(fallback);
  } catch (_error) {
    return clone(fallback);
  }
}

function normaliseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry) => entry !== null && entry !== undefined && entry !== '');
  }
  try {
    const parsed = JSON.parse(value);
    return normaliseArray(parsed);
  } catch (_error) {
    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

function buildSearchTerms(input) {
  const stack = Array.isArray(input) ? [...input] : [input];
  const tokens = [];
  while (stack.length) {
    const value = stack.pop();
    if (value === null || value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    if (typeof value === 'object') {
      stack.push(...Object.values(value));
      continue;
    }
    const stringValue = String(value).trim();
    if (stringValue) {
      tokens.push(stringValue.toLowerCase());
    }
  }
  return Array.from(new Set(tokens)).join(' ');
}

function resolveGeo(countryCode) {
  if (!countryCode) {
    return null;
  }
  const resolved = resolveCountryCoordinates(countryCode);
  if (resolved) {
    return {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      country: resolved.code ?? countryCode
    };
  }
  return { latitude: null, longitude: null, country: countryCode };
}

export class SearchIngestionService {
  constructor({
    dbClient = db,
    loggerInstance = logger,
    batchSize = DEFAULT_BATCH_SIZE,
    documentModel = ExplorerSearchDocumentModel,
    loaders = {}
  } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance?.child ? loggerInstance.child({ service: 'SearchIngestionService' }) : logger;
    this.batchSize = Math.max(25, Number(batchSize) || DEFAULT_BATCH_SIZE);
    this.documentModel = documentModel;
    this.loaders = {
      communities: loaders.communities ?? this.loadCommunities.bind(this),
      courses: loaders.courses ?? this.loadCourses.bind(this),
      ebooks: loaders.ebooks ?? this.loadEbooks.bind(this),
      tutors: loaders.tutors ?? this.loadTutors.bind(this),
      profiles: loaders.profiles ?? this.loadProfiles.bind(this),
      ads: loaders.ads ?? this.loadAds.bind(this),
      events: loaders.events ?? this.loadEvents.bind(this)
    };
  }

  getSupportedEntities() {
    return Object.keys(this.loaders);
  }

  async fullReindex({ since = null, indexes } = {}) {
    const requested = indexes?.length ? indexes : this.getSupportedEntities();
    for (const entity of requested) {
      if (!this.loaders[entity]) {
        throw new Error(`Search ingestion loader not defined for entity "${entity}"`);
      }
    }

    for (const entity of requested) {
      await this.reindexEntity(entity, { since });
    }
  }

  async reindexEntity(entity, { since = null } = {}) {
    const loader = this.loaders[entity];
    if (!loader) {
      throw new Error(`Search ingestion loader not defined for entity "${entity}"`);
    }

    let processed = 0;
    const sinceDate = since ? new Date(since) : null;

    if (!sinceDate || Number.isNaN(sinceDate.valueOf())) {
      await this.documentModel.deleteByEntityTypes([entity], this.db);
    }

    try {
      for await (const documents of loader({ since: sinceDate, batchSize: this.batchSize })) {
        if (!documents?.length) {
          continue;
        }
        processed += documents.length;
        await this.documentModel.upsertMany(documents, this.db);
      }

      recordSearchIngestionRun({ index: entity, documentCount: processed, status: 'success', since: sinceDate ?? null });
      this.logger.info({ entity, processed, since: sinceDate }, 'Search documents reindexed');
    } catch (error) {
      recordSearchIngestionRun({ index: entity, documentCount: processed, status: 'error', error, since: sinceDate ?? null });
      this.logger.error({ err: error, entity }, 'Failed to reindex search documents');
      throw error;
    }
  }

  async *loadCommunities() {
    const rows = await this.db('communities as c')
      .select('c.id', 'c.slug', 'c.name', 'c.description', 'c.cover_image_url', 'c.visibility', 'c.metadata', 'c.created_at')
      .orderBy('c.id');
    if (!rows.length) {
      return;
    }

    const memberRows = await this.db('community_members')
      .select('community_id')
      .count({ total: '*' })
      .whereIn('community_id', rows.map((row) => row.id))
      .groupBy('community_id');
    const memberMap = new Map(memberRows.map((row) => [row.community_id, Number(row.total ?? 0)]));

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const tags = normaliseArray(metadata.focus);
      const languages = normaliseArray(metadata.languages);
      const memberCount = memberMap.get(row.id) ?? 0;
      const trendScore = Number(metadata.trendScore ?? metadata.memberVelocity ?? 0);
      const geo = resolveGeo(metadata.country);

      return {
        entityType: 'communities',
        entityId: String(row.id),
        slug: row.slug,
        title: row.name,
        subtitle: metadata.tagline ?? (memberCount ? `${memberCount} members` : null),
        description: row.description ?? null,
        tags,
        categories: metadata.category ? [metadata.category] : [],
        languages,
        price: null,
        rating: null,
        previewMedia: {
          url: metadata.heroImageUrl ?? row.cover_image_url ?? null,
          type: row.cover_image_url || metadata.heroImageUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          memberCount,
          trendScore,
          visibility: row.visibility,
          createdAt: row.created_at,
          timezone: metadata.timezone ?? null
        },
        metadata: {
          slug: row.slug,
          category: metadata.category ?? null,
          visibility: row.visibility,
          timezone: metadata.timezone ?? null,
          country: metadata.country ?? null,
          languages,
          isFeatured: Boolean(metadata.isFeatured),
          tagline: metadata.tagline ?? null,
          createdAt: row.created_at
        },
        geo,
        searchTerms: buildSearchTerms([
          row.name,
          row.description,
          metadata.tagline,
          row.visibility,
          metadata.timezone,
          metadata.country,
          tags,
          languages
        ]),
        popularityScore: memberCount + trendScore * 25
      };
    });

    yield documents;
  }

  async *loadCourses() {
    const rows = await this.db('courses as c')
      .leftJoin('users as u', 'u.id', 'c.instructor_id')
      .select(
        'c.id',
        'c.slug',
        'c.title',
        'c.summary',
        'c.description',
        'c.thumbnail_url',
        'c.level',
        'c.category',
        'c.skills',
        'c.tags',
        'c.languages',
        'c.delivery_format',
        'c.price_currency',
        'c.price_amount',
        'c.rating_average',
        'c.rating_count',
        'c.enrolment_count',
        'c.release_at',
        'c.metadata',
        'c.created_at',
        'u.first_name as instructor_first_name',
        'u.last_name as instructor_last_name'
      )
      .orderBy('c.id');
    if (!rows.length) {
      return;
    }

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const languages = normaliseArray(row.languages);
      const skills = normaliseArray(row.skills);
      const tags = normaliseArray(row.tags);
      const instructorName = metadata.instructorName
        ? metadata.instructorName
        : [row.instructor_first_name, row.instructor_last_name].filter(Boolean).join(' ').trim() || null;
      const priceAmount = Number(row.price_amount ?? 0);
      const ratingAverage = Number(row.rating_average ?? 0);
      const ratingCount = Number(row.rating_count ?? 0);

      return {
        entityType: 'courses',
        entityId: String(row.id),
        slug: row.slug,
        title: row.title,
        subtitle: [row.level, row.delivery_format, instructorName].filter(Boolean).join(' · ') || null,
        description: row.summary ?? row.description ?? null,
        tags,
        categories: row.category ? [row.category] : [],
        languages,
        price: {
          currency: row.price_currency ?? 'USD',
          amount: priceAmount
        },
        rating: {
          average: ratingAverage,
          count: ratingCount
        },
        previewMedia: {
          url: metadata.heroImageUrl ?? row.thumbnail_url ?? null,
          type: row.thumbnail_url || metadata.heroImageUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          level: row.level,
          deliveryFormat: row.delivery_format,
          enrolments: Number(row.enrolment_count ?? 0),
          releaseAt: row.release_at,
          skills,
          instructorName,
          priceAmount,
          priceCurrency: row.price_currency ?? 'USD'
        },
        metadata: {
          slug: row.slug,
          category: row.category ?? null,
          level: row.level ?? null,
          deliveryFormat: row.delivery_format ?? null,
          languages,
          skills,
          instructorName,
          priceCurrency: row.price_currency ?? 'USD',
          priceAmount,
          releaseAt: row.release_at,
          createdAt: row.created_at
        },
        geo: null,
        searchTerms: buildSearchTerms([
          row.title,
          row.summary,
          row.description,
          row.level,
          row.category,
          row.delivery_format,
          instructorName,
          languages,
          skills,
          tags
        ]),
        popularityScore: ratingAverage * Math.max(ratingCount, 1) + Number(row.enrolment_count ?? 0) / 10
      };
    });

    yield documents;
  }

  async *loadEbooks() {
    const rows = await this.db('ebooks as e')
      .select(
        'e.id',
        'e.slug',
        'e.title',
        'e.subtitle',
        'e.description',
        'e.authors',
        'e.tags',
        'e.categories',
        'e.languages',
        'e.isbn',
        'e.reading_time_minutes',
        'e.price_currency',
        'e.price_amount',
        'e.rating_average',
        'e.rating_count',
        'e.cover_image_url',
        'e.release_at',
        'e.metadata',
        'e.created_at'
      )
      .orderBy('e.id');
    if (!rows.length) {
      return;
    }

    const documents = rows.map((row) => {
      const authors = normaliseArray(row.authors);
      const tags = normaliseArray(row.tags);
      const categories = normaliseArray(row.categories);
      const languages = normaliseArray(row.languages);
      const metadata = parseJson(row.metadata, {});
      const readingTime = Number(row.reading_time_minutes ?? 0);
      const ratingAverage = Number(row.rating_average ?? 0);
      const ratingCount = Number(row.rating_count ?? 0);

      return {
        entityType: 'ebooks',
        entityId: String(row.id),
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle ?? (authors.length ? `By ${authors.join(', ')}` : null),
        description: row.description ?? null,
        tags,
        categories,
        languages,
        price: {
          currency: row.price_currency ?? 'USD',
          amount: Number(row.price_amount ?? 0)
        },
        rating: {
          average: ratingAverage,
          count: ratingCount
        },
        previewMedia: {
          url: metadata.heroImageUrl ?? row.cover_image_url ?? null,
          type: row.cover_image_url || metadata.heroImageUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          readingTimeMinutes: readingTime,
          releaseAt: row.release_at,
          authors
        },
        metadata: {
          slug: row.slug,
          isbn: row.isbn ?? null,
          languages,
          categories,
          authors,
          priceCurrency: row.price_currency ?? 'USD',
          priceAmount: Number(row.price_amount ?? 0),
          releaseAt: row.release_at,
          createdAt: row.created_at
        },
        geo: null,
        searchTerms: buildSearchTerms([
          row.title,
          row.subtitle,
          row.description,
          row.isbn,
          authors,
          tags,
          categories,
          languages
        ]),
        popularityScore: ratingAverage * Math.max(ratingCount, 1) + Math.max(0, 300 - readingTime)
      };
    });

    yield documents;
  }

  async *loadTutors() {
    const rows = await this.db('tutor_profiles as t')
      .leftJoin('users as u', 'u.id', 't.user_id')
      .select(
        't.id',
        't.user_id',
        't.display_name',
        't.headline',
        't.bio',
        't.skills',
        't.languages',
        't.country',
        't.timezones',
        't.hourly_rate_amount',
        't.hourly_rate_currency',
        't.rating_average',
        't.rating_count',
        't.completed_sessions',
        't.response_time_minutes',
        't.is_verified',
        't.metadata',
        't.created_at',
        'u.role as user_role'
      )
      .orderBy('t.id');
    if (!rows.length) {
      return;
    }

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const languages = normaliseArray(row.languages);
      const skills = normaliseArray(row.skills);
      const timezones = normaliseArray(row.timezones);
      const hourlyRateAmount = Number(row.hourly_rate_amount ?? 0);
      const ratingAverage = Number(row.rating_average ?? 0);
      const ratingCount = Number(row.rating_count ?? 0);
      const completedSessions = Number(row.completed_sessions ?? 0);
      const responseTime = Number(row.response_time_minutes ?? 0);
      const geo = resolveGeo(row.country ?? metadata.country);

      return {
        entityType: 'tutors',
        entityId: String(row.id),
        slug: metadata.slug ?? null,
        title: row.display_name,
        subtitle: row.headline ?? null,
        description: row.bio ?? null,
        tags: skills,
        categories: [],
        languages,
        price: {
          currency: row.hourly_rate_currency ?? 'USD',
          amount: hourlyRateAmount
        },
        rating: {
          average: ratingAverage,
          count: ratingCount
        },
        previewMedia: {
          url: metadata.avatarUrl ?? null,
          type: metadata.avatarUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          skills,
          languages,
          timezones,
          country: row.country ?? null,
          completedSessions,
          responseTimeMinutes: responseTime,
          hourlyRateAmount,
          hourlyRateCurrency: row.hourly_rate_currency ?? 'USD',
          isVerified: Boolean(row.is_verified)
        },
        metadata: {
          slug: metadata.slug ?? null,
          country: row.country ?? null,
          timezones,
          isVerified: Boolean(row.is_verified),
          skills,
          languages,
          role: row.user_role ?? null,
          createdAt: row.created_at
        },
        geo,
        searchTerms: buildSearchTerms([
          row.display_name,
          row.headline,
          row.bio,
          row.country,
          row.user_role,
          skills,
          languages,
          timezones
        ]),
        popularityScore: ratingAverage * Math.max(ratingCount, 1) + completedSessions / 5 - responseTime / 30
      };
    });

    yield documents;
  }

  async *loadProfiles() {
    const rows = await this.db('user_profiles as p')
      .leftJoin('users as u', 'u.id', 'p.user_id')
      .select(
        'p.user_id',
        'p.display_name',
        'p.tagline',
        'p.location',
        'p.avatar_url',
        'p.banner_url',
        'p.bio',
        'p.metadata',
        'p.created_at',
        'u.role',
        'u.created_at as user_created_at'
      )
      .orderBy('p.user_id');
    if (!rows.length) {
      return;
    }

    const followerRows = await this.db('user_follows')
      .select('following_id')
      .count({ total: '*' })
      .whereIn('following_id', rows.map((row) => row.user_id))
      .andWhere({ status: 'accepted' })
      .groupBy('following_id');
    const followerMap = new Map(followerRows.map((row) => [row.following_id, Number(row.total ?? 0)]));

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const followerCount = followerMap.get(row.user_id) ?? 0;
      const pronouns = metadata.pronouns ?? null;
      const badges = normaliseArray(metadata.badges);
      const languages = normaliseArray(metadata.languages);

      return {
        entityType: 'profiles',
        entityId: String(row.user_id),
        slug: metadata.slug ?? null,
        title: row.display_name ?? metadata.fullName ?? null,
        subtitle: row.tagline ?? pronouns ?? null,
        description: row.bio ?? null,
        tags: badges,
        categories: [],
        languages,
        price: null,
        rating: null,
        previewMedia: {
          url: row.avatar_url ?? metadata.avatarUrl ?? null,
          type: row.avatar_url || metadata.avatarUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          followerCount,
          role: row.role ?? metadata.role ?? null,
          badges,
          languages
        },
        metadata: {
          role: row.role ?? metadata.role ?? null,
          location: row.location ?? null,
          pronouns,
          badges,
          languages,
          createdAt: row.created_at ?? row.user_created_at
        },
        geo: null,
        searchTerms: buildSearchTerms([
          row.display_name,
          row.tagline,
          row.bio,
          row.location,
          row.role,
          pronouns,
          badges,
          languages
        ]),
        popularityScore: followerCount
      };
    });

    yield documents;
  }

  async *loadAds() {
    const rows = await this.db('ads_campaigns as a')
      .select(
        'a.id',
        'a.public_id',
        'a.name',
        'a.objective',
        'a.status',
        'a.budget_currency',
        'a.budget_daily_cents',
        'a.spend_total_cents',
        'a.performance_score',
        'a.ctr',
        'a.cpc_cents',
        'a.cpa_cents',
        'a.targeting_keywords',
        'a.targeting_audiences',
        'a.targeting_locations',
        'a.targeting_languages',
        'a.creative_headline',
        'a.creative_description',
        'a.creative_url',
        'a.start_at',
        'a.end_at',
        'a.metadata',
        'a.created_at'
      )
      .orderBy('a.id');
    if (!rows.length) {
      return;
    }

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const keywords = normaliseArray(row.targeting_keywords);
      const audiences = normaliseArray(row.targeting_audiences);
      const locations = normaliseArray(row.targeting_locations);
      const languages = normaliseArray(row.targeting_languages);
      const performanceScore = Number(row.performance_score ?? 0);
      const ctr = Number(row.ctr ?? 0);

      return {
        entityType: 'ads',
        entityId: String(row.id),
        slug: row.public_id ?? null,
        title: row.name,
        subtitle: [row.objective, ctr ? `${(ctr * 100).toFixed(2)}% CTR` : null].filter(Boolean).join(' · ') || null,
        description: row.creative_description ?? null,
        tags: keywords,
        categories: [],
        languages,
        price: null,
        rating: null,
        previewMedia: {
          url: metadata.creativePreviewUrl ?? null,
          type: metadata.creativePreviewUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          objective: row.objective ?? null,
          status: row.status ?? null,
          performanceScore,
          ctr,
          spendTotalCents: Number(row.spend_total_cents ?? 0),
          budgetDailyCents: Number(row.budget_daily_cents ?? 0),
          cpcCents: Number(row.cpc_cents ?? 0),
          cpaCents: Number(row.cpa_cents ?? 0),
          targetingAudiences: audiences,
          targetingLocations: locations,
          targetingLanguages: languages,
          startAt: row.start_at,
          endAt: row.end_at
        },
        metadata: {
          slug: row.public_id ?? null,
          status: row.status ?? null,
          objective: row.objective ?? null,
          targetingAudiences: audiences,
          targetingLocations: locations,
          targetingLanguages: languages,
          startAt: row.start_at,
          endAt: row.end_at,
          createdAt: row.created_at
        },
        geo: null,
        searchTerms: buildSearchTerms([
          row.name,
          row.objective,
          row.status,
          row.creative_headline,
          row.creative_description,
          keywords,
          audiences,
          locations,
          languages
        ]),
        popularityScore: performanceScore * 10 + ctr * 100
      };
    });

    yield documents;
  }

  async *loadEvents() {
    const rows = await this.db('live_classrooms as lc')
      .leftJoin('communities as c', 'c.id', 'lc.community_id')
      .select(
        'lc.id',
        'lc.slug',
        'lc.title',
        'lc.summary',
        'lc.description',
        'lc.type',
        'lc.status',
        'lc.is_ticketed',
        'lc.price_amount',
        'lc.price_currency',
        'lc.capacity',
        'lc.reserved_seats',
        'lc.timezone',
        'lc.start_at',
        'lc.end_at',
        'lc.topics',
        'lc.metadata',
        'lc.created_at',
        'c.name as community_name'
      )
      .orderBy('lc.id');
    if (!rows.length) {
      return;
    }

    const documents = rows.map((row) => {
      const metadata = parseJson(row.metadata, {});
      const topics = normaliseArray(row.topics);
      const priceAmount = Number(row.price_amount ?? 0);
      const isTicketed = Boolean(row.is_ticketed);
      const subtitleParts = [row.summary, row.community_name].filter(Boolean);

      return {
        entityType: 'events',
        entityId: String(row.id),
        slug: row.slug,
        title: row.title,
        subtitle: subtitleParts.length ? subtitleParts.join(' · ') : null,
        description: row.description ?? null,
        tags: topics,
        categories: [],
        languages: [],
        price: {
          currency: row.price_currency ?? 'USD',
          amount: priceAmount
        },
        rating: null,
        previewMedia: {
          url: metadata.coverImageUrl ?? null,
          type: metadata.coverImageUrl ? 'image' : null,
          placeholder: metadata.previewPlaceholder ?? null
        },
        metrics: {
          type: row.type ?? null,
          status: row.status ?? null,
          capacity: Number(row.capacity ?? 0),
          reservedSeats: Number(row.reserved_seats ?? 0),
          startAt: row.start_at,
          endAt: row.end_at,
          timezone: row.timezone ?? null,
          isTicketed
        },
        metadata: {
          slug: row.slug,
          type: row.type ?? null,
          status: row.status ?? null,
          timezone: row.timezone ?? null,
          topics,
          isTicketed,
          communityName: row.community_name ?? null,
          createdAt: row.created_at
        },
        geo: null,
        searchTerms: buildSearchTerms([
          row.title,
          row.summary,
          row.description,
          row.type,
          row.status,
          row.timezone,
          row.community_name,
          topics
        ]),
        popularityScore: Number(row.reserved_seats ?? 0) + (isTicketed ? 25 : 10)
      };
    });

    yield documents;
  }
}

export default SearchIngestionService;
