import db from '../config/database.js';
import { buildEnvironmentColumns } from '../utils/environmentContext.js';
import {
  readJsonArrayColumn,
  readJsonColumn,
  writeJsonArrayColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'enablement_guides';

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    excerpt: row.excerpt,
    owner: row.owner,
    audience: readJsonArrayColumn(row.audience, []),
    products: readJsonArrayColumn(row.products, []),
    tags: readJsonArrayColumn(row.tags, []),
    capabilities: readJsonArrayColumn(row.capabilities, []),
    deliverables: readJsonArrayColumn(row.deliverables, []),
    readingTimeMinutes: row.reading_time_minutes,
    timeToCompleteMinutes: row.time_to_complete_minutes,
    wordCount: row.word_count,
    contentHash: row.content_hash,
    sourcePath: row.source_path,
    metadata: readJsonColumn(row.metadata, {}),
    publishedAt: row.published_at,
    lastIndexedAt: row.last_indexed_at,
    searchText: row.search_text,
    environment: {
      key: row.environment_key ?? null,
      name: row.environment_name ?? null,
      tier: row.environment_tier ?? null,
      region: row.environment_region ?? null,
      workspace: row.environment_workspace ?? null
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class EnablementGuideModel {
  static toDomain = toDomain;

  static async replaceAll(articles = [], { environment } = {}, connection = db) {
    const envColumns = buildEnvironmentColumns(environment ?? {});
    const trx = await connection.transaction();

    try {
      const slugs = articles.map((article) => article.slug).filter(Boolean);

      if (slugs.length > 0) {
        await trx(TABLE)
          .where({ environment_key: envColumns.environment_key })
          .whereNotIn('slug', slugs)
          .del();
      } else {
        await trx(TABLE).where({ environment_key: envColumns.environment_key }).del();
      }

      if (articles.length > 0) {
        const dialect = String(trx?.client?.config?.client ?? '').toLowerCase();
        const valueExpression = (column) => {
          if (dialect.includes('pg') || dialect.includes('sqlite')) {
            return trx.raw(`excluded.${column}`);
          }
          return trx.raw(`VALUES(${column})`);
        };

        const rows = articles.map((article) => ({
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          excerpt: article.excerpt,
          owner: article.metadata?.owner ?? article.owner ?? 'Unassigned',
          audience: writeJsonArrayColumn(article.metadata?.audience ?? article.audience ?? []),
          products: writeJsonArrayColumn(article.metadata?.products ?? article.products ?? []),
          tags: writeJsonArrayColumn(article.metadata?.tags ?? article.tags ?? []),
          capabilities: writeJsonArrayColumn(article.metadata?.capabilities ?? article.capabilities ?? []),
          deliverables: writeJsonArrayColumn(article.metadata?.deliverables ?? article.deliverables ?? []),
          reading_time_minutes: article.readingTimeMinutes ?? article.metadata?.readingTimeMinutes ?? 5,
          time_to_complete_minutes: article.metadata?.timeToCompleteMinutes ?? article.timeToCompleteMinutes ?? 0,
          word_count: article.wordCount ?? 0,
          content_hash: article.contentHash,
          source_path: article.sourcePath ?? article.filePath ?? article.slug,
          metadata: writeJsonColumn(article.metadata ?? {}),
          published_at: article.publishedAt ?? null,
          last_indexed_at: article.lastIndexedAt ?? new Date(),
          search_text: article.searchText ?? '',
          ...envColumns
        }));

        await trx(TABLE)
          .insert(rows)
          .onConflict(['environment_key', 'slug'])
          .merge({
            title: valueExpression('title'),
            summary: valueExpression('summary'),
            excerpt: valueExpression('excerpt'),
            owner: valueExpression('owner'),
            audience: valueExpression('audience'),
            products: valueExpression('products'),
            tags: valueExpression('tags'),
            capabilities: valueExpression('capabilities'),
            deliverables: valueExpression('deliverables'),
            reading_time_minutes: valueExpression('reading_time_minutes'),
            time_to_complete_minutes: valueExpression('time_to_complete_minutes'),
            word_count: valueExpression('word_count'),
            content_hash: valueExpression('content_hash'),
            source_path: valueExpression('source_path'),
            metadata: valueExpression('metadata'),
            published_at: valueExpression('published_at'),
            last_indexed_at: valueExpression('last_indexed_at'),
            search_text: valueExpression('search_text'),
            environment_name: valueExpression('environment_name'),
            environment_tier: valueExpression('environment_tier'),
            environment_region: valueExpression('environment_region'),
            environment_workspace: valueExpression('environment_workspace'),
            updated_at: trx.fn.now()
          });
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async list(
    { environment, audience, tag, search, limit = 50, offset = 0 } = {},
    connection = db
  ) {
    const envColumns = buildEnvironmentColumns(environment ?? {});
    const query = connection(TABLE)
      .where({ environment_key: envColumns.environment_key })
      .orderBy('title', 'asc')
      .limit(Math.max(1, limit))
      .offset(Math.max(0, offset));

    const dialect = String(connection?.client?.config?.client ?? '').toLowerCase();
    const containsExpression = (column, value) => {
      const payload = JSON.stringify([value]);
      if (dialect.includes('pg')) {
        return connection.raw(`${column} @> ?::jsonb`, [payload]);
      }
      if (dialect.includes('sqlite')) {
        return connection.raw(`EXISTS (SELECT 1 FROM json_each(${column}) WHERE value = ?)`, [value]);
      }
      return connection.raw(`JSON_CONTAINS(${column}, ?)`, [JSON.stringify(value)]);
    };

    if (audience) {
      const audiences = Array.isArray(audience) ? audience : [audience];
      query.where((builder) => {
        for (const value of audiences) {
          builder.orWhere(containsExpression('audience', value));
        }
      });
    }

    if (tag) {
      const tags = Array.isArray(tag) ? tag : [tag];
      query.where((builder) => {
        for (const value of tags) {
          builder.orWhere(containsExpression('tags', value));
        }
      });
    }

    if (search) {
      const normalized = String(search).trim().toLowerCase();
      if (normalized) {
        query.andWhere('search_text', 'like', `%${normalized}%`);
      }
    }

    const rows = await query;
    return rows.map(toDomain);
  }

  static async findBySlug(slug, { environment } = {}, connection = db) {
    if (!slug) {
      return null;
    }
    const envColumns = buildEnvironmentColumns(environment ?? {});
    const row = await connection(TABLE)
      .where({ slug, environment_key: envColumns.environment_key })
      .first();
    return toDomain(row);
  }
}
