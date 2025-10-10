exports.up = async function up(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('first_name', 120).notNullable();
      table.string('last_name', 120).nullable();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.enum('role', ['user', 'instructor', 'admin']).notNullable().defaultTo('user');
      table.integer('age').unsigned();
      table.string('address', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
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
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('deleted_at').nullable();
      table.index(['owner_id']);
      table.index(['slug']);
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
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('left_at');
      table.unique(['community_id', 'user_id']);
      table.index(['user_id', 'status']);
    });
  }

  const hasDomainEvents = await knex.schema.hasTable('domain_events');
  if (!hasDomainEvents) {
    await knex.schema.createTable('domain_events', (table) => {
      table.increments('id').primary();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 100).notNullable();
      table.string('event_type', 100).notNullable();
      table.json('payload');
      table
        .integer('performed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['entity_type', 'entity_id']);
      table.index(['event_type']);
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
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('revoked_at');
      table.string('revoked_reason', 255);
      table.unique(['user_id', 'refresh_token_hash']);
      table.index(['user_id', 'expires_at']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('domain_events');
  await knex.schema.dropTableIfExists('community_members');
  await knex.schema.dropTableIfExists('communities');
  await knex.schema.dropTableIfExists('users');
};
