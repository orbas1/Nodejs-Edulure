import { jsonDefault } from './_helpers/utils.js';

const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});
const JSON_EMPTY_ARRAY = (knex) => jsonDefault(knex, []);

export async function up(knex) {
  const hasChecklist = await knex.schema.hasTable('creation_project_checklist_items');
  if (!hasChecklist) {
    await knex.schema.createTable('creation_project_checklist_items', (table) => {
      table.increments('id').primary();
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('creation_projects')
        .onDelete('CASCADE');
      table.string('task_key', 120).notNullable();
      table.string('title', 240).notNullable();
      table.text('description');
      table
        .enum('category', ['setup', 'content', 'compliance', 'monetisation', 'launch', 'post_launch'])
        .notNullable()
        .defaultTo('setup');
      table
        .enum('status', ['pending', 'in_progress', 'blocked', 'completed'])
        .notNullable()
        .defaultTo('pending');
      table.enum('severity', ['info', 'warning', 'critical']).notNullable().defaultTo('info');
      table.integer('sequence_index').unsigned().notNullable().defaultTo(0);
      table.timestamp('due_at');
      table.timestamp('completed_at');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['project_id', 'task_key']);
      table.index(['project_id', 'status'], 'creation_project_checklist_status_idx');
      table.index(['project_id', 'category'], 'creation_project_checklist_category_idx');
      table.index(['status', 'due_at'], 'creation_project_checklist_due_idx');
    });
  }

  const hasGuides = await knex.schema.hasTable('instructor_workspace_guides');
  if (!hasGuides) {
    await knex.schema.createTable('instructor_workspace_guides', (table) => {
      table.increments('id').primary();
      table.string('slug', 160).notNullable().unique();
      table.string('title', 240).notNullable();
      table.text('summary');
      table.text('body').notNullable();
      table.json('project_types').notNullable().defaultTo(JSON_EMPTY_ARRAY(knex));
      table
        .enum('tone', ['info', 'success', 'warning', 'critical'])
        .notNullable()
        .defaultTo('info');
      table.json('recommendations').notNullable().defaultTo(JSON_EMPTY_ARRAY(knex));
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('published_at');
      table.timestamp('retired_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['is_active', 'tone'], 'instructor_workspace_guides_activity_idx');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('instructor_workspace_guides');
  await knex.schema.dropTableIfExists('creation_project_checklist_items');
}
