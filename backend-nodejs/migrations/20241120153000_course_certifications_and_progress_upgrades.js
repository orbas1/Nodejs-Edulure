import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTemplates = await knex.schema.hasTable('achievement_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('achievement_templates', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique();
      table.string('name', 200).notNullable();
      table.string('description', 500);
      table
        .enum('type', ['course_completion', 'assessment_mastery', 'milestone'])
        .notNullable()
        .defaultTo('course_completion');
      table.string('certificate_background_url', 500);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['type', 'is_active']);
    });
  }

  const hasLearnerAchievements = await knex.schema.hasTable('learner_achievements');
  if (!hasLearnerAchievements) {
    await knex.schema.createTable('learner_achievements', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('course_id')
        .unsigned()
        .references('id')
        .inTable('courses')
        .onDelete('SET NULL');
      table
        .integer('template_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('achievement_templates')
        .onDelete('RESTRICT');
      table
        .enum('status', ['awarded', 'revoked'])
        .notNullable()
        .defaultTo('awarded');
      table.timestamp('issued_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('revoked_at');
      table.string('certificate_url', 500);
      table.json('progress_snapshot').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'course_id', 'template_id']);
      table.index(['user_id', 'status']);
      table.index(['course_id', 'status']);
    });
  }

  const hasCertificateTemplateId = await knex.schema.hasColumn(
    'course_enrollments',
    'certificate_template_id'
  );
  if (!hasCertificateTemplateId) {
    await knex.schema.alterTable('course_enrollments', (table) => {
      table
        .integer('certificate_template_id')
        .unsigned()
        .references('id')
        .inTable('achievement_templates')
        .onDelete('SET NULL');
      table.timestamp('certificate_issued_at');
      table.string('certificate_url', 500);
    });
  }

  const hasProgressMetadata = await knex.schema.hasColumn('course_progress', 'progress_source');
  if (!hasProgressMetadata) {
    await knex.schema.alterTable('course_progress', (table) => {
      table
        .enum('progress_source', ['manual', 'video', 'assessment', 'sync'])
        .notNullable()
        .defaultTo('manual');
      table.json('progress_metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    });
  }
}

export async function down(knex) {
  const hasProgressMetadata = await knex.schema.hasColumn('course_progress', 'progress_source');
  if (hasProgressMetadata) {
    await knex.schema.alterTable('course_progress', (table) => {
      table.dropColumn('progress_metadata');
      table.dropColumn('progress_source');
    });
  }

  const hasCertificateTemplateId = await knex.schema.hasColumn(
    'course_enrollments',
    'certificate_template_id'
  );
  if (hasCertificateTemplateId) {
    await knex.schema.alterTable('course_enrollments', (table) => {
      table.dropColumn('certificate_url');
      table.dropColumn('certificate_issued_at');
      table.dropColumn('certificate_template_id');
    });
  }

  await knex.schema.dropTableIfExists('learner_achievements');
  await knex.schema.dropTableIfExists('achievement_templates');
}
