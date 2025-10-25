const DUPLICATE_PATTERNS = [
  'duplicate column name',
  'already exists',
  'duplicate key name',
  'er_dup_fieldname',
  'er_dup_keyname',
  'er_dup_key'
];

const isDuplicateError = (error) => {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toLowerCase();
  return (
    DUPLICATE_PATTERNS.some((pattern) => message.includes(pattern)) ||
    DUPLICATE_PATTERNS.some((pattern) => code.includes(pattern))
  );
};

async function safeAlterTable(knex, tableName, alterFn) {
  try {
    await knex.schema.alterTable(tableName, alterFn);
  } catch (error) {
    if (isDuplicateError(error)) {
      return;
    }
    throw error;
  }
}

export async function up(knex) {
  await safeAlterTable(knex, 'kyc_verifications', (table) => {
    table.specificType('sensitive_notes_ciphertext', 'VARBINARY(4096)').nullable();
    table.string('sensitive_notes_hash', 128).nullable();
    table
      .string('sensitive_notes_classification', 64)
      .notNullable()
      .defaultTo('kyc.review.notes');
    table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
    table.index(['sensitive_notes_hash'], 'kyc_verifications_notes_hash_idx');
  });

  await safeAlterTable(knex, 'kyc_documents', (table) => {
    table.specificType('document_payload_ciphertext', 'VARBINARY(4096)').nullable();
    table.string('document_payload_hash', 128).nullable();
    table.string('classification_tag', 64).notNullable().defaultTo('kyc.document');
    table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
    table.index(['document_payload_hash'], 'kyc_documents_payload_hash_idx');
    table.index(['classification_tag', 'status'], 'kyc_documents_classification_status_idx');
  });

  await safeAlterTable(knex, 'payment_intents', (table) => {
    table.specificType('sensitive_details_ciphertext', 'VARBINARY(4096)').nullable();
    table.string('sensitive_details_hash', 128).nullable();
    table.string('classification_tag', 64).notNullable().defaultTo('payment.intent');
    table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
    table.index(['sensitive_details_hash'], 'payment_intents_sensitive_hash_idx');
    table.index(['classification_tag', 'status'], 'payment_intents_classification_status_idx');
  });

  await safeAlterTable(knex, 'payment_refunds', (table) => {
    table.specificType('sensitive_details_ciphertext', 'VARBINARY(2048)').nullable();
    table.string('sensitive_details_hash', 128).nullable();
    table.string('classification_tag', 64).notNullable().defaultTo('payment.refund');
    table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
    table.index(['sensitive_details_hash'], 'payment_refunds_sensitive_hash_idx');
    table.index(['classification_tag', 'status'], 'payment_refunds_classification_status_idx');
  });

  await safeAlterTable(knex, 'community_affiliate_payouts', (table) => {
    table.specificType('disbursement_payload_ciphertext', 'VARBINARY(2048)').nullable();
    table.string('disbursement_payload_hash', 128).nullable();
    table.string('classification_tag', 64).notNullable().defaultTo('payout.affiliate');
    table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
    table.index(['disbursement_payload_hash'], 'affiliate_payouts_payload_hash_idx');
    table.index(['classification_tag', 'status'], 'affiliate_payouts_classification_status_idx');
  });

  await safeAlterTable(knex, 'explorer_search_events', (table) => {
    table.index(['created_at', 'is_zero_result'], 'explorer_search_events_created_zero_idx');
    table.index(['session_id', 'created_at'], 'explorer_search_events_session_created_idx');
    table.index(['user_id', 'created_at'], 'explorer_search_events_user_created_idx');
  });

  await safeAlterTable(knex, 'explorer_search_event_entities', (table) => {
    table.index(['entity_type', 'created_at'], 'explorer_search_entities_type_created_idx');
    table.index(['event_id', 'is_zero_result'], 'explorer_search_entities_event_zero_idx');
  });

  await safeAlterTable(knex, 'explorer_search_event_interactions', (table) => {
    table.index(['event_id', 'interaction_type'], 'explorer_search_interactions_event_type_idx');
    table.index(['entity_type', 'created_at'], 'explorer_search_interactions_type_created_idx');
  });

  await safeAlterTable(knex, 'explorer_search_daily_metrics', (table) => {
    table.index(['entity_type', 'metric_date'], 'explorer_daily_entity_date_idx');
    table.index(['metric_date', 'zero_results'], 'explorer_daily_zero_results_idx');
  });

  await safeAlterTable(knex, 'analytics_alerts', (table) => {
    table.index(['alert_code', 'severity'], 'analytics_alerts_code_severity_idx');
  });

  await safeAlterTable(knex, 'analytics_forecasts', (table) => {
    table.index(['forecast_code', 'target_date'], 'analytics_forecasts_code_date_idx');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('analytics_forecasts', (table) => {
    table.dropIndex(['forecast_code', 'target_date'], 'analytics_forecasts_code_date_idx');
  });

  await knex.schema.alterTable('analytics_alerts', (table) => {
    table.dropIndex(['alert_code', 'severity'], 'analytics_alerts_code_severity_idx');
  });

  await knex.schema.alterTable('explorer_search_daily_metrics', (table) => {
    table.dropIndex(['entity_type', 'metric_date'], 'explorer_daily_entity_date_idx');
    table.dropIndex(['metric_date', 'zero_results'], 'explorer_daily_zero_results_idx');
  });

  await knex.schema.alterTable('explorer_search_event_interactions', (table) => {
    table.dropIndex(['event_id', 'interaction_type'], 'explorer_search_interactions_event_type_idx');
    table.dropIndex(['entity_type', 'created_at'], 'explorer_search_interactions_type_created_idx');
  });

  await knex.schema.alterTable('explorer_search_event_entities', (table) => {
    table.dropIndex(['entity_type', 'created_at'], 'explorer_search_entities_type_created_idx');
    table.dropIndex(['event_id', 'is_zero_result'], 'explorer_search_entities_event_zero_idx');
  });

  await knex.schema.alterTable('explorer_search_events', (table) => {
    table.dropIndex(['created_at', 'is_zero_result'], 'explorer_search_events_created_zero_idx');
    table.dropIndex(['session_id', 'created_at'], 'explorer_search_events_session_created_idx');
    table.dropIndex(['user_id', 'created_at'], 'explorer_search_events_user_created_idx');
  });

  await knex.schema.alterTable('community_affiliate_payouts', (table) => {
    table.dropIndex(['disbursement_payload_hash'], 'affiliate_payouts_payload_hash_idx');
    table.dropIndex(['classification_tag', 'status'], 'affiliate_payouts_classification_status_idx');
    table.dropColumn('disbursement_payload_ciphertext');
    table.dropColumn('disbursement_payload_hash');
    table.dropColumn('classification_tag');
    table.dropColumn('encryption_key_version');
  });

  await knex.schema.alterTable('payment_refunds', (table) => {
    table.dropIndex(['sensitive_details_hash'], 'payment_refunds_sensitive_hash_idx');
    table.dropIndex(['classification_tag', 'status'], 'payment_refunds_classification_status_idx');
    table.dropColumn('sensitive_details_ciphertext');
    table.dropColumn('sensitive_details_hash');
    table.dropColumn('classification_tag');
    table.dropColumn('encryption_key_version');
  });

  await knex.schema.alterTable('payment_intents', (table) => {
    table.dropIndex(['sensitive_details_hash'], 'payment_intents_sensitive_hash_idx');
    table.dropIndex(['classification_tag', 'status'], 'payment_intents_classification_status_idx');
    table.dropColumn('sensitive_details_ciphertext');
    table.dropColumn('sensitive_details_hash');
    table.dropColumn('classification_tag');
    table.dropColumn('encryption_key_version');
  });

  await knex.schema.alterTable('kyc_documents', (table) => {
    table.dropIndex(['document_payload_hash'], 'kyc_documents_payload_hash_idx');
    table.dropIndex(['classification_tag', 'status'], 'kyc_documents_classification_status_idx');
    table.dropColumn('document_payload_ciphertext');
    table.dropColumn('document_payload_hash');
    table.dropColumn('classification_tag');
    table.dropColumn('encryption_key_version');
  });

  await knex.schema.alterTable('kyc_verifications', (table) => {
    table.dropIndex(['sensitive_notes_hash'], 'kyc_verifications_notes_hash_idx');
    table.dropColumn('sensitive_notes_ciphertext');
    table.dropColumn('sensitive_notes_hash');
    table.dropColumn('sensitive_notes_classification');
    table.dropColumn('encryption_key_version');
  });
}
