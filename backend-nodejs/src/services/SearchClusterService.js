import logger from '../config/logger.js';
import { env } from '../config/env.js';
import searchConfiguration, { createMeilisearchClient } from '../config/search.js';
import {
  recordSearchOperation,
  updateSearchIndexStatus,
  updateSearchNodeHealth
} from '../observability/metrics.js';

export const INDEX_DEFINITIONS = buildIndexDefinitions(env.search.indexPrefix);

function buildIndexDefinitions(prefix) {
  const namespaces = {
    communities: {
      primaryKey: 'id',
      searchableAttributes: ['name', 'tagline', 'description', 'topics', 'tags'],
      filterableAttributes: [
        'visibility',
        'category',
        'tags',
        'timezone',
        'isFeatured',
        'memberCount',
        'ownerId',
        'country',
        'languages'
      ],
      sortableAttributes: ['memberCount', 'trendScore', 'createdAt', 'updatedAt'],
      displayedAttributes: [
        'id',
        'slug',
        'name',
        'tagline',
        'description',
        'topics',
        'tags',
        'category',
        'visibility',
        'timezone',
        'isFeatured',
        'memberCount',
        'trendScore',
        'ownerId',
        'country',
        'languages',
        'createdAt',
        'updatedAt'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(trendScore)',
        'desc(memberCount)'
      ],
      synonyms: {
        community: ['group', 'guild', 'hub'],
        communities: ['groups', 'guilds', 'hubs'],
        mentor: ['coach', 'advisor', 'guide'],
        mentors: ['coaches', 'advisors', 'guides']
      }
    },
    courses: {
      primaryKey: 'id',
      searchableAttributes: ['title', 'summary', 'skills', 'tags', 'instructorName'],
      filterableAttributes: [
        'level',
        'category',
        'tags',
        'languages',
        'deliveryFormat',
        'price.currency',
        'price.amount',
        'rating.average',
        'rating.count',
        'isPublished'
      ],
      sortableAttributes: [
        'rating.average',
        'rating.count',
        'enrolmentCount',
        'price.amount',
        'releaseAt',
        'updatedAt'
      ],
      displayedAttributes: [
        'id',
        'slug',
        'title',
        'summary',
        'skills',
        'tags',
        'level',
        'category',
        'languages',
        'deliveryFormat',
        'price',
        'rating',
        'enrolmentCount',
        'releaseAt',
        'updatedAt',
        'instructorId',
        'instructorName'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(rating.average)',
        'desc(enrolmentCount)',
        'desc(releaseAt)'
      ],
      synonyms: {
        course: ['class', 'program', 'curriculum'],
        courses: ['classes', 'programs', 'curricula'],
        powerpoint: ['deck', 'slides'],
        ppt: ['powerpoint', 'slides']
      }
    },
    ebooks: {
      primaryKey: 'id',
      searchableAttributes: ['title', 'description', 'authors', 'tags', 'isbn'],
      filterableAttributes: [
        'categories',
        'tags',
        'languages',
        'price.currency',
        'price.amount',
        'readingTimeMinutes',
        'releaseAt',
        'isPublished'
      ],
      sortableAttributes: ['rating.average', 'rating.count', 'releaseAt', 'updatedAt'],
      displayedAttributes: [
        'id',
        'slug',
        'title',
        'description',
        'authors',
        'tags',
        'categories',
        'languages',
        'price',
        'rating',
        'readingTimeMinutes',
        'releaseAt',
        'updatedAt',
        'watermarkId'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(rating.average)',
        'desc(rating.count)',
        'desc(releaseAt)'
      ],
      synonyms: {
        ebook: ['book', 'digital book', 'guide'],
        ebooks: ['books', 'digital books', 'guides'],
        author: ['writer'],
        authors: ['writers']
      }
    },
    tutors: {
      primaryKey: 'id',
      searchableAttributes: ['displayName', 'headline', 'bio', 'skills', 'languages'],
      filterableAttributes: [
        'hourlyRate.currency',
        'hourlyRate.amount',
        'skills',
        'languages',
        'rating.average',
        'rating.count',
        'responseTimeMinutes',
        'country',
        'timezones',
        'isVerified'
      ],
      sortableAttributes: [
        'rating.average',
        'rating.count',
        'hourlyRate.amount',
        'responseTimeMinutes',
        'completedSessions',
        'updatedAt'
      ],
      displayedAttributes: [
        'id',
        'displayName',
        'headline',
        'bio',
        'skills',
        'languages',
        'country',
        'timezones',
        'rating',
        'hourlyRate',
        'completedSessions',
        'responseTimeMinutes',
        'availability',
        'isVerified',
        'updatedAt'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(rating.average)',
        'desc(completedSessions)',
        'asc(responseTimeMinutes)'
      ],
      synonyms: {
        tutor: ['coach', 'instructor', 'mentor'],
        tutors: ['coaches', 'instructors', 'mentors']
      }
    },
    profiles: {
      primaryKey: 'id',
      searchableAttributes: ['displayName', 'headline', 'bio', 'skills', 'communities'],
      filterableAttributes: [
        'role',
        'country',
        'languages',
        'communities',
        'badges',
        'isVerified',
        'createdAt'
      ],
      sortableAttributes: ['followerCount', 'createdAt', 'updatedAt'],
      displayedAttributes: [
        'id',
        'displayName',
        'headline',
        'bio',
        'skills',
        'communities',
        'badges',
        'languages',
        'country',
        'role',
        'followerCount',
        'createdAt',
        'updatedAt'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(followerCount)',
        'desc(updatedAt)'
      ],
      synonyms: {
        learner: ['student'],
        learners: ['students'],
        instructor: ['teacher', 'tutor'],
        instructors: ['teachers', 'tutors']
      }
    },
    ads: {
      primaryKey: 'id',
      searchableAttributes: ['name', 'objective', 'targeting.keywords', 'creative.headline'],
      filterableAttributes: [
        'status',
        'objective',
        'budget.currency',
        'budget.daily',
        'spend.currency',
        'targeting.audiences',
        'targeting.locations',
        'createdBy'
      ],
      sortableAttributes: [
        'budget.daily',
        'spend.total',
        'performanceScore',
        'ctr',
        'createdAt',
        'updatedAt'
      ],
      displayedAttributes: [
        'id',
        'name',
        'objective',
        'status',
        'budget',
        'spend',
        'performanceScore',
        'ctr',
        'cpc',
        'cpa',
        'targeting',
        'startAt',
        'endAt',
        'createdBy',
        'createdAt',
        'updatedAt'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'desc(performanceScore)',
        'desc(ctr)',
        'asc(cpc)'
      ],
      synonyms: {
        ads: ['campaigns', 'promotions'],
        advertisement: ['ad', 'promotion'],
        advertisements: ['ads', 'promotions']
      }
    },
    events: {
      primaryKey: 'id',
      searchableAttributes: ['title', 'description', 'topics', 'communityName'],
      filterableAttributes: [
        'communityId',
        'type',
        'status',
        'startAt',
        'endAt',
        'timezone',
        'isTicketed',
        'price.currency',
        'price.amount',
        'instructorId'
      ],
      sortableAttributes: ['startAt', 'endAt', 'createdAt', 'updatedAt'],
      displayedAttributes: [
        'id',
        'slug',
        'title',
        'description',
        'topics',
        'communityId',
        'communityName',
        'type',
        'status',
        'timezone',
        'isTicketed',
        'price',
        'capacity',
        'startAt',
        'endAt',
        'instructorId',
        'createdAt',
        'updatedAt'
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'asc(startAt)',
        'desc(capacity)'
      ],
      synonyms: {
        event: ['session', 'workshop', 'webinar', 'class'],
        events: ['sessions', 'workshops', 'webinars', 'classes']
      }
    }
  };

  return Object.entries(namespaces).map(([name, config]) => ({
    name,
    uid: `${prefix}_${name}`,
    ...config,
    typoTolerance: {
      enabled: true,
      disableOnWords: ['Edulure'],
      disableOnAttributes: [],
      minWordSizeForTypos: {
        oneTypo: 5,
        twoTypos: 9
      }
    },
    stopWords: ['the', 'a', 'an', 'of', 'for'],
    pagination: {
      maxTotalHits: 1000
    },
    faceting: {
      maxValuesPerFacet: 250
    }
  }));
}

