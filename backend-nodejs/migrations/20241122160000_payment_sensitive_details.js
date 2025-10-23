import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasCiphertext = await knex.schema.hasColumn('payment_intents', 'sensitive_details_ciphertext');
  if (!hasCiphertext) {
    await knex.schema.alterTable('payment_intents', (table) => {
      table.text('sensitive_details_ciphertext');
      table.string('sensitive_details_hash', 191);
      table.string('classification_tag', 100);
      table.string('encryption_key_version', 50);
      table.index(['sensitive_details_hash'], 'payment_intents_sensitive_hash_idx');
    });
  }

  const hasIntentReceiptMask = await knex.schema.hasColumn('payment_intents', 'receipt_email');
  if (!hasIntentReceiptMask) {
    await knex.schema.alterTable('payment_intents', (table) => {
      table.string('receipt_email', 191);
    });
  }

  const hasRefundCiphertext = await knex.schema.hasColumn('payment_refunds', 'sensitive_details_ciphertext');
  if (!hasRefundCiphertext) {
    await knex.schema.alterTable('payment_refunds', (table) => {
      table.text('sensitive_details_ciphertext');
      table.string('sensitive_details_hash', 191);
      table.string('classification_tag', 100);
      table.string('encryption_key_version', 50);
      table.index(['sensitive_details_hash'], 'payment_refunds_sensitive_hash_idx');
    });
  }

  const hasCouponRedemptions = await knex.schema.hasColumn('payment_coupon_redemptions', 'metadata');
  if (!hasCouponRedemptions) {
    await knex.schema.alterTable('payment_coupon_redemptions', (table) => {
      table
        .json('metadata')
        .notNullable()
        .defaultTo(jsonDefault(knex, {}));
    });
  }
}

export async function down(knex) {
  const hasCiphertext = await knex.schema.hasColumn('payment_intents', 'sensitive_details_ciphertext');
  if (hasCiphertext) {
    await knex.schema.alterTable('payment_intents', (table) => {
      table.dropIndex('sensitive_details_hash', 'payment_intents_sensitive_hash_idx');
      table.dropColumn('sensitive_details_ciphertext');
      table.dropColumn('sensitive_details_hash');
      table.dropColumn('classification_tag');
      table.dropColumn('encryption_key_version');
    });
  }

  const hasRefundCiphertext = await knex.schema.hasColumn('payment_refunds', 'sensitive_details_ciphertext');
  if (hasRefundCiphertext) {
    await knex.schema.alterTable('payment_refunds', (table) => {
      table.dropIndex('sensitive_details_hash', 'payment_refunds_sensitive_hash_idx');
      table.dropColumn('sensitive_details_ciphertext');
      table.dropColumn('sensitive_details_hash');
      table.dropColumn('classification_tag');
      table.dropColumn('encryption_key_version');
    });
  }

  const hasCouponMetadata = await knex.schema.hasColumn('payment_coupon_redemptions', 'metadata');
  if (hasCouponMetadata) {
    await knex.schema.alterTable('payment_coupon_redemptions', (table) => {
      table.dropColumn('metadata');
    });
  }
}
