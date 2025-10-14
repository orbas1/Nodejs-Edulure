export async function up(knex) {
  const hasAuditEvents = await knex.schema.hasTable('audit_events');
  if (!hasAuditEvents) {
    await knex.schema.createTable('audit_events', (table) => {
      table.bigIncrements('id').primary();
      table
        .uuid('event_uuid')
        .notNullable()
        .defaultTo(knex.raw('(UUID())'))
        .unique();
      table.string('tenant_id', 36).notNullable().defaultTo('global');
      table
        .integer('actor_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('actor_type', 80).notNullable();
      table.string('actor_role', 80).notNullable();
      table.string('event_type', 120).notNullable();
      table.string('event_severity', 32).notNullable().defaultTo('info');
      table.string('entity_type', 120).notNullable();
      table.string('entity_id', 120).notNullable();
      table.json('payload').notNullable().defaultTo(JSON.stringify({}));
      table.specificType('ip_address_ciphertext', 'VARBINARY(256)').nullable();
      table.string('ip_address_hash', 128).nullable();
      table.string('request_id', 64).nullable();
      table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('ingested_at').notNullable().defaultTo(knex.fn.now());
      table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.index(['tenant_id', 'occurred_at'], 'audit_events_tenant_occurred_idx');
      table.index(['entity_type', 'entity_id', 'occurred_at'], 'audit_events_entity_idx');
      table.index(['event_type', 'event_severity', 'occurred_at'], 'audit_events_event_idx');
      table.index(['actor_id', 'actor_role', 'occurred_at'], 'audit_events_actor_idx');
      table.index(['ip_address_hash'], 'audit_events_ip_hash_idx');
    });
  }

  const hasConsentRecords = await knex.schema.hasTable('consent_records');
  if (!hasConsentRecords) {
    await knex.schema.createTable('consent_records', (table) => {
      table.bigIncrements('id').primary();
      table
        .uuid('consent_uuid')
        .notNullable()
        .defaultTo(knex.raw('(UUID())'))
        .unique();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('tenant_id', 36).notNullable().defaultTo('global');
      table.string('consent_type', 120).notNullable();
      table.string('policy_version', 32).notNullable();
      table.enu('status', ['granted', 'revoked', 'expired']).notNullable().defaultTo('granted');
      table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('revoked_at');
      table.timestamp('expires_at');
      table.enu('channel', ['web', 'mobile', 'api', 'support', 'import']).notNullable().defaultTo('web');
      table.boolean('active').notNullable().defaultTo(true);
      table.specificType('evidence_ciphertext', 'VARBINARY(2048)').nullable();
      table.string('evidence_checksum', 128).nullable();
      table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(
        ['tenant_id', 'user_id', 'consent_type', 'policy_version'],
        'consent_records_user_policy_unique'
      );
      table.index(['tenant_id', 'consent_type', 'status'], 'consent_records_type_status_idx');
      table.index(['user_id', 'status'], 'consent_records_user_status_idx');
      table.index(['expires_at'], 'consent_records_expires_idx');
    });
  }

  const hasDsrRequests = await knex.schema.hasTable('dsr_requests');
  if (!hasDsrRequests) {
    await knex.schema.createTable('dsr_requests', (table) => {
      table.bigIncrements('id').primary();
      table
        .uuid('request_uuid')
        .notNullable()
        .defaultTo(knex.raw('(UUID())'))
        .unique();
      table.string('tenant_id', 36).notNullable().defaultTo('global');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .enu('request_type', ['access', 'erasure', 'rectification', 'portability', 'restriction'])
        .notNullable();
      table
        .enu('status', ['pending', 'in_review', 'awaiting_user', 'completed', 'rejected', 'cancelled'])
        .notNullable()
        .defaultTo('pending');
      table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('due_at').notNullable().defaultTo(knex.raw('DATE_ADD(NOW(), INTERVAL 30 DAY)'));
      table.timestamp('closed_at');
      table
        .integer('handled_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.boolean('escalated').notNullable().defaultTo(false);
      table.timestamp('escalated_at');
      table.string('case_reference', 64).notNullable().unique();
      table.decimal('sla_days', 5, 2).notNullable().defaultTo(30.0);
      table.specificType('request_ciphertext', 'VARBINARY(4096)').nullable();
      table.specificType('response_ciphertext', 'VARBINARY(4096)').nullable();
      table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['tenant_id', 'status', 'due_at'], 'dsr_requests_status_due_idx');
      table.index(['user_id', 'request_type', 'submitted_at'], 'dsr_requests_user_type_idx');
      table.index(['escalated', 'status'], 'dsr_requests_escalation_idx');
    });
  }

  const hasSecurityIncidents = await knex.schema.hasTable('security_incidents');
  if (!hasSecurityIncidents) {
    await knex.schema.createTable('security_incidents', (table) => {
      table.bigIncrements('id').primary();
      table
        .uuid('incident_uuid')
        .notNullable()
        .defaultTo(knex.raw('(UUID())'))
        .unique();
      table.string('tenant_id', 36).notNullable().defaultTo('global');
      table
        .integer('reporter_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .integer('assigned_to')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .enu('category', ['scam', 'fraud', 'account_takeover', 'abuse', 'data_breach', 'other'])
        .notNullable();
      table.enu('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
      table
        .enu('status', ['new', 'triaged', 'mitigating', 'resolved', 'dismissed'])
        .notNullable()
        .defaultTo('new');
      table.specificType('description_ciphertext', 'VARBINARY(4096)').notNullable();
      table.specificType('notes_ciphertext', 'VARBINARY(4096)').nullable();
      table.string('source', 64).notNullable().defaultTo('user-report');
      table.string('external_case_id', 64);
      table.timestamp('reported_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('triaged_at');
      table.timestamp('resolved_at');
      table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.index(['tenant_id', 'status', 'reported_at'], 'security_incidents_status_idx');
      table.index(['category', 'severity', 'reported_at'], 'security_incidents_category_idx');
      table.index(['assigned_to', 'status'], 'security_incidents_assignee_idx');
      table.index(['external_case_id'], 'security_incidents_case_idx');
    });
  }
}

export async function down(knex) {
  const hasSecurityIncidents = await knex.schema.hasTable('security_incidents');
  if (hasSecurityIncidents) {
    await knex.schema.dropTable('security_incidents');
  }

  const hasDsrRequests = await knex.schema.hasTable('dsr_requests');
  if (hasDsrRequests) {
    await knex.schema.dropTable('dsr_requests');
  }

  const hasConsentRecords = await knex.schema.hasTable('consent_records');
  if (hasConsentRecords) {
    await knex.schema.dropTable('consent_records');
  }

  const hasAuditEvents = await knex.schema.hasTable('audit_events');
  if (hasAuditEvents) {
    await knex.schema.dropTable('audit_events');
  }
}
