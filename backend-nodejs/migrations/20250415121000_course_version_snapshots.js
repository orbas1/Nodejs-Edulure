import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('course_version_snapshots');
  if (!hasTable) {
    await knex.schema.createTable('course_version_snapshots', (table) => {
      table.increments('id').primary();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.integer('version').unsigned().notNullable();
      table
        .integer('actor_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('change_summary', 500);
      table.json('changes').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('snapshot').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
      addTimestamps(table, knex);
      table.unique(['course_id', 'version'], 'course_version_snapshots_unique_version');
      table.index(['course_id', 'recorded_at'], 'course_version_snapshots_course_recorded_idx');
      table.index(['actor_id'], 'course_version_snapshots_actor_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_version_snapshots');
  }

  const moduleHasVersion = await knex.schema.hasColumn('course_modules', 'version');
  if (!moduleHasVersion) {
    await knex.schema.alterTable('course_modules', (table) => {
      table.integer('version').unsigned().notNullable().defaultTo(1);
    });
    await knex('course_modules').update({ version: 1 });
  }

  const lessonHasVersion = await knex.schema.hasColumn('course_lessons', 'version');
  if (!lessonHasVersion) {
    await knex.schema.alterTable('course_lessons', (table) => {
      table.integer('version').unsigned().notNullable().defaultTo(1);
    });
    await knex('course_lessons').update({ version: 1 });
  }
}

export async function down(knex) {
  const lessonHasVersion = await knex.schema.hasColumn('course_lessons', 'version');
  if (lessonHasVersion) {
    await knex.schema.alterTable('course_lessons', (table) => {
      table.dropColumn('version');
    });
  }

  const moduleHasVersion = await knex.schema.hasColumn('course_modules', 'version');
  if (moduleHasVersion) {
    await knex.schema.alterTable('course_modules', (table) => {
      table.dropColumn('version');
    });
  }

  await knex.schema.dropTableIfExists('course_version_snapshots');
}
