const NEW_STATUSES = ['draft', 'scheduled', 'announced', 'live', 'complete', 'cancelled'];
const PREVIOUS_STATUSES = ['draft', 'announced', 'live', 'complete', 'cancelled'];

export async function up(knex) {
  await knex.raw(
    `ALTER TABLE community_webinars MODIFY status ENUM(${NEW_STATUSES.map(() => '?').join(', ')}) NOT NULL DEFAULT 'draft'`,
    NEW_STATUSES
  );
}

export async function down(knex) {
  await knex('community_webinars').where({ status: 'scheduled' }).update({ status: 'announced' });
  await knex.raw(
    `ALTER TABLE community_webinars MODIFY status ENUM(${PREVIOUS_STATUSES.map(() => '?').join(', ')}) NOT NULL DEFAULT 'draft'`,
    PREVIOUS_STATUSES
  );
}
