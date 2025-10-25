import { jsonDefault } from './_helpers/utils.js';
import { updatedAtDefault } from './_helpers/tableDefaults.js';

const BILLING_INTERVALS = ['monthly', 'quarterly', 'annual', 'lifetime'];
const SUBSCRIPTION_STATUSES = ['incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired'];
const AFFILIATE_STATUSES = ['pending', 'approved', 'suspended', 'revoked'];
const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed'];

export async function up(knex) {
  const hasAffiliatesTable = await knex.schema.hasTable('community_affiliates');
  if (!hasAffiliatesTable) {
    await knex.schema.createTable('community_affiliates', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('status', AFFILIATE_STATUSES).notNullable().defaultTo('pending');
      table.string('referral_code', 60).notNullable();
      table.integer('commission_rate_bps').unsigned().notNullable().defaultTo(250);
      table.integer('total_earned_cents').unsigned().notNullable().defaultTo(0);
      table.integer('total_paid_cents').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('approved_at');
      table.timestamp('suspended_at');
      table.timestamp('revoked_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.unique(['community_id', 'user_id']);
      table.unique(['referral_code']);
      table.index(['community_id', 'status']);
    });
  }

  const hasRolesTable = await knex.schema.hasTable('community_role_definitions');
  if (!hasRolesTable) {
    await knex.schema.createTable('community_role_definitions', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table.string('role_key', 60).notNullable();
      table.string('name', 120).notNullable();
      table.string('description', 500);
      table.json('permissions').notNullable().defaultTo(jsonDefault(knex, {}));
      table.boolean('is_default_assignable').notNullable().defaultTo(true);
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.unique(['community_id', 'role_key']);
      table.index(['community_id', 'is_default_assignable'], 'community_role_assignable_idx');
    });
  }

  const hasPaywallTierTable = await knex.schema.hasTable('community_paywall_tiers');
  if (!hasPaywallTierTable) {
    await knex.schema.createTable('community_paywall_tiers', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table.string('slug', 80).notNullable();
      table.string('name', 150).notNullable();
      table.string('description', 1000);
      table.integer('price_cents').unsigned().notNullable();
      table.string('currency', 3).notNullable();
      table.enum('billing_interval', BILLING_INTERVALS).notNullable().defaultTo('monthly');
      table.integer('trial_period_days').unsigned().notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.json('benefits').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.string('stripe_price_id', 120);
      table.string('paypal_plan_id', 120);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.unique(['community_id', 'slug']);
      table.index(['community_id', 'is_active']);
    });
  }

  const hasSubscriptionsTable = await knex.schema.hasTable('community_subscriptions');
  if (!hasSubscriptionsTable) {
    await knex.schema.createTable('community_subscriptions', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().defaultTo(knex.raw('(UUID())'));
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('tier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_paywall_tiers')
        .onDelete('CASCADE');
      table.enum('status', SUBSCRIPTION_STATUSES).notNullable().defaultTo('incomplete');
      table.timestamp('started_at');
      table.timestamp('current_period_start');
      table.timestamp('current_period_end');
      table.boolean('cancel_at_period_end').notNullable().defaultTo(false);
      table.timestamp('canceled_at');
      table.timestamp('expires_at');
      table.enum('provider', ['stripe', 'paypal']).notNullable();
      table.string('provider_customer_id', 120);
      table.string('provider_subscription_id', 120);
      table.string('provider_status', 60);
      table
        .integer('latest_payment_intent_id')
        .unsigned()
        .references('id')
        .inTable('payment_intents')
        .onDelete('SET NULL');
      table
        .integer('affiliate_id')
        .unsigned()
        .references('id')
        .inTable('community_affiliates')
        .onDelete('SET NULL');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.unique(['public_id']);
      table.index(['community_id', 'status']);
      table.index(['user_id', 'status']);
    });
  }

  const hasPayoutsTable = await knex.schema.hasTable('community_affiliate_payouts');
  if (!hasPayoutsTable) {
    await knex.schema.createTable('community_affiliate_payouts', (table) => {
      table.increments('id').primary();
      table
        .integer('affiliate_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_affiliates')
        .onDelete('CASCADE');
      table.integer('amount_cents').unsigned().notNullable();
      table.enum('status', PAYOUT_STATUSES).notNullable().defaultTo('pending');
      table.string('payout_reference', 120);
      table.timestamp('scheduled_at');
      table.timestamp('processed_at');
      table.string('failure_reason', 500);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.index(['affiliate_id', 'status']);
    });
  }

  const hasMemberMetadata = await knex.schema.hasColumn('community_members', 'metadata');
  if (!hasMemberMetadata) {
    await knex.schema.table('community_members', (table) => {
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    });
  }

  await knex.schema.alterTable('community_members', (table) => {
    table.string('role', 60).notNullable().defaultTo('member').alter();
    table.enum('status', ['active', 'pending', 'banned', 'suspended']).notNullable().defaultTo('active').alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('community_members', (table) => {
    table.enum('role', ['owner', 'admin', 'moderator', 'member']).notNullable().defaultTo('member').alter();
    table.enum('status', ['active', 'pending', 'banned']).notNullable().defaultTo('active').alter();
    table.dropColumn('metadata');
  });
  await knex.schema.dropTableIfExists('community_affiliate_payouts');
  await knex.schema.dropTableIfExists('community_subscriptions');
  await knex.schema.dropTableIfExists('community_paywall_tiers');
  await knex.schema.dropTableIfExists('community_role_definitions');
  await knex.schema.dropTableIfExists('community_affiliates');
}
