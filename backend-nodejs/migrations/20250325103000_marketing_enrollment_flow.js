import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const PLAN_INTERVALS = ['monthly', 'annual', 'lifetime'];
const INVITE_STATUSES = ['pending', 'accepted', 'expired', 'revoked'];

export async function up(knex) {
  const hasMarketingBlocks = await knex.schema.hasTable('marketing_blocks');
  if (!hasMarketingBlocks) {
    await knex.schema.createTable('marketing_blocks', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique();
      table.string('block_type', 60).notNullable();
      table.string('eyebrow', 160);
      table.string('title', 240).notNullable();
      table.string('subtitle', 480);
      table.string('status_label', 160);
      table.json('chips').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('media').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('primary_cta').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('secondary_cta').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('tertiary_cta').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['block_type'], 'marketing_blocks_block_type_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'marketing_blocks');
  }

  const hasPlanOffers = await knex.schema.hasTable('marketing_plan_offers');
  if (!hasPlanOffers) {
    await knex.schema.createTable('marketing_plan_offers', (table) => {
      table.increments('id').primary();
      table.string('public_id', 80).notNullable().unique();
      table.string('name', 160).notNullable();
      table.string('headline', 240).notNullable();
      table.string('tagline', 320);
      table.integer('price_cents').unsigned().notNullable().defaultTo(0);
      table.string('currency', 3).notNullable().defaultTo('USD');
      table
        .enum('billing_interval', PLAN_INTERVALS, {
          useNative: false,
          enumName: 'marketing_plan_interval_enum'
        })
        .notNullable()
        .defaultTo(PLAN_INTERVALS[0]);
      table.boolean('is_featured').notNullable().defaultTo(false);
      table.json('badge').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('upsell').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['billing_interval', 'is_featured'], 'marketing_plan_offers_interval_featured_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'marketing_plan_offers');
  }

  const hasPlanFeatures = await knex.schema.hasTable('marketing_plan_features');
  if (!hasPlanFeatures) {
    await knex.schema.createTable('marketing_plan_features', (table) => {
      table.increments('id').primary();
      table
        .integer('plan_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('marketing_plan_offers')
        .onDelete('CASCADE');
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.string('label', 320).notNullable();
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['plan_id', 'position'], 'marketing_plan_features_plan_position_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'marketing_plan_features');
  }

  const hasOnboardingInvites = await knex.schema.hasTable('learner_onboarding_invites');
  if (!hasOnboardingInvites) {
    await knex.schema.createTable('learner_onboarding_invites', (table) => {
      table.increments('id').primary();
      table.string('invite_code', 80).notNullable().unique();
      table.string('email', 180).notNullable();
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('SET NULL');
      table
        .enum('status', INVITE_STATUSES, {
          useNative: false,
          enumName: 'learner_onboarding_invite_status_enum'
        })
        .notNullable()
        .defaultTo('pending');
      table.timestamp('expires_at');
      table.timestamp('claimed_at');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['email', 'status'], 'learner_onboarding_invites_email_status_idx');
      table.index(['community_id', 'status'], 'learner_onboarding_invites_community_status_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'learner_onboarding_invites');
  }

  const hasOnboardingResponses = await knex.schema.hasTable('learner_onboarding_responses');
  if (!hasOnboardingResponses) {
    await knex.schema.createTable('learner_onboarding_responses', (table) => {
      table.increments('id').primary();
      table.string('email', 180).notNullable();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('role', 40).notNullable();
      table.string('first_name', 160).notNullable();
      table.string('last_name', 160);
      table.string('persona', 160);
      table.json('goals').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('invites').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('preferences').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.boolean('terms_accepted').notNullable().defaultTo(false);
      table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
      addTimestamps(table, knex);
      table.unique(['email', 'role'], 'learner_onboarding_responses_email_role_unique');
      table.index(['submitted_at'], 'learner_onboarding_responses_submitted_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'learner_onboarding_responses');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('learner_onboarding_responses');
  await knex.schema.dropTableIfExists('learner_onboarding_invites');
  await knex.schema.dropTableIfExists('marketing_plan_features');
  await knex.schema.dropTableIfExists('marketing_plan_offers');
  await knex.schema.dropTableIfExists('marketing_blocks');
}
