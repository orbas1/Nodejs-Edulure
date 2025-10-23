import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchDocumentService } from '../src/services/SearchDocumentService.js';

const loggerStub = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function createDbStub() {
  const searchDocs = [];
  const queueEntries = [];

  const searchMergeMock = vi.fn(async () => undefined);
  const queueMergeMock = vi.fn(async () => undefined);
  const searchOnConflictMock = vi.fn(() => ({ merge: searchMergeMock }));
  const queueOnConflictMock = vi.fn(() => ({ merge: queueMergeMock }));

  const searchInsertMock = vi.fn((rows) => {
    rows.forEach((row) => {
      searchDocs.push({ ...row });
    });
    return { onConflict: searchOnConflictMock };
  });

  const queueInsertMock = vi.fn((rows) => {
    rows.forEach((row) => {
      queueEntries.push({ ...row });
    });
    return { onConflict: queueOnConflictMock };
  });

  const db = vi.fn((tableName) => {
    if (tableName === 'search_documents') {
      return { insert: searchInsertMock };
    }
    if (tableName === 'search_document_refresh_queue') {
      return { insert: queueInsertMock };
    }
    throw new Error(`Unexpected table access: ${tableName}`);
  });

  db.transaction = vi.fn(async (handler) => handler(db));
  db.schema = { hasTable: vi.fn(async () => true) };

  return {
    db,
    searchDocs,
    queueEntries,
    searchInsertMock,
    queueInsertMock,
    searchOnConflictMock,
    queueOnConflictMock,
    searchMergeMock,
    queueMergeMock
  };
}

describe('SearchDocumentService', () => {
  beforeEach(() => {
    Object.values(loggerStub).forEach((spy) => spy.mockReset());
  });

  it('upserts documents and schedules refresh entries using loader output', async () => {
    const { db, searchDocs, queueEntries, searchOnConflictMock, queueOnConflictMock, searchMergeMock, queueMergeMock } =
      createDbStub();

    const loaderDoc = {
      entityType: 'courses',
      entityId: 'course-ops',
      title: 'Operations Mastery',
      subtitle: 'Scale the modern learning platform',
      description: 'Deep dive into orchestration playbooks.',
      keywords: ['ops', 'platform'],
      metadata: {
        category: 'operations',
        tags: ['ops'],
        languages: ['en']
      },
      category: 'operations',
      languageCodes: ['en'],
      tagSlugs: ['ops'],
      priceCurrency: 'USD',
      priceAmountMinor: 4500,
      ratingAverage: 4.6,
      ratingCount: 128,
      popularityScore: 72.4567,
      freshnessScore: 88.1234,
      isActive: true,
      publishedAt: new Date('2024-03-01T00:00:00Z'),
      indexedAt: new Date('2024-03-02T00:00:00Z'),
      refreshedAt: new Date('2024-03-02T00:00:00Z'),
      previewSummary: 'Learn to scale operations',
      previewImageUrl: 'https://example.com/preview.png',
      previewHighlights: ['Level: Advanced', '1200 learners'],
      ctaLinks: [{ label: 'View course', href: '/courses/operations-mastery', type: 'primary' }],
      badges: [{ type: 'level', label: 'Advanced' }],
      monetisationTag: 'Premium course'
    };

    const service = new SearchDocumentService({
      dbClient: db,
      loggerInstance: loggerStub,
      loaders: {
        courses: vi.fn(async () => [loaderDoc])
      }
    });

    const runAt = new Date('2024-03-05T00:00:00Z');
    const result = await service.rebuild({ trx: db, entityTypes: ['courses'], reason: 'bootstrap', runAt });

    expect(result.processed).toBe(1);
    expect(searchDocs).toHaveLength(1);
    expect(searchOnConflictMock).toHaveBeenCalledWith(['entity_type', 'entity_id']);
    expect(searchMergeMock).toHaveBeenCalled();

    const insertedDoc = searchDocs[0];
    expect(insertedDoc.entity_type).toBe('courses');
    expect(insertedDoc.entity_id).toBe('course-ops');
    expect(JSON.parse(insertedDoc.keywords)).toEqual(['ops', 'platform']);
    expect(JSON.parse(insertedDoc.metadata)).toMatchObject({ category: 'operations', tags: ['ops'] });
    expect(insertedDoc.category).toBe('operations');
    expect(insertedDoc.language_codes).toBe('en');
    expect(insertedDoc.tag_slugs).toBe('ops');
    expect(insertedDoc.price_currency).toBe('USD');
    expect(insertedDoc.price_amount_minor).toBe(4500);
    expect(insertedDoc.rating_average).toBeCloseTo(4.6);
    expect(insertedDoc.rating_count).toBe(128);
    expect(insertedDoc.published_at).toEqual(new Date('2024-03-01T00:00:00Z'));
    expect(insertedDoc.updated_at).toBeInstanceOf(Date);
    expect(insertedDoc.preview_summary).toBe('Learn to scale operations');
    expect(insertedDoc.preview_image_url).toBe('https://example.com/preview.png');
    expect(JSON.parse(insertedDoc.preview_highlights)).toEqual(['Level: Advanced', '1200 learners']);
    expect(JSON.parse(insertedDoc.cta_links)).toEqual([
      { label: 'View course', href: '/courses/operations-mastery', type: 'primary' }
    ]);
    expect(JSON.parse(insertedDoc.badges)).toEqual([{ type: 'level', label: 'Advanced' }]);
    expect(insertedDoc.monetisation_tag).toBe('Premium course');

    expect(queueEntries).toHaveLength(1);
    expect(queueOnConflictMock).toHaveBeenCalledWith(['entity_type', 'entity_id']);
    expect(queueMergeMock).toHaveBeenCalled();

    const queued = queueEntries[0];
    expect(queued.entity_type).toBe('courses');
    expect(queued.entity_id).toBe('course-ops');
    expect(queued.reason).toBe('bootstrap');
    expect(queued.priority).toBe('high');
    expect(queued.run_at).toEqual(runAt);
  });

  it('skips unknown entity types', async () => {
    const { db, searchDocs, queueEntries, searchInsertMock, queueInsertMock } = createDbStub();

    const service = new SearchDocumentService({
      dbClient: db,
      loggerInstance: loggerStub,
      loaders: {}
    });

    const result = await service.rebuild({ entityTypes: ['unknown'] });

    expect(result.processed).toBe(0);
    expect(searchDocs).toHaveLength(0);
    expect(queueEntries).toHaveLength(0);
    expect(searchInsertMock).not.toHaveBeenCalled();
    expect(queueInsertMock).not.toHaveBeenCalled();
  });
});
