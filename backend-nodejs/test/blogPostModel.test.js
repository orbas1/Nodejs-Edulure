import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/models/BlogMediaModel.js', () => ({
  default: {
    listForPost: vi.fn(async () => [{ id: 1, metadata: {} }]),
    replaceForPost: vi.fn()
  }
}));

import BlogPostModel from '../src/models/BlogPostModel.js';
import BlogMediaModel from '../src/models/BlogMediaModel.js';

function createConnectionMock(tags = []) {
  const builder = {
    select: vi.fn(() => builder),
    join: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => Promise.resolve(tags))
  };

  return (table) => {
    if (table === 'blog_tags') {
      return builder;
    }
    throw new Error(`Unexpected table requested: ${table}`);
  };
}

describe('BlogPostModel.hydrate', () => {
  it('guards against malformed metadata payloads', async () => {
    const connection = createConnectionMock([{ id: 2, slug: 'news', name: 'News' }]);
    const result = await BlogPostModel.hydrate(
      {
        id: 10,
        slug: 'test-post',
        title: 'Post',
        excerpt: null,
        content: 'Hello',
        status: 'draft',
        publishedAt: null,
        scheduledFor: null,
        metadata: '{broken-json',
        isFeatured: 0,
        readingTimeMinutes: 5,
        viewCount: 2,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        authorId: 42,
        authorFirstName: 'Ada',
        authorLastName: 'Lovelace',
        authorEmail: 'ada@example.com',
        categoryId: null,
        categoryName: null,
        categorySlug: null
      },
      connection
    );

    expect(result.metadata).toEqual({});
    expect(BlogMediaModel.listForPost).toHaveBeenCalledWith(10, connection);
  });
});

