import { addTimestamps, constraintExists, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

function buildModuleSnapshot(row) {
  if (!row) {
    return {};
  }

  return {
    courseId: row.course_id ?? null,
    title: row.title ?? null,
    slug: row.slug ?? null,
    position: row.position ?? null,
    releaseOffsetDays: row.release_offset_days ?? null,
    metadata:
      typeof row.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(row.metadata);
            } catch (_error) {
              return {};
            }
          })()
        : row.metadata ?? {},
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

export async function up(knex) {
  const hasModuleVersions = await knex.schema.hasTable('course_module_versions');
  if (!hasModuleVersions) {
    await knex.schema.createTable('course_module_versions', (table) => {
      table.increments('id').primary();
      table
        .integer('module_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_modules')
        .onDelete('CASCADE');
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.integer('version').unsigned().notNullable();
      table.string('change_type', 32).notNullable().defaultTo('update');
      table.string('change_reason', 255);
      table
        .integer('changed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());
      table.json('snapshot').notNullable().defaultTo(jsonDefault(knex, '{}'));
      table.json('diff').notNullable().defaultTo(jsonDefault(knex, '{}'));
      addTimestamps(table, knex);
      table.unique(['module_id', 'version'], 'course_module_versions_module_version_unique');
      table.index(['course_id', 'captured_at'], 'course_module_versions_course_captured_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_module_versions');

    const hasModules = await knex.schema.hasTable('course_modules');
    if (hasModules) {
      const modules = await knex('course_modules').select(
        'id',
        'course_id',
        'title',
        'slug',
        'position',
        'release_offset_days',
        'metadata',
        'created_at',
        'updated_at'
      );

      if (modules.length > 0) {
        const payload = modules.map((module) => ({
          module_id: module.id,
          course_id: module.course_id,
          version: 1,
          change_type: 'initial',
          change_reason: 'Initial snapshot',
          captured_at: knex.fn.now(),
          snapshot: JSON.stringify(buildModuleSnapshot(module)),
          diff: JSON.stringify({}),
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        }));

        if (payload.length > 0) {
          await knex('course_module_versions').insert(payload);
        }
      }
    }
  }

  const hasAssessmentQuestions = await knex.schema.hasTable('course_assessment_questions');
  if (!hasAssessmentQuestions) {
    await knex.schema.createTable('course_assessment_questions', (table) => {
      table.increments('id').primary();
      table
        .integer('assignment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_assignments')
        .onDelete('CASCADE');
      table.string('question_id', 120).notNullable();
      table.string('question_type', 64).notNullable().defaultTo('multiple_choice');
      table.text('prompt').notNullable();
      table.json('options').notNullable().defaultTo(jsonDefault(knex, '[]'));
      table.json('answer_key').notNullable().defaultTo(jsonDefault(knex, '{}'));
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.integer('points').unsigned().notNullable().defaultTo(1);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      table.timestamp('archived_at').nullable();
      addTimestamps(table, knex);
      table.unique(['assignment_id', 'question_id'], 'course_assessment_questions_unique_assignment_question');
      table.index(['assignment_id', 'position'], 'course_assessment_questions_assignment_position_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'course_assessment_questions');
  } else {
    const hasUniqueConstraint = await constraintExists(
      knex,
      'course_assessment_questions',
      'course_assessment_questions_unique_assignment_question'
    );

    if (!hasUniqueConstraint) {
      await knex.schema.alterTable('course_assessment_questions', (table) => {
        table.unique(
          ['assignment_id', 'question_id'],
          'course_assessment_questions_unique_assignment_question'
        );
      });
    }
  }
}

export async function down(knex) {
  const tables = ['course_assessment_questions', 'course_module_versions'];
  for (const tableName of tables) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      await knex.schema.dropTable(tableName);
    }
  }
}
