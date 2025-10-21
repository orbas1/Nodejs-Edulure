import { jsonDefault } from './_utils.js';

export async function up(knex) {
  const hasCommunityMessages = await knex.schema.hasTable('community_messages');
  if (!hasCommunityMessages) {
    await knex.schema.createTable('community_messages', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_channels')
        .onDelete('CASCADE');
      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('message_type', ['text', 'system', 'event', 'file', 'live'])
        .notNullable()
        .defaultTo('text');
      table.text('body').notNullable();
      table.json('attachments').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table
        .enum('status', ['visible', 'hidden', 'deleted'])
        .notNullable()
        .defaultTo('visible');
      table.boolean('pinned').notNullable().defaultTo(false);
      table
        .integer('thread_root_id')
        .unsigned()
        .references('id')
        .inTable('community_messages')
        .onDelete('SET NULL');
      table
        .integer('reply_to_message_id')
        .unsigned()
        .references('id')
        .inTable('community_messages')
        .onDelete('SET NULL');
      table.timestamp('delivered_at');
      table.timestamp('deleted_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id', 'channel_id', 'created_at']);
      table.index(['thread_root_id']);
      table.index(['status']);
    });
  }

  const hasChannelMembers = await knex.schema.hasTable('community_channel_members');
  if (!hasChannelMembers) {
    await knex.schema.createTable('community_channel_members', (table) => {
      table.increments('id').primary();
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_channels')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('role', ['member', 'moderator'])
        .notNullable()
        .defaultTo('member');
      table.boolean('notifications_enabled').notNullable().defaultTo(true);
      table.timestamp('mute_until');
      table.timestamp('last_read_at');
      table
        .integer('last_read_message_id')
        .unsigned()
        .references('id')
        .inTable('community_messages')
        .onDelete('SET NULL');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['channel_id', 'user_id']);
      table.index(['user_id']);
    });
  }

  const hasCommunityReactions = await knex.schema.hasTable('community_message_reactions');
  if (!hasCommunityReactions) {
    await knex.schema.createTable('community_message_reactions', (table) => {
      table.increments('id').primary();
      table
        .integer('message_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_messages')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('emoji', 40).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['message_id', 'user_id', 'emoji']);
      table.index(['emoji']);
    });
  }

  const hasModerationActions = await knex.schema.hasTable('community_message_moderation_actions');
  if (!hasModerationActions) {
    await knex.schema.createTable('community_message_moderation_actions', (table) => {
      table.increments('id').primary();
      table
        .integer('message_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_messages')
        .onDelete('CASCADE');
      table
        .integer('actor_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('action_type', ['hide', 'restore', 'delete', 'flag'])
        .notNullable();
      table.string('reason', 500);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['message_id']);
      table.index(['action_type']);
    });
  }

  const hasDirectThreads = await knex.schema.hasTable('direct_message_threads');
  if (!hasDirectThreads) {
    await knex.schema.createTable('direct_message_threads', (table) => {
      table.increments('id').primary();
      table.string('subject', 240);
      table.boolean('is_group').notNullable().defaultTo(false);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('last_message_at');
      table.string('last_message_preview', 280);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['last_message_at']);
    });
  }

  const hasDirectMessages = await knex.schema.hasTable('direct_messages');
  if (!hasDirectMessages) {
    await knex.schema.createTable('direct_messages', (table) => {
      table.increments('id').primary();
      table
        .integer('thread_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('direct_message_threads')
        .onDelete('CASCADE');
      table
        .integer('sender_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('message_type', ['text', 'system', 'file'])
        .notNullable()
        .defaultTo('text');
      table.text('body').notNullable();
      table.json('attachments').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table
        .enum('status', ['sent', 'delivered', 'read', 'deleted'])
        .notNullable()
        .defaultTo('sent');
      table.timestamp('delivered_at');
      table.timestamp('read_at');
      table.timestamp('deleted_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['thread_id', 'created_at']);
    });
  }

  const hasDirectParticipants = await knex.schema.hasTable('direct_message_participants');
  if (!hasDirectParticipants) {
    await knex.schema.createTable('direct_message_participants', (table) => {
      table.increments('id').primary();
      table
        .integer('thread_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('direct_message_threads')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('role', ['member', 'admin'])
        .notNullable()
        .defaultTo('member');
      table.boolean('notifications_enabled').notNullable().defaultTo(true);
      table.boolean('is_muted').notNullable().defaultTo(false);
      table.timestamp('mute_until');
      table.timestamp('last_read_at');
      table
        .integer('last_read_message_id')
        .unsigned()
        .references('id')
        .inTable('direct_messages')
        .onDelete('SET NULL');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['thread_id', 'user_id']);
      table.index(['user_id']);
    });
  }

  const hasPresence = await knex.schema.hasTable('user_presence_sessions');
  if (!hasPresence) {
    await knex.schema.createTable('user_presence_sessions', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('session_id', 64).notNullable();
      table
        .enum('client', ['web', 'mobile', 'provider', 'admin'])
        .notNullable()
        .defaultTo('web');
      table
        .enum('status', ['online', 'away', 'offline'])
        .notNullable()
        .defaultTo('online');
      table.timestamp('connected_at').defaultTo(knex.fn.now());
      table.timestamp('last_seen_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.unique(['session_id']);
      table.index(['user_id']);
      table.index(['status']);
      table.index(['expires_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_presence_sessions');
  await knex.schema.dropTableIfExists('direct_message_participants');
  await knex.schema.dropTableIfExists('direct_messages');
  await knex.schema.dropTableIfExists('direct_message_threads');
  await knex.schema.dropTableIfExists('community_message_moderation_actions');
  await knex.schema.dropTableIfExists('community_message_reactions');
  await knex.schema.dropTableIfExists('community_channel_members');
  await knex.schema.dropTableIfExists('community_messages');
}
