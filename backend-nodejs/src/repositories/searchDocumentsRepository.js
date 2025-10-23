import db from '../config/database.js';
import logger from '../config/logger.js';

function normaliseDocumentPayload(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Search document payload must be an object.');
  }

  const {
    entityType,
    entityId,
    title,
    summary = null,
    searchVector,
    filters = {},
    metadata = {},
    media = {},
    geo = {}
  } = document;

  if (!entityType || !entityId) {
    throw new Error('Search document requires entityType and entityId.');
  }

  if (!searchVector || typeof searchVector !== 'string') {
    throw new Error('Search document requires a non-empty searchVector string.');
  }

  const normalisedTitle = title ? String(title).trim() : '';

  if (!normalisedTitle) {
    throw new Error('Search document requires a title.');
  }

  return {
    entity_type: String(entityType),
    entity_id: String(entityId),
    title: normalisedTitle,
    summary: summary ? String(summary) : null,
    search_vector: searchVector,
    filters: JSON.stringify(filters ?? {}),
    metadata: JSON.stringify(metadata ?? {}),
    media: JSON.stringify(media ?? {}),
    geo: JSON.stringify(geo ?? {})
  };
}

export class SearchDocumentsRepository {
  constructor({ dbClient = db, loggerInstance = logger.child({ module: 'search-documents-repo' }) } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
  }

  async deleteByEntity(entityType, trx = this.db) {
    await trx('search_documents').where({ entity_type: entityType }).del();
  }

  async upsertDocuments(documents, trx = this.db) {
    if (!Array.isArray(documents) || !documents.length) {
      return 0;
    }

    const rows = documents.map(normaliseDocumentPayload);
    const query = trx('search_documents')
      .insert(rows)
      .onConflict(['entity_type', 'entity_id'])
      .merge({
        title: trx.raw('VALUES(title)'),
        summary: trx.raw('VALUES(summary)'),
        search_vector: trx.raw('VALUES(search_vector)'),
        filters: trx.raw('VALUES(filters)'),
        metadata: trx.raw('VALUES(metadata)'),
        media: trx.raw('VALUES(media)'),
        geo: trx.raw('VALUES(geo)'),
        updated_at: trx.fn.now()
      });

    const result = await query;
    if (typeof result === 'number') {
      return result;
    }

    // MySQL returns an array with insert id metadata; fallback to processed count.
    return rows.length;
  }

  async replaceEntityDocuments(entityType, documents, trx = this.db) {
    return trx.transaction(async (transaction) => {
      await this.deleteByEntity(entityType, transaction);
      return this.upsertDocuments(documents, transaction);
    });
  }

  async fetchRawDocuments({ entity, since, limit = 250, offset = 0 }) {
    const query = this.db('search_documents')
      .where({ entity_type: entity })
      .orderBy('updated_at', 'desc')
      .limit(Math.max(1, limit))
      .offset(Math.max(0, offset));

    if (since) {
      query.andWhere('updated_at', '>=', since);
    }

    return query;
  }
}

export const searchDocumentsRepository = new SearchDocumentsRepository();

export default searchDocumentsRepository;
