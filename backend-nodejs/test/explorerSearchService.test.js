import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExplorerSearchService } from '../src/services/ExplorerSearchService.js';

const loggerStub = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

const documentModelMock = {
  getSupportedEntities: vi.fn(() => ['courses', 'tutors']),
  search: vi.fn()
};

const adsServiceMock = {
  placementsForSearch: vi.fn(async () => ({ items: [] }))
};

const previewMetricModelMock = {
  getRecentPreviewDigest: vi.fn(async (entity) => {
    if (entity === 'tutors') {
      return new Map([
        [
          'tutor-ava',
          {
            entityId: 'tutor-ava',
            previewType: 'image',
            thumbnailUrl: 'https://cdn.example.com/tutor-ava.jpg',
            previewUrl: null,
            capturedAt: '2025-01-01T00:00:00.000Z'
          }
        ]
      ]);
    }
    return new Map();
  })
};

describe('ExplorerSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the document model and formats results per entity', async () => {
    const service = new ExplorerSearchService({
      documentModel: documentModelMock,
      adsService: adsServiceMock,
      loggerInstance: loggerStub,
      previewMetricModel: previewMetricModelMock
    });

    expect(service.getSupportedEntities()).toEqual(['courses', 'tutors']);

    documentModelMock.search.mockImplementationOnce(async () => ({
      entityType: 'courses',
      hits: [
        {
          entityId: 'course-ops',
          title: 'Operations Mastery',
          subtitle: null,
          description: 'Scale operations',
          thumbnailUrl: 'https://example.com/course.jpg',
          keywords: ['ops'],
          metadata: {
            tags: ['ops'],
            enrolmentCount: 1200,
            releaseAt: '2024-03-01T00:00:00Z'
          },
          level: 'advanced',
          price: { currency: 'USD', amountMinor: 4900 },
          rating: { average: 4.6, count: 128 },
          popularityScore: 72.4,
          freshnessScore: 88.1,
          slug: 'operations-mastery',
          publishedAt: '2024-03-01T00:00:00Z'
        }
      ],
      total: 1,
      page: 1,
      perPage: 5,
      facets: { category: { ops: 1 } },
      processingTimeMs: 5
    }));

    documentModelMock.search.mockImplementationOnce(async () => ({
      entityType: 'tutors',
      hits: [
        {
          entityId: 'tutor-ava',
          title: 'Ava Sinclair',
          description: 'Ops coach',
          metadata: { skills: ['ops'], headline: 'Ops coach' },
          price: { currency: 'USD', amountMinor: 12500 },
          rating: { average: 4.8, count: 64 },
          completedSessions: 45,
          responseTimeMinutes: 12,
          isVerified: true,
          popularityScore: 64.5,
          freshnessScore: 70.2,
          slug: 'ava-sinclair'
        }
      ],
      total: 1,
      page: 1,
      perPage: 5,
      facets: { skills: { ops: 1 } },
      processingTimeMs: 7
    }));

    const result = await service.search({
      query: 'ops',
      entityTypes: ['courses', 'tutors'],
      page: 1,
      perPage: 5,
      filters: { courses: { level: 'advanced' } },
      sort: { courses: 'rating' }
    });

    expect(documentModelMock.search).toHaveBeenCalledTimes(2);
    expect(documentModelMock.search).toHaveBeenNthCalledWith(1, 'courses', {
      query: 'ops',
      filters: { level: 'advanced' },
      sort: 'rating',
      page: 1,
      perPage: 5,
      includeFacets: true
    });
    expect(documentModelMock.search).toHaveBeenNthCalledWith(2, 'tutors', {
      query: 'ops',
      filters: {},
      sort: 'relevance',
      page: 1,
      perPage: 5,
      includeFacets: true
    });

    expect(result.entities).toEqual(['courses', 'tutors']);
    expect(result.results.courses.hits[0]).toMatchObject({
      title: 'Operations Mastery',
      actions: [{ href: '/courses/operations-mastery' }]
    });
    expect(result.results.tutors.hits[0]).toMatchObject({
      title: 'Ava Sinclair',
      actions: [{ href: '/tutors/ava-sinclair' }],
      metrics: { isVerified: true },
      thumbnailUrl: 'https://cdn.example.com/tutor-ava.jpg'
    });

    expect(adsServiceMock.placementsForSearch).toHaveBeenCalledWith({
      query: 'ops',
      entities: ['courses', 'tutors']
    });
    expect(previewMetricModelMock.getRecentPreviewDigest).toHaveBeenCalledWith('courses', expect.any(Object));
    expect(previewMetricModelMock.getRecentPreviewDigest).toHaveBeenCalledWith('tutors', expect.any(Object));
  });
});
