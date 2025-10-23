import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const PAGE_STATUSES = ['draft', 'published', 'archived'];

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasPages = await trx.schema.hasTable('marketing_pages');
    if (!hasPages) {
      await trx.schema.createTable('marketing_pages', (table) => {
        table.increments('id').primary();
        table.string('slug', 120).notNullable();
        table.string('title', 180).notNullable();
        table
          .enum('status', PAGE_STATUSES, {
            useNative: true,
            enumName: 'marketing_page_status'
          })
          .notNullable()
          .defaultTo('draft');
        table.string('description', 300);
        table.string('default_locale', 8).notNullable().defaultTo('en');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['slug']);
      });

      await ensureUpdatedAtTrigger(trx, 'marketing_pages');
    }

    const hasBlocks = await trx.schema.hasTable('marketing_blocks');
    if (!hasBlocks) {
      await trx.schema.createTable('marketing_blocks', (table) => {
        table.increments('id').primary();
        table
          .integer('page_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('marketing_pages')
          .onDelete('CASCADE');
        table.string('locale', 8).notNullable().defaultTo('en');
        table.string('block_key', 140).notNullable();
        table.string('block_type', 80).notNullable();
        table.string('heading', 200);
        table.text('subheading');
        table.json('content').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('media').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('cta').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.integer('position').notNullable().defaultTo(0);
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('variant', 80);
        addTimestamps(table, trx);
        table.unique(['page_id', 'locale', 'block_key'], 'marketing_blocks_page_locale_key_unique');
        table.index(['page_id', 'locale'], 'marketing_blocks_page_locale_idx');
        table.index(['page_id', 'block_type'], 'marketing_blocks_page_type_idx');
      });

      await addCheckConstraint(
        trx,
        'marketing_blocks',
        'marketing_blocks_position_chk',
        'position >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'marketing_blocks');
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const hasBlocks = await trx.schema.hasTable('marketing_blocks');
    if (hasBlocks) {
      await trx.schema.dropTable('marketing_blocks');
    }

    const hasPages = await trx.schema.hasTable('marketing_pages');
    if (hasPages) {
      await trx.schema.dropTable('marketing_pages');
    }
  });
}
