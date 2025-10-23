import db from '../config/database.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { recordSearchIngestionRun } from '../observability/metrics.js';
import searchDocumentsRepository from '../repositories/searchDocumentsRepository.js';
import { SUPPORTED_ENTITIES } from './search/entityConfig.js';
import { schedulerCheckpointModel } from '../models/SchedulerCheckpointModel.js';

function safeJsonParse(value, fallback) {
  if (!value) {
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

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== undefined && entry !== null);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry !== undefined && entry !== null) : [];
  } catch (_error) {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  }
}

function buildSearchVector(...parts) {
  return parts
    .flatMap((part) => {
      if (!part) {
        return [];
      }
      if (Array.isArray(part)) {
        return part.filter(Boolean);
      }
      return [part];
    })
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join(' ');
}

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function serialiseDate(value) {
  const date = normaliseDate(value);
  return date ? date.toISOString() : null;
}

async function* paginateQuery(builderFactory, batchSize) {
  let offset = 0;
  while (true) {
    const rows = await builderFactory().limit(batchSize).offset(offset);
    if (!rows.length) {
      return;
    }
    yield rows;
    offset += rows.length;
  }
}

export class SearchIngestionService {
  constructor({
    dbClient = db,
    repository = searchDocumentsRepository,
    loggerInstance = logger.child({ module: 'search-ingestion-service' }),
    batchSize = env.search.ingestion.batchSize,
    concurrency = env.search.ingestion.concurrency,
    deleteBeforeReindex = env.search.ingestion.deleteBeforeReindex,
    loaders = {},
    checkpointStore = schedulerCheckpointModel
  } = {}) {
    this.db = dbClient;
    this.repository = repository;
    this.logger = loggerInstance;
    this.batchSize = Math.max(25, batchSize);
    this.concurrency = Math.max(1, concurrency);
    this.deleteBeforeReindex = Boolean(deleteBeforeReindex);
    this.entities = SUPPORTED_ENTITIES;
    this.loaders = {
      communities: this.loadCommunities.bind(this),
      courses: this.loadCourses.bind(this),
      ebooks: this.loadEbooks.bind(this),
      tutors: this.loadTutors.bind(this),
      profiles: this.loadProfiles.bind(this),
      ads: this.loadAds.bind(this),
      events: this.loadEvents.bind(this),
      ...loaders
    };
    this.checkpoints =
      typeof checkpointStore?.withConnection === 'function'
        ? checkpointStore.withConnection(dbClient)
        : checkpointStore;
  }

  async fullReindex({ since = null, indexes = this.entities } = {}) {
    const sinceDate = since ? normaliseDate(since) : null;
    const uniqueIndexes = indexes.filter((name, index, array) => array.indexOf(name) === index);
    uniqueIndexes.forEach((entity) => {
      if (!this.loaders[entity]) {
        throw new Error(`Search ingestion loader not defined for entity "${entity}"`);
      }
    });

    const queue = [...uniqueIndexes];
    const results = [];
    const workers = Array.from({ length: Math.min(this.concurrency, queue.length || 1) }).map(() =>
      (async () => {
        while (queue.length) {
          const entity = queue.shift();
          if (!entity) {
            return;
          }
          const outcome = await this.reindexEntity(entity, { since: sinceDate });
          results.push(outcome);
        }
      })()
    );

    await Promise.all(workers);
    return results;
  }

  async reindexEntity(entity, { since = null } = {}) {
    const loader = this.loaders[entity];
    if (!loader) {
      throw new Error(`Search ingestion loader not defined for entity "${entity}"`);
    }

    const startTime = Date.now();
    let processed = 0;
    const checkpointKey = `search.ingestion.${entity}`;
    const sinceIso = since ? normaliseDate(since)?.toISOString?.() ?? null : null;

    if (!since && this.deleteBeforeReindex) {
      await this.repository.deleteByEntity(entity);
    }

    try {
      for await (const documents of loader({ since, batchSize: this.batchSize })) {
        if (!Array.isArray(documents) || !documents.length) {
          continue;
        }
        const inserted = await this.repository.upsertDocuments(documents);
        processed += inserted;
      }

      const durationSeconds = (Date.now() - startTime) / 1000;
      recordSearchIngestionRun({
        index: entity,
        documentCount: processed,
        durationSeconds,
        status: 'success'
      });
      await this.checkpoints.recordRun(checkpointKey, {
        status: 'success',
        ranAt: new Date(),
        metadata: {
          entity,
          documentCount: processed,
          since: sinceIso,
          durationSeconds
        }
      });
      this.logger.info({ entity, processed, durationSeconds }, 'Search documents synchronised');
      return { entity, documentCount: processed, durationSeconds };
    } catch (error) {
      const durationSeconds = (Date.now() - startTime) / 1000;
      recordSearchIngestionRun({
        index: entity,
        documentCount: processed,
        durationSeconds,
        status: 'error',
        error
      });
      await this.checkpoints.recordRun(checkpointKey, {
        status: 'error',
        ranAt: new Date(),
        metadata: {
          entity,
          documentCount: processed,
          since: sinceIso,
          durationSeconds
        },
        errorMessage: error.message ?? String(error)
      });
      this.logger.error({ err: error, entity }, 'Search ingestion failed');
      throw error;
    }
  }

