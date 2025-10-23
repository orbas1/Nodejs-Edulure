import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import SearchDocumentModel from '../src/models/SearchDocumentModel.js';

let connection;

const createTables = async () => {
  await connection.schema.createTable('search_documents', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 64).notNullable();
    table.string('entity_id', 128).notNullable();
    table.string('entity_public_id', 128);
    table.string('slug', 240);
    table.string('title', 240).notNullable();
    table.string('subtitle', 240);
    table.text('description');
    table.string('thumbnail_url', 500);
    table.text('keywords').notNullable().defaultTo('[]');
    table.text('metadata').notNullable().defaultTo('{}');
    table.string('category', 120);
    table.string('level', 60);
    table.string('country', 4);
    table.string('language_codes', 255);
    table.string('tag_slugs', 500);
    table.string('price_currency', 3).notNullable().defaultTo('USD');
    table.integer('price_amount_minor').notNullable().defaultTo(0);
    table.decimal('rating_average', 8, 4).notNullable().defaultTo(0);
    table.integer('rating_count').notNullable().defaultTo(0);
    table.integer('member_count').notNullable().defaultTo(0);
    table.integer('post_count').notNullable().defaultTo(0);
    table.integer('completed_sessions').notNullable().defaultTo(0);
    table.integer('response_time_minutes').notNullable().defaultTo(0);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.decimal('popularity_score', 12, 4).notNullable().defaultTo(0);
    table.decimal('freshness_score', 12, 4).notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('published_at');
    table.timestamp('indexed_at').defaultTo(connection.fn.now());
    table.timestamp('refreshed_at');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  });
};

describe('SearchDocumentModel', () => {
  beforeAll(async () => {
    connection = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });
    await createTables();
  });

  beforeEach(async () => {
    await connection('search_documents').delete();

    await connection('search_documents').insert({
      entity_type: 'courses',
      entity_id: 'automation-launch-masterclass',
      entity_public_id: 'course-public-001',
      slug: 'automation-launch-masterclass',
      title: 'Automation Launch Masterclass',
      subtitle: 'Advanced cohort · Automation launch',
      description: 'Production blueprint for live classroom automation launches.',
      thumbnail_url: 'https://cdn.test/courses/automation.jpg',
      keywords: JSON.stringify(['automation', 'cohort', 'launch']),
      metadata: JSON.stringify({
        summary: 'Production blueprint for automation launches.',
        tags: ['automation', 'launch'],
        languages: ['en'],
        visibility: 'public',
        timezones: ['UTC', 'America/New_York'],
        preview: {
          type: 'video',
          url: 'https://cdn.test/video/automation-preview.mp4',
          posterUrl: 'https://cdn.test/images/automation-thumb.jpg'
        }
      }),
      category: 'operations',
      level: 'advanced',
      country: 'US',
      language_codes: 'en',
      tag_slugs: 'automation,launch',
      price_currency: 'USD',
      price_amount_minor: 129900,
      rating_average: 4.8,
      rating_count: 187,
      member_count: 421,
      is_verified: true,
      popularity_score: 92.1,
      freshness_score: 88.3,
      published_at: connection.fn.now(),
      indexed_at: connection.fn.now(),
      refreshed_at: connection.fn.now()
    });

    await connection('search_documents').insert({
      entity_type: 'communities',
      entity_id: 'learning-ops-guild',
      slug: 'learning-ops-guild',
      title: 'Learning Ops Guild',
      subtitle: 'Public · Automation guild',
      description: 'Operations leaders share launch playbooks and telemetry recipes.',
      thumbnail_url: 'https://cdn.test/communities/ops.jpg',
      keywords: JSON.stringify(['operations', 'automation', 'community']),
      metadata: JSON.stringify({
        visibility: 'public',
        focus: ['operations'],
        languages: ['en'],
        timezones: ['UTC'],
        preview: {
          type: 'video',
          url: 'https://cdn.test/video/ops-preview.mp4',
          posterUrl: 'https://cdn.test/images/ops-thumb.jpg'
        }
      }),
      category: 'operations',
      language_codes: 'en',
      tag_slugs: 'operations,automation',
      rating_average: 4.9,
      rating_count: 212,
      member_count: 284,
      post_count: 42,
      is_verified: true,
      popularity_score: 84.4,
      freshness_score: 79.5,
      published_at: connection.fn.now(),
      indexed_at: connection.fn.now(),
      refreshed_at: connection.fn.now()
    });

    await connection('search_documents').insert({
      entity_type: 'tutors',
      entity_id: 'kai-watanabe',
      slug: 'kai-watanabe',
      title: 'Kai Watanabe',
      subtitle: 'Automation strategist & tutor',
      description: 'Guides automation launch teams through rehearsal drills.',
      thumbnail_url: 'https://cdn.test/tutors/kai.jpg',
      keywords: JSON.stringify(['automation', 'strategist', 'tutor']),
      metadata: JSON.stringify({
        headline: 'Automation strategist',
        languages: ['en', 'ja'],
        skills: ['automation', 'coaching'],
        preview: {
          type: 'image',
          url: 'https://cdn.test/tutors/kai-thumb.jpg'
        }
      }),
      category: 'coaching',
      country: 'JP',
      language_codes: 'en,ja',
      tag_slugs: 'automation,coaching',
      price_currency: 'USD',
      price_amount_minor: 18000,
      rating_average: 4.9,
      rating_count: 86,
      completed_sessions: 312,
      response_time_minutes: 18,
      is_verified: true,
      popularity_score: 86.7,
      freshness_score: 72.4,
      published_at: connection.fn.now(),
      indexed_at: connection.fn.now(),
      refreshed_at: connection.fn.now()
    });
  });

  afterAll(async () => {
    await connection.destroy();
  });

  it('searches courses with sqlite-compatible filters and returns facets', async () => {
    const result = await SearchDocumentModel.search(
      'courses',
      {
        query: 'automation',
        filters: {
          level: 'advanced',
          tags: ['automation'],
          timezones: ['UTC'],
          price: { min: 1000, max: 2000 },
          languages: ['en']
        },
        includeFacets: true
      },
      connection
    );

    expect(result.hits).toHaveLength(1);
    const [hit] = result.hits;
    expect(hit.entityId).toBe('automation-launch-masterclass');
    expect(hit.metadata.tags).toContain('automation');
    expect(result.facets.languages.en).toBeGreaterThan(0);
  });

  it('applies metadata equality and array filters for communities', async () => {
    const result = await SearchDocumentModel.search(
      'communities',
      {
        filters: {
          visibility: ['public'],
          languages: ['en'],
          timezones: ['UTC']
        }
      },
      connection
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].entityId).toBe('learning-ops-guild');
  });

  it('supports query fallback and token filters for tutors under sqlite', async () => {
    const result = await SearchDocumentModel.search(
      'tutors',
      {
        query: 'strategist',
        filters: {
          languages: ['ja'],
          skills: ['automation']
        }
      },
      connection
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].entityId).toBe('kai-watanabe');
  });
});
