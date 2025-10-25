export async function up(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasUserDob = await knex.schema.hasColumn('users', 'date_of_birth');
    if (!hasUserDob) {
      await knex.schema.alterTable('users', (table) => {
        table.date('date_of_birth');
      });
    }
  }

  const hasResponses = await knex.schema.hasTable('learner_onboarding_responses');
  if (hasResponses) {
    const hasResponseDob = await knex.schema.hasColumn('learner_onboarding_responses', 'date_of_birth');
    if (!hasResponseDob) {
      await knex.schema.alterTable('learner_onboarding_responses', (table) => {
        table.date('date_of_birth');
      });
    }
  }
}

export async function down(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasUserDob = await knex.schema.hasColumn('users', 'date_of_birth');
    if (hasUserDob) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('date_of_birth');
      });
    }
  }

  const hasResponses = await knex.schema.hasTable('learner_onboarding_responses');
  if (hasResponses) {
    const hasResponseDob = await knex.schema.hasColumn('learner_onboarding_responses', 'date_of_birth');
    if (hasResponseDob) {
      await knex.schema.alterTable('learner_onboarding_responses', (table) => {
        table.dropColumn('date_of_birth');
      });
    }
  }
}
