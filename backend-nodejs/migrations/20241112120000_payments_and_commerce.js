exports.up = async function up(knex) {
  const hasCoupons = await knex.schema.hasTable('commerce_coupons');
  if (!hasCoupons) {
    await knex.schema.createTable('commerce_coupons', (table) => {
      table.increments('id').primary();
      table.string('code', 48).notNullable().unique();
      table
        .enum('discount_type', ['percentage', 'fixed'])
        .notNullable()
        .defaultTo('percentage');
      table.decimal('discount_value', 10, 2).notNullable();
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.integer('max_redemptions').unsigned().nullable();
      table.integer('redemption_count').unsigned().notNullable().defaultTo(0);
      table.timestamp('valid_from').notNullable();
      table.timestamp('valid_until').nullable();
      table.boolean('stackable').notNullable().defaultTo(false);
      table
        .enum('status', ['active', 'expired', 'archived'])
        .notNullable()
        .defaultTo('active');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status', 'valid_until']);
    });
  }

  const hasTaxRates = await knex.schema.hasTable('commerce_tax_rates');
  if (!hasTaxRates) {
    await knex.schema.createTable('commerce_tax_rates', (table) => {
      table.increments('id').primary();
      table.string('country_code', 2).notNullable();
      table.string('region_code', 10).nullable();
      table.decimal('rate_percentage', 5, 2).notNullable();
      table.string('label', 120).notNullable();
      table.boolean('is_default').notNullable().defaultTo(false);
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('effective_from').notNullable().defaultTo(knex.fn.now());
      table.timestamp('effective_until').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['country_code', 'region_code']);
      table.index(['is_default']);
    });
  }

  const hasOrders = await knex.schema.hasTable('payment_orders');
  if (!hasOrders) {
    await knex.schema.createTable('payment_orders', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('order_number', 40).notNullable().unique();
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.decimal('subtotal_amount', 12, 2).notNullable();
      table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('total_amount', 12, 2).notNullable();
      table
        .enum('status', [
          'draft',
          'awaiting_payment',
          'requires_action',
          'processing',
          'completed',
          'cancelled',
          'refunded'
        ])
        .notNullable()
        .defaultTo('awaiting_payment');
      table
        .enum('payment_provider', ['stripe', 'paypal'])
        .notNullable();
      table.string('provider_intent_id', 120).nullable();
      table.string('provider_client_secret', 200).nullable();
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.string('billing_email', 255).nullable();
      table.string('billing_country', 2).nullable();
      table.string('billing_region', 32).nullable();
      table
        .integer('applied_coupon_id')
        .unsigned()
        .references('id')
        .inTable('commerce_coupons')
        .onDelete('SET NULL');
      table
        .integer('applied_tax_rate_id')
        .unsigned()
        .references('id')
        .inTable('commerce_tax_rates')
        .onDelete('SET NULL');
      table.timestamp('expires_at').nullable();
      table.timestamp('paid_at').nullable();
      table.timestamp('cancelled_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id', 'status']);
      table.index(['payment_provider', 'provider_intent_id']);
    });
  }

  const hasOrderItems = await knex.schema.hasTable('payment_order_items');
  if (!hasOrderItems) {
    await knex.schema.createTable('payment_order_items', (table) => {
      table.increments('id').primary();
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_orders')
        .onDelete('CASCADE');
      table.string('item_type', 60).notNullable();
      table.string('item_id', 60).nullable();
      table.string('name', 255).notNullable();
      table.integer('quantity').unsigned().notNullable().defaultTo(1);
      table.decimal('unit_amount', 12, 2).notNullable();
      table.decimal('total_amount', 12, 2).notNullable();
      table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['order_id']);
    });
  }

  const hasTransactions = await knex.schema.hasTable('payment_transactions');
  if (!hasTransactions) {
    await knex.schema.createTable('payment_transactions', (table) => {
      table.increments('id').primary();
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_orders')
        .onDelete('CASCADE');
      table
        .enum('transaction_type', ['authorization', 'capture', 'refund'])
        .notNullable()
        .defaultTo('authorization');
      table
        .enum('status', ['pending', 'requires_action', 'succeeded', 'cancelled', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.string('payment_provider', 16).notNullable();
      table.string('provider_transaction_id', 160).nullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).notNullable();
      table.string('payment_method_type', 64).nullable();
      table.json('response_snapshot').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('processed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['order_id', 'status']);
    });
  }

  const hasRefunds = await knex.schema.hasTable('payment_refunds');
  if (!hasRefunds) {
    await knex.schema.createTable('payment_refunds', (table) => {
      table.increments('id').primary();
      table
        .integer('transaction_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_transactions')
        .onDelete('CASCADE');
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).notNullable();
      table
        .enum('status', ['pending', 'processing', 'succeeded', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.string('reason', 120).nullable();
      table.string('provider_refund_id', 160).nullable();
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table
        .integer('requested_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('requested_at').defaultTo(knex.fn.now());
      table.timestamp('processed_at').nullable();
      table.index(['status']);
    });
  }

  const hasPaymentAudits = await knex.schema.hasTable('payment_audit_logs');
  if (!hasPaymentAudits) {
    await knex.schema.createTable('payment_audit_logs', (table) => {
      table.increments('id').primary();
      table.string('event_type', 80).notNullable();
      table
        .integer('order_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('payment_orders')
        .onDelete('CASCADE');
      table
        .integer('transaction_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('payment_transactions')
        .onDelete('CASCADE');
      table.json('payload').notNullable().defaultTo(JSON.stringify({}));
      table
        .integer('performed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['event_type']);
      table.index(['order_id']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('payment_audit_logs');
  await knex.schema.dropTableIfExists('payment_refunds');
  await knex.schema.dropTableIfExists('payment_transactions');
  await knex.schema.dropTableIfExists('payment_order_items');
  await knex.schema.dropTableIfExists('payment_orders');
  await knex.schema.dropTableIfExists('commerce_tax_rates');
  await knex.schema.dropTableIfExists('commerce_coupons');
};
