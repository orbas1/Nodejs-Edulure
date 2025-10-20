const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

export function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

export function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

export function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

export function jsonDefault(knex, fallback = '{}') {
  if (isPostgres(knex)) {
    return knex.raw('?::jsonb', [fallback]);
  }

  if (isMysql(knex)) {
    return knex.raw('CAST(? AS JSON)', [fallback]);
  }

  return knex.raw('?', [fallback]);
}

export async function ensureUpdatedAtTrigger(knex, tableName) {
  if (isMysql(knex)) {
    await knex.raw(
      `ALTER TABLE ?? MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      [tableName]
    );
    return;
  }

  if (isPostgres(knex)) {
    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
          CREATE FUNCTION set_updated_at_timestamp() RETURNS trigger AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END;
      $$;
    `);

    const triggerName = `${tableName}_updated_at_trg`;

    await knex.raw(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = '${triggerName}'
          ) THEN
            CREATE TRIGGER "${triggerName}"
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at_timestamp();
          END IF;
        END;
        $$;
      `
    );
  }
}

export function addTimestamps(table, context) {
  table.timestamp('created_at').notNullable().defaultTo(context.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(context.fn.now());
}

export function normaliseRows(result) {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result[0] ?? [];
  }

  if (typeof result === 'object' && result !== null && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

export async function constraintExists(knex, tableName, constraintName) {
  if (isMysql(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
      )
    );

    return rows.length > 0;
  }

  if (isPostgres(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?`,
        [tableName, constraintName]
      )
    );

    return rows.length > 0;
  }

  return false;
}

export async function addCheckConstraint(knex, tableName, constraintName, expression) {
  if (await constraintExists(knex, tableName, constraintName)) {
    return;
  }

  await knex.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${expression})`, [tableName, constraintName]);
}

export async function dropCheckConstraint(knex, tableName, constraintName) {
  if (!(await constraintExists(knex, tableName, constraintName))) {
    return;
  }

  if (isMysql(knex)) {
    await knex.raw('ALTER TABLE ?? DROP CHECK ??', [tableName, constraintName]);
    return;
  }

  await knex.raw('ALTER TABLE ?? DROP CONSTRAINT ??', [tableName, constraintName]);
}
