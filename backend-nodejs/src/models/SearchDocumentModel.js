import db from '../config/database.js';
import logger from '../config/logger.js';

const TABLE = 'search_documents';

function ensureObject(value, fallback = {}) {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  return value;
}

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    summary: row.summary,
    searchVector: row.search_vector,
    filters: parseJson(row.filters),
    metadata: parseJson(row.metadata),
    media: parseJson(row.media),
    geo: parseJson(row.geo),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

function normaliseDocument(document) {
  const payload = ensureObject(document);
  const entityType = String(payload.entityType ?? '').trim();
  const entityId = String(payload.entityId ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const searchVector = String(payload.searchVector ?? '').trim();

  if (!entityType || !entityId) {
    throw new Error('SearchDocumentModel requires entityType and entityId.');
  }
  if (!title) {
    throw new Error('SearchDocumentModel requires a non-empty title.');
  }
  if (!searchVector) {
    throw new Error('SearchDocumentModel requires a non-empty searchVector.');
  }

  return {
    entity_type: entityType,
    entity_id: entityId,
    title,
    summary: payload.summary ? String(payload.summary) : null,
    search_vector: searchVector,
    filters: JSON.stringify(payload.filters ?? {}),
    metadata: JSON.stringify(payload.metadata ?? {}),
    media: JSON.stringify(payload.media ?? {}),
    geo: JSON.stringify(payload.geo ?? {})
  };
}

export class SearchDocumentModel {
  constructor({
    dbClient = db,
    loggerInstance = logger.child({ model: 'SearchDocument' })
  } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
  }

  withConnection(connection) {
    if (!connection) {
      return this;
    }
    return new SearchDocumentModel({ dbClient: connection, loggerInstance: this.logger });
  }

  async deleteByEntity(entityType) {
    try {
      await this.db(TABLE).where({ entity_type: entityType }).del();
    } catch (error) {
      this.logger.error({ err: error, entityType }, 'Failed to delete search documents for entity');
      throw error;
    }
  }

  async upsertMany(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return 0;
    }

    const rows = documents.map(normaliseDocument);
    try {
      const query = this.db(TABLE)
        .insert(rows)
        .onConflict(['entity_type', 'entity_id'])
        .merge({
          title: this.db.raw('VALUES(title)'),
          summary: this.db.raw('VALUES(summary)'),
          search_vector: this.db.raw('VALUES(search_vector)'),
          filters: this.db.raw('VALUES(filters)'),
          metadata: this.db.raw('VALUES(metadata)'),
          media: this.db.raw('VALUES(media)'),
          geo: this.db.raw('VALUES(geo)'),
          updated_at: this.db.fn.now()
        });

      const result = await query;
      if (typeof result === 'number') {
        return result;
      }
      return rows.length;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to upsert search documents');
      throw error;
    }
  }

  async replaceForEntity(entityType, documents) {
    try {
      return await this.db.transaction(async (trx) => {
        const scopedModel = this.withConnection(trx);
        await scopedModel.deleteByEntity(entityType);
        return scopedModel.upsertMany(documents);
      });
    } catch (error) {
      this.logger.error({ err: error, entityType }, 'Failed to replace search documents for entity');
      throw error;
    }
  }

  async findByEntity(entityType, entityId) {
    try {
      const row = await this.db(TABLE)
        .where({ entity_type: entityType, entity_id: entityId })
        .first();
      return toDomain(row);
    } catch (error) {
      this.logger.error({ err: error, entityType, entityId }, 'Failed to load search document');
      throw error;
    }
  }

  async fetchPage({ entityType, since, limit = 50, offset = 0 } = {}) {
    try {
      const query = this.db(TABLE)
        .where((builder) => {
          if (entityType) {
            builder.where({ entity_type: entityType });
          }
          if (since) {
            builder.andWhere('updated_at', '>=', since);
          }
        })
        .orderBy('updated_at', 'desc')
        .limit(Math.max(1, limit))
        .offset(Math.max(0, offset));

      const rows = await query;
      return rows.map(toDomain);
    } catch (error) {
      this.logger.error({ err: error, entityType }, 'Failed to fetch search documents page');
      throw error;
    }
  }
}

export const searchDocumentModel = new SearchDocumentModel();

export default SearchDocumentModel;
