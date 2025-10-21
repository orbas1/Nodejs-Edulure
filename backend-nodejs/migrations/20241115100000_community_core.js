import { jsonDefault } from './_utils.js';

export async function up(knex) {
  const hasChannels = await knex.schema.hasTable('community_channels');
  if (!hasChannels) {
    await knex.schema.createTable('community_channels', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table.string('name', 120).notNullable();
      table.string('slug', 150).notNullable();
      table
        .enum('channel_type', ['general', 'classroom', 'resources', 'announcements', 'events'])
        .notNullable()
        .defaultTo('general');
      table.text('description');
      table.boolean('is_default').notNullable().defaultTo(false);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['community_id', 'slug']);
      table.index(['community_id', 'channel_type']);
    });
  }

  const hasPosts = await knex.schema.hasTable('community_posts');
  if (!hasPosts) {
    await knex.schema.createTable('community_posts', (table) => {
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
        .references('id')
        .inTable('community_channels')
        .onDelete('SET NULL');
      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('post_type', ['update', 'event', 'resource', 'classroom', 'poll'])
        .notNullable()
        .defaultTo('update');
      table.string('title', 200);
      table.text('body').notNullable();
      table.json('tags').notNullable().defaultTo(jsonDefault(knex, []));
      table
        .enum('visibility', ['public', 'members', 'admins'])
        .notNullable()
        .defaultTo('members');
      table
        .enum('status', ['draft', 'scheduled', 'published', 'archived'])
        .notNullable()
        .defaultTo('published');
      table.timestamp('scheduled_at');
      table.timestamp('published_at');
      table.integer('comment_count').unsigned().notNullable().defaultTo(0);
      table.json('reaction_summary').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('deleted_at');
      table.index(['community_id', 'status']);
      table.index(['author_id']);
      table.index(['published_at']);
    });
  }

  const hasResources = await knex.schema.hasTable('community_resources');
  if (!hasResources) {
    await knex.schema.createTable('community_resources', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.text('description');
      table
        .enum('resource_type', ['content_asset', 'external_link', 'document', 'classroom_session'])
        .notNullable()
        .defaultTo('content_asset');
      table
        .integer('asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table.string('link_url', 500);
      table.string('classroom_reference', 120);
      table.json('tags').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table
        .enum('visibility', ['members', 'admins'])
        .notNullable()
        .defaultTo('members');
      table
        .enum('status', ['draft', 'published', 'archived'])
        .notNullable()
        .defaultTo('published');
      table.timestamp('published_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('deleted_at');
      table.index(['community_id', 'status']);
      table.index(['resource_type']);
      table.index(['asset_id']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('community_resources');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('community_channels');
}
