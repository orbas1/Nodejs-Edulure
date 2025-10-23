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

describe('ExplorerSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the document model and formats results per entity', async () => {
    const service = new ExplorerSearchService({
      documentModel: documentModelMock,
      adsService: adsServiceMock,
      loggerInstance: loggerStub
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
          publishedAt: '2024-03-01T00:00:00Z',
          previewSummary: 'Learn ops playbooks fast',
          previewImageUrl: 'https://example.com/course.jpg',
          previewHighlights: ['Level: Advanced', '1200 learners'],
          ctaLinks: [{ label: 'View course', href: '/courses/operations-mastery', type: 'primary' }],
          badges: [{ type: 'level', label: 'Advanced' }],
          monetisationTag: 'Premium course'
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
          slug: 'ava-sinclair',
          previewSummary: 'Ops coaching and mentorship',
          previewImageUrl: 'https://example.com/ava.png',
          previewHighlights: ['Verified tutor', 'Responds in 12m'],
          ctaLinks: [{ label: 'Hire tutor', href: '/tutors/ava-sinclair', type: 'primary' }],
          badges: [{ type: 'verified', label: 'Verified' }],
          monetisationTag: 'Verified tutor'
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
      actions: [{ href: '/courses/operations-mastery', type: 'primary' }],
      preview: {
        summary: 'Learn ops playbooks fast',
        highlights: ['Level: Advanced', '1200 learners'],
        ctaLinks: [{ href: '/courses/operations-mastery', type: 'primary', label: 'View course' }]
      },
      badges: [{ type: 'level', label: 'Advanced' }],
      monetisationTag: 'Premium course'
    });
    expect(result.results.tutors.hits[0]).toMatchObject({
      title: 'Ava Sinclair',
      actions: [{ href: '/tutors/ava-sinclair', type: 'primary' }],
      metrics: { isVerified: true },
      preview: {
        summary: 'Ops coaching and mentorship',
        highlights: ['Verified tutor', 'Responds in 12m']
      },
      monetisationTag: 'Verified tutor'
    });

    expect(adsServiceMock.placementsForSearch).toHaveBeenCalledWith({
      query: 'ops',
      entities: ['courses', 'tutors']
    });
  });
});
