import db from '../config/database.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';

export const INDEX_DEFINITIONS = [
  { name: 'communities', entity: 'communities' },
  { name: 'courses', entity: 'courses' },
  { name: 'ebooks', entity: 'ebooks' },
  { name: 'tutors', entity: 'tutors' },
  { name: 'tickets', entity: 'tickets' },
  { name: 'ads', entity: 'ads' },
  { name: 'events', entity: 'events' }
];

export class SearchDocumentService {
  constructor({ dbClient = db, loggerInstance = logger, configuration = env.search } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance.child({ module: 'search-documents' });
    this.schema = configuration.schema;
    this.dictionary = configuration.dictionary;
    this.maxPerPage = configuration.maxPerPage;
    this.facetMaxBuckets = configuration.facetMaxBuckets;
    this.ingestionConfig = configuration.ingestion ?? {};
    this.supportedEntities = INDEX_DEFINITIONS.map((definition) => definition.entity);
  }

  async ensureSchema() {
    try {
      await this.db.withSchema(this.schema).from('documents').count({ total: '*' }).limit(1);
    } catch (error) {
      this.logger.error({ err: error }, 'Search documents table lookup failed');
      throw new Error(
        `Search documents table "${this.schema}.documents" not found. Run migrations to create the Postgres search schema.`
      );
    }
  }

  async start() {
    try {
      await this.ensureSchema();
      await this.refreshAll({ reason: 'bootstrap' });
      this.logger.info('Postgres search provider initialised');
      return { status: 'ready', message: 'Postgres search provider ready' };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to initialise search provider');
      return { status: 'degraded', message: error.message };
    }
  }

  async stop() {
    this.logger.debug('Search provider shutdown requested');
  }

  async refreshAll({ reason = 'manual' } = {}) {
    try {
      await this.db.raw('SELECT search.refresh_all_documents()');
      this.logger.info({ reason }, 'Search documents refreshed');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to refresh search documents');
      throw error;
    }
  }

  async refreshEntity(entity, { id = null, since = null } = {}) {
    if (!this.supportedEntities.includes(entity)) {
      throw new Error(`Unsupported search entity "${entity}"`);
    }

    if (id !== null) {
      await this.db.raw('SELECT search.refresh_document(?, ?)', [entity, id]);
      return 1;
    }

    const table = this.resolveTableForEntity(entity);
    const batchSize = Math.max(1, this.ingestionConfig.batchSize ?? 500);
    const updatedColumn = this.resolveUpdatedColumn(entity);
    const sinceDate = since instanceof Date ? since : since ? new Date(since) : null;
    const validSince = sinceDate instanceof Date && !Number.isNaN(sinceDate?.getTime()) ? sinceDate : null;
    let processed = 0;

    await this.db.transaction(async (trx) => {
      const baseQuery = trx.select('id').from(table).orderBy('id');
      if (validSince && updatedColumn) {
        baseQuery.where(updatedColumn, '>=', validSince);
      }
      const rows = await baseQuery;
      if (!rows.length) {
        return;
      }
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const slice = rows.slice(offset, offset + batchSize);
        for (const row of slice) {
          await trx.raw('SELECT search.refresh_document(?, ?)', [entity, row.id]);
          processed += 1;
        }
      }
    });

    return processed;
  }

  resolveTableForEntity(entity) {
    switch (entity) {
      case 'communities':
        return 'communities';
      case 'courses':
        return 'courses';
      case 'ebooks':
        return 'ebooks';
      case 'tutors':
        return 'tutor_profiles';
      case 'tickets':
        return 'learner_support_cases';
      case 'ads':
        return 'ads_campaigns';
      case 'events':
        return 'community_events';
      default:
        throw new Error(`Unsupported search entity "${entity}"`);
    }
  }

  resolveUpdatedColumn(entity) {
    switch (entity) {
      case 'communities':
      case 'courses':
      case 'ebooks':
      case 'tutors':
      case 'tickets':
      case 'ads':
      case 'events':
        return 'updated_at';
      default:
        return null;
    }
  }

  async clearEntityDocuments(entity) {
    if (!this.supportedEntities.includes(entity)) {
      throw new Error(`Unsupported search entity "${entity}"`);
    }

    await this.db
      .withSchema(this.schema)
      .from('documents')
      .where('entity_type', entity)
      .del();
  }
}

export const searchClusterService = new SearchDocumentService();

export default searchClusterService;
