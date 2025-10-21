const FOLLOW_STATUSES = ['pending', 'accepted', 'declined'];
const PROFILE_VISIBILITY = ['public', 'followers', 'private'];
const MESSAGE_PERMISSIONS = ['anyone', 'followers', 'none'];
const JSON_EMPTY_OBJECT = JSON.stringify({});

export async function up(knex) {
  const hasPrivacySettings = await knex.schema.hasTable('user_privacy_settings');
  if (!hasPrivacySettings) {
    await knex.schema.createTable('user_privacy_settings', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('profile_visibility', PROFILE_VISIBILITY).notNullable().defaultTo('public');
      table.boolean('follow_approval_required').notNullable().defaultTo(false);
      table.enum('message_permission', MESSAGE_PERMISSIONS).notNullable().defaultTo('followers');
      table.boolean('share_activity').notNullable().defaultTo(true);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id']);
    });
  }

  const hasFollows = await knex.schema.hasTable('user_follows');
  if (!hasFollows) {
    await knex.schema.createTable('user_follows', (table) => {
      table.increments('id').primary();
      table
        .integer('follower_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('following_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('status', FOLLOW_STATUSES).notNullable().defaultTo('accepted');
      table.string('source', 80);
      table.string('reason', 240);
      table.timestamp('accepted_at');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['follower_id', 'following_id']);
      table.index(['following_id', 'status']);
      table.index(['follower_id', 'status']);
    });
  }

  const hasMutes = await knex.schema.hasTable('user_mute_list');
  if (!hasMutes) {
    await knex.schema.createTable('user_mute_list', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('muted_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('muted_until');
      table.string('reason', 240);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'muted_user_id']);
      table.index(['user_id']);
    });
  }

  const hasBlocks = await knex.schema.hasTable('user_block_list');
  if (!hasBlocks) {
    await knex.schema.createTable('user_block_list', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('blocked_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('reason', 240);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('blocked_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at');
      table.unique(['user_id', 'blocked_user_id']);
      table.index(['user_id']);
      table.index(['blocked_user_id']);
    });
  }

  const hasRecommendations = await knex.schema.hasTable('user_follow_recommendations');
  if (!hasRecommendations) {
    await knex.schema.createTable('user_follow_recommendations', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('recommended_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.decimal('score', 5, 2).notNullable().defaultTo(0);
      table.integer('mutual_followers_count').unsigned().notNullable().defaultTo(0);
      table.string('reason_code', 80).notNullable().defaultTo('mutual_followers');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.timestamp('consumed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'recommended_user_id']);
      table.index(['user_id']);
      table.index(['recommended_user_id']);
      table.index(['score']);
    });
  }

  const hasAuditLog = await knex.schema.hasTable('social_audit_logs');
  if (!hasAuditLog) {
    await knex.schema.createTable('social_audit_logs', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('target_user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('action', 120).notNullable();
      table.string('source', 120);
      table.string('ip_address', 120);
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['user_id', 'action']);
      table.index(['target_user_id']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('social_audit_logs');
  await knex.schema.dropTableIfExists('user_follow_recommendations');
  await knex.schema.dropTableIfExists('user_block_list');
  await knex.schema.dropTableIfExists('user_mute_list');
  await knex.schema.dropTableIfExists('user_follows');
  await knex.schema.dropTableIfExists('user_privacy_settings');
}
