import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const TESTIMONIAL_VARIANTS = ['testimonial', 'social_proof', 'case_study'];

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('marketing_testimonials');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('marketing_testimonials', (table) => {
    table.increments('id').primary();
    table.string('slug', 120).notNullable().unique();
    table
      .enum('variant', TESTIMONIAL_VARIANTS, {
        useNative: false,
        enumName: 'marketing_testimonial_variant_enum'
      })
      .notNullable()
      .defaultTo('testimonial');
    table.text('quote').notNullable();
    table.string('author_name', 160);
    table.string('author_title', 200);
    table.string('attribution', 200);
    table.string('persona', 160);
    table.string('featured_product', 180);
    table.json('surfaces').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    table.integer('position').unsigned().notNullable().defaultTo(0);
    addTimestamps(table, knex);
    table.index(['variant'], 'marketing_testimonials_variant_idx');
    table.index(['position'], 'marketing_testimonials_position_idx');
  });

  await ensureUpdatedAtTrigger(knex, 'marketing_testimonials');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('marketing_testimonials');
}
