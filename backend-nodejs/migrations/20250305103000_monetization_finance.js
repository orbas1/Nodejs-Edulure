const CATALOG_TABLE = 'monetization_catalog_items';
const USAGE_TABLE = 'monetization_usage_records';
const SCHEDULE_TABLE = 'monetization_revenue_schedules';
const RECON_TABLE = 'monetization_reconciliation_runs';

export async function up(knex) {
  const hasCatalog = await knex.schema.hasTable(CATALOG_TABLE);
  if (!hasCatalog) {
    await knex.schema.createTable(CATALOG_TABLE, (table) => {
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
      table.json('metadata').notNullable().defaultTo('{}');
      table
        .enum('status', ['draft', 'active', 'retired'])
        .notNullable()
        .defaultTo('active');
      table.timestamp('effective_from').notNullable().defaultTo(knex.fn.now());
      table.timestamp('effective_to');
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('retired_at');

      table.unique(['tenant_id', 'product_code'], 'monetization_catalog_tenant_code_unique');
      table.index(['tenant_id', 'status'], 'monetization_catalog_tenant_status_idx');
      table.index(['tenant_id', 'billing_interval'], 'monetization_catalog_interval_idx');
    });
  }

  const hasUsage = await knex.schema.hasTable(USAGE_TABLE);
  if (!hasUsage) {
    await knex.schema.createTable(USAGE_TABLE, (table) => {
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
      table.timestamp('usage_date').notNullable().defaultTo(knex.fn.now());
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
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at');

      table.index(['tenant_id', 'product_code', 'usage_date'], 'monetization_usage_tenant_product_date_idx');
      table.index(['tenant_id', 'external_reference'], 'monetization_usage_external_idx');
      table.index(['tenant_id', 'processed_at'], 'monetization_usage_processed_idx');
    });
  }

  const hasSchedule = await knex.schema.hasTable(SCHEDULE_TABLE);
  if (!hasSchedule) {
    await knex.schema.createTable(SCHEDULE_TABLE, (table) => {
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
      table.timestamp('recognition_start').notNullable().defaultTo(knex.fn.now());
      table.timestamp('recognition_end').notNullable().defaultTo(knex.fn.now());
      table.bigInteger('amount_cents').unsigned().notNullable().defaultTo(0);
      table.bigInteger('recognized_amount_cents').unsigned().notNullable().defaultTo(0);
      table.string('currency', 3).notNullable().defaultTo('GBP');
      table.string('revenue_account', 120).notNullable().defaultTo('4000-education-services');
      table.string('deferred_revenue_account', 120).notNullable().defaultTo('2050-deferred-revenue');
      table.timestamp('recognized_at');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['tenant_id', 'status'], 'monetization_schedule_status_idx');
      table.index(['tenant_id', 'recognition_end'], 'monetization_schedule_recognition_idx');
      table.index(['tenant_id', 'payment_intent_id'], 'monetization_schedule_payment_idx');
    });
  }

  const hasRecon = await knex.schema.hasTable(RECON_TABLE);
  if (!hasRecon) {
    await knex.schema.createTable(RECON_TABLE, (table) => {
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
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['tenant_id', 'created_at'], 'monetization_recon_created_idx');
      table.unique(['tenant_id', 'window_start', 'window_end'], 'monetization_recon_window_unique');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(RECON_TABLE);
  await knex.schema.dropTableIfExists(SCHEDULE_TABLE);
  await knex.schema.dropTableIfExists(USAGE_TABLE);
  await knex.schema.dropTableIfExists(CATALOG_TABLE);
}

