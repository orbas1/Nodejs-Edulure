import { beforeAll, describe, expect, it } from 'vitest';

import enablementContentService from '../src/services/EnablementContentService.js';

describe('EnablementContentService', () => {
  beforeAll(async () => {
    await enablementContentService.refreshCache();
  });

  it('lists enablement articles with metadata and excerpts', async () => {
    const result = await enablementContentService.listArticles();
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.items[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      summary: expect.any(String),
      audience: expect.arrayContaining([expect.any(String)]),
      products: expect.arrayContaining([expect.any(String)]),
      tags: expect.arrayContaining([expect.any(String)]),
      readingTimeMinutes: expect.any(Number)
    });
  });

  it('filters articles by tag and search query', async () => {
    const filtered = await enablementContentService.listArticles({ tag: 'communications', q: 'cadence' });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].slug).toBe('stakeholder-communications-kit');
  });

  it('returns article content in requested format', async () => {
    const markdownArticle = await enablementContentService.getArticle('operator-onboarding-playbook');
    expect(markdownArticle.format).toBe('markdown');
    expect(markdownArticle.content).toContain('# Operator Onboarding Playbook');

    const htmlArticle = await enablementContentService.getArticle('operator-onboarding-playbook', { format: 'html' });
    expect(htmlArticle.format).toBe('html');
    expect(htmlArticle.content).toContain('<h1>Operator Onboarding Playbook</h1>');
  });

  it('exposes aggregated capability matrix statistics', async () => {
    const matrix = await enablementContentService.getCapabilityMatrix();
    expect(matrix.total).toBeGreaterThanOrEqual(3);
    expect(matrix.audiences).toHaveProperty('support');
    expect(matrix.products).toHaveProperty('operator-console');
    expect(matrix.tags).toHaveProperty('training');
    expect(matrix.totalTimeToCompleteMinutes).toBeGreaterThan(0);
  });
});
