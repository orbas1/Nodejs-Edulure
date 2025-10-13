export const up = async (knex) => {
  await knex.schema.createTable('kyc_verifications', (table) => {
    table.increments('id').primary();
    table.string('reference', 40).notNullable().unique();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .enum('status', [
        'collecting',
        'submitted',
        'pending_review',
        'approved',
        'rejected',
        'resubmission_required'
      ])
      .notNullable()
      .defaultTo('collecting');
    table.integer('documents_required').unsigned().notNullable().defaultTo(3);
    table.integer('documents_submitted').unsigned().notNullable().defaultTo(0);
    table.decimal('risk_score', 5, 2).notNullable().defaultTo(0);
    table.boolean('needs_manual_review').notNullable().defaultTo(false);
    table.string('escalation_level', 32).notNullable().defaultTo('none');
    table.timestamp('last_submitted_at');
    table.timestamp('last_reviewed_at');
    table
      .integer('reviewed_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.text('rejection_reason');
    table.json('policy_references');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index(['user_id', 'status'], 'kyc_verifications_user_status_idx');
    table.index(['status', 'last_submitted_at'], 'kyc_verifications_status_submitted_idx');
  });

  await knex.schema.createTable('kyc_documents', (table) => {
    table.increments('id').primary();
    table
      .integer('verification_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('kyc_verifications')
      .onDelete('CASCADE');
    table.string('document_type', 64).notNullable();
    table
      .enum('status', ['pending', 'accepted', 'rejected'])
      .notNullable()
      .defaultTo('pending');
    table.string('storage_bucket', 128).notNullable();
    table.string('storage_key', 255).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('mime_type', 128).notNullable();
    table.bigInteger('size_bytes').notNullable();
    table.string('checksum_sha256', 128).notNullable();
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    table.unique(['verification_id', 'document_type'], 'kyc_documents_unique_per_type');
    table.index(['verification_id', 'document_type'], 'kyc_documents_lookup_idx');
  });

  await knex.schema.createTable('kyc_audit_logs', (table) => {
    table.increments('id').primary();
    table
      .integer('verification_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('kyc_verifications')
      .onDelete('CASCADE');
    table
      .integer('actor_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('action', 64).notNullable();
    table.text('notes');
    table.json('metadata');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['verification_id', 'created_at'], 'kyc_audit_logs_lookup_idx');
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('kyc_audit_logs');
  await knex.schema.dropTableIfExists('kyc_documents');
  await knex.schema.dropTableIfExists('kyc_verifications');
};
