const GROWTH_STATUSES = ['planning', 'active', 'paused', 'completed'];
const EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'archived'];
const AFFILIATE_CHANNEL_STATUSES = ['draft', 'active', 'paused', 'retired'];
const PAYOUT_STATUSES = ['scheduled', 'processing', 'paid', 'failed'];
const AD_CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'];
const APPLICATION_STATUSES = ['draft', 'submitted', 'interview', 'approved', 'rejected'];

export async function up(knex) {
  const hasFinancialProfiles = await knex.schema.hasTable('learner_financial_profiles');
  if (!hasFinancialProfiles) {
    await knex.schema.createTable('learner_financial_profiles', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.boolean('auto_pay_enabled').notNullable().defaultTo(false);
      table.integer('reserve_target_cents').unsigned().notNullable().defaultTo(0);
      table.json('preferences').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id']);
    });
  }

  const hasPaymentMethods = await knex.schema.hasTable('learner_payment_methods');
  if (!hasPaymentMethods) {
    await knex.schema.createTable('learner_payment_methods', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('label', 120).notNullable();
      table.string('brand', 60).notNullable();
      table.string('last4', 4).notNullable();
      table.string('expiry', 10).notNullable();
      table.boolean('is_primary').notNullable().defaultTo(false);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'label']);
      table.index(['user_id', 'is_primary'], 'learner_payment_methods_user_primary_idx');
    });
  }

  const hasBillingContacts = await knex.schema.hasTable('learner_billing_contacts');
  if (!hasBillingContacts) {
    await knex.schema.createTable('learner_billing_contacts', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 150).notNullable();
      table.string('email', 180).notNullable();
      table.string('phone', 60);
      table.string('company', 150);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'email']);
      table.index(['user_id'], 'learner_billing_contacts_user_idx');
    });
  }

  const hasGrowthInitiatives = await knex.schema.hasTable('learner_growth_initiatives');
  if (!hasGrowthInitiatives) {
    await knex.schema.createTable('learner_growth_initiatives', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('slug', 120).notNullable();
      table.string('title', 180).notNullable();
      table.enum('status', GROWTH_STATUSES).notNullable().defaultTo('planning');
      table.text('objective');
      table.string('primary_metric', 120);
      table.decimal('baseline_value', 10, 2);
      table.decimal('target_value', 10, 2);
      table.decimal('current_value', 10, 2);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table.json('tags').notNullable().defaultTo('[]');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'slug']);
      table.index(['user_id', 'status'], 'learner_growth_initiatives_status_idx');
    });
  }

  const hasGrowthExperiments = await knex.schema.hasTable('learner_growth_experiments');
  if (!hasGrowthExperiments) {
    await knex.schema.createTable('learner_growth_experiments', (table) => {
      table.increments('id').primary();
      table
        .integer('initiative_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('learner_growth_initiatives')
        .onDelete('CASCADE');
      table.string('name', 180).notNullable();
      table.enum('status', EXPERIMENT_STATUSES).notNullable().defaultTo('draft');
      table.text('hypothesis');
      table.string('metric', 120);
      table.decimal('baseline_value', 10, 2);
      table.decimal('target_value', 10, 2);
      table.decimal('result_value', 10, 2);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table.json('segments').notNullable().defaultTo('[]');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['initiative_id', 'status'], 'learner_growth_experiments_status_idx');
    });
  }

  const hasAffiliateChannels = await knex.schema.hasTable('learner_affiliate_channels');
  if (!hasAffiliateChannels) {
    await knex.schema.createTable('learner_affiliate_channels', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('platform', 80).notNullable();
      table.string('handle', 120);
      table.string('referral_code', 80).notNullable();
      table.string('tracking_url', 500);
      table.enum('status', AFFILIATE_CHANNEL_STATUSES).notNullable().defaultTo('draft');
      table.integer('commission_rate_bps').unsigned().notNullable().defaultTo(250);
      table.integer('total_earnings_cents').unsigned().notNullable().defaultTo(0);
      table.integer('total_paid_cents').unsigned().notNullable().defaultTo(0);
      table.json('notes').notNullable().defaultTo('[]');
      table.json('performance').notNullable().defaultTo('{}');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'referral_code']);
      table.index(['user_id', 'status'], 'learner_affiliate_channels_status_idx');
    });
  }

  const hasAffiliatePayouts = await knex.schema.hasTable('learner_affiliate_payouts');
  if (!hasAffiliatePayouts) {
    await knex.schema.createTable('learner_affiliate_payouts', (table) => {
      table.increments('id').primary();
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('learner_affiliate_channels')
        .onDelete('CASCADE');
      table.integer('amount_cents').unsigned().notNullable();
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.enum('status', PAYOUT_STATUSES).notNullable().defaultTo('scheduled');
      table.timestamp('scheduled_at');
      table.timestamp('processed_at');
      table.string('reference', 120);
      table.string('note', 500);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['channel_id', 'status'], 'learner_affiliate_payouts_status_idx');
    });
  }

  const hasLearnerAds = await knex.schema.hasTable('learner_ad_campaigns');
  if (!hasLearnerAds) {
    await knex.schema.createTable('learner_ad_campaigns', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 180).notNullable();
      table.enum('status', AD_CAMPAIGN_STATUSES).notNullable().defaultTo('draft');
      table.string('objective', 180);
      table.integer('daily_budget_cents').unsigned().notNullable().defaultTo(0);
      table.integer('total_spend_cents').unsigned().notNullable().defaultTo(0);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table.timestamp('last_synced_at');
      table.json('metrics').notNullable().defaultTo('{}');
      table.json('targeting').notNullable().defaultTo('{}');
      table.json('creative').notNullable().defaultTo('{}');
      table.json('placements').notNullable().defaultTo('[]');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id', 'status'], 'learner_ad_campaigns_status_idx');
    });
  }

  const hasInstructorApplications = await knex.schema.hasTable('instructor_applications');
  if (!hasInstructorApplications) {
    await knex.schema.createTable('instructor_applications', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('status', APPLICATION_STATUSES).notNullable().defaultTo('draft');
      table.string('stage', 120).notNullable().defaultTo('intake');
      table.text('motivation');
      table.string('portfolio_url', 500);
      table.integer('experience_years').unsigned().notNullable().defaultTo(0);
      table.json('teaching_focus').notNullable().defaultTo('[]');
      table.json('availability').notNullable().defaultTo('{}');
      table.json('marketing_assets').notNullable().defaultTo('[]');
      table.timestamp('submitted_at');
      table.timestamp('reviewed_at');
      table.text('decision_note');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id']);
      table.index(['status'], 'instructor_applications_status_idx');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('instructor_applications');
  await knex.schema.dropTableIfExists('learner_ad_campaigns');
  await knex.schema.dropTableIfExists('learner_affiliate_payouts');
  await knex.schema.dropTableIfExists('learner_affiliate_channels');
  await knex.schema.dropTableIfExists('learner_growth_experiments');
  await knex.schema.dropTableIfExists('learner_growth_initiatives');
  await knex.schema.dropTableIfExists('learner_billing_contacts');
  await knex.schema.dropTableIfExists('learner_payment_methods');
  await knex.schema.dropTableIfExists('learner_financial_profiles');
}
