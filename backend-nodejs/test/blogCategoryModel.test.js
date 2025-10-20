import { describe, expect, it } from 'vitest';

import BlogCategoryModel from '../src/models/BlogCategoryModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('BlogCategoryModel', () => {
  it('normalises and upserts categories safely', async () => {
    const connection = createMockConnection({ blog_categories: [] });

    const created = await BlogCategoryModel.upsert(
      {
        slug: ' Featured News ',
        name: ' Featured News ',
        description: 'All the latest updates',
        displayOrder: '5',
        isFeatured: 1
      },
      connection
    );

    expect(created.slug).toBe('featured-news');
    expect(created.displayOrder).toBe(5);
    expect(created.isFeatured).toBe(true);

    const stored = connection.__getRows('blog_categories')[0];
    expect(stored.slug).toBe('featured-news');
    expect(stored.display_order).toBe(5);
    expect(stored.is_featured).toBe(true);
  });

  it('lists featured categories with limits applied', async () => {
    const connection = createMockConnection({
      blog_categories: [
        {
          id: 1,
          slug: 'news',
          name: 'News',
          description: 'All updates',
          display_order: 2,
          is_featured: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 2,
          slug: 'guides',
          name: 'Guides',
          description: 'How-tos',
          display_order: 1,
          is_featured: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    const categories = await BlogCategoryModel.list({ includeFeaturedOnly: true, limit: 1 }, connection);
    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('guides');
    expect(categories[0].isFeatured).toBe(true);
  });

  it('reorders categories deterministically', async () => {
    const connection = createMockConnection({
      blog_categories: [
        { id: 1, slug: 'news', name: 'News', display_order: 1, is_featured: 0 },
        { id: 2, slug: 'guides', name: 'Guides', display_order: 2, is_featured: 0 }
      ]
    });

    const updated = await BlogCategoryModel.reorder(
      [
        { slug: 'news', displayOrder: 5 },
        { slug: 'guides', displayOrder: 1 }
      ],
      connection
    );

    expect(updated).toBe(2);
    const rows = connection.__getRows('blog_categories');
    expect(rows.find((row) => row.slug === 'news').display_order).toBe(5);
    expect(rows.find((row) => row.slug === 'guides').display_order).toBe(1);
  });
});