  async *loadCommunities({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('communities').select('*');
      if (since) {
        query.where('communities.updated_at', '>=', since);
      }
      query.orderBy('communities.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const metadata = safeJsonParse(row.metadata, {});
        const topics = toArray(metadata.topics);
        const tags = toArray(metadata.tags);
        const languages = toArray(metadata.languages);
        const timezone = metadata.timezone ?? metadata.timezoneId ?? null;
        const country = metadata.country ?? null;
        const trendScore = normaliseNumber(metadata.trendScore ?? metadata.metrics?.trendScore, 0);
        const memberCount = normaliseNumber(
          metadata.memberCount ?? metadata.metrics?.memberCount ?? row.member_count,
          0
        );
        const coverImageUrl = row.cover_image_url ?? metadata.coverImageUrl ?? null;
        const geo = metadata.location ?? metadata.geo ?? {};

        const payload = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          tagline: metadata.tagline ?? null,
          description: row.description ?? metadata.description ?? null,
          topics,
          tags,
          category: metadata.category ?? 'general',
          visibility: row.visibility,
          memberCount,
          trendScore,
          coverImageUrl,
          createdAt: serialiseDate(row.created_at),
          updatedAt: serialiseDate(row.updated_at)
        };

        return {
          entityType: 'communities',
          entityId: row.id,
          title: row.name,
          summary: metadata.tagline ?? row.description ?? null,
          searchVector: buildSearchVector(row.name, metadata.tagline, row.description, topics, tags),
          filters: {
            visibility: row.visibility,
            category: metadata.category ?? 'general',
            tags,
            topics,
            timezone,
            country,
            languages
          },
          metadata: {
            payload,
            sort: {
              trendScore,
              memberCount,
              createdAt: serialiseDate(row.created_at)
            }
          },
          media: {
            coverImageUrl,
            imageUrl: coverImageUrl
          },
          geo: typeof geo === 'object' ? geo : {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadCourses({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('courses').select('*');
      if (since) {
        query.where('courses.updated_at', '>=', since);
      }
      query.orderBy('courses.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const skills = toArray(row.skills);
        const tags = toArray(row.tags);
        const languages = toArray(row.languages);
        const metadata = safeJsonParse(row.metadata, {});
        const thumbnailUrl = row.thumbnail_url ?? metadata.thumbnailUrl ?? null;
        const ratingAverage = normaliseNumber(row.rating_average, 0);
        const ratingCount = normaliseNumber(row.rating_count, 0);
        const enrolmentCount = normaliseNumber(row.enrolment_count, 0);

        const payload = {
          id: row.id,
          slug: row.slug,
          title: row.title,
          summary: row.summary ?? null,
          description: row.description ?? null,
          skills,
          tags,
          languages,
          level: row.level,
          category: row.category,
          deliveryFormat: row.delivery_format,
          price: { currency: row.price_currency, amount: row.price_amount },
          rating: { average: ratingAverage, count: ratingCount },
          enrolmentCount,
          releaseAt: serialiseDate(row.release_at),
          isPublished: Boolean(row.is_published),
          thumbnailUrl,
          metadata
        };

        return {
          entityType: 'courses',
          entityId: row.id,
          title: row.title,
          summary: row.summary ?? null,
          searchVector: buildSearchVector(
            row.title,
            row.summary,
            row.description,
            skills,
            tags,
            languages,
            row.level,
            row.category
          ),
          filters: {
            category: row.category,
            level: row.level,
            deliveryFormat: row.delivery_format,
            languages,
            tags,
            'price.currency': row.price_currency,
            isPublished: Boolean(row.is_published)
          },
          metadata: {
            payload,
            sort: {
              ratingAverage,
              releaseAt: serialiseDate(row.release_at),
              priceAmount: normaliseNumber(row.price_amount)
            }
          },
          media: {
            thumbnailUrl,
            imageUrl: thumbnailUrl
          },
          geo: {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadEbooks({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('ebooks').select('*');
      if (since) {
        query.where('ebooks.updated_at', '>=', since);
      }
      query.orderBy('ebooks.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const tags = toArray(row.tags);
        const categories = toArray(row.categories);
        const authors = toArray(row.authors);
        const languages = toArray(row.languages);
        const metadata = safeJsonParse(row.metadata, {});
        const ratingAverage = normaliseNumber(row.rating_average, 0);
        const ratingCount = normaliseNumber(row.rating_count, 0);

        const payload = {
          id: row.id,
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle ?? null,
          description: row.description ?? null,
          authors,
          tags,
          categories,
          languages,
          isbn: row.isbn ?? null,
          readingTimeMinutes: normaliseNumber(row.reading_time_minutes, 0),
          price: { currency: row.price_currency, amount: row.price_amount },
          rating: { average: ratingAverage, count: ratingCount },
          status: row.status,
          isPublic: Boolean(row.is_public),
          releaseAt: serialiseDate(row.release_at),
          metadata
        };

        const priceAmount = normaliseNumber(row.price_amount, 0);

        return {
          entityType: 'ebooks',
          entityId: row.id,
          title: row.title,
          summary: row.subtitle ?? row.description ?? null,
          searchVector: buildSearchVector(
            row.title,
            row.subtitle,
            row.description,
            authors,
            tags,
            categories,
            languages
          ),
          filters: {
            categories,
            languages,
            tags,
            'price.currency': row.price_currency,
            status: row.status
          },
          metadata: {
            payload,
            sort: {
              ratingAverage,
              releaseAt: serialiseDate(row.release_at),
              readingTimeMinutes: normaliseNumber(row.reading_time_minutes, 0)
            }
          },
          media: {},
          geo: {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadTutors({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('tutor_profiles').select('*');
      if (since) {
        query.where('tutor_profiles.updated_at', '>=', since);
      }
      query.orderBy('tutor_profiles.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const skills = toArray(row.skills);
        const languages = toArray(row.languages);
        const timezones = toArray(row.timezones);
        const metadata = safeJsonParse(row.metadata, {});
        const ratingAverage = normaliseNumber(row.rating_average, 0);
        const ratingCount = normaliseNumber(row.rating_count, 0);
        const responseTimeMinutes = normaliseNumber(row.response_time_minutes, 0);
        const hourlyRateAmount = normaliseNumber(row.hourly_rate_amount, 0);

        const payload = {
          id: row.id,
          displayName: row.display_name,
          headline: row.headline ?? null,
          bio: row.bio ?? null,
          skills,
          languages,
          country: row.country ?? null,
          timezones,
          hourlyRate: { currency: row.hourly_rate_currency, amount: hourlyRateAmount },
          rating: { average: ratingAverage, count: ratingCount },
          completedSessions: normaliseNumber(row.completed_sessions, 0),
          responseTimeMinutes,
          isVerified: Boolean(row.is_verified),
          metadata
        };

        return {
          entityType: 'tutors',
          entityId: row.id,
          title: row.display_name,
          summary: row.headline ?? null,
          searchVector: buildSearchVector(
            row.display_name,
            row.headline,
            row.bio,
            skills,
            languages,
            timezones,
            row.country
          ),
          filters: {
            languages,
            skills,
            country: row.country ?? null,
            isVerified: Boolean(row.is_verified)
          },
          metadata: {
            payload,
            sort: {
              ratingAverage,
              hourlyRateAmount,
              responseTimeMinutes
            }
          },
          media: {},
          geo: metadata.location ?? {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadProfiles({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('users').select('*');
      if (since) {
        query.where('users.updated_at', '>=', since);
      }
      query.orderBy('users.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const metadata = {};
        const payload = {
          id: row.id,
          displayName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.email,
          headline: null,
          bio: null,
          role: row.role,
          followerCount: 0,
          communities: [],
          badges: [],
          languages: [],
          metadata
        };

        return {
          entityType: 'profiles',
          entityId: row.id,
          title: payload.displayName,
          summary: row.email,
          searchVector: buildSearchVector(row.first_name, row.last_name, row.email, row.role),
          filters: {
            role: row.role
          },
          metadata: {
            payload,
            sort: {
              followers: 0,
              createdAt: serialiseDate(row.created_at)
            }
          },
          media: {},
          geo: {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadAds({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('ads_campaigns').select('*');
      if (since) {
        query.where('ads_campaigns.updated_at', '>=', since);
      }
      query.orderBy('ads_campaigns.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const targetingKeywords = toArray(row.targeting_keywords);
        const targetingAudiences = toArray(row.targeting_audiences);
        const targetingLocations = toArray(row.targeting_locations);
        const targetingLanguages = toArray(row.targeting_languages);
        const metadata = safeJsonParse(row.metadata, {});

        const payload = {
          id: row.id,
          name: row.name,
          objective: row.objective,
          status: row.status,
          budget: { currency: row.budget_currency, dailyCents: normaliseNumber(row.budget_daily_cents) },
          spend: { currency: row.spend_currency, totalCents: normaliseNumber(row.spend_total_cents) },
          performanceScore: normaliseNumber(row.performance_score, 0),
          ctr: normaliseNumber(row.ctr, 0),
          targeting: {
            keywords: targetingKeywords,
            audiences: targetingAudiences,
            locations: targetingLocations,
            languages: targetingLanguages
          },
          creative: {
            headline: row.creative_headline,
            description: row.creative_description,
            url: row.creative_url
          },
          startAt: serialiseDate(row.start_at),
          endAt: serialiseDate(row.end_at),
          metadata
        };

        return {
          entityType: 'ads',
          entityId: row.id,
          title: row.name,
          summary: row.creative_description ?? null,
          searchVector: buildSearchVector(
            row.name,
            row.creative_headline,
            row.creative_description,
            targetingKeywords,
            targetingAudiences,
            targetingLocations
          ),
          filters: {
            status: row.status,
            objective: row.objective,
            'targeting.audiences': targetingAudiences,
            'targeting.locations': targetingLocations,
            'targeting.languages': targetingLanguages
          },
          metadata: {
            payload,
            sort: {
              performanceScore: normaliseNumber(row.performance_score, 0),
              spendTotalCents: normaliseNumber(row.spend_total_cents, 0),
              createdAt: serialiseDate(row.created_at)
            }
          },
          media: {},
          geo: {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }

  async *loadEvents({ since, batchSize }) {
    const builderFactory = () => {
      const query = this.db('community_events').select('*');
      if (since) {
        query.where('community_events.updated_at', '>=', since);
      }
      query.orderBy('community_events.updated_at', 'asc');
      return query;
    };

    for await (const rows of paginateQuery(builderFactory, batchSize)) {
      const documents = rows.map((row) => {
        const metadata = safeJsonParse(row.metadata, {});
        const topics = toArray(row.topics ?? metadata.topics);

        const payload = {
          id: row.id,
          communityId: row.community_id,
          title: row.title,
          type: row.type,
          status: row.status,
          timezone: row.timezone,
          isTicketed: Boolean(row.is_ticketed),
          price: { currency: row.price_currency, amount: normaliseNumber(row.price_amount, 0) },
          startAt: serialiseDate(row.start_at),
          endAt: serialiseDate(row.end_at),
          topics,
          description: row.description ?? null,
          metadata
        };

        return {
          entityType: 'events',
          entityId: row.id,
          title: row.title,
          summary: row.description ?? null,
          searchVector: buildSearchVector(
            row.title,
            row.description,
            topics,
            row.type,
            row.timezone
          ),
          filters: {
            type: row.type,
            status: row.status,
            timezone: row.timezone,
            isTicketed: Boolean(row.is_ticketed),
            'price.currency': row.price_currency
          },
          metadata: {
            payload,
            sort: {
              startAt: serialiseDate(row.start_at),
              createdAt: serialiseDate(row.created_at)
            }
          },
          media: {},
          geo: metadata.location ?? {},
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
      yield documents;
    }
  }
}

const searchIngestionService = new SearchIngestionService();

export default searchIngestionService;
