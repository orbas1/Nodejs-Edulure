import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import EbookModel from '../src/models/EbookModel.js';

let connection;

const createTables = async () => {
  await connection.schema.createTable('content_assets', (table) => {
    table.increments('id').primary();
    table.integer('created_by').notNullable();
    table.timestamp('created_at').defaultTo(connection.fn.now());
  });

  await connection.schema.createTable('ebooks', (table) => {
    table.increments('id').primary();
    table.string('public_id').notNullable();
    table
      .integer('asset_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('content_assets')
      .onDelete('CASCADE');
    table.string('title').notNullable();
    table.string('slug').notNullable();
    table.string('subtitle');
    table.text('description');
    table.text('authors').notNullable().defaultTo('[]');
    table.text('tags').notNullable().defaultTo('[]');
    table.text('categories').notNullable().defaultTo('[]');
    table.text('languages').notNullable().defaultTo('["en"]');
    table.string('isbn');
    table.string('cover_image_url');
    table.string('sample_download_url');
    table.string('audiobook_url');
    table.integer('reading_time_minutes').notNullable().defaultTo(0);
    table.string('price_currency').notNullable().defaultTo('USD');
    table.decimal('price_amount').notNullable().defaultTo(0);
    table.decimal('rating_average').notNullable().defaultTo(0);
    table.integer('rating_count').notNullable().defaultTo(0);
    table.integer('watermark_id');
    table.string('status').notNullable().defaultTo('draft');
    table.boolean('is_public').notNullable().defaultTo(false);
    table.timestamp('release_at');
    table.text('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  });
};

describe('EbookModel', () => {
  beforeAll(async () => {
    connection = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });
    await connection.raw('PRAGMA foreign_keys = ON');
    await createTables();
  });

  beforeEach(async () => {
    await connection('ebooks').delete();
    await connection('content_assets').delete();
  });

  afterAll(async () => {
    await connection.destroy();
  });

  const createAsset = async (createdBy = 42) => {
    const [assetId] = await connection('content_assets').insert({ created_by: createdBy });
    return assetId;
  };

  it('creates an ebook with a sanitised slug and parsed metadata', async () => {
    const assetId = await createAsset();

    const ebook = await EbookModel.create(
      {
        publicId: 'pub-ebook-1',
        assetId,
        title: '  Effective Node Patterns  ',
        authors: ['Ada Lovelace'],
        tags: ['node', 'patterns'],
        metadata: { difficulty: 'intermediate' }
      },
      connection
    );

    expect(ebook.slug).toBe('effective-node-patterns');
    expect(ebook.title).toBe('Effective Node Patterns');
    expect(ebook.languages).toEqual(['en']);
    expect(ebook.metadata).toEqual({ difficulty: 'intermediate' });
    expect(ebook.authors).toEqual(['Ada Lovelace']);
  });

  it('throws when a slug cannot be derived from the provided fields', async () => {
    const assetId = await createAsset();

    await expect(
      EbookModel.create(
        {
          publicId: 'pub-ebook-2',
          assetId,
          title: '!!!',
          slug: '   '
        },
        connection
      )
    ).rejects.toThrow('Ebook slug could not be derived from the provided slug or title');
  });

  it('prevents invalid slug updates and applies sanitisation when valid', async () => {
    const assetId = await createAsset();
    const ebook = await EbookModel.create(
      {
        publicId: 'pub-ebook-3',
        assetId,
        title: 'Modern Graph Data',
        slug: 'custom-slug'
      },
      connection
    );

    await expect(
      EbookModel.updateById(ebook.id, { slug: '   ' }, connection)
    ).rejects.toThrow('slug must resolve to a valid URL-friendly value');

    const updated = await EbookModel.updateById(
      ebook.id,
      { slug: 'Refined Graph Data', title: '  Refined Graph Data  ' },
      connection
    );

    expect(updated.slug).toBe('refined-graph-data');
    expect(updated.title).toBe('Refined Graph Data');
  });
});
