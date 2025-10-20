const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

function normaliseRows(result) {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result[0] ?? [];
  }

  if (typeof result === 'object' && result !== null && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

async function constraintExists(knex, tableName, constraintName) {
  if (isMysql(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  if (isPostgres(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  return false;
}

async function addCheckConstraint(knex, tableName, constraintName, expression) {
  if (await constraintExists(knex, tableName, constraintName)) {
    return;
  }

  await knex.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${expression})`, [tableName, constraintName]);
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasWebinars = await trx.schema.hasTable('community_webinars');
    if (!hasWebinars) {
      await trx.schema.createTable('community_webinars', (table) => {
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
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.index(['community_id', 'start_at']);
        table.index(['status']);
      });

      await addCheckConstraint(
        trx,
        'community_webinars',
        'community_webinars_registrant_chk',
        'registrant_count >= 0'
      );
    }

    const hasPodcastEpisodes = await trx.schema.hasTable('community_podcast_episodes');
    if (!hasPodcastEpisodes) {
      await trx.schema.createTable('community_podcast_episodes', (table) => {
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
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.index(['community_id']);
        table.index(['stage']);
        table.index(['release_on']);
      });

      await addCheckConstraint(
        trx,
        'community_podcast_episodes',
        'community_podcast_duration_chk',
        'duration_minutes >= 0'
      );
    }

    const hasGrowth = await trx.schema.hasTable('community_growth_experiments');
    if (!hasGrowth) {
      await trx.schema.createTable('community_growth_experiments', (table) => {
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
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.index(['community_id']);
        table.index(['status']);
        table.index(['start_date']);
      });

      await addCheckConstraint(
        trx,
        'community_growth_experiments',
        'community_growth_experiments_baseline_chk',
        'baseline_value IS NULL OR baseline_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'community_growth_experiments',
        'community_growth_experiments_target_chk',
        'target_value IS NULL OR target_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'community_growth_experiments',
        'community_growth_experiments_impact_chk',
        'impact_score IS NULL OR impact_score >= 0'
      );
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('community_growth_experiments');
    await trx.schema.dropTableIfExists('community_podcast_episodes');
    await trx.schema.dropTableIfExists('community_webinars');
  });
}
