import db from '../../config/database.js';
import logger from '../../config/logger.js';
import SearchDocumentModel from '../../models/SearchDocumentModel.js';
import { ENTITY_CONFIG, SUPPORTED_ENTITIES } from './entityConfig.js';

function toSearchTerm(value) {
  if (!value) {
    return null;
  }
  const normalised = String(value).trim().toLowerCase();
  return normalised.length ? `%${normalised}%` : null;
}

function resolveField(source, path) {
  if (!source || !path) {
    return undefined;
  }
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    if (typeof acc === 'object') {
      return acc[key];
    }
    return undefined;
  }, source);
}

function normaliseSortDirectives(entity, sortPreference) {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    return [];
  }
  if (!sortPreference || (Array.isArray(sortPreference) && sortPreference.length === 0)) {
    const defaultKey = config.defaultSort;
    const defaultSort = config.sorts[defaultKey];
    return Array.isArray(defaultSort) ? defaultSort : [];
  }
  if (typeof sortPreference === 'string') {
    if (config.sorts[sortPreference]) {
      return config.sorts[sortPreference];
    }
    return [sortPreference];
  }
  if (Array.isArray(sortPreference)) {
    return sortPreference;
  }
  if (typeof sortPreference === 'object' && sortPreference.field) {
    const direction = String(sortPreference.direction ?? 'asc').toLowerCase();
    return [`${direction}(${sortPreference.field})`];
  }
  return [];
}

function parseSortToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const trimmed = token.trim();
  const match = trimmed.match(/^(asc|desc)\((.+)\)$/i);
  if (match) {
    return { direction: match[1].toLowerCase(), field: match[2] };
  }
  if (trimmed.includes(':')) {
    const [field, direction = 'asc'] = trimmed.split(':');
    return { direction: direction.toLowerCase(), field };
  }
  return { direction: 'asc', field: trimmed };
}

function dedupeStrings(values) {
  return Array.from(
    new Set(
      values
        .map((value) => {
          if (value === null || value === undefined) {
            return null;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length ? trimmed : null;
          }
          return value;
        })
        .filter((value) => value !== null && value !== undefined)
    )
  );
}

export default class RelationalExplorerSearchProvider {
  constructor({ dbClient = db, loggerInstance = logger, documentModel = SearchDocumentModel } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
    this.maxRowsPerEntity = 750;
    this.tableName = documentModel.tableName;
    this.documentModel = documentModel;
  }

  ensureEntitySupported(entity) {
    if (!SUPPORTED_ENTITIES.includes(entity)) {
      throw new Error(`Unsupported explorer search entity "${entity}"`);
    }
  }

  async fetchRows(entity, query) {
    this.ensureEntitySupported(entity);
    const builder = this.db(this.tableName)
      .where('entity_type', entity)
      .orderBy('updated_at', 'desc')
      .limit(this.maxRowsPerEntity);

    const term = toSearchTerm(query);
    if (term) {
      builder.andWhere((qb) => {
        qb.whereRaw('LOWER(title) LIKE ?', [term])
          .orWhereRaw('LOWER(summary) LIKE ?', [term])
          .orWhereRaw('LOWER(body) LIKE ?', [term]);
      });
    }

    return builder;
  }

  mapRowToDocument(entity, row, query) {
    const base = this.documentModel.deserialize(row) ?? {};
    const document = base.document ?? {};
    const facets = base.facets ?? {};
    const metrics = base.metrics ?? {};
    const tags = Array.isArray(document.tags) ? document.tags : base.tags ?? [];

    const id = document.id ?? base.documentId ?? row.document_id ?? row.id;
    const slug = document.slug ?? base.slug ?? row.slug ?? null;
    const summary = document.summary ?? base.summary ?? row.summary ?? document.description ?? null;
    const body = base.body ?? row.body ?? document.description ?? summary ?? '';

    let score = 0;
    if (query) {
      const normalizedQuery = query.toLowerCase();
      const haystack = [document.title, summary, body]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(' \n ');
      if (haystack.includes(normalizedQuery)) {
        score += 5;
      }
      if (document.title && document.title.toLowerCase().includes(normalizedQuery)) {
        score += 5;
      }
    }
    if (base.updatedAt ?? row.updated_at) {
      score += Math.max(0, Date.now() - new Date(base.updatedAt ?? row.updated_at).getTime()) / -3600000;
    }

    return {
      ...document,
      id,
      slug,
      entityType: entity,
      summary,
      raw: document,
      tags,
      __facets: facets,
      __metrics: metrics,
      __score: score,
      __body: body,
      __updatedAt: base.updatedAt ?? row.updated_at ?? null
    };
  }

