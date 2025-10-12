exports.up = async function up(knex) {
  const hasCourses = await knex.schema.hasTable('courses');
  if (!hasCourses) {
    await knex.schema.createTable('courses', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('instructor_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('slug', 220).notNullable().unique();
      table.string('summary', 500);
      table.text('description');
      table
        .enum('level', ['beginner', 'intermediate', 'advanced', 'expert'])
        .notNullable()
        .defaultTo('beginner');
      table.string('category', 120).notNullable().defaultTo('general');
      table.json('skills').notNullable().defaultTo(JSON.stringify([]));
      table.json('tags').notNullable().defaultTo(JSON.stringify([]));
      table.json('languages').notNullable().defaultTo(JSON.stringify(['en']));
      table
        .enum('delivery_format', ['self_paced', 'cohort', 'live', 'blended'])
        .notNullable()
        .defaultTo('self_paced');
      table.string('thumbnail_url', 500);
      table.string('price_currency', 3).notNullable().defaultTo('USD');
      table.integer('price_amount').unsigned().notNullable().defaultTo(0);
      table.decimal('rating_average', 4, 2).notNullable().defaultTo(0);
      table.integer('rating_count').unsigned().notNullable().defaultTo(0);
      table.integer('enrolment_count').unsigned().notNullable().defaultTo(0);
      table.boolean('is_published').notNullable().defaultTo(false);
      table.timestamp('release_at');
      table
        .enum('status', ['draft', 'review', 'published', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status', 'category']);
      table.index(['instructor_id', 'status']);
      table.index(['release_at']);
    });
  }

  const hasModules = await knex.schema.hasTable('course_modules');
  if (!hasModules) {
    await knex.schema.createTable('course_modules', (table) => {
      table.increments('id').primary();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('slug', 220).notNullable();
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.integer('release_offset_days').notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['course_id', 'slug']);
      table.index(['course_id', 'position']);
    });
  }

  const hasLessons = await knex.schema.hasTable('course_lessons');
  if (!hasLessons) {
    await knex.schema.createTable('course_lessons', (table) => {
      table.increments('id').primary();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table
        .integer('module_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_modules')
        .onDelete('CASCADE');
      table
        .integer('asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table.string('title', 200).notNullable();
      table.string('slug', 220).notNullable();
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.integer('duration_minutes').unsigned().notNullable().defaultTo(0);
      table.timestamp('release_at');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['module_id', 'slug']);
      table.index(['course_id', 'position']);
    });
  }

  const hasAssignments = await knex.schema.hasTable('course_assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('course_assignments', (table) => {
      table.increments('id').primary();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table
        .integer('module_id')
        .unsigned()
        .references('id')
        .inTable('course_modules')
        .onDelete('SET NULL');
      table.string('title', 200).notNullable();
      table.text('instructions');
      table.integer('max_score').unsigned().notNullable().defaultTo(100);
      table.integer('due_offset_days').notNullable().defaultTo(0);
      table.json('rubric').notNullable().defaultTo('{}');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['course_id']);
      table.index(['module_id']);
    });
  }

  const hasEnrollments = await knex.schema.hasTable('course_enrollments');
  if (!hasEnrollments) {
    await knex.schema.createTable('course_enrollments', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('status', ['invited', 'active', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('active');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0);
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamp('last_accessed_at');
      table.json('metadata').notNullable().defaultTo('{}');
      table.unique(['course_id', 'user_id']);
      table.index(['status']);
      table.index(['user_id', 'status']);
    });
  }

  const hasProgress = await knex.schema.hasTable('course_progress');
  if (!hasProgress) {
    await knex.schema.createTable('course_progress', (table) => {
      table.increments('id').primary();
      table
        .integer('enrollment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_enrollments')
        .onDelete('CASCADE');
      table
        .integer('lesson_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_lessons')
        .onDelete('CASCADE');
      table.boolean('completed').notNullable().defaultTo(false);
      table.timestamp('completed_at');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo('{}');
      table.unique(['enrollment_id', 'lesson_id']);
      table.index(['lesson_id']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('course_progress');
  await knex.schema.dropTableIfExists('course_enrollments');
  await knex.schema.dropTableIfExists('course_assignments');
  await knex.schema.dropTableIfExists('course_lessons');
  await knex.schema.dropTableIfExists('course_modules');
  await knex.schema.dropTableIfExists('courses');
};
