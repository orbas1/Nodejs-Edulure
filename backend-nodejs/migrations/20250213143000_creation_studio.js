export async function up(knex) {
  const hasProjects = await knex.schema.hasTable('creation_projects');
  if (!hasProjects) {
    await knex.schema.createTable('creation_projects', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('type', ['course', 'ebook', 'community', 'ads_asset'])
        .notNullable();
      table
        .enum('status', ['draft', 'ready_for_review', 'in_review', 'changes_requested', 'approved', 'published', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.string('title', 240).notNullable();
      table.text('summary');
      table.json('metadata').notNullable().defaultTo('{}');
      table.json('content_outline').notNullable().defaultTo(JSON.stringify([]));
      table.json('compliance_notes').notNullable().defaultTo(JSON.stringify([]));
      table.json('analytics_targets').notNullable().defaultTo(JSON.stringify({}));
      table.json('publishing_channels').notNullable().defaultTo(JSON.stringify([]));
      table.timestamp('review_requested_at');
      table.timestamp('approved_at');
      table.timestamp('published_at');
      table.timestamp('archived_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['owner_id']);
      table.index(['type']);
      table.index(['status']);
      table.index(['created_at']);
    });
  }

  const hasCollaborators = await knex.schema.hasTable('creation_project_collaborators');
  if (!hasCollaborators) {
    await knex.schema.createTable('creation_project_collaborators', (table) => {
      table.increments('id').primary();
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('creation_projects')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('role', ['owner', 'editor', 'commenter', 'viewer'])
        .notNullable()
        .defaultTo('editor');
      table.json('permissions').notNullable().defaultTo(JSON.stringify([]));
      table.timestamp('added_at').defaultTo(knex.fn.now());
      table.timestamp('removed_at');
      table.unique(['project_id', 'user_id']);
      table.index(['user_id']);
    });
  }

  const hasTemplates = await knex.schema.hasTable('creation_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('creation_templates', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .enum('type', ['course', 'ebook', 'community', 'ads_asset'])
        .notNullable();
      table.string('title', 200).notNullable();
      table.text('description');
      table.json('schema').notNullable();
      table.integer('version').unsigned().notNullable().defaultTo(1);
      table.boolean('is_default').notNullable().defaultTo(false);
      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.json('governance_tags').notNullable().defaultTo(JSON.stringify([]));
      table.timestamp('published_at');
      table.timestamp('retired_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['type']);
      table.index(['is_default']);
      table.unique(['type', 'title', 'version']);
    });
  }

  const hasSessions = await knex.schema.hasTable('creation_collaboration_sessions');
  if (!hasSessions) {
    await knex.schema.createTable('creation_collaboration_sessions', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('creation_projects')
        .onDelete('CASCADE');
      table
        .integer('participant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('role', ['owner', 'editor', 'commenter', 'viewer'])
        .notNullable()
        .defaultTo('editor');
      table.json('capabilities').notNullable().defaultTo(JSON.stringify([]));
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.timestamp('last_heartbeat_at').defaultTo(knex.fn.now());
      table.timestamp('left_at');
      table.boolean('was_terminated').notNullable().defaultTo(false);
      table.index(['project_id']);
      table.index(['participant_id']);
      table.index(['joined_at']);
    });
  }

  const hasVersions = await knex.schema.hasTable('creation_project_versions');
  if (!hasVersions) {
    await knex.schema.createTable('creation_project_versions', (table) => {
      table.increments('id').primary();
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('creation_projects')
        .onDelete('CASCADE');
      table.integer('version_number').unsigned().notNullable();
      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.json('snapshot').notNullable();
      table.json('change_summary').notNullable().defaultTo(JSON.stringify({}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['project_id', 'version_number']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('creation_project_versions');
  await knex.schema.dropTableIfExists('creation_collaboration_sessions');
  await knex.schema.dropTableIfExists('creation_templates');
  await knex.schema.dropTableIfExists('creation_project_collaborators');
  await knex.schema.dropTableIfExists('creation_projects');
}
