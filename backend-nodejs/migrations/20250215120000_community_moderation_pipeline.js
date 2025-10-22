import { jsonDefault } from './_helpers/utils.js';
const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});

export async function up(knex) {
  const hasModerationState = await knex.schema.hasColumn('community_posts', 'moderation_state');
  if (!hasModerationState) {
    await knex.schema.alterTable('community_posts', (table) => {
      table
        .enum('moderation_state', ['clean', 'pending', 'under_review', 'escalated', 'rejected', 'suppressed'])
        .notNullable()
        .defaultTo('clean');
      table.json('moderation_metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('last_moderated_at');
      table.index(['community_id', 'moderation_state'], 'community_posts_moderation_idx');
    });
  }

  const hasCases = await knex.schema.hasTable('community_post_moderation_cases');
  if (!hasCases) {
    await knex.schema.createTable('community_post_moderation_cases', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique().defaultTo(knex.raw('(UUID())'));
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE');
      table
        .integer('reporter_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .integer('assigned_to')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .enum('status', ['pending', 'in_review', 'escalated', 'approved', 'rejected', 'suppressed'])
        .notNullable()
        .defaultTo('pending');
      table
        .enum('severity', ['low', 'medium', 'high', 'critical'])
        .notNullable()
        .defaultTo('low');
      table
        .enum('flagged_source', ['user_report', 'automated_detection', 'ai_assistant', 'external_signal', 'manual_audit'])
        .notNullable()
        .defaultTo('user_report');
      table.string('reason', 500).notNullable();
      table.integer('risk_score').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('escalated_at');
      table.timestamp('resolved_at');
      table
        .integer('resolved_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id', 'status']);
      table.index(['post_id']);
      table.index(['severity']);
      table.index(['risk_score']);
      table.index(['created_at']);
    });
  }

  const hasActions = await knex.schema.hasTable('community_post_moderation_actions');
  if (!hasActions) {
    await knex.schema.createTable('community_post_moderation_actions', (table) => {
      table.increments('id').primary();
      table
        .integer('case_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_post_moderation_cases')
        .onDelete('CASCADE');
      table
        .integer('actor_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .enum('action', ['flagged', 'updated', 'assigned', 'escalated', 'approved', 'rejected', 'suppressed', 'restored', 'comment'])
        .notNullable();
      table.string('notes', 1000);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['case_id']);
      table.index(['action']);
    });
  }

  const hasScamReports = await knex.schema.hasTable('scam_reports');
  if (!hasScamReports) {
    await knex.schema.createTable('scam_reports', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique().defaultTo(knex.raw('(UUID())'));
      table
        .integer('reporter_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .enum('entity_type', ['user', 'community_post', 'community', 'project', 'payment', 'message'])
        .notNullable();
      table.string('entity_id', 120).notNullable();
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('SET NULL');
      table
        .enum('status', ['pending', 'investigating', 'confirmed', 'dismissed'])
        .notNullable()
        .defaultTo('pending');
      table.integer('risk_score').unsigned().notNullable().defaultTo(0);
      table.string('reason', 500).notNullable();
      table.text('description');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table
        .integer('handled_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['entity_type', 'entity_id']);
      table.index(['community_id']);
      table.index(['status']);
      table.index(['risk_score']);
      table.index(['created_at']);
    });
  }

  const hasAnalytics = await knex.schema.hasTable('moderation_analytics_events');
  if (!hasAnalytics) {
    await knex.schema.createTable('moderation_analytics_events', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('SET NULL');
      table.string('entity_type', 120).notNullable();
      table.string('entity_id', 120).notNullable();
      table.string('event_type', 160).notNullable();
      table.integer('risk_score').unsigned();
      table.json('metrics').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.string('source', 120).notNullable().defaultTo('manual');
      table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('ingested_at').notNullable().defaultTo(knex.fn.now());
      table.index(['community_id', 'event_type']);
      table.index(['event_type']);
      table.index(['occurred_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('moderation_analytics_events');
  await knex.schema.dropTableIfExists('scam_reports');
  await knex.schema.dropTableIfExists('community_post_moderation_actions');
  await knex.schema.dropTableIfExists('community_post_moderation_cases');

  const hasModerationState = await knex.schema.hasColumn('community_posts', 'moderation_state');
  if (hasModerationState) {
    await knex.schema.alterTable('community_posts', (table) => {
      table.dropIndex(['community_id', 'moderation_state'], 'community_posts_moderation_idx');
      table.dropColumn('moderation_state');
      table.dropColumn('moderation_metadata');
      table.dropColumn('last_moderated_at');
    });
  }
}
