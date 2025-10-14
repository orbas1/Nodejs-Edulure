exports.up = async function up(knex) {
  const hasCategories = await knex.schema.hasTable('blog_categories');
  if (!hasCategories) {
    await knex.schema.createTable('blog_categories', (table) => {
      table.increments('id').primary();
      table.string('slug', 160).notNullable().unique();
      table.string('name', 160).notNullable();
      table.string('description', 400);
      table.integer('display_order').unsigned().defaultTo(0);
      table.boolean('is_featured').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    });
  }

  const hasTags = await knex.schema.hasTable('blog_tags');
  if (!hasTags) {
    await knex.schema.createTable('blog_tags', (table) => {
      table.increments('id').primary();
      table.string('slug', 160).notNullable().unique();
      table.string('name', 120).notNullable();
      table.string('description', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    });
  }

  const hasPosts = await knex.schema.hasTable('blog_posts');
  if (!hasPosts) {
    await knex.schema.createTable('blog_posts', (table) => {
      table.increments('id').primary();
      table.string('slug', 200).notNullable().unique();
      table.string('title', 240).notNullable();
      table.string('excerpt', 500);
      table.text('content').notNullable();
      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('category_id')
        .unsigned()
        .references('id')
        .inTable('blog_categories')
        .onDelete('SET NULL');
      table.enum('status', ['draft', 'scheduled', 'published', 'archived']).defaultTo('draft');
      table.timestamp('published_at');
      table.timestamp('scheduled_for');
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.boolean('is_featured').notNullable().defaultTo(false);
      table.integer('reading_time_minutes').unsigned().defaultTo(3);
      table.integer('view_count').unsigned().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status', 'published_at']);
      table.index(['category_id']);
      table.index(['author_id']);
    });
  }

  const hasPostTags = await knex.schema.hasTable('blog_post_tags');
  if (!hasPostTags) {
    await knex.schema.createTable('blog_post_tags', (table) => {
      table.increments('id').primary();
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('blog_posts')
        .onDelete('CASCADE');
      table
        .integer('tag_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('blog_tags')
        .onDelete('CASCADE');
      table.unique(['post_id', 'tag_id']);
      table.index(['tag_id']);
    });
  }

  const hasMedia = await knex.schema.hasTable('blog_media');
  if (!hasMedia) {
    await knex.schema.createTable('blog_media', (table) => {
      table.increments('id').primary();
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('blog_posts')
        .onDelete('CASCADE');
      table.string('media_url', 500).notNullable();
      table.string('alt_text', 160);
      table.string('media_type', 60).notNullable().defaultTo('image');
      table.integer('display_order').unsigned().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('blog_media');
  await knex.schema.dropTableIfExists('blog_post_tags');
  await knex.schema.dropTableIfExists('blog_posts');
  await knex.schema.dropTableIfExists('blog_tags');
  await knex.schema.dropTableIfExists('blog_categories');
};
