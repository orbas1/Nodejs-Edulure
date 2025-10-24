import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

export async function up(knex) {
  const hasBlueprints = await knex.schema.hasTable('course_blueprints');
  if (!hasBlueprints) {
    await knex.schema.createTable('course_blueprints', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('stage', 100).notNullable().defaultTo('Planning');
      table.string('summary', 500);
      table.string('target_learners', 200);
      table.string('price_label', 120);
      table.integer('module_count').unsigned().notNullable().defaultTo(0);
      table.decimal('readiness_score', 5, 2).notNullable().defaultTo(0);
      table.string('readiness_label', 120);
      table.integer('total_duration_minutes').unsigned().notNullable().defaultTo(0);
      table.json('outstanding_tasks').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.json('upcoming_milestones').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_blueprints_course_id_idx');
      table.index(['stage'], 'course_blueprints_stage_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_blueprints');
  }

  const hasBlueprintModules = await knex.schema.hasTable('course_blueprint_modules');
  if (!hasBlueprintModules) {
    await knex.schema.createTable('course_blueprint_modules', (table) => {
      table.increments('id').primary();
      table
        .integer('blueprint_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_blueprints')
        .onDelete('CASCADE');
      table
        .integer('module_id')
        .unsigned()
        .references('id')
        .inTable('course_modules')
        .onDelete('SET NULL');
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.string('title', 200).notNullable();
      table.string('release_label', 200);
      table.integer('lesson_count').unsigned().notNullable().defaultTo(0);
      table.integer('assignment_count').unsigned().notNullable().defaultTo(0);
      table.integer('duration_minutes').unsigned().notNullable().defaultTo(0);
      table.json('outstanding_tasks').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['blueprint_id'], 'course_blueprint_modules_blueprint_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_blueprint_modules');
  }

  const hasCourseLaunches = await knex.schema.hasTable('course_launches');
  if (!hasCourseLaunches) {
    await knex.schema.createTable('course_launches', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.timestamp('target_date');
      table.string('target_label', 200);
      table.string('phase', 120).notNullable().defaultTo('Planning');
      table.string('owner', 120);
      table.string('risk_level', 120).notNullable().defaultTo('On track');
      table.string('risk_tone', 40).notNullable().defaultTo('low');
      table.string('activation_coverage', 120);
      table.decimal('confidence_score', 5, 4).notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_launches_course_id_idx');
      table.index(['phase'], 'course_launches_phase_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_launches');
  }

  const hasLaunchChecklist = await knex.schema.hasTable('course_launch_checklist_items');
  if (!hasLaunchChecklist) {
    await knex.schema.createTable('course_launch_checklist_items', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('launch_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_launches')
        .onDelete('CASCADE');
      table.string('label', 200).notNullable();
      table.boolean('completed').notNullable().defaultTo(false);
      table.string('owner', 120);
      table.timestamp('due_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['launch_id'], 'course_launch_checklist_launch_idx');
      table.index(['completed'], 'course_launch_checklist_completed_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_launch_checklist_items');
  }

  const hasLaunchSignals = await knex.schema.hasTable('course_launch_signals');
  if (!hasLaunchSignals) {
    await knex.schema.createTable('course_launch_signals', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('launch_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_launches')
        .onDelete('CASCADE');
      table.string('label', 200).notNullable();
      table.string('severity', 40).notNullable().defaultTo('info');
      table.string('description', 500);
      table.string('action_label', 200);
      table.string('action_href', 500);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['launch_id'], 'course_launch_signals_launch_idx');
      table.index(['severity'], 'course_launch_signals_severity_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_launch_signals');
  }

  const hasCourseReviews = await knex.schema.hasTable('course_reviews');
  if (!hasCourseReviews) {
    await knex.schema.createTable('course_reviews', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('reviewer_name', 200).notNullable();
      table.string('reviewer_role', 200);
      table.string('reviewer_company', 200);
      table.decimal('rating', 4, 2).notNullable().defaultTo(0);
      table.string('headline', 300);
      table.text('feedback');
      table.string('delivery_mode', 120);
      table.string('experience', 200);
      table.timestamp('submitted_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_reviews_course_id_idx');
      table.index(['submitted_at'], 'course_reviews_submitted_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_reviews');
  }

  const hasRefresherLessons = await knex.schema.hasTable('course_refresher_lessons');
  if (!hasRefresherLessons) {
    await knex.schema.createTable('course_refresher_lessons', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('format', 120).notNullable().defaultTo('Live session');
      table.string('cadence', 120);
      table.string('owner', 120);
      table.string('status', 120).notNullable().defaultTo('Scheduled');
      table.timestamp('next_session_at');
      table.string('channel', 200);
      table.string('enrollment_window', 200);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_refresher_lessons_course_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_refresher_lessons');
  }

  const hasRecordedAssets = await knex.schema.hasTable('course_recorded_assets');
  if (!hasRecordedAssets) {
    await knex.schema.createTable('course_recorded_assets', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table
        .integer('asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table.string('title', 200).notNullable();
      table.string('format', 120).notNullable().defaultTo('Video');
      table.string('status', 120).notNullable().defaultTo('Draft');
      table.integer('duration_minutes').unsigned().notNullable().defaultTo(0);
      table.integer('size_mb').unsigned();
      table.string('quality', 120);
      table.string('language', 120);
      table.string('aspect_ratio', 40);
      table.decimal('engagement_completion_rate', 5, 2);
      table.json('tags').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.string('audience', 120);
      table.timestamp('updated_at_source');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_recorded_assets_course_idx');
      table.index(['status'], 'course_recorded_assets_status_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_recorded_assets');
  }

  const hasCatalogueListings = await knex.schema.hasTable('course_catalogue_listings');
  if (!hasCatalogueListings) {
    await knex.schema.createTable('course_catalogue_listings', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('channel', 200).notNullable();
      table.string('status', 120).notNullable().defaultTo('Draft');
      table.integer('impressions').unsigned().notNullable().defaultTo(0);
      table.integer('conversions').unsigned().notNullable().defaultTo(0);
      table.decimal('conversion_rate', 7, 4).notNullable().defaultTo(0);
      table.integer('price_amount').unsigned().notNullable().defaultTo(0);
      table.string('price_currency', 3).notNullable().defaultTo('USD');
      table.timestamp('last_synced_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_catalogue_listings_course_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_catalogue_listings');
  }

  const hasDripSequences = await knex.schema.hasTable('course_drip_sequences');
  if (!hasDripSequences) {
    await knex.schema.createTable('course_drip_sequences', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('cadence', 120).notNullable().defaultTo('Weekly');
      table.string('anchor', 120).notNullable().defaultTo('enrollment');
      table.string('timezone', 120).notNullable().defaultTo('UTC');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_drip_sequences_course_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_drip_sequences');
  }

  const hasDripSegments = await knex.schema.hasTable('course_drip_segments');
  if (!hasDripSegments) {
    await knex.schema.createTable('course_drip_segments', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('sequence_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_drip_sequences')
        .onDelete('CASCADE');
      table.string('label', 200).notNullable();
      table.string('audience', 200);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['sequence_id'], 'course_drip_segments_sequence_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_drip_segments');
  }

  const hasDripSchedules = await knex.schema.hasTable('course_drip_schedules');
  if (!hasDripSchedules) {
    await knex.schema.createTable('course_drip_schedules', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('sequence_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_drip_sequences')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('release_label', 200);
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.integer('offset_days').notNullable().defaultTo(0);
      table.string('gating', 200);
      table.json('prerequisites').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.json('notifications').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.string('workspace', 200);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['sequence_id'], 'course_drip_schedules_sequence_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_drip_schedules');
  }

  const hasMobileExperiences = await knex.schema.hasTable('course_mobile_experiences');
  if (!hasMobileExperiences) {
    await knex.schema.createTable('course_mobile_experiences', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('experience_type', 120).notNullable();
      table.string('status', 120).notNullable().defaultTo('Pending review');
      table.string('description', 300);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.index(['course_id'], 'course_mobile_experiences_course_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_mobile_experiences');
  }
}

export async function down(knex) {
  const tables = [
    'course_mobile_experiences',
    'course_drip_schedules',
    'course_drip_segments',
    'course_drip_sequences',
    'course_catalogue_listings',
    'course_recorded_assets',
    'course_refresher_lessons',
    'course_reviews',
    'course_launch_signals',
    'course_launch_checklist_items',
    'course_launches',
    'course_blueprint_modules',
    'course_blueprints'
  ];

  for (const table of tables) {
    // eslint-disable-next-line no-await-in-loop
    await knex.schema.dropTableIfExists(table);
  }
}
