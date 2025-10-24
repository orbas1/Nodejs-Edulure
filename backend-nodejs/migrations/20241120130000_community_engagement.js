import { jsonDefault } from './_helpers/utils.js';
import {
  COMMUNITY_EVENT_PARTICIPANT_STATUSES,
  COMMUNITY_EVENT_REMINDER_STATUSES
} from '../src/models/communityEventConstants.js';

const PARTICIPANT_STATUSES = [...COMMUNITY_EVENT_PARTICIPANT_STATUSES];
const REMINDER_STATUSES = [...COMMUNITY_EVENT_REMINDER_STATUSES];

export async function up(knex) {
  const hasMemberPoints = await knex.schema.hasTable('community_member_points');
  if (!hasMemberPoints) {
    await knex.schema.createTable('community_member_points', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.integer('points').notNullable().defaultTo(0);
      table.integer('lifetime_points').unsigned().notNullable().defaultTo(0);
      table.string('tier', 60).notNullable().defaultTo('bronze');
      table.timestamp('last_awarded_at');
      table.timestamp('last_activity_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['community_id', 'user_id']);
      table.index(['community_id', 'points']);
      table.index(['community_id', 'tier']);
    });
  }

  const hasPointTransactions = await knex.schema.hasTable('community_member_point_transactions');
  if (!hasPointTransactions) {
    await knex.schema.createTable('community_member_point_transactions', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('awarded_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.integer('delta_points').notNullable();
      table.integer('balance_after').notNullable();
      table.string('reason', 240).notNullable();
      table.string('source', 120).notNullable().defaultTo('manual');
      table.string('reference_id', 120);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('awarded_at').defaultTo(knex.fn.now());
      table.index(['community_id', 'user_id'], 'community_points_user_idx');
      table.index(['community_id', 'awarded_at'], 'community_points_awarded_idx');
      table.index(['community_id', 'source'], 'community_points_source_idx');
    });
  }

  const hasStreaks = await knex.schema.hasTable('community_member_streaks');
  if (!hasStreaks) {
    await knex.schema.createTable('community_member_streaks', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.integer('current_streak_days').unsigned().notNullable().defaultTo(0);
      table.integer('longest_streak_days').unsigned().notNullable().defaultTo(0);
      table.date('last_active_on');
      table.timestamp('resumed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['community_id', 'user_id']);
      table.index(['community_id', 'current_streak_days']);
    });
  }

  const hasEvents = await knex.schema.hasTable('community_events');
  if (!hasEvents) {
    await knex.schema.createTable('community_events', (table) => {
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
      table.string('slug', 180).notNullable();
      table.string('summary', 500);
      table.text('description');
      table.timestamp('start_at').notNullable();
      table.timestamp('end_at').notNullable();
      table.string('timezone', 60).notNullable().defaultTo('Etc/UTC');
      table.string('visibility', 20).notNullable().defaultTo('members');
      table.string('status', 30).notNullable().defaultTo('scheduled');
      table.integer('attendance_limit').unsigned();
      table.integer('attendance_count').unsigned().notNullable().defaultTo(0);
      table.integer('waitlist_count').unsigned().notNullable().defaultTo(0);
      table.boolean('requires_rsvp').notNullable().defaultTo(true);
      table.boolean('is_online').notNullable().defaultTo(false);
      table.string('meeting_url', 500);
      table.string('location_name', 200);
      table.string('location_address', 500);
      table.decimal('location_latitude', 10, 7);
      table.decimal('location_longitude', 10, 7);
      table.string('cover_image_url', 500);
      table.string('recurrence_rule', 240);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['community_id', 'slug']);
      table.index(['community_id', 'start_at']);
      table.index(['community_id', 'status']);
    });
  }

  const hasParticipants = await knex.schema.hasTable('community_event_participants');
  if (!hasParticipants) {
    await knex.schema.createTable('community_event_participants', (table) => {
      table.increments('id').primary();
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_events')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('status', PARTICIPANT_STATUSES).notNullable().defaultTo('interested');
      table.timestamp('rsvp_at').defaultTo(knex.fn.now());
      table.timestamp('check_in_at');
      table.timestamp('reminder_scheduled_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.unique(['event_id', 'user_id']);
      table.index(['event_id', 'status']);
    });
  }

  const hasReminders = await knex.schema.hasTable('community_event_reminders');
  if (!hasReminders) {
    await knex.schema.createTable('community_event_reminders', (table) => {
      table.increments('id').primary();
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_events')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('status', REMINDER_STATUSES).notNullable().defaultTo('pending');
      table.string('channel', 30).notNullable().defaultTo('email');
      table.timestamp('remind_at').notNullable();
      table.timestamp('sent_at');
      table.timestamp('last_attempt_at');
      table.integer('attempt_count').unsigned().notNullable().defaultTo(0);
      table.string('failure_reason', 500);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.unique(['event_id', 'user_id', 'channel']);
      table.index(['status', 'remind_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('community_event_reminders');
  await knex.schema.dropTableIfExists('community_event_participants');
  await knex.schema.dropTableIfExists('community_events');
  await knex.schema.dropTableIfExists('community_member_streaks');
  await knex.schema.dropTableIfExists('community_member_point_transactions');
  await knex.schema.dropTableIfExists('community_member_points');
}
