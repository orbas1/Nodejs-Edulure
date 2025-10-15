const NEW_TYPES = [
  'course',
  'ebook',
  'community',
  'ads_asset',
  'gig',
  'job_listing',
  'experience_launchpad',
  'volunteering_opportunity',
  'mentorship'
];

const LEGACY_TYPES = ['course', 'ebook', 'community', 'ads_asset'];

export async function up(knex) {
  await knex.transaction(async (trx) => {
    await trx.raw(
      `ALTER TABLE creation_projects MODIFY COLUMN type ENUM(${NEW_TYPES.map(() => '?').join(', ')}) NOT NULL`,
      NEW_TYPES
    );

    await trx.raw(
      `ALTER TABLE creation_templates MODIFY COLUMN type ENUM(${NEW_TYPES.map(() => '?').join(', ')}) NOT NULL`,
      NEW_TYPES
    );
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const fallbackType = 'course';
    await trx('creation_projects')
      .whereIn('type', NEW_TYPES.filter((type) => !LEGACY_TYPES.includes(type)))
      .update({ type: fallbackType });

    await trx('creation_templates')
      .whereIn('type', NEW_TYPES.filter((type) => !LEGACY_TYPES.includes(type)))
      .update({ type: fallbackType });

    await trx.raw(
      `ALTER TABLE creation_projects MODIFY COLUMN type ENUM(${LEGACY_TYPES.map(() => '?').join(', ')}) NOT NULL`,
      LEGACY_TYPES
    );

    await trx.raw(
      `ALTER TABLE creation_templates MODIFY COLUMN type ENUM(${LEGACY_TYPES.map(() => '?').join(', ')}) NOT NULL`,
      LEGACY_TYPES
    );
  });
}
