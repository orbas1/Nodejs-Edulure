import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const TABLE = 'learner_course_promotions';
const STATUS_ENUM = 'learner_course_promotion_status_enum';
const STATUSES = ['draft', 'active', 'archived'];

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasTable = await trx.schema.hasTable(TABLE);
    if (!hasTable) {
      await trx.schema.createTable(TABLE, (table) => {
        table.increments('id').primary();
        table
          .uuid('promotion_uuid')
          .notNullable()
          .defaultTo(trx.raw('(UUID())'))
          .unique();
        table
          .integer('course_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('courses')
          .onDelete('CASCADE');
        table.string('slug', 120).unique();
        table.string('headline', 240).notNullable();
        table.string('caption', 360);
        table.text('body');
        table.string('action_label', 160);
        table.string('action_href', 360);
        table.integer('priority').notNullable().defaultTo(0);
        table
          .enu('status', STATUSES, {
            useNative: true,
            enumName: STATUS_ENUM
          })
          .notNullable()
          .defaultTo('active');
        table.timestamp('starts_at');
        table.timestamp('ends_at');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['course_id'], 'learner_course_promotions_course_idx');
        table.index(['status'], 'learner_course_promotions_status_idx');
        table.index(['course_id', 'status'], 'learner_course_promotions_course_status_idx');
      });

      await addCheckConstraint(
        trx,
        TABLE,
        'learner_course_promotions_priority_chk',
        'priority >= 0'
      );
      await ensureUpdatedAtTrigger(trx, TABLE);
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists(TABLE);
    const dialect = trx?.client?.config?.client ?? 'mysql2';
    if (['pg', 'postgres', 'postgresql'].includes(dialect)) {
      await trx.raw('DROP TYPE IF EXISTS ??', [STATUS_ENUM]);
    }
  });
}
