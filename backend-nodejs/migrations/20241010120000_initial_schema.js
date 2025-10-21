const DEFAULT_CHARSET = 'utf8mb4';
const DEFAULT_COLLATION = 'utf8mb4_unicode_ci';

const applyTableDefaults = (table) => {
  if (typeof table.engine === 'function') {
    table.engine('InnoDB');
  }

  if (typeof table.charset === 'function') {
    table.charset(DEFAULT_CHARSET);
  }

  if (typeof table.collate === 'function') {
    table.collate(DEFAULT_COLLATION);
  }
};

const ensureJsonColumn = (table, columnName, { nullable = false } = {}) => {
  const column = table.json(columnName);
  if (!nullable) {
    column.notNullable();
  }

  column.defaultTo('{}');
  return column;
};

const ensureJsonArrayColumn = (table, columnName, { nullable = false } = {}) => {
  const column = table.json(columnName);
  if (!nullable) {
    column.notNullable();
  }

  column.defaultTo('[]');
  return column;
};

export async function up(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('first_name', 120).notNullable();
      table.string('last_name', 120);
      table.string('email', 255).notNullable().unique('users_email_unique');
      table.string('password_hash', 255).notNullable();
      table.enum('role', ['user', 'instructor', 'admin']).notNullable().defaultTo('user');
      table.integer('age').unsigned();
      table.string('address', 255);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['role'], 'idx_users_role');
      applyTableDefaults(table);
    });
  }

  const hasCommunities = await knex.schema.hasTable('communities');
  if (!hasCommunities) {
    await knex.schema.createTable('communities', (table) => {
      table.increments('id').primary();
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 150).notNullable();
      table.string('slug', 160).notNullable().unique();
      table.text('description');
      table.string('cover_image_url', 500);
      table.enum('visibility', ['public', 'private']).notNullable().defaultTo('public');
      ensureJsonColumn(table, 'metadata');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('deleted_at').nullable();
      table.index(['owner_id'], 'idx_communities_owner');
      table.index(['slug'], 'idx_communities_slug');
      table.index(['deleted_at'], 'idx_communities_deleted_at');
      applyTableDefaults(table);
    });
  }

  const hasCommunityMembers = await knex.schema.hasTable('community_members');
  if (!hasCommunityMembers) {
    await knex.schema.createTable('community_members', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('role', ['owner', 'admin', 'moderator', 'member']).notNullable().defaultTo('member');
      table.enum('status', ['active', 'pending', 'banned']).notNullable().defaultTo('active');
      table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('left_at');
      table.unique(['community_id', 'user_id'], 'community_members_unique_user');
      table.index(['user_id', 'status'], 'idx_community_members_user_status');
      table.index(['community_id', 'role'], 'idx_community_members_role');
      table.index(['left_at'], 'idx_community_members_left_at');
      applyTableDefaults(table);
    });
  }

  const hasDomainEvents = await knex.schema.hasTable('domain_events');
  if (!hasDomainEvents) {
    await knex.schema.createTable('domain_events', (table) => {
      table.increments('id').primary();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 100).notNullable();
      table.string('event_type', 100).notNullable();
      ensureJsonColumn(table, 'payload', { nullable: true });
      table
        .integer('performed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['entity_type', 'entity_id'], 'idx_domain_events_entity');
      table.index(['event_type'], 'idx_domain_events_event_type');
      table.index(['created_at'], 'idx_domain_events_created_at');
      applyTableDefaults(table);
    });
  }

  const hasFieldServiceProviders = await knex.schema.hasTable('field_service_providers');
  if (!hasFieldServiceProviders) {
    await knex.schema.createTable('field_service_providers', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('name', 120).notNullable();
      table.string('email', 255);
      table.string('phone', 64);
      table
        .enu('status', ['active', 'inactive', 'suspended'])
        .notNullable()
        .defaultTo('active');
      ensureJsonArrayColumn(table, 'specialties', { nullable: true });
      table.decimal('rating', 3, 2).notNullable().defaultTo(0);
      table.timestamp('last_check_in_at');
      table.decimal('location_lat', 10, 7);
      table.decimal('location_lng', 10, 7);
      table.string('location_label', 255);
      table.timestamp('location_updated_at');
      ensureJsonColumn(table, 'metadata');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status'], 'idx_field_service_providers_status');
      table.index(['user_id'], 'idx_field_service_providers_user');
      table.index(['location_updated_at'], 'idx_field_service_providers_location_updated');
      applyTableDefaults(table);
    });
  }

  const hasFieldServiceOrders = await knex.schema.hasTable('field_service_orders');
  if (!hasFieldServiceOrders) {
    await knex.schema.createTable('field_service_orders', (table) => {
      table.increments('id').primary();
      table.string('reference', 40).notNullable().unique();
      table
        .integer('customer_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('provider_id')
        .unsigned()
        .references('id')
        .inTable('field_service_providers')
        .onDelete('SET NULL');
      table.string('status', 32).notNullable();
      table.string('priority', 24).notNullable().defaultTo('standard');
      table.string('service_type', 160).notNullable();
      table.string('summary', 255);
      table.timestamp('requested_at').notNullable();
      table.timestamp('scheduled_for');
      table.integer('eta_minutes');
      table.integer('sla_minutes');
      table.decimal('distance_km', 6, 2);
      table.decimal('location_lat', 10, 7).notNullable();
      table.decimal('location_lng', 10, 7).notNullable();
      table.string('location_label', 255);
      table.string('address_line_1', 255);
      table.string('address_line_2', 255);
      table.string('city', 120);
      table.string('region', 120);
      table.string('postal_code', 24);
      table.string('country', 2).notNullable().defaultTo('GB');
      ensureJsonColumn(table, 'metadata');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status'], 'idx_field_service_orders_status');
      table.index(['customer_user_id'], 'idx_field_service_orders_customer');
      table.index(['provider_id'], 'idx_field_service_orders_provider');
      table.index(['scheduled_for'], 'idx_field_service_orders_scheduled');
      applyTableDefaults(table);
    });
  }

  const hasFieldServiceEvents = await knex.schema.hasTable('field_service_events');
  if (!hasFieldServiceEvents) {
    await knex.schema.createTable('field_service_events', (table) => {
      table.increments('id').primary();
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('field_service_orders')
        .onDelete('CASCADE');
      table.string('event_type', 64).notNullable();
      table.string('status', 32);
      table.text('notes');
      table.string('author', 160);
      table.timestamp('occurred_at').notNullable();
      ensureJsonColumn(table, 'metadata', { nullable: true });
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['order_id'], 'idx_field_service_events_order');
      table.index(['occurred_at'], 'idx_field_service_events_occurred_at');
      applyTableDefaults(table);
    });
  }

  const hasUserSessions = await knex.schema.hasTable('user_sessions');
  if (!hasUserSessions) {
    await knex.schema.createTable('user_sessions', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('refresh_token_hash', 128).notNullable();
      table.string('user_agent', 500);
      table.string('ip_address', 45);
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('revoked_at');
      table.string('revoked_reason', 255);
      table.unique(['user_id', 'refresh_token_hash']);
      table.index(['user_id', 'expires_at'], 'idx_user_sessions_expiration');
      table.index(['revoked_at'], 'idx_user_sessions_revoked');
      applyTableDefaults(table);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('field_service_events');
  await knex.schema.dropTableIfExists('field_service_orders');
  await knex.schema.dropTableIfExists('field_service_providers');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('domain_events');
  await knex.schema.dropTableIfExists('community_members');
  await knex.schema.dropTableIfExists('communities');
  await knex.schema.dropTableIfExists('users');
}
