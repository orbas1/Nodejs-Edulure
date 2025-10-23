import db from '../config/database.js';
import { searchConfiguration } from '../config/search.js';

const TABLE = searchConfiguration.tableName ?? 'search_documents';

const BASE_COLUMNS = [
  'id',
  'entity_type as entityType',
  'document_id as documentId',
  'title',
  'slug',
  'summary',
  'body',
  'image_url as imageUrl',
  'tags',
  'facets',
  'metrics',
  'document',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(column, fallback) {
  if (column === null || column === undefined) {
    return structuredClone(fallback);
  }
  if (typeof column === 'object') {
    return Array.isArray(fallback) ? [...column] : { ...fallback, ...column };
  }
  try {
    const parsed = JSON.parse(column);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : structuredClone(fallback);
    }
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...parsed };
    }
  } catch (_error) {
    // fall through to fallback
  }
  return structuredClone(fallback);
}

function parseArray(column) {
  if (column === null || column === undefined) {
    return [];
  }
  if (Array.isArray(column)) {
    return column;
  }
  try {
    const parsed = JSON.parse(column);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    if (typeof column === 'string') {
      return column
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  }
}

function toDbPayload(document) {
  if (!document?.entityType || !document?.documentId) {
    throw new Error('Search document must include entityType and documentId fields.');
  }

  return {
    entity_type: document.entityType,
    document_id: document.documentId,
    title: document.title ?? '',
    slug: document.slug ?? null,
    summary: document.summary ?? null,
    body: document.body ?? null,
    image_url: document.imageUrl ?? null,
    tags: JSON.stringify(Array.isArray(document.tags) ? document.tags : []),
    facets: JSON.stringify(document.facets ?? {}),
    metrics: JSON.stringify(document.metrics ?? {}),
    document: JSON.stringify(document.document ?? {})
  };
}

function runWithConnection(connection, handler) {
  if (connection?.isTransaction) {
    return handler(connection);
  }
  if (typeof connection?.transaction === 'function') {
    return connection.transaction(handler);
  }
  return db.transaction(handler);
}

export default class SearchDocumentModel {
  static get tableName() {
    return TABLE;
  }

  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      entityType: row.entityType ?? row.entity_type ?? null,
      documentId: row.documentId ?? row.document_id ?? null,
      title: row.title ?? '',
      slug: row.slug ?? null,
      summary: row.summary ?? null,
      body: row.body ?? null,
      imageUrl: row.imageUrl ?? row.image_url ?? null,
      tags: parseArray(row.tags),
      facets: parseJson(row.facets, {}),
      metrics: parseJson(row.metrics, {}),
      document: parseJson(row.document, {}),
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null
    };
  }

  static async findByEntity(entityType, { limit = 100, searchTerm = null } = {}, connection = db) {
    if (!entityType) {
      return [];
    }

    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ entity_type: entityType })
      .orderBy('updated_at', 'desc')
      .limit(limit);

    if (searchTerm) {
      const term = `%${String(searchTerm).toLowerCase().trim()}%`;
      query.andWhere((qb) => {
        qb.whereRaw('LOWER(title) LIKE ?', [term])
          .orWhereRaw('LOWER(summary) LIKE ?', [term])
          .orWhereRaw('LOWER(body) LIKE ?', [term]);
      });
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async truncate(connection = db) {
    return runWithConnection(connection, async (trx) => {
      const exists = await trx.schema.hasTable(TABLE);
      if (!exists) {
        return;
      }
      await trx(TABLE).del();
    });
  }

  static async deleteByEntity(entityType, connection = db) {
    if (!entityType) {
      return;
    }
    return runWithConnection(connection, async (trx) => {
      await trx(TABLE).where({ entity_type: entityType }).del();
    });
  }

  static async bulkUpsert(documents, connection = db) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return;
    }

    await runWithConnection(connection, async (trx) => {
      const now = trx.fn.now();
      const payloads = documents.map((document) => ({
        ...toDbPayload(document),
        updated_at: now
      }));

      await trx(TABLE)
        .insert(payloads)
        .onConflict(['entity_type', 'document_id'])
        .merge();
    });
  }

  static async count(connection = db) {
    const [{ total }] = await connection(TABLE).count({ total: '*' });
    return Number(total ?? 0);
  }
}
