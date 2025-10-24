export async function up(knex) {
  const communicationsTable = 'support_operations_communications';
  const notificationPoliciesTable = 'support_notification_policies';

  const hasCommunicationsTable = await knex.schema.hasTable(communicationsTable);
  if (hasCommunicationsTable) {
    const hasMessageColumn = await knex.schema.hasColumn(communicationsTable, 'message');
    if (!hasMessageColumn) {
      await knex.schema.alterTable(communicationsTable, (table) => {
        table.text('message').nullable();
      });
    }
  }

  const hasNotificationPoliciesTable = await knex.schema.hasTable(notificationPoliciesTable);
  if (hasNotificationPoliciesTable) {
    await knex.schema.raw(
      `ALTER TABLE ${notificationPoliciesTable}
        MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    );
    await knex(notificationPoliciesTable).update({ updated_at: knex.fn.now() });
  }
}

export async function down(knex) {
  const communicationsTable = 'support_operations_communications';
  const notificationPoliciesTable = 'support_notification_policies';

  const hasCommunicationsTable = await knex.schema.hasTable(communicationsTable);
  if (hasCommunicationsTable) {
    const hasMessageColumn = await knex.schema.hasColumn(communicationsTable, 'message');
    if (hasMessageColumn) {
      await knex.schema.alterTable(communicationsTable, (table) => {
        table.dropColumn('message');
      });
    }
  }

  const hasNotificationPoliciesTable = await knex.schema.hasTable(notificationPoliciesTable);
  if (hasNotificationPoliciesTable) {
    await knex.schema.raw(
      `ALTER TABLE ${notificationPoliciesTable}
        MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    );
  }
}
