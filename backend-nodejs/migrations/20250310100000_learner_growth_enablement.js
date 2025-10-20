const GROWTH_STATUSES = ['planning', 'active', 'paused', 'completed'];
const EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'archived'];
const AFFILIATE_CHANNEL_STATUSES = ['draft', 'active', 'paused', 'retired'];
const PAYOUT_STATUSES = ['scheduled', 'processing', 'paid', 'failed'];
const AD_CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'];
const APPLICATION_STATUSES = ['draft', 'submitted', 'interview', 'approved', 'rejected'];

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

function jsonDefault(knex, fallback = '{}') {
  if (isPostgres(knex)) {
    return knex.raw('?::jsonb', [fallback]);
  }

  if (isMysql(knex)) {
    return knex.raw('CAST(? AS JSON)', [fallback]);
  }

  return knex.raw('?', [fallback]);
}

async function ensureUpdatedAtTrigger(knex, tableName) {
  if (isMysql(knex)) {
    await knex.raw(
      `ALTER TABLE ?? MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      [tableName]
    );
    return;
  }

  if (isPostgres(knex)) {
    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
          CREATE FUNCTION set_updated_at_timestamp() RETURNS trigger AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END;
      $$;
    `);

    const triggerName = `${tableName}_updated_at_trg`;

    await knex.raw(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = '${triggerName}'
          ) THEN
            CREATE TRIGGER "${triggerName}"
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at_timestamp();
          END IF;
        END;
        $$;
      `
    );
  }
}

function addTimestamps(table, context) {
  table.timestamp('created_at').notNullable().defaultTo(context.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(context.fn.now());
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
    const hasFinancialProfiles = await trx.schema.hasTable('learner_financial_profiles');
    if (!hasFinancialProfiles) {
      await trx.schema.createTable('learner_financial_profiles', (table) => {
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
        table.json('preferences').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id']);
      });

      await addCheckConstraint(
        trx,
        'learner_financial_profiles',
        'learner_financial_profiles_reserve_chk',
        'reserve_target_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_financial_profiles');
    }

    const hasPaymentMethods = await trx.schema.hasTable('learner_payment_methods');
    if (!hasPaymentMethods) {
      await trx.schema.createTable('learner_payment_methods', (table) => {
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
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id', 'label']);
        table.index(['user_id', 'is_primary'], 'learner_payment_methods_user_primary_idx');
      });
      await ensureUpdatedAtTrigger(trx, 'learner_payment_methods');
    }

    const hasBillingContacts = await trx.schema.hasTable('learner_billing_contacts');
    if (!hasBillingContacts) {
      await trx.schema.createTable('learner_billing_contacts', (table) => {
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
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id', 'email']);
        table.index(['user_id'], 'learner_billing_contacts_user_idx');
      });
      await ensureUpdatedAtTrigger(trx, 'learner_billing_contacts');
    }

    const hasGrowthInitiatives = await trx.schema.hasTable('learner_growth_initiatives');
    if (!hasGrowthInitiatives) {
      await trx.schema.createTable('learner_growth_initiatives', (table) => {
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
        table.json('tags').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id', 'slug']);
        table.index(['user_id', 'status'], 'learner_growth_initiatives_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_growth_initiatives',
        'learner_growth_initiatives_metrics_chk',
        'baseline_value IS NULL OR baseline_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_growth_initiatives',
        'learner_growth_initiatives_target_chk',
        'target_value IS NULL OR target_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_growth_initiatives',
        'learner_growth_initiatives_current_chk',
        'current_value IS NULL OR current_value >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_growth_initiatives');
    }

    const hasGrowthExperiments = await trx.schema.hasTable('learner_growth_experiments');
    if (!hasGrowthExperiments) {
      await trx.schema.createTable('learner_growth_experiments', (table) => {
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
        table.json('segments').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['initiative_id', 'status'], 'learner_growth_experiments_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_growth_experiments',
        'learner_growth_experiments_baseline_chk',
        'baseline_value IS NULL OR baseline_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_growth_experiments',
        'learner_growth_experiments_target_chk',
        'target_value IS NULL OR target_value >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_growth_experiments',
        'learner_growth_experiments_result_chk',
        'result_value IS NULL OR result_value >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_growth_experiments');
    }

    const hasAffiliateChannels = await trx.schema.hasTable('learner_affiliate_channels');
    if (!hasAffiliateChannels) {
      await trx.schema.createTable('learner_affiliate_channels', (table) => {
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
        table.json('notes').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('performance').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id', 'referral_code']);
        table.index(['user_id', 'status'], 'learner_affiliate_channels_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_affiliate_channels',
        'learner_affiliate_channels_commission_chk',
        'commission_rate_bps >= 0 AND commission_rate_bps <= 10000'
      );
      await addCheckConstraint(
        trx,
        'learner_affiliate_channels',
        'learner_affiliate_channels_earnings_chk',
        'total_earnings_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_affiliate_channels',
        'learner_affiliate_channels_paid_chk',
        'total_paid_cents >= 0 AND total_paid_cents <= total_earnings_cents'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_affiliate_channels');
    }

    const hasAffiliatePayouts = await trx.schema.hasTable('learner_affiliate_payouts');
    if (!hasAffiliatePayouts) {
      await trx.schema.createTable('learner_affiliate_payouts', (table) => {
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
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['channel_id', 'status'], 'learner_affiliate_payouts_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_affiliate_payouts',
        'learner_affiliate_payouts_amount_chk',
        'amount_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_affiliate_payouts');
    }

    const hasLearnerAds = await trx.schema.hasTable('learner_ad_campaigns');
    if (!hasLearnerAds) {
      await trx.schema.createTable('learner_ad_campaigns', (table) => {
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
        table.json('metrics').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('targeting').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('creative').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('placements').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['user_id', 'status'], 'learner_ad_campaigns_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_ad_campaigns',
        'learner_ad_campaigns_budget_chk',
        'daily_budget_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        'learner_ad_campaigns',
        'learner_ad_campaigns_spend_chk',
        'total_spend_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_ad_campaigns');
    }

    const hasInstructorApplications = await trx.schema.hasTable('instructor_applications');
    if (!hasInstructorApplications) {
      await trx.schema.createTable('instructor_applications', (table) => {
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
        table.json('teaching_focus').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('availability').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('marketing_assets').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.timestamp('submitted_at');
        table.timestamp('reviewed_at');
        table.text('decision_note');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id']);
        table.index(['status'], 'instructor_applications_status_idx');
      });

      await addCheckConstraint(
        trx,
        'instructor_applications',
        'instructor_applications_experience_chk',
        'experience_years >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'instructor_applications');
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('instructor_applications');
    await trx.schema.dropTableIfExists('learner_ad_campaigns');
    await trx.schema.dropTableIfExists('learner_affiliate_payouts');
    await trx.schema.dropTableIfExists('learner_affiliate_channels');
    await trx.schema.dropTableIfExists('learner_growth_experiments');
    await trx.schema.dropTableIfExists('learner_growth_initiatives');
    await trx.schema.dropTableIfExists('learner_billing_contacts');
    await trx.schema.dropTableIfExists('learner_payment_methods');
    await trx.schema.dropTableIfExists('learner_financial_profiles');
  });
}
