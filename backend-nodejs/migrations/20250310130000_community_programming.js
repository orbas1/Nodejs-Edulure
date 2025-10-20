export async function up(knex) {
  const hasWebinars = await knex.schema.hasTable('community_webinars');
  if (!hasWebinars) {
    await knex.schema.createTable('community_webinars', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('topic', 220).notNullable();
      table.string('host', 160).notNullable();
      table.timestamp('start_at').notNullable();
      table
        .enum('status', ['draft', 'announced', 'live', 'complete', 'cancelled'])
        .notNullable()
        .defaultTo('draft');
      table.integer('registrant_count').unsigned().defaultTo(0);
      table.string('watch_url', 500);
      table.text('description');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id', 'start_at']);
      table.index(['status']);
    });
  }

  const hasPodcastEpisodes = await knex.schema.hasTable('community_podcast_episodes');
  if (!hasPodcastEpisodes) {
    await knex.schema.createTable('community_podcast_episodes', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('title', 220).notNullable();
      table.string('host', 160).notNullable();
      table
        .enum('stage', ['planning', 'recording', 'editing', 'qa', 'scheduled', 'live', 'archived'])
        .notNullable()
        .defaultTo('planning');
      table.date('release_on');
      table.integer('duration_minutes').unsigned().defaultTo(0);
      table.text('summary');
      table.string('audio_url', 500);
      table.string('cover_art_url', 500);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id']);
      table.index(['stage']);
      table.index(['release_on']);
    });
  }

  const hasGrowth = await knex.schema.hasTable('community_growth_experiments');
  if (!hasGrowth) {
    await knex.schema.createTable('community_growth_experiments', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('title', 220).notNullable();
      table.string('owner_name', 160);
      table
        .enum('status', ['ideation', 'design', 'building', 'live', 'completed', 'archived'])
        .notNullable()
        .defaultTo('ideation');
      table.string('target_metric', 160);
      table.decimal('baseline_value', 10, 2);
      table.decimal('target_value', 10, 2);
      table.decimal('impact_score', 5, 2);
      table.date('start_date');
      table.date('end_date');
      table.text('hypothesis');
      table.text('notes');
      table.string('experiment_url', 500);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id']);
      table.index(['status']);
      table.index(['start_date']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('community_growth_experiments');
  await knex.schema.dropTableIfExists('community_podcast_episodes');
  await knex.schema.dropTableIfExists('community_webinars');
}
