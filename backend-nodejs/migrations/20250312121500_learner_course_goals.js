import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const GOAL_STATUSES = ['planned', 'in-progress', 'at-risk', 'completed', 'on-hold'];

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasTable = await trx.schema.hasTable('learner_course_goals');
    if (!hasTable) {
      await trx.schema.createTable('learner_course_goals', (table) => {
        table.increments('id').primary();
        table
          .uuid('goal_uuid')
          .notNullable()
          .defaultTo(trx.raw('(UUID())'))
          .unique();
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
          .notNullable()
          .references('id')
          .inTable('courses')
          .onDelete('CASCADE');
        table
          .integer('enrollment_id')
          .unsigned()
          .references('id')
          .inTable('course_enrollments')
          .onDelete('SET NULL');
        table.string('title', 240).notNullable();
        table
          .enu('status', GOAL_STATUSES, {
            useNative: true,
            enumName: 'learner_course_goal_status_enum'
          })
          .notNullable()
          .defaultTo('planned');
        table.boolean('is_active').notNullable().defaultTo(true);
        table.integer('priority').notNullable().defaultTo(0);
        table.integer('target_lessons').unsigned().notNullable().defaultTo(0);
        table.integer('remaining_lessons').unsigned().notNullable().defaultTo(0);
        table.integer('focus_minutes_per_week').unsigned().notNullable().defaultTo(0);
        table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0);
        table.timestamp('due_date');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['user_id'], 'learner_course_goals_user_idx');
        table.index(['course_id'], 'learner_course_goals_course_idx');
        table.index(['user_id', 'course_id'], 'learner_course_goals_user_course_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_course_goals',
        'learner_course_goals_progress_chk',
        'progress_percent >= 0 AND progress_percent <= 100'
      );
      await addCheckConstraint(
        trx,
        'learner_course_goals',
        'learner_course_goals_priority_chk',
        'priority >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_course_goals');
    }

    await trx('learner_course_goals')
      .whereNull('priority')
      .update({ priority: 0 });
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const enumName = 'learner_course_goal_status_enum';
    await trx.schema.dropTableIfExists('learner_course_goals');

    const dialect = trx?.client?.config?.client ?? 'mysql2';
    if (['pg', 'postgres', 'postgresql'].includes(dialect)) {
      await trx.raw('DROP TYPE IF EXISTS ??', [enumName]);
    }
  });
}
