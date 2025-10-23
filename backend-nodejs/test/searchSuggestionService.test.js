import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchSuggestionService } from '../src/services/SearchSuggestionService.js';

const savedSearchService = {
  list: vi.fn()
};

const eventModel = {
  topQueries: vi.fn()
};

const metricModel = {
  listPreviewDigests: vi.fn()
};

const loggerInstance = {
  child: vi.fn(() => ({ warn: vi.fn(), info: vi.fn() }))
};

function buildService() {
  return new SearchSuggestionService({
    savedSearchServiceInstance: savedSearchService,
    eventModel,
    metricModel,
    loggerInstance
  });
}

describe('SearchSuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('combines saved searches, trending queries, and preview digests', async () => {
    savedSearchService.list.mockResolvedValue([
      {
        id: 1,
        name: 'Pinned automation',
        query: 'automation',
        entityTypes: ['courses'],
        isPinned: true,
        lastUsedAt: '2024-05-19T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'Communities marketing',
        query: 'marketing',
        entityTypes: ['communities'],
        isPinned: false,
        lastUsedAt: '2024-05-18T00:00:00.000Z'
      }
    ]);

    eventModel.topQueries.mockResolvedValue([
      { query: 'design systems', searches: 24 }
    ]);

    metricModel.listPreviewDigests.mockResolvedValue([
      {
        entityType: 'courses',
        metricDate: new Date('2024-05-18T00:00:00.000Z'),
        searches: 18,
        digest: {
          id: 'course-123',
          title: 'Course 123',
          thumbnailUrl: 'https://cdn.test/course.jpg',
          ratingAverage: 4.6,
          ratingCount: 48
        }
      },
      {
        entityType: 'all',
        metricDate: new Date('2024-05-18T00:00:00.000Z'),
        searches: 42,
        digest: {
          id: 'digest-aggregate',
          title: 'Top pick',
          thumbnailUrl: 'https://cdn.test/top-pick.jpg'
        }
      }
    ]);

    const service = buildService();
    const suggestions = await service.getSuggestions({ userId: 5, limit: 5, sinceDays: 7 });

    expect(suggestions).toHaveLength(4);
    expect(suggestions[0].type).toBe('saved-search');
    expect(suggestions[0].preview?.thumbnailUrl).toBe('https://cdn.test/course.jpg');
    expect(suggestions[1].type).toBe('saved-search');
    expect(suggestions[2].type).toBe('trending-query');
    expect(suggestions[2].preview?.thumbnailUrl).toBe('https://cdn.test/top-pick.jpg');
    expect(suggestions[3].type).toBe('entity-preview');
    expect(suggestions[3].target).toEqual({ entityType: 'courses', entityId: 'course-123' });
  });

  it('falls back gracefully when user is unauthenticated', async () => {
    savedSearchService.list.mockResolvedValue([]);
    eventModel.topQueries.mockResolvedValue([]);
    metricModel.listPreviewDigests.mockResolvedValue([]);

    const service = buildService();
    const suggestions = await service.getSuggestions({ userId: null, limit: 3, sinceDays: 5 });

    expect(savedSearchService.list).not.toHaveBeenCalled();
    expect(eventModel.topQueries).toHaveBeenCalled();
    expect(Array.isArray(suggestions)).toBe(true);
  });
});
