import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn()
}));

vi.mock('../../src/api/httpClient.js', () => ({
  httpClient: httpClientMock,
  API_BASE_URL: 'https://api.example.com',
  responseCache: {
    createKey: vi.fn(() => 'key'),
    get: vi.fn(() => undefined),
    set: vi.fn(),
    invalidateTags: vi.fn()
  }
}));

import { createCommunity, listCommunities } from '../../src/api/adminControlApi.js';
import { fetchExplorerSummary } from '../../src/api/analyticsApi.js';
import { fetchCommunityFeed } from '../../src/api/communityApi.js';
import { postCommunityMessage } from '../../src/api/communityChatApi.js';
import { listCommunityWebinars } from '../../src/api/communityProgrammingApi.js';
import { fetchCoursePlayer } from '../../src/api/courseApi.js';
import { createEbookListing } from '../../src/api/ebookApi.js';
import { listSavedSearches } from '../../src/api/explorerApi.js';

const resolved = (value) => Promise.resolve(value);

beforeEach(() => {
  Object.values(httpClientMock).forEach((fn) => fn.mockReset());
  httpClientMock.get.mockImplementation(() => resolved({ data: [], meta: {} }));
  httpClientMock.post.mockImplementation(() => resolved({ data: {} }));
  httpClientMock.put.mockImplementation(() => resolved({ data: {} }));
  httpClientMock.patch.mockImplementation(() => resolved({ data: {} }));
  httpClientMock.delete.mockImplementation(() => resolved({ data: {} }));
});

describe('adminControlApi', () => {
  it('requires a token to list communities', () => {
    expect(() => listCommunities()).toThrow(/Authentication token is required/);
  });

  it('passes caching metadata when listing communities', async () => {
    httpClientMock.get.mockResolvedValueOnce({ data: [{ id: 1 }], meta: { pagination: { page: 1 } } });
    const result = await listCommunities({ token: 'token-123', params: { page: 2 } });

    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/admin/control/communities',
      expect.objectContaining({
        token: 'token-123',
        params: { page: 2 },
        cache: expect.objectContaining({ tags: ['admin:control:communities'], varyByToken: true })
      })
    );
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('invalidates caches when creating a community', async () => {
    await createCommunity({ token: 'token-123', payload: { name: 'New Community' } });
    expect(httpClientMock.post).toHaveBeenCalledWith(
      '/admin/control/communities',
      { name: 'New Community' },
      expect.objectContaining({
        token: 'token-123',
        cache: expect.objectContaining({ invalidateTags: ['admin:control:communities'] })
      })
    );
  });
});

describe('analyticsApi', () => {
  it('requires tokens and sets cache tags for explorer summary', async () => {
    httpClientMock.get.mockResolvedValueOnce({ data: { total: 1 } });
    await fetchExplorerSummary({ token: 'token-abc', range: '30d' });
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/analytics/explorer/summary',
      expect.objectContaining({
        token: 'token-abc',
        cache: expect.objectContaining({ tags: ['analytics:explorer:summary:30d'] })
      })
    );
  });
});

describe('communityApi integrations', () => {
  it('enforces identifiers and caching on community feed requests', async () => {
    httpClientMock.get.mockResolvedValueOnce({ data: [{ id: 'post-1' }], meta: {} });
    const response = await fetchCommunityFeed({ communityId: 'c1', token: 'token-123' });
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/communities/c1/posts',
      expect.objectContaining({
        token: 'token-123',
        cache: expect.objectContaining({ tags: ['community:c1:feed'] })
      })
    );
    expect(response.data).toEqual([{ id: 'post-1' }]);
  });

  it('invalidates chat caches when posting new messages', async () => {
    await postCommunityMessage({ communityId: 'c1', channelId: 'ch1', token: 'token-123', payload: { text: 'hi' } });
    expect(httpClientMock.post).toHaveBeenCalledWith(
      '/communities/c1/chat/channels/ch1/messages',
      { text: 'hi' },
      expect.objectContaining({
        token: 'token-123',
        cache: expect.objectContaining({
          invalidateTags: ['community:c1:chat:channels', 'community:c1:chat:messages:ch1']
        })
      })
    );
  });
});

describe('communityProgrammingApi', () => {
  it('adds cache metadata when listing webinars', async () => {
    await listCommunityWebinars({ communityId: 'c1', token: 'token-123' });
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/communities/c1/webinars',
      expect.objectContaining({
        token: 'token-123',
        cache: expect.objectContaining({ tags: ['community:c1:webinars'] })
      })
    );
  });
});

describe('courseApi', () => {
  it('provides caching when fetching course players', async () => {
    await fetchCoursePlayer('course-1', { token: 'token-xyz' });
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/courses/course-1/player',
      expect.objectContaining({
        token: 'token-xyz',
        cache: expect.objectContaining({ tags: ['course:course-1:player'] })
      })
    );
  });
});

describe('ebookApi', () => {
  it('invalidates relevant caches when creating a listing', async () => {
    await createEbookListing({ token: 'token-ebook', payload: { title: 'Book' } });
    expect(httpClientMock.post).toHaveBeenCalledWith(
      '/ebooks',
      { title: 'Book' },
      expect.objectContaining({
        token: 'token-ebook',
        cache: expect.objectContaining({ invalidateTags: ['ebooks:catalogue:token-ebook', 'ebooks:marketplace'] })
      })
    );
  });
});

describe('explorerApi', () => {
  it('uses cache metadata when listing saved searches', async () => {
    await listSavedSearches({ token: 'token-search' });
    expect(httpClientMock.get).toHaveBeenCalledWith(
      '/explorer/saved-searches',
      expect.objectContaining({
        token: 'token-search',
        cache: expect.objectContaining({ tags: ['explorer:saved-searches:token-search'] })
      })
    );
  });
});