  applyFilters(entity, hit, filters, globalFilters) {
    const merged = { ...(globalFilters ?? {}) };
    const entityFilters = Array.isArray(filters) ? {} : filters?.[entity] ?? filters ?? {};
    for (const [key, value] of Object.entries(entityFilters)) {
      merged[key] = value;
    }

    const facets = hit.__facets ?? {};
    const metrics = hit.__metrics ?? {};

    const evaluateArray = (candidateValues, expectedValues) => {
      if (!Array.isArray(expectedValues) || !expectedValues.length) {
        return true;
      }
      if (!Array.isArray(candidateValues) || !candidateValues.length) {
        return false;
      }
      return expectedValues.some((expected) => candidateValues.includes(expected));
    };

    const evaluateObject = (candidate, descriptor) => {
      if (!descriptor || typeof descriptor !== 'object') {
        return true;
      }
      if (descriptor.equals !== undefined && candidate !== descriptor.equals) {
        return false;
      }
      if (descriptor.not !== undefined && candidate === descriptor.not) {
        return false;
      }
      if (descriptor.min !== undefined && Number(candidate) < Number(descriptor.min)) {
        return false;
      }
      if (descriptor.max !== undefined && Number(candidate) > Number(descriptor.max)) {
        return false;
      }
      return true;
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        const candidate = facets[key] ?? metrics[key] ?? resolveField(hit, key);
        if (!evaluateArray(Array.isArray(candidate) ? candidate : [candidate], value)) {
          return false;
        }
        continue;
      }

      if (typeof value === 'object') {
        const candidate = metrics[key] ?? resolveField(hit, key);
        if (!evaluateObject(candidate, value)) {
          return false;
        }
        continue;
      }

      const candidate = facets[key] ?? metrics[key] ?? resolveField(hit, key);
      if (Array.isArray(candidate)) {
        if (!candidate.includes(value)) {
          return false;
        }
        continue;
      }
      if (candidate !== value) {
        return false;
      }
    }

    return true;
  }

  applySort(entity, hits, sortPreference) {
    const directives = normaliseSortDirectives(entity, sortPreference);
    if (!directives.length) {
      return { hits: [...hits], directives: [] };
    }

    const parsed = directives
      .map((directive) => parseSortToken(directive))
      .filter((entry) => entry && entry.field);

    if (!parsed.length) {
      return { hits: [...hits], directives: [] };
    }

    const sorted = [...hits].sort((a, b) => {
      for (const directive of parsed) {
        const { field, direction } = directive;
        const left = (a.__metrics && a.__metrics[field]) ?? resolveField(a, field);
        const right = (b.__metrics && b.__metrics[field]) ?? resolveField(b, field);

        if (left === undefined && right === undefined) {
          continue;
        }
        if (left === undefined) {
          return direction === 'desc' ? 1 : -1;
        }
        if (right === undefined) {
          return direction === 'desc' ? -1 : 1;
        }

        if (left > right) {
          return direction === 'desc' ? -1 : 1;
        }
        if (left < right) {
          return direction === 'desc' ? 1 : -1;
        }
      }
      return (b.__score ?? 0) - (a.__score ?? 0);
    });

    return { hits: sorted, directives };
  }

  buildFacetDistribution(hits) {
    const distribution = {};
    for (const hit of hits) {
      const facets = hit.__facets ?? {};
      for (const [facet, values] of Object.entries(facets)) {
        if (!values) {
          continue;
        }
        const bucket = distribution[facet] ?? (distribution[facet] = {});
        const list = Array.isArray(values) ? values : [values];
        for (const value of list) {
          if (value === null || value === undefined || value === '') {
            continue;
          }
          const key = typeof value === 'string' ? value : JSON.stringify(value);
          bucket[key] = (bucket[key] ?? 0) + 1;
        }
      }
    }
    return distribution;
  }

  normaliseHit(hit) {
    const { __facets, __metrics, __score, __body, __updatedAt, raw, ...rest } = hit;
    const baseRaw = raw ?? rest;
    return {
      ...rest,
      raw: { ...baseRaw, facets: __facets, metrics: __metrics, body: __body, updatedAt: __updatedAt }
    };
  }

  async search({
    entity,
    query = '',
    page = 1,
    perPage = 10,
    filters = {},
    globalFilters = {},
    sort = {},
    includeFacets = true
  } = {}) {
    const start = Date.now();
    const rows = await this.fetchRows(entity, query);
    const documents = rows.map((row) => this.mapRowToDocument(entity, row, query));
    const matched = documents.filter((doc) => this.applyFilters(entity, doc, filters, globalFilters));
    const { hits: sorted, directives } = this.applySort(entity, matched, sort?.[entity] ?? sort);

    const offset = Math.max(0, (page - 1) * perPage);
    const paginated = sorted.slice(offset, offset + perPage);
    const processingTimeMs = Date.now() - start;

    const facetDistribution = includeFacets ? this.buildFacetDistribution(matched) : {};

    return {
      entity,
      query,
      hits: paginated.map((hit) => this.normaliseHit(hit)),
      rawHits: sorted.map((hit) => this.normaliseHit(hit)),
      totalHits: matched.length,
      processingTimeMs,
      sortDirectives: directives,
      facets: facetDistribution
    };
  }
}
