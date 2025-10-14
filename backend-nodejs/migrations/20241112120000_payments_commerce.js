export async function up(knex) {
  const hasCoupons = await knex.schema.hasTable('payment_coupons');
  if (!hasCoupons) {
    await knex.schema.createTable('payment_coupons', (table) => {
      table.increments('id').primary();
      table.string('code', 64).notNullable().unique();
      table.string('name', 150).notNullable();
      table.text('description');
      table
        .enum('discount_type', ['percentage', 'fixed_amount'])
        .notNullable()
        .defaultTo('percentage');
      table.integer('discount_value').unsigned().notNullable();
      table.string('currency', 3);
      table.integer('max_redemptions').unsigned();
      table.integer('per_user_limit').unsigned();
      table.integer('times_redeemed').unsigned().notNullable().defaultTo(0);
      table.boolean('is_stackable').notNullable().defaultTo(false);
      table
        .enum('status', ['draft', 'active', 'expired', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.timestamp('valid_from').notNullable();
      table.timestamp('valid_until');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('archived_at');
      table.index(['status']);
      table.index(['valid_from', 'valid_until']);
    });
  }

  const hasIntents = await knex.schema.hasTable('payment_intents');
  if (!hasIntents) {
    await knex.schema.createTable('payment_intents', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.enum('provider', ['stripe', 'paypal']).notNullable();
      table.string('provider_intent_id', 191).notNullable();
      table.string('provider_capture_id', 191);
      table.string('provider_latest_charge_id', 191);
      table
        .enum(
          'status',
          [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'processing',
            'succeeded',
            'canceled',
            'failed',
            'refunded',
            'partially_refunded'
          ]
        )
        .notNullable()
        .defaultTo('requires_payment_method');
      table.string('currency', 3).notNullable();
      table.bigInteger('amount_subtotal').unsigned().notNullable();
      table.bigInteger('amount_discount').unsigned().notNullable().defaultTo(0);
      table.bigInteger('amount_tax').unsigned().notNullable().defaultTo(0);
      table.bigInteger('amount_total').unsigned().notNullable();
      table.bigInteger('amount_refunded').unsigned().notNullable().defaultTo(0);
      table.json('tax_breakdown').notNullable().defaultTo('{}');
      table.json('metadata').notNullable().defaultTo('{}');
      table
        .integer('coupon_id')
        .unsigned()
        .references('id')
        .inTable('payment_coupons')
        .onDelete('SET NULL');
      table.string('entity_type', 60).notNullable();
      table.string('entity_id', 120).notNullable();
      table.string('receipt_email', 191);
      table.timestamp('captured_at');
      table.timestamp('canceled_at');
      table.timestamp('expires_at');
      table.string('failure_code', 60);
      table.string('failure_message', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['provider', 'provider_intent_id']);
      table.index(['status']);
      table.index(['currency']);
      table.index(['user_id', 'status']);
      table.index(['entity_type', 'entity_id']);
    });
  }

  const hasCouponRedemptions = await knex.schema.hasTable('payment_coupon_redemptions');
  if (!hasCouponRedemptions) {
    await knex.schema.createTable('payment_coupon_redemptions', (table) => {
      table.increments('id').primary();
      table
        .integer('coupon_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_coupons')
        .onDelete('CASCADE');
      table
        .integer('payment_intent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_intents')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['coupon_id', 'payment_intent_id']);
      table.index(['coupon_id', 'user_id']);
    });
  }

  const hasRefunds = await knex.schema.hasTable('payment_refunds');
  if (!hasRefunds) {
    await knex.schema.createTable('payment_refunds', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('payment_intent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_intents')
        .onDelete('CASCADE');
      table.string('provider_refund_id', 191).notNullable();
      table
        .enum('status', ['pending', 'succeeded', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.bigInteger('amount').unsigned().notNullable();
      table.string('currency', 3).notNullable();
      table.string('reason', 191);
      table
        .integer('requested_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('processed_at');
      table.string('failure_code', 60);
      table.string('failure_message', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['payment_intent_id', 'provider_refund_id']);
      table.index(['status']);
    });
  }

  const hasLedger = await knex.schema.hasTable('payment_ledger_entries');
  if (!hasLedger) {
    await knex.schema.createTable('payment_ledger_entries', (table) => {
      table.increments('id').primary();
      table
        .integer('payment_intent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_intents')
        .onDelete('CASCADE');
      table.string('entry_type', 60).notNullable();
      table.bigInteger('amount').notNullable();
      table.string('currency', 3).notNullable();
      table.json('details').notNullable().defaultTo('{}');
      table.timestamp('recorded_at').defaultTo(knex.fn.now());
      table.index(['payment_intent_id', 'entry_type']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('payment_ledger_entries');
  await knex.schema.dropTableIfExists('payment_refunds');
  await knex.schema.dropTableIfExists('payment_coupon_redemptions');
  await knex.schema.dropTableIfExists('payment_intents');
  await knex.schema.dropTableIfExists('payment_coupons');
}
