export async function up(knex) {
  await knex.schema.alterTable('courses', (table) => {
    table.index(['status', 'category'], 'courses_status_category_idx');
    table.index(['status', 'level'], 'courses_status_level_idx');
    table.index(['status', 'delivery_format'], 'courses_status_delivery_idx');
    table.index(['status', 'is_published'], 'courses_status_publish_idx');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('courses', (table) => {
    table.dropIndex(['status', 'category'], 'courses_status_category_idx');
    table.dropIndex(['status', 'level'], 'courses_status_level_idx');
    table.dropIndex(['status', 'delivery_format'], 'courses_status_delivery_idx');
    table.dropIndex(['status', 'is_published'], 'courses_status_publish_idx');
  });
}
