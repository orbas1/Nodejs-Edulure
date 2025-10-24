import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SupportKnowledgeBaseService from '../src/services/SupportKnowledgeBaseService.js';
import { createMockConnection } from './support/mockDb.js';

const connectionRef = { current: null };

const dbMock = (...args) => {
  if (!connectionRef.current) {
    throw new Error('Mock database connection not initialised');
  }
  return connectionRef.current(...args);
};

vi.mock('../src/config/database.js', () => ({
  default: dbMock
}));

describe('SupportKnowledgeBaseService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00Z'));
    connectionRef.current = createMockConnection({
      support_articles: [
        {
          id: 1,
          slug: 'live-classroom-reset',
          title: 'Stabilise a live classroom session',
          summary: 'Recover frozen live classroom rooms and re-sync media.',
          category: 'Live classroom',
          url: 'https://support.edulure.test/articles/live-classroom-reset',
          minutes: 5,
          keywords: '["live classroom","reset","frozen"]',
          helpfulness_score: 9.6,
          updated_at: '2025-03-01T10:00:00Z'
        },
        {
          id: 2,
          slug: 'billing-decline-remedy',
          title: 'Resolve recurring billing declines',
          summary: 'Checklist for reconciling payment failures.',
          category: 'Billing & payments',
          url: 'https://support.edulure.test/articles/billing-decline-remedy',
          minutes: 4,
          keywords: '["billing","declines","payments"]',
          helpfulness_score: 8.4,
          updated_at: '2025-02-27T09:30:00Z'
        },
        {
          id: 3,
          slug: 'course-cache-refresh',
          title: 'Refresh stale course content',
          summary: 'Regenerate cached modules when lessons update.',
          category: 'Course access',
          url: 'https://support.edulure.test/articles/course-cache-refresh',
          minutes: 6,
          keywords: '["course","cache","refresh"]',
          helpfulness_score: 7.1,
          updated_at: '2025-02-15T08:45:00Z'
        }
      ]
    });
    dbMock.fn = connectionRef.current.fn;
    dbMock.transaction = connectionRef.current.transaction;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches articles by query, category, and limit with ranking fallbacks', async () => {
    const articles = await SupportKnowledgeBaseService.searchArticles({
      query: 'billing declines',
      category: 'Billing & payments',
      limit: 2
    });

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      id: 2,
      slug: 'billing-decline-remedy',
      title: 'Resolve recurring billing declines',
      helpfulnessScore: 8.4,
      stale: false,
      reviewIntervalDays: 90
    });
    expect(articles[0].updatedAt).toBe('2025-02-27T09:30:00.000Z');
    expect(articles[0].reviewDueAt).toBe('2025-05-28T09:30:00.000Z');
  });

  it('builds ticket suggestions by normalising search results', async () => {
    const suggestions = await SupportKnowledgeBaseService.buildSuggestionsForTicket({
      subject: 'Live classroom session frozen',
      description: 'Learners stall at 95% when joining live classes.',
      category: 'Live classroom'
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      id: 'live-classroom-reset',
      title: 'Stabilise a live classroom session',
      url: 'https://support.edulure.test/articles/live-classroom-reset',
      minutes: 5,
      stale: false
    });
  });
});
