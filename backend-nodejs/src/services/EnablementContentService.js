import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import * as markedModule from 'marked';

import logger from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultContentDirectory = path.resolve(__dirname, '../enablement/content');
const serviceLogger = logger.child({ module: 'enablement-content-service' });

const markdownCandidates = [
  markedModule?.marked,
  markedModule?.default,
  markedModule
].filter(Boolean);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function fallbackMarkdownRenderer(markdown) {
  if (!markdown) {
    return '';
  }

  const lines = String(markdown).split(/\r?\n/);
  const html = [];
  let paragraphBuffer = [];
  let inList = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }
    const paragraphText = paragraphBuffer.join(' ');
    html.push(`<p>${formatInline(paragraphText)}</p>`);
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = Math.min(6, headingMatch[1].length);
      html.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeList();

  return html.join('\n');
}

function renderMarkdown(markdown) {
  for (const candidate of markdownCandidates) {
    if (!candidate) {
      continue;
    }
    if (typeof candidate.parse === 'function') {
      return candidate.parse(markdown, { mangle: false, headerIds: false });
    }
    if (typeof candidate === 'function') {
      return candidate(markdown, { mangle: false, headerIds: false });
    }
    if (typeof candidate.marked === 'function') {
      return candidate.marked(markdown, { mangle: false, headerIds: false });
    }
  }
  return fallbackMarkdownRenderer(markdown);
}

function normaliseSlug(value, fallback) {
  if (typeof value === 'string' && value.trim()) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  return fallback;
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function parseFrontMatter(rawContent) {
  const trimmed = rawContent.trimStart();
  if (!trimmed.startsWith('---')) {
    return { metadata: {}, body: rawContent };
  }

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { metadata: {}, body: rawContent };
  }

  const rawMeta = trimmed.slice(3, endIndex).trim();
  let metadata;
  try {
    metadata = rawMeta ? JSON.parse(rawMeta) : {};
  } catch (error) {
    serviceLogger.warn({ err: error }, 'Failed to parse enablement front matter');
    metadata = {};
  }
  const body = trimmed.slice(endIndex + 4).trimStart();
  return { metadata, body };
}

function computeWordCount(markdown) {
  if (!markdown) {
    return 0;
  }
  const plain = markdown
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, ' ')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  return plain
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function estimateReadingTime(wordCount) {
  const wordsPerMinute = 225;
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

function createExcerpt(markdown, length = 60) {
  if (!markdown) {
    return '';
  }
  const words = markdown
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, ' ')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length <= length) {
    return words.join(' ');
  }
  return `${words.slice(0, length).join(' ')}…`;
}

async function walkMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function buildCapabilityMatrix(articles) {
  const matrix = {
    total: articles.length,
    audiences: {},
    products: {},
    tags: {},
    capabilities: {},
    owners: {},
    totalTimeToCompleteMinutes: 0,
    lastUpdatedAt: null
  };

  for (const article of articles) {
    matrix.totalTimeToCompleteMinutes += article.metadata.timeToCompleteMinutes ?? 0;

    const updatedAt = article.updatedAt ?? article.createdAt;
    if (!matrix.lastUpdatedAt || updatedAt > matrix.lastUpdatedAt) {
      matrix.lastUpdatedAt = updatedAt;
    }

    for (const audience of article.metadata.audience ?? []) {
      matrix.audiences[audience] = (matrix.audiences[audience] ?? 0) + 1;
    }
    for (const product of article.metadata.products ?? []) {
      matrix.products[product] = (matrix.products[product] ?? 0) + 1;
    }
    for (const tag of article.metadata.tags ?? []) {
      matrix.tags[tag] = (matrix.tags[tag] ?? 0) + 1;
    }
    for (const capability of article.metadata.capabilities ?? []) {
      matrix.capabilities[capability] = (matrix.capabilities[capability] ?? 0) + 1;
    }
    if (article.metadata.owner) {
      matrix.owners[article.metadata.owner] = (matrix.owners[article.metadata.owner] ?? 0) + 1;
    }
  }

  return matrix;
}