function describeNode(node, role) {
  return {
    host: node.host,
    client: node.client,
    role
  };
}

export class SearchClusterService {
  constructor({
    adminNodes,
    replicaNodes,
    readNodes,
    healthcheckIntervalMs,
    requestTimeoutMs,
    loggerInstance = logger
  }) {
    this.logger = loggerInstance;
    this.healthcheckIntervalMs = healthcheckIntervalMs;
    this.requestTimeoutMs = requestTimeoutMs;
    this.adminNodes = adminNodes;
    this.replicaNodes = replicaNodes;
    this.readNodes = readNodes;
    this.interval = null;
  }

  get searchClient() {
    return this.readNodes[0]?.client ?? this.adminNodes[0]?.client ?? null;
  }

  async start() {
    this.logger.info('Initialising Meilisearch cluster');
    try {
      await this.bootstrap();
      await this.checkClusterHealth();
    } catch (error) {
      if (env.isDevelopment) {
        this.logger.warn({ err: error }, 'Meilisearch cluster unavailable – continuing in degraded mode');
        return;
      }
      throw error;
    }

    if (this.healthcheckIntervalMs > 0) {
      this.interval = setInterval(() => {
        this.checkClusterHealth().catch((error) => {
          this.logger.error({ err: error }, 'Meilisearch healthcheck execution failed');
        });
      }, this.healthcheckIntervalMs);
      this.interval.unref?.();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async bootstrap() {
    await this.ensureIndexes();
    await this.auditSearchKeyPrivileges();
  }

  async ensureIndexes() {
    for (const definition of INDEX_DEFINITIONS) {
      await this.withAdminClient(`ensure-index:${definition.uid}`, async (client, host) => {
        await this.ensureIndex(client, definition, host);
      });
    }
  }

  async ensureIndex(client, definition, host) {
    try {
      const info = await recordSearchOperation('get_index', () => client.getIndex(definition.uid));
      if (info?.primaryKey && info.primaryKey !== definition.primaryKey) {
        this.logger.warn(
          {
            index: definition.uid,
            primaryKey: info.primaryKey,
            expectedPrimaryKey: definition.primaryKey
          },
          'Existing Meilisearch index primary key does not match expected configuration'
        );
      }
    } catch (error) {
      if (error?.code === 'index_not_found' || error?.errorCode === 'index_not_found') {
        const task = await recordSearchOperation('create_index', () =>
          client.createIndex({ uid: definition.uid, primaryKey: definition.primaryKey })
        );
        if (task?.taskUid) {
          await recordSearchOperation('wait_for_task', () =>
            client.waitForTask(task.taskUid, { timeoutMs: this.requestTimeoutMs, intervalMs: 50 })
          );
        }
      } else {
        updateSearchIndexStatus(definition.uid, 0);
        throw error;
      }
    }

    const index = client.index(definition.uid);
    const task = await recordSearchOperation('update_index_settings', () =>
      index.updateSettings({
        searchableAttributes: definition.searchableAttributes,
        filterableAttributes: definition.filterableAttributes,
        sortableAttributes: definition.sortableAttributes,
        displayedAttributes: definition.displayedAttributes,
        rankingRules: definition.rankingRules,
        synonyms: definition.synonyms,
        stopWords: definition.stopWords,
        typoTolerance: definition.typoTolerance,
        pagination: definition.pagination,
        faceting: definition.faceting
      })
    );

    if (task?.taskUid) {
      await recordSearchOperation('wait_for_task', () =>
        client.waitForTask(task.taskUid, { timeoutMs: this.requestTimeoutMs, intervalMs: 50 })
      );
    }

    updateSearchIndexStatus(definition.uid, 1);
    this.logger.info({ index: definition.uid, host }, 'Meilisearch index synchronised');
  }

  async auditSearchKeyPrivileges() {
    await this.withAdminClient('audit-search-key', async (client) => {
      try {
        const keys = await recordSearchOperation('list_keys', () => client.getKeys());
        const searchKeyRecord = keys?.results?.find((key) => key.key === env.search.searchApiKey);
        if (!searchKeyRecord) {
          this.logger.warn(
            'Configured MEILISEARCH_SEARCH_API_KEY not found in cluster – generate a read-only key scoped to explorer indexes.'
          );
          return;
        }

        const actions = new Set(searchKeyRecord.actions ?? []);
        const hasWritePrivilege = Array.from(actions).some((action) =>
          action.includes('documents.write') || action.includes('indexes.*') || action.includes('documents.add')
        );
        if (hasWritePrivilege) {
          throw new Error(
            'Configured MEILISEARCH_SEARCH_API_KEY grants write privileges. Generate a read-only key limited to search endpoints.'
          );
        }

        const wildcardIndexAccess = (searchKeyRecord.indexes ?? []).includes('*');
        if (wildcardIndexAccess) {
          this.logger.warn(
            {
              keyUid: searchKeyRecord.uid,
              indexes: searchKeyRecord.indexes
            },
            'Search API key grants wildcard index access – restrict to explorer indexes for least privilege.'
          );
        }
      } catch (error) {
        if (error?.message?.includes('write privileges')) {
          throw error;
        }
        this.logger.warn({ err: error }, 'Unable to verify Meilisearch search API key privileges');
      }
    });
  }

  async checkClusterHealth() {
    const nodes = [
      ...this.adminNodes.map((node) => describeNode(node, 'primary')),
      ...this.replicaNodes.map((node) => describeNode(node, 'replica')),
      ...this.readNodes.map((node) => describeNode(node, 'read'))
    ];

    const seen = new Set();
    await Promise.all(
      nodes.map(async ({ host, client, role }) => {
        if (seen.has(`${role}:${host}`)) {
          return;
        }
        seen.add(`${role}:${host}`);
        try {
          await recordSearchOperation('healthcheck', () => client.health());
          updateSearchNodeHealth({ host, role, healthy: true });
        } catch (error) {
          updateSearchNodeHealth({ host, role, healthy: false });
          this.logger.error({ err: error, host, role }, 'Meilisearch node failed healthcheck');
        }
      })
    );
  }

  async withAdminClient(operation, handler) {
    if (!this.adminNodes.length && !this.replicaNodes.length) {
      throw new Error('No Meilisearch administrative hosts configured.');
    }

    let lastError = null;
    for (const node of [...this.adminNodes, ...this.replicaNodes]) {
      try {
        return await handler(node.client, node.host);
      } catch (error) {
        lastError = error;
        this.logger.warn({ err: error, host: node.host, operation }, 'Failed to execute Meilisearch operation');
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error('Failed to execute Meilisearch administrative operation – all hosts unreachable.');
  }

  getClientForHost(host) {
    const match = [...this.adminNodes, ...this.replicaNodes, ...this.readNodes].find((node) => node.host === host);
    return match?.client ?? createMeilisearchClient(host, env.search.adminApiKey);
  }

  getClusterStatus() {
    const nodes = [...this.adminNodes, ...this.replicaNodes, ...this.readNodes];
    const summary = nodes.reduce(
      (acc, node) => {
        if (node.health.status === 'healthy') {
          acc.healthy += 1;
        } else if (node.health.status === 'degraded') {
          acc.degraded += 1;
        } else {
          acc.unreachable += 1;
        }
        return acc;
      },
      { healthy: 0, degraded: 0, unreachable: 0 }
    );

    return {
      nodes: nodes.map((node) => ({ host: node.host, status: node.health.status, latencyMs: node.health.latencyMs })),
      summary,
      generatedAt: new Date().toISOString()
    };
  }

  async createSnapshot() {
    return this.withAdminClient('create-snapshot', async (client) => {
      const task = await recordSearchOperation('create_snapshot', () => client.createSnapshot());
      if (task?.taskUid) {
        await recordSearchOperation('wait_for_task', () =>
          client.waitForTask(task.taskUid, { timeoutMs: this.requestTimeoutMs, intervalMs: 100 })
        );
      }
      return task;
    });
  }
}

export const searchClusterService = new SearchClusterService({
  adminNodes: searchConfiguration.admin,
  replicaNodes: searchConfiguration.replicas,
  readNodes: searchConfiguration.read,
  healthcheckIntervalMs: env.search.healthcheckIntervalMs,
  requestTimeoutMs: env.search.requestTimeoutMs,
  loggerInstance: logger
});

export default searchClusterService;
