import db from '../config/database.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { INDEX_DEFINITIONS, searchClusterService } from './SearchClusterService.js';
import { recordSearchOperation, recordSearchIngestionRun } from '../observability/metrics.js';
import { getEntityScoreWeights } from '../config/searchRankingConfig.js';

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
    return value.filter((entry) => entry !== null && entry !== undefined);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry !== null && entry !== undefined) : [];
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

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dedupeStrings(values) {
  return Array.from(
    new Set(
      values
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item) => typeof item === 'string' && item.length > 0)
    )
  );
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeDateInput(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const INDEX_NAMES = INDEX_DEFINITIONS.map((definition) => definition.name);

export class SearchIngestionService {
  constructor({
    clusterService = searchClusterService,
    dbClient = db,
    loggerInstance = logger,
    batchSize = env.search.ingestion.batchSize,
    concurrency = env.search.ingestion.concurrency,
    deleteBeforeReindex = env.search.ingestion.deleteBeforeReindex,
    loaders = {}
  } = {}) {
    this.clusterService = clusterService;
    this.db = dbClient;
    this.logger = loggerInstance;
    this.batchSize = Math.max(25, batchSize);
    this.concurrency = Math.max(1, concurrency);
    this.deleteBeforeReindex = deleteBeforeReindex;

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
  }

  async fullReindex({ since = null, indexes = INDEX_NAMES } = {}) {
    const sinceDate = normalizeDateInput(since);
    const uniqueIndexes = indexes.filter((name, index, array) => array.indexOf(name) === index);
    uniqueIndexes.forEach((indexName) => {
      if (!this.loaders[indexName]) {
        throw new Error(`Search ingestion loader not defined for index "${indexName}"`);
      }
    });

    const queue = [...uniqueIndexes];
    const workers = Array.from({ length: Math.min(this.concurrency, queue.length || 1) }).map(() =>
      (async () => {
        while (queue.length) {
          const indexName = queue.shift();
          if (!indexName) {
            return;
          }
          try {
            await this.reindexIndex(indexName, { since: sinceDate });
          } catch (error) {
            recordSearchIngestionRun({
              index: this.resolveIndexUid(indexName),
              documentCount: 0,
              durationSeconds: 0,
              status: 'error',
              error
            });
            throw error;
          }
        }
      })()
    );

    await Promise.all(workers);
  }

  async reindexIndex(indexName, { since = null } = {}) {
    const loader = this.loaders[indexName];
    if (!loader) {
      throw new Error(`Search ingestion loader not defined for index "${indexName}"`);
    }

    const indexUid = this.resolveIndexUid(indexName);
    const startTime = Date.now();
    let processed = 0;
    const deleteBeforeSync = this.deleteBeforeReindex && !since;

    await this.clusterService.withAdminClient(`ingest:${indexUid}`, async (client, host) => {
      if (deleteBeforeSync) {
        const deleteTask = await recordSearchOperation('delete_all_documents', () => client.deleteAllDocuments());
        if (deleteTask?.taskUid) {
          await recordSearchOperation('wait_for_task', () =>
            client.waitForTask(deleteTask.taskUid, {
              timeoutMs: this.clusterService.requestTimeoutMs,
              intervalMs: 100
            })
          );
        }
      }

      for await (const documents of loader({ since, batchSize: this.batchSize })) {
        if (!Array.isArray(documents) || documents.length === 0) {
          continue;
        }

        const index = client.index(indexUid);
        const task = await recordSearchOperation('index_documents', () => index.addDocuments(documents));
        if (task?.taskUid) {
          await recordSearchOperation('wait_for_task', () =>
            client.waitForTask(task.taskUid, {
              timeoutMs: this.clusterService.requestTimeoutMs,
              intervalMs: 100
            })
          );
        }

        processed += documents.length;
        this.logger.debug(
          { index: indexUid, host, batchSize: documents.length, processed },
          'Indexed search documents batch'
        );
      }
    });

    const durationSeconds = (Date.now() - startTime) / 1000;
    recordSearchIngestionRun({ index: indexUid, documentCount: processed, durationSeconds, status: 'success' });
    this.logger.info({ index: indexUid, processed, durationSeconds }, 'Search ingestion completed');
  }

  resolveIndexUid(indexName) {
    const definition = INDEX_DEFINITIONS.find((item) => item.name === indexName);
    if (!definition) {
      throw new Error(`Unknown search index "${indexName}"`);
    }
    return definition.uid;
  }

  async *loadCommunities({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('communities as c')
        .select([
          'c.id',
          'c.slug',
          'c.name',
          'c.description',
          'c.visibility',
          'c.owner_id as ownerId',
          'c.metadata',
          'c.created_at as createdAt',
          'c.updated_at as updatedAt',
          this.db.raw(
            "(SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as memberCount"
          ),
          this.db.raw(
            "(SELECT COUNT(*) FROM community_resources WHERE community_id = c.id AND status = 'published') as resourceCount"
          ),
          this.db.raw(
            "(SELECT COUNT(*) FROM community_posts WHERE community_id = c.id AND status = 'published' AND deleted_at IS NULL) as postCount"
          ),
          this.db.raw(
            "(SELECT COUNT(*) FROM community_events WHERE community_id = c.id AND status IN ('scheduled','live','completed')) as eventCount"
          ),
          this.db.raw(
            "(SELECT COUNT(*) FROM community_message_reactions WHERE message_id IN (SELECT id FROM community_messages WHERE community_id = c.id)) as reactionCount"
          )
        ])
        .modify((qb) => {
          if (since) {
            qb.where('c.updated_at', '>=', since);
          }
        })
        .whereNull('c.deleted_at')
        .orderBy('c.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeCommunity(row));
      offset += rows.length;
    }
  }

  serializeCommunity(row) {
    const metadata = safeJsonParse(row.metadata, {});
    const topics = dedupeStrings([...toArray(metadata.topics), ...toArray(metadata.focus)]);
    const tags = dedupeStrings([...toArray(metadata.tags), ...topics]);
    const languages = dedupeStrings(toArray(metadata.languages));
    const timezone = metadata.timezone ?? metadata.defaultTimezone ?? env.engagement.defaultTimezone ?? 'Etc/UTC';
    const memberCount = normalizeNumber(row.memberCount, 0);
    const resourceCount = normalizeNumber(row.resourceCount, 0);
    const postCount = normalizeNumber(row.postCount, 0);
    const eventCount = normalizeNumber(row.eventCount, 0);
    const reactionCount = normalizeNumber(row.reactionCount, 0);
    const weights = getEntityScoreWeights('communities');
    const trendScore = Math.round(
      memberCount * weights.members +
        postCount * weights.posts +
        resourceCount * weights.resources +
        eventCount * weights.events +
        reactionCount * weights.reactions
    );

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: metadata.tagline ?? metadata.tagLine ?? null,
      description: row.description,
      topics,
      tags,
      category: metadata.category ?? topics[0] ?? 'general',
      visibility: row.visibility,
      timezone,
      isFeatured: toBoolean(metadata.isFeatured ?? metadata.featured, false),
      memberCount,
      trendScore,
      ownerId: row.ownerId,
      country: metadata.country ?? metadata.region ?? null,
      languages: languages.length ? languages : ['en'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async *loadCourses({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('courses as course')
        .leftJoin('users as instructor', 'course.instructor_id', 'instructor.id')
        .select([
          'course.id',
          'course.slug',
          'course.title',
          'course.summary',
          'course.description',
          'course.skills',
          'course.tags',
          'course.languages',
          'course.level',
          'course.category',
          'course.delivery_format as deliveryFormat',
          'course.thumbnail_url as thumbnailUrl',
          'course.price_currency as priceCurrency',
          'course.price_amount as priceAmount',
          'course.rating_average as ratingAverage',
          'course.rating_count as ratingCount',
          'course.enrolment_count as enrolmentCount',
          'course.release_at as releaseAt',
          'course.updated_at as updatedAt',
          'course.created_at as createdAt',
          'course.metadata',
          'course.status',
          'course.is_published as isPublished',
          'instructor.id as instructorId',
          'instructor.first_name as instructorFirstName',
          'instructor.last_name as instructorLastName'
        ])
        .modify((qb) => {
          qb.where('course.status', 'published');
          qb.andWhere('course.is_published', true);
          if (since) {
            qb.andWhere('course.updated_at', '>=', since);
          }
        })
        .orderBy('course.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeCourse(row));
      offset += rows.length;
    }
  }

  serializeCourse(row) {
    const metadata = safeJsonParse(row.metadata, {});
    const skills = dedupeStrings(toArray(row.skills));
    const tags = dedupeStrings(toArray(row.tags));
    const languages = dedupeStrings(toArray(row.languages));
    const instructorName = dedupeStrings([
      [row.instructorFirstName, row.instructorLastName].filter(Boolean).join(' ').trim(),
      metadata.instructorName
    ]).find(Boolean);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary ?? row.description?.slice(0, 240) ?? null,
      description: row.description,
      skills,
      tags,
      level: row.level,
      category: row.category,
      languages: languages.length ? languages : ['en'],
      deliveryFormat: row.deliveryFormat,
      thumbnailUrl: row.thumbnailUrl ?? metadata.thumbnailUrl ?? null,
      price: {
        currency: row.priceCurrency,
        amount: normalizeNumber(row.priceAmount, 0)
      },
      rating: {
        average: normalizeNumber(row.ratingAverage, 0),
        count: normalizeNumber(row.ratingCount, 0)
      },
      enrolmentCount: normalizeNumber(row.enrolmentCount, 0),
      releaseAt: row.releaseAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      instructorId: row.instructorId,
      instructorName: instructorName ?? null
    };
  }

  async *loadEbooks({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('ebooks as ebook')
        .leftJoin('content_assets as asset', 'ebook.asset_id', 'asset.id')
        .select([
          'ebook.id',
          'ebook.slug',
          'ebook.title',
          'ebook.subtitle',
          'ebook.description',
          'ebook.authors',
          'ebook.tags',
          'ebook.categories',
          'ebook.languages',
          'ebook.isbn',
          'ebook.price_currency as priceCurrency',
          'ebook.price_amount as priceAmount',
          'ebook.reading_time_minutes as readingTimeMinutes',
          'ebook.rating_average as ratingAverage',
          'ebook.rating_count as ratingCount',
          'ebook.status',
          'ebook.is_public as isPublic',
          'ebook.release_at as releaseAt',
          'ebook.updated_at as updatedAt',
          'ebook.created_at as createdAt',
          'ebook.metadata',
          'ebook.watermark_id as watermarkId',
          'asset.storage_key as storageKey',
          'asset.converted_key as convertedKey'
        ])
        .modify((qb) => {
          qb.where('ebook.status', 'published');
          if (since) {
            qb.andWhere('ebook.updated_at', '>=', since);
          }
        })
        .orderBy('ebook.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeEbook(row));
      offset += rows.length;
    }
  }

  serializeEbook(row) {
    const metadata = safeJsonParse(row.metadata, {});
    const authors = dedupeStrings(toArray(row.authors));
    const tags = dedupeStrings([...toArray(row.tags), ...toArray(metadata.keywords)]);
    const categories = dedupeStrings(toArray(row.categories));
    const languages = dedupeStrings(toArray(row.languages));
    const priceMeta = metadata.price ?? metadata.ticketPrice ?? {};
    const priceAmount = normalizeNumber(row.priceAmount ?? priceMeta.amount ?? priceMeta.cents, 0);
    const priceCurrency = row.priceCurrency ?? priceMeta.currency ?? 'USD';

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? metadata.subtitle ?? null,
      description: row.description,
      authors,
      tags,
      categories,
      languages: languages.length ? languages : ['en'],
      isbn: row.isbn ?? metadata.isbn ?? null,
      price: {
        currency: priceCurrency,
        amount: priceAmount
      },
      readingTimeMinutes: normalizeNumber(row.readingTimeMinutes ?? metadata.readingTimeMinutes, 0),
      rating: {
        average: normalizeNumber(row.ratingAverage ?? metadata.ratingAverage, 0),
        count: normalizeNumber(row.ratingCount ?? metadata.ratingCount, 0)
      },
      releaseAt: row.releaseAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      watermarkId: row.watermarkId,
      asset: {
        storageKey: row.storageKey ?? null,
        convertedKey: row.convertedKey ?? null
      },
      isPublic: toBoolean(row.isPublic ?? metadata.isPublic, false)
    };
  }

  async *loadTutors({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('tutor_profiles as tutor')
        .leftJoin('users as user', 'tutor.user_id', 'user.id')
        .select([
          'tutor.id',
          'tutor.display_name as displayName',
          'tutor.headline',
          'tutor.bio',
          'tutor.skills',
          'tutor.languages',
          'tutor.country',
          'tutor.timezones',
          'tutor.availability_preferences as availabilityPreferences',
          'tutor.hourly_rate_amount as hourlyRateAmount',
          'tutor.hourly_rate_currency as hourlyRateCurrency',
          'tutor.rating_average as ratingAverage',
          'tutor.rating_count as ratingCount',
          'tutor.completed_sessions as completedSessions',
          'tutor.response_time_minutes as responseTimeMinutes',
          'tutor.is_verified as isVerified',
          'tutor.metadata',
          'tutor.created_at as createdAt',
          'tutor.updated_at as updatedAt',
          'user.id as userId',
          this.db.raw(
            "(SELECT MIN(start_at) FROM tutor_availability_slots WHERE tutor_id = tutor.id AND status = 'open') as nextAvailability"
          )
        ])
        .modify((qb) => {
          if (since) {
            qb.where('tutor.updated_at', '>=', since);
          }
        })
        .orderBy('tutor.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeTutor(row));
      offset += rows.length;
    }
  }

  serializeTutor(row) {
    const metadata = safeJsonParse(row.metadata, {});
    const skills = dedupeStrings([...toArray(row.skills), ...toArray(metadata.specialties)]);
    const languages = dedupeStrings(toArray(row.languages));
    const timezones = dedupeStrings(toArray(row.timezones));
    const availability = safeJsonParse(row.availabilityPreferences, {});

    return {
      id: row.id,
      displayName: row.displayName,
      headline: row.headline ?? metadata.headline ?? null,
      bio: row.bio ?? metadata.bio ?? null,
      skills,
      languages: languages.length ? languages : ['en'],
      country: row.country ?? metadata.country ?? null,
      timezones: timezones.length ? timezones : ['Etc/UTC'],
      hourlyRate: {
        currency: row.hourlyRateCurrency ?? 'USD',
        amount: normalizeNumber(row.hourlyRateAmount, 0)
      },
      rating: {
        average: normalizeNumber(row.ratingAverage ?? metadata.ratingAverage, 0),
        count: normalizeNumber(row.ratingCount ?? metadata.ratingCount, 0)
      },
      completedSessions: normalizeNumber(row.completedSessions ?? metadata.completedSessions, 0),
      responseTimeMinutes: normalizeNumber(row.responseTimeMinutes ?? metadata.responseTimeMinutes, 0),
      availability: {
        nextAvailableAt: row.nextAvailability ?? null,
        preferences: availability
      },
      isVerified: toBoolean(row.isVerified ?? metadata.isVerified, false),
      updatedAt: row.updatedAt,
      createdAt: row.createdAt
    };
  }

  async *loadProfiles({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('users as user')
        .leftJoin('user_privacy_settings as privacy', 'privacy.user_id', 'user.id')
        .leftJoin('tutor_profiles as tutor', 'tutor.user_id', 'user.id')
        .select([
          'user.id',
          'user.first_name as firstName',
          'user.last_name as lastName',
          'user.role',
          'user.created_at as createdAt',
          'user.updated_at as updatedAt',
          'privacy.profile_visibility as profileVisibility',
          'privacy.metadata as privacyMetadata',
          'tutor.bio as tutorBio',
          'tutor.skills as tutorSkills',
          'tutor.languages as tutorLanguages',
          'tutor.country as tutorCountry',
          'tutor.is_verified as tutorVerified',
          this.db.raw(
            "(SELECT COUNT(*) FROM user_follows WHERE following_id = user.id AND status = 'accepted') as followerCount"
          ),
          this.db.raw(
            `(
              SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cm.community_id, 'name', c.name))
              FROM community_members cm
              JOIN communities c ON c.id = cm.community_id
              WHERE cm.user_id = user.id AND cm.status = 'active'
            ) as communitiesJson`
          )
        ])
        .modify((qb) => {
          if (since) {
            qb.where('user.updated_at', '>=', since);
          }
        })
        .orderBy('user.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeProfile(row));
      offset += rows.length;
    }
  }

  serializeProfile(row) {
    const privacyMetadata = safeJsonParse(row.privacyMetadata, {});
    const tutorSkills = toArray(row.tutorSkills);
    const tutorLanguages = toArray(row.tutorLanguages);
    const communitiesJson = safeJsonParse(row.communitiesJson, []);
    const displayName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
    const skills = dedupeStrings([...tutorSkills, ...toArray(privacyMetadata.skills)]);
    const languages = dedupeStrings([...tutorLanguages, ...toArray(privacyMetadata.languages)]);
    const badges = dedupeStrings(toArray(privacyMetadata.badges));
    const communities = Array.isArray(communitiesJson)
      ? communitiesJson.map((entry) => entry?.name).filter(Boolean)
      : [];

    return {
      id: row.id,
      displayName: displayName || privacyMetadata.displayName || null,
      headline: privacyMetadata.headline ?? null,
      bio: row.tutorBio ?? privacyMetadata.bio ?? null,
      skills,
      role: row.role,
      languages: languages.length ? languages : ['en'],
      communities,
      badges,
      country: row.tutorCountry ?? privacyMetadata.country ?? null,
      followerCount: normalizeNumber(row.followerCount, 0),
      isVerified: toBoolean(row.tutorVerified ?? privacyMetadata.verified, false),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async *loadAds({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('ads_campaigns as campaign')
        .select([
          'campaign.id',
          'campaign.name',
          'campaign.objective',
          'campaign.status',
          'campaign.budget_currency as budgetCurrency',
          'campaign.budget_daily_cents as budgetDailyCents',
          'campaign.spend_currency as spendCurrency',
          'campaign.spend_total_cents as spendTotalCents',
          'campaign.performance_score as performanceScore',
          'campaign.ctr',
          'campaign.cpc_cents as cpcCents',
          'campaign.cpa_cents as cpaCents',
          'campaign.targeting_keywords as targetingKeywords',
          'campaign.targeting_audiences as targetingAudiences',
          'campaign.targeting_locations as targetingLocations',
          'campaign.targeting_languages as targetingLanguages',
          'campaign.creative_headline as creativeHeadline',
          'campaign.creative_description as creativeDescription',
          'campaign.creative_url as creativeUrl',
          'campaign.start_at as startAt',
          'campaign.end_at as endAt',
          'campaign.created_by as createdBy',
          'campaign.created_at as createdAt',
          'campaign.updated_at as updatedAt',
          'campaign.metadata'
        ])
        .modify((qb) => {
          qb.whereNot('campaign.status', 'archived');
          if (since) {
            qb.andWhere('campaign.updated_at', '>=', since);
          }
        })
        .orderBy('campaign.id')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeAd(row));
      offset += rows.length;
    }
  }

  serializeAd(row) {
    const metadata = safeJsonParse(row.metadata, {});
    return {
      id: row.id,
      name: row.name,
      objective: row.objective,
      status: row.status,
      budget: {
        currency: row.budgetCurrency,
        daily: normalizeNumber(row.budgetDailyCents, 0)
      },
      spend: {
        currency: row.spendCurrency,
        total: normalizeNumber(row.spendTotalCents, 0)
      },
      performanceScore: normalizeNumber(row.performanceScore, 0),
      ctr: normalizeNumber(row.ctr, 0),
      cpc: normalizeNumber(row.cpcCents, 0),
      cpa: normalizeNumber(row.cpaCents, 0),
      targeting: {
        keywords: dedupeStrings(toArray(row.targetingKeywords)),
        audiences: dedupeStrings(toArray(row.targetingAudiences)),
        locations: dedupeStrings(toArray(row.targetingLocations)),
        languages: dedupeStrings(toArray(row.targetingLanguages))
      },
      creative: {
        headline: row.creativeHeadline,
        description: row.creativeDescription ?? metadata.creativeDescription ?? null,
        url: row.creativeUrl ?? metadata.creativeUrl ?? null
      },
      startAt: row.startAt,
      endAt: row.endAt,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async *loadEvents({ since, batchSize }) {
    let offset = 0;
    for (;;) {
      const rows = await this.db('community_events as event')
        .leftJoin('communities as community', 'community.id', 'event.community_id')
        .select([
          'event.id',
          'event.slug',
          'event.title',
          'event.summary',
          'event.description',
          'event.community_id as communityId',
          'community.name as communityName',
          'event.status',
          'event.timezone',
          'event.is_ticketed as isTicketed',
          'event.attendance_limit as capacity',
          'event.start_at as startAt',
          'event.end_at as endAt',
          'event.metadata',
          'event.created_at as createdAt',
          'event.updated_at as updatedAt'
        ])
        .modify((qb) => {
          if (since) {
            qb.where('event.updated_at', '>=', since);
          }
        })
        .orderBy('event.start_at', 'desc')
        .limit(batchSize)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      yield rows.map((row) => this.serializeEvent(row));
      offset += rows.length;
    }
  }

  serializeEvent(row) {
    const metadata = safeJsonParse(row.metadata, {});
    const topics = dedupeStrings(toArray(metadata.topics));
    const price = metadata.price ?? metadata.ticketPrice ?? {};
    const isTicketed = toBoolean(row.isTicketed ?? metadata.ticketed, false) || normalizeNumber(price.amount ?? price.cents, 0) > 0;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? row.summary ?? null,
      topics,
      communityId: row.communityId,
      communityName: row.communityName,
      type: metadata.type ?? metadata.sessionType ?? 'workshop',
      status: row.status,
      timezone: row.timezone,
      isTicketed,
      price: {
        currency: price.currency ?? 'USD',
        amount: normalizeNumber(price.amount ?? price.cents, 0)
      },
      capacity: normalizeNumber(row.capacity ?? metadata.capacity, 0),
      startAt: row.startAt,
      endAt: row.endAt,
      instructorId: metadata.instructorId ?? metadata.hostId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async getIngestionSummary() {
    const stats = await this.clusterService.getClusterStatus();
    const lastRuns = await recordSearchOperation('ingestion.summary', async () =>
      this.db('search_ingestion_runs')
        .select(['id', 'index_name as indexName', 'status', 'document_count as documentCount', 'duration_seconds as durationSeconds', 'completed_at as completedAt'])
        .orderBy('completed_at', 'desc')
        .limit(10)
    ).catch(() => []);

    return {
      cluster: stats,
      recentRuns: lastRuns,
      generatedAt: new Date().toISOString()
    };
  }
}

export const searchIngestionService = new SearchIngestionService();

export default SearchIngestionService;
