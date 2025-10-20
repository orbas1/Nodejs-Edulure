import { describe, expect, it } from 'vitest';

import BlogTagModel from '../src/models/BlogTagModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('BlogTagModel', () => {
  it('creates tags with normalised slugs', async () => {
    const connection = createMockConnection({ blog_tags: [] });

    const tag = await BlogTagModel.ensure('Featured Insights', 'Featured Insights', { description: 'Top picks' }, connection);
    expect(tag.slug).toBe('featured-insights');
    expect(tag.name).toBe('Featured Insights');

    const rows = connection.__getRows('blog_tags');
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe('featured-insights');
    expect(rows[0].description).toBe('Top picks');
  });

  it('updates tags when metadata changes', async () => {
    const connection = createMockConnection({
      blog_tags: [
        {
          id: 1,
          slug: 'product-updates',
          name: 'Product Updates',
          description: 'All product news',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    const tag = await BlogTagModel.ensure('product-updates', 'Product Announcements', { description: 'Announcements' }, connection);
    expect(tag.name).toBe('Product Announcements');
    expect(tag.description).toBe('Announcements');
  });

  it('returns empty list when no slugs provided', async () => {
    const connection = createMockConnection({ blog_tags: [] });
    const tags = await BlogTagModel.findBySlugs([], connection);
    expect(tags).toEqual([]);
  });
});