class EnablementContentService {
  constructor({ contentDirectory = defaultContentDirectory, cacheTtlMs = 5 * 60 * 1000 } = {}) {
    this.contentDirectory = contentDirectory;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  async refreshCache() {
    this.cache = await this.buildCache();
    this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
    return {
      articles: this.cache.articles.length,
      lastUpdatedAt: this.cache.matrix.lastUpdatedAt
    };
  }

  async ensureCache() {
    if (!this.cache || Date.now() >= this.cacheExpiresAt) {
      await this.refreshCache();
    }
  }

  async buildCache() {
    const files = await walkMarkdownFiles(this.contentDirectory);
    const articles = [];
    const articleLookup = new Map();

    for (const filePath of files) {
      try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);
        const { metadata: rawMetadata, body } = parseFrontMatter(rawContent);
        const slug = normaliseSlug(rawMetadata.slug, normaliseSlug(path.basename(filePath, '.md')));
        if (!slug) {
          serviceLogger.warn({ filePath }, 'Enablement article missing slug; skipping');
          continue;
        }

        const metadata = {
          ...rawMetadata,
          slug,
          title: rawMetadata.title ?? slug.replace(/-/g, ' '),
          summary: rawMetadata.summary ?? createExcerpt(body, 40),
          audience: ensureArray(rawMetadata.audience),
          products: ensureArray(rawMetadata.products),
          tags: ensureArray(rawMetadata.tags),
          capabilities: ensureArray(rawMetadata.capabilities),
          owner: rawMetadata.owner ?? 'Unassigned',
          timeToCompleteMinutes: Number.parseInt(rawMetadata.timeToCompleteMinutes ?? 0, 10),
          deliverables: ensureArray(rawMetadata.deliverables)
        };

        const updatedAt = rawMetadata.lastUpdated ? new Date(rawMetadata.lastUpdated) : stats.mtime;
        const createdAt = rawMetadata.createdAt ? new Date(rawMetadata.createdAt) : stats.birthtime;
        const wordCount = computeWordCount(body);
        const readingTimeMinutes = estimateReadingTime(wordCount);
        const excerpt = createExcerpt(body, 80);
        const html = renderMarkdown(body);
        const contentHash = crypto.createHash('sha256').update(rawContent).digest('hex');
        const searchText = [metadata.title, metadata.summary, metadata.owner, metadata.audience.join(' '), metadata.tags.join(' '), body]
          .join(' ')
          .toLowerCase();

        const article = {
          slug,
          filePath,
          metadata,
          markdown: body,
          html,
          excerpt,
          wordCount,
          readingTimeMinutes,
          updatedAt: updatedAt.toISOString(),
          createdAt: createdAt.toISOString(),
          contentHash,
          searchText
        };

        articles.push(article);
        articleLookup.set(slug, article);
      } catch (error) {
        serviceLogger.error({ err: error, filePath }, 'Failed to process enablement article');
      }
    }

    articles.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    const matrix = buildCapabilityMatrix(articles);

    return {
      articles,
      articleLookup,
      matrix
    };
  }

  filterArticles(articles, { audience, product, tag, q }) {
    let filtered = articles;

    if (audience) {
      const desired = new Set(ensureArray(audience).map((item) => item.toLowerCase()));
      filtered = filtered.filter((article) => article.metadata.audience.some((item) => desired.has(item.toLowerCase())));
    }

    if (product) {
      const desired = new Set(ensureArray(product).map((item) => item.toLowerCase()));
      filtered = filtered.filter((article) => article.metadata.products.some((item) => desired.has(item.toLowerCase())));
    }

    if (tag) {
      const desired = new Set(ensureArray(tag).map((item) => item.toLowerCase()));
      filtered = filtered.filter((article) => article.metadata.tags.some((item) => desired.has(item.toLowerCase())));
    }

    if (q && typeof q === 'string' && q.trim()) {
      const terms = q
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);
      filtered = filtered.filter((article) => terms.every((term) => article.searchText.includes(term)));
    }

    return filtered;
  }

  async listArticles(filters = {}, options = {}) {
    await this.ensureCache();
    const { limit = 50, offset = 0 } = options;
    const filtered = this.filterArticles(this.cache.articles, filters);
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
      limit,
      offset,
      items: paginated.map((article) => ({
        slug: article.slug,
        title: article.metadata.title,
        summary: article.metadata.summary,
        excerpt: article.excerpt,
        audience: article.metadata.audience,
        products: article.metadata.products,
        tags: article.metadata.tags,
        capabilities: article.metadata.capabilities,
        owner: article.metadata.owner,
        deliverables: article.metadata.deliverables,
        timeToCompleteMinutes: article.metadata.timeToCompleteMinutes,
        readingTimeMinutes: article.readingTimeMinutes,
        updatedAt: article.updatedAt,
        createdAt: article.createdAt,
        wordCount: article.wordCount,
        contentHash: article.contentHash
      }))
    };
  }

  async getArticle(slug, { format = 'markdown' } = {}) {
    if (!slug) {
      return null;
    }
    await this.ensureCache();
    const normalisedSlug = normaliseSlug(slug, slug);
    const article = this.cache.articleLookup.get(normalisedSlug);
    if (!article) {
      return null;
    }

    const content = format === 'html' ? article.html : article.markdown;

    return {
      slug: article.slug,
      title: article.metadata.title,
      summary: article.metadata.summary,
      content,
      format,
      audience: article.metadata.audience,
      products: article.metadata.products,
      tags: article.metadata.tags,
      capabilities: article.metadata.capabilities,
      owner: article.metadata.owner,
      deliverables: article.metadata.deliverables,
      timeToCompleteMinutes: article.metadata.timeToCompleteMinutes,
      readingTimeMinutes: article.readingTimeMinutes,
      updatedAt: article.updatedAt,
      createdAt: article.createdAt,
      wordCount: article.wordCount,
      contentHash: article.contentHash
    };
  }

  async getCapabilityMatrix() {
    await this.ensureCache();
    return this.cache.matrix;
  }
}

const enablementContentService = new EnablementContentService();

export default enablementContentService;
