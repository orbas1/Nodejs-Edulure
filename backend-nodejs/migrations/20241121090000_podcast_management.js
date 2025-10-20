import { jsonDefault } from './_utils.js';

export async function up(knex) {
  const hasShows = await knex.schema.hasTable('podcast_shows');
  if (!hasShows) {
    await knex.schema.createTable('podcast_shows', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('SET NULL');
      table
        .integer('owner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('title', 200).notNullable();
      table.string('slug', 220).notNullable().unique();
      table.string('subtitle', 300);
      table.text('description');
      table.string('cover_image_url', 500);
      table.string('category', 120);
      table
        .enum('status', ['draft', 'in_production', 'scheduled', 'published', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.boolean('is_public').notNullable().defaultTo(false);
      table.string('distribution_channels', 255);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('launch_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id']);
      table.index(['owner_id']);
      table.index(['status']);
    });
  }

  const hasEpisodes = await knex.schema.hasTable('podcast_episodes');
  if (!hasEpisodes) {
    await knex.schema.createTable('podcast_episodes', (table) => {
      table.increments('id').primary();
      table
        .integer('show_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('podcast_shows')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('slug', 220).notNullable();
      table.string('summary', 500);
      table.text('description');
      table.string('audio_url', 500);
      table.string('video_url', 500);
      table.integer('duration_seconds').unsigned().defaultTo(0);
      table.integer('season_number').unsigned().defaultTo(1);
      table.integer('episode_number').unsigned().defaultTo(1);
      table
        .enum('status', ['draft', 'editing', 'scheduled', 'published', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.timestamp('publish_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['show_id', 'slug']);
      table.index(['show_id', 'status']);
      table.index(['publish_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('podcast_episodes');
  await knex.schema.dropTableIfExists('podcast_shows');
}
