import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTutorProfiles = await knex.schema.hasTable('tutor_profiles');
  if (!hasTutorProfiles) {
    await knex.schema.createTable('tutor_profiles', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('display_name', 200).notNullable();
      table.string('headline', 250);
      table.text('bio');
      table.json('skills').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('languages').notNullable().defaultTo(jsonDefault(knex, ["en"]));
      table.string('country', 2);
      table.json('timezones').notNullable().defaultTo(jsonDefault(knex, ["Etc/UTC"]));
      table.json('availability_preferences').notNullable().defaultTo(jsonDefault(knex, {}));
      table.integer('hourly_rate_amount').unsigned().notNullable().defaultTo(0);
      table.string('hourly_rate_currency', 3).notNullable().defaultTo('USD');
      table.decimal('rating_average', 4, 2).notNullable().defaultTo(0);
      table.integer('rating_count').unsigned().notNullable().defaultTo(0);
      table.integer('completed_sessions').unsigned().notNullable().defaultTo(0);
      table.integer('response_time_minutes').unsigned().notNullable().defaultTo(0);
      table.boolean('is_verified').notNullable().defaultTo(false);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id']);
      table.index(['country']);
      table.index(['rating_average']);
    });
  }

  const hasTutorAvailability = await knex.schema.hasTable('tutor_availability_slots');
  if (!hasTutorAvailability) {
    await knex.schema.createTable('tutor_availability_slots', (table) => {
      table.increments('id').primary();
      table
        .integer('tutor_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tutor_profiles')
        .onDelete('CASCADE');
      table.timestamp('start_at').notNullable();
      table.timestamp('end_at').notNullable();
      table
        .enum('status', ['open', 'held', 'booked', 'cancelled'])
        .notNullable()
        .defaultTo('open');
      table.boolean('is_recurring').notNullable().defaultTo(false);
      table.string('recurrence_rule', 240);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tutor_id', 'start_at']);
      table.index(['tutor_id', 'status']);
    });
  }

  const hasTutorBookings = await knex.schema.hasTable('tutor_bookings');
  if (!hasTutorBookings) {
    await knex.schema.createTable('tutor_bookings', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('tutor_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tutor_profiles')
        .onDelete('CASCADE');
      table
        .integer('learner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('requested_at').defaultTo(knex.fn.now());
      table.timestamp('confirmed_at');
      table.timestamp('cancelled_at');
      table.timestamp('completed_at');
      table.timestamp('scheduled_start').notNullable();
      table.timestamp('scheduled_end').notNullable();
      table.integer('duration_minutes').unsigned().notNullable().defaultTo(60);
      table.integer('hourly_rate_amount').unsigned().notNullable().defaultTo(0);
      table.string('hourly_rate_currency', 3).notNullable().defaultTo('USD');
      table.string('meeting_url', 500);
      table
        .enum('status', ['requested', 'confirmed', 'cancelled', 'completed'])
        .notNullable()
        .defaultTo('requested');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.index(['tutor_id', 'status']);
      table.index(['learner_id', 'status']);
    });
  }

  const hasLiveClassrooms = await knex.schema.hasTable('live_classrooms');
  if (!hasLiveClassrooms) {
    await knex.schema.createTable('live_classrooms', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('SET NULL');
      table
        .integer('instructor_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('title', 250).notNullable();
      table.string('slug', 220).notNullable().unique();
      table.string('summary', 500);
      table.text('description');
      table
        .enum('type', ['workshop', 'webinar', 'coaching', 'office_hours'])
        .notNullable()
        .defaultTo('workshop');
      table
        .enum('status', ['draft', 'scheduled', 'live', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('draft');
      table.boolean('is_ticketed').notNullable().defaultTo(false);
      table.integer('price_amount').unsigned().notNullable().defaultTo(0);
      table.string('price_currency', 3).notNullable().defaultTo('USD');
      table.integer('capacity').unsigned().defaultTo(0);
      table.integer('reserved_seats').unsigned().notNullable().defaultTo(0);
      table.string('timezone', 60).notNullable().defaultTo('Etc/UTC');
      table.timestamp('start_at').notNullable();
      table.timestamp('end_at').notNullable();
      table.json('topics').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status']);
      table.index(['start_at']);
      table.index(['community_id']);
    });
  }

  const hasLiveRegistrations = await knex.schema.hasTable('live_classroom_registrations');
  if (!hasLiveRegistrations) {
    await knex.schema.createTable('live_classroom_registrations', (table) => {
      table.increments('id').primary();
      table
        .integer('classroom_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('live_classrooms')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('status', ['registered', 'waitlisted', 'cancelled', 'attended'])
        .notNullable()
        .defaultTo('registered');
      table.string('ticket_type', 120);
      table.integer('amount_paid').unsigned().notNullable().defaultTo(0);
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.timestamp('registered_at').defaultTo(knex.fn.now());
      table.timestamp('attended_at');
      table.timestamp('cancelled_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.unique(['classroom_id', 'user_id']);
      table.index(['classroom_id', 'status']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('live_classroom_registrations');
  await knex.schema.dropTableIfExists('live_classrooms');
  await knex.schema.dropTableIfExists('tutor_bookings');
  await knex.schema.dropTableIfExists('tutor_availability_slots');
  await knex.schema.dropTableIfExists('tutor_profiles');
}
