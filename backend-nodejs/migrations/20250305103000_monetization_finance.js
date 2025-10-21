import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const CATALOG_TABLE = 'monetization_catalog_items';
const USAGE_TABLE = 'monetization_usage_records';
const SCHEDULE_TABLE = 'monetization_revenue_schedules';
const RECON_TABLE = 'monetization_reconciliation_runs';

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const catalogExists = await trx.schema.hasTable(CATALOG_TABLE);
    if (!catalogExists) {
      await trx.schema.createTable(CATALOG_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table.string('tenant_id', 64).notNullable().defaultTo('global');
        table.string('product_code', 80).notNullable();
        table.string('name', 160).notNullable();
        table.text('description');
        table
          .enum('pricing_model', ['flat_fee', 'per_unit', 'tiered', 'package'])
          .notNullable()
          .defaultTo('flat_fee');
        table
          .enum('billing_interval', ['one_time', 'monthly', 'quarterly', 'annual', 'usage'])
          .notNullable()
          .defaultTo('monthly');
        table
          .enum('revenue_recognition_method', ['immediate', 'deferred', 'schedule'])
          .notNullable()
          .defaultTo('immediate');
        table.integer('recognition_duration_days').unsigned().defaultTo(0);
        table.bigInteger('unit_amount_cents').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('GBP');
        table.string('usage_metric', 120);
        table.string('revenue_account', 120).notNullable().defaultTo('4000-education-services');
        table.string('deferred_revenue_account', 120).notNullable().defaultTo('2050-deferred-revenue');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table
          .enum('status', ['draft', 'active', 'retired'])
          .notNullable()
          .defaultTo('active');
        table.timestamp('effective_from').notNullable().defaultTo(trx.fn.now());
        table.timestamp('effective_to');
        addTimestamps(table, trx);
        table.timestamp('retired_at');

        table.unique(['tenant_id', 'product_code'], 'monetization_catalog_tenant_code_unique');
        table.index(['tenant_id', 'status'], 'monetization_catalog_tenant_status_idx');
        table.index(['tenant_id', 'billing_interval'], 'monetization_catalog_interval_idx');
      });

      await addCheckConstraint(
        trx,
        CATALOG_TABLE,
        'monetization_catalog_amount_positive_chk',
        'unit_amount_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        CATALOG_TABLE,
        'monetization_catalog_recognition_duration_chk',
        'recognition_duration_days >= 0'
      );
      await ensureUpdatedAtTrigger(trx, CATALOG_TABLE);
    }

    const usageExists = await trx.schema.hasTable(USAGE_TABLE);
    if (!usageExists) {
      await trx.schema.createTable(USAGE_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table.string('tenant_id', 64).notNullable().defaultTo('global');
        table
          .integer('catalog_item_id')
          .unsigned()
          .references('id')
          .inTable(CATALOG_TABLE)
          .onDelete('SET NULL');
        table.string('product_code', 80).notNullable();
        table.string('account_reference', 120).notNullable();
        table
          .integer('user_id')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table.timestamp('usage_date').notNullable().defaultTo(trx.fn.now());
        table.decimal('quantity', 14, 4).notNullable().defaultTo(0);
        table.bigInteger('unit_amount_cents').unsigned().notNullable().defaultTo(0);
        table.bigInteger('amount_cents').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('GBP');
        table.string('source', 80).notNullable().defaultTo('manual');
        table.string('external_reference', 120);
        table
          .integer('payment_intent_id')
          .unsigned()
          .references('id')
          .inTable('payment_intents')
          .onDelete('SET NULL');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.timestamp('recorded_at').notNullable().defaultTo(trx.fn.now());
        table.timestamp('processed_at');
        addTimestamps(table, trx);

        table.index(['tenant_id', 'product_code', 'usage_date'], 'monetization_usage_tenant_product_date_idx');
        table.index(['tenant_id', 'external_reference'], 'monetization_usage_external_idx');
        table.index(['tenant_id', 'processed_at'], 'monetization_usage_processed_idx');
      });

      await addCheckConstraint(trx, USAGE_TABLE, 'monetization_usage_quantity_chk', 'quantity >= 0');
      await addCheckConstraint(
        trx,
        USAGE_TABLE,
        'monetization_usage_unit_amount_chk',
        'unit_amount_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        USAGE_TABLE,
        'monetization_usage_amount_chk',
        'amount_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, USAGE_TABLE);
    }

    const scheduleExists = await trx.schema.hasTable(SCHEDULE_TABLE);
    if (!scheduleExists) {
      await trx.schema.createTable(SCHEDULE_TABLE, (table) => {
        table.increments('id').primary();
        table.string('tenant_id', 64).notNullable().defaultTo('global');
        table
          .integer('payment_intent_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('payment_intents')
          .onDelete('CASCADE');
        table
          .integer('catalog_item_id')
          .unsigned()
          .references('id')
          .inTable(CATALOG_TABLE)
          .onDelete('SET NULL');
        table
          .integer('usage_record_id')
          .unsigned()
          .references('id')
          .inTable(USAGE_TABLE)
          .onDelete('SET NULL');
        table.string('product_code', 80);
        table
          .enum('status', ['pending', 'in_progress', 'recognized'])
          .notNullable()
          .defaultTo('pending');
        table
          .enum('recognition_method', ['immediate', 'deferred', 'schedule'])
          .notNullable()
          .defaultTo('immediate');
        table.timestamp('recognition_start').notNullable().defaultTo(trx.fn.now());
        table.timestamp('recognition_end').notNullable().defaultTo(trx.fn.now());
        table.bigInteger('amount_cents').unsigned().notNullable().defaultTo(0);
        table.bigInteger('recognized_amount_cents').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('GBP');
        table.string('revenue_account', 120).notNullable().defaultTo('4000-education-services');
        table.string('deferred_revenue_account', 120).notNullable().defaultTo('2050-deferred-revenue');
        table.timestamp('recognized_at');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['tenant_id', 'status'], 'monetization_schedule_status_idx');
        table.index(['tenant_id', 'recognition_end'], 'monetization_schedule_recognition_idx');
        table.index(['tenant_id', 'payment_intent_id'], 'monetization_schedule_payment_idx');
      });

      await addCheckConstraint(
        trx,
        SCHEDULE_TABLE,
        'monetization_schedule_amount_chk',
        'amount_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        SCHEDULE_TABLE,
        'monetization_schedule_recognized_amount_chk',
        'recognized_amount_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        SCHEDULE_TABLE,
        'monetization_schedule_recognized_lte_amount_chk',
        'recognized_amount_cents <= amount_cents'
      );
      await addCheckConstraint(
        trx,
        SCHEDULE_TABLE,
        'monetization_schedule_recognition_window_chk',
        'recognition_end >= recognition_start'
      );
      await ensureUpdatedAtTrigger(trx, SCHEDULE_TABLE);
    }

    const reconExists = await trx.schema.hasTable(RECON_TABLE);
    if (!reconExists) {
      await trx.schema.createTable(RECON_TABLE, (table) => {
        table.increments('id').primary();
        table.string('tenant_id', 64).notNullable().defaultTo('global');
        table.timestamp('window_start').notNullable();
        table.timestamp('window_end').notNullable();
        table
          .enum('status', ['completed', 'partial', 'failed'])
          .notNullable()
          .defaultTo('completed');
        table.bigInteger('invoiced_cents').notNullable().defaultTo(0);
        table.bigInteger('usage_cents').notNullable().defaultTo(0);
        table.bigInteger('recognized_cents').notNullable().defaultTo(0);
        table.bigInteger('deferred_cents').notNullable().defaultTo(0);
        table.bigInteger('variance_cents').notNullable().defaultTo(0);
        table.decimal('variance_ratio', 8, 4).notNullable().defaultTo(0);
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['tenant_id', 'created_at'], 'monetization_recon_created_idx');
        table.unique(['tenant_id', 'window_start', 'window_end'], 'monetization_recon_window_unique');
      });

      await addCheckConstraint(
        trx,
        RECON_TABLE,
        'monetization_recon_window_chk',
        'window_end >= window_start'
      );
      await addCheckConstraint(
        trx,
        RECON_TABLE,
        'monetization_recon_invoiced_chk',
        'invoiced_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        RECON_TABLE,
        'monetization_recon_usage_chk',
        'usage_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        RECON_TABLE,
        'monetization_recon_recognized_chk',
        'recognized_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        RECON_TABLE,
        'monetization_recon_deferred_chk',
        'deferred_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, RECON_TABLE);
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists(RECON_TABLE);
    await trx.schema.dropTableIfExists(SCHEDULE_TABLE);
    await trx.schema.dropTableIfExists(USAGE_TABLE);
    await trx.schema.dropTableIfExists(CATALOG_TABLE);
  });
}

