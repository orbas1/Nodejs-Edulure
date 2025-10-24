import { isMysql, isPostgres } from './_helpers/schema.js';

const TABLE = 'payment_ledger_entries';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    return;
  }

  const hasAmountCents = await knex.schema.hasColumn(TABLE, 'amount_cents');
  const hasAmount = await knex.schema.hasColumn(TABLE, 'amount');

  if (!hasAmountCents && hasAmount) {
    if (isPostgres(knex)) {
      await knex.raw('ALTER TABLE ?? RENAME COLUMN ?? TO ??', [TABLE, 'amount', 'amount_cents']);
    } else if (isMysql(knex)) {
      await knex.raw('ALTER TABLE ?? CHANGE COLUMN ?? ?? BIGINT NOT NULL', [TABLE, 'amount', 'amount_cents']);
    } else {
      await knex.schema.alterTable(TABLE, (table) => {
        table.renameColumn('amount', 'amount_cents');
      });
    }
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    return;
  }

  const hasAmount = await knex.schema.hasColumn(TABLE, 'amount');
  const hasAmountCents = await knex.schema.hasColumn(TABLE, 'amount_cents');

  if (!hasAmount && hasAmountCents) {
    if (isPostgres(knex)) {
      await knex.raw('ALTER TABLE ?? RENAME COLUMN ?? TO ??', [TABLE, 'amount_cents', 'amount']);
    } else if (isMysql(knex)) {
      await knex.raw('ALTER TABLE ?? CHANGE COLUMN ?? ?? BIGINT NOT NULL', [TABLE, 'amount_cents', 'amount']);
    } else {
      await knex.schema.alterTable(TABLE, (table) => {
        table.renameColumn('amount_cents', 'amount');
      });
    }
  }
}
