import { addTimestamps, ensureUpdatedAtTrigger, isMysql, isPostgres, jsonDefault } from './_helpers/schema.js';

async function addColumnIfMissing(knex, tableName, columnName, callback) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => {
      callback(table);
    });
  }
}

async function indexExists(knex, tableName, indexName) {
  if (isMysql(knex)) {
    const [rows] = await knex.raw(
      `SELECT COUNT(1) AS count
         FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?`,
      [tableName, indexName]
    );

    return Number(rows?.[0]?.count ?? rows?.count ?? 0) > 0;
  }

  if (isPostgres(knex)) {
    const result = await knex
      .select(knex.raw('COUNT(1) AS count'))
      .from('pg_indexes')
      .whereRaw('LOWER(tablename) = LOWER(?)', [tableName])
      .andWhereRaw('LOWER(indexname) = LOWER(?)', [indexName])
      .first();

    return Number(result?.count ?? 0) > 0;
  }

  return false;
}

async function ensureIndex(knex, tableName, indexName, columns, unique = false) {
  if (await indexExists(knex, tableName, indexName)) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    if (unique) {
      table.unique(columns, indexName);
    } else {
      table.index(columns, indexName);
    }
  });
}

async function dropIndexIfExists(knex, tableName, indexName, unique = false) {
  if (!(await indexExists(knex, tableName, indexName))) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    if (unique) {
      table.dropUnique([], indexName);
    } else {
      table.dropIndex([], indexName);
    }
  });
}

export async function up(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    await addColumnIfMissing(knex, 'users', 'recovery_email', (table) => {
      table.string('recovery_email', 255).nullable();
    });

    await addColumnIfMissing(knex, 'users', 'recovery_email_verified_at', (table) => {
      table.timestamp('recovery_email_verified_at').nullable();
    });

    await knex('users')
      .whereNotNull('recovery_email')
      .update({ recovery_email: knex.raw('LOWER(recovery_email)') });

    await ensureIndex(
      knex,
      'users',
      'users_recovery_email_unique',
      ['recovery_email'],
      true
    );
  }

  const hasAssignments = await knex.schema.hasTable('user_role_assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('user_role_assignments', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('tenant_id', 120).notNullable().defaultTo('global');
      table.string('role', 64).notNullable();
      table
        .integer('granted_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
      table.timestamp('revoked_at').nullable();
      table.string('revoked_reason', 160);
      addTimestamps(table, knex);
      table.unique(['user_id', 'tenant_id', 'role'], 'user_role_assignments_unique_user_tenant_role');
      table.index(['tenant_id', 'role'], 'user_role_assignments_tenant_role_idx');
      table.index(['user_id', 'revoked_at'], 'user_role_assignments_user_revoked_idx');
      table.index(['expires_at'], 'user_role_assignments_expires_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'user_role_assignments');

    const existingUsers = await knex('users').select('id', 'role');
    if (existingUsers.length > 0) {
      const payload = existingUsers
        .filter((row) => row.role)
        .map((row) => ({
          user_id: row.id,
          tenant_id: 'global',
          role: row.role,
          granted_by: null,
          granted_at: knex.fn.now(),
          metadata: JSON.stringify({ source: 'backfill' })
        }));

      if (payload.length > 0) {
        await knex('user_role_assignments').insert(payload);
      }
    }
  }
}

export async function down(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    await dropIndexIfExists(knex, 'users', 'users_recovery_email_unique', true);
    const hasRecoveryEmail = await knex.schema.hasColumn('users', 'recovery_email');
    if (hasRecoveryEmail) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('recovery_email');
      });
    }

    const hasRecoveryVerified = await knex.schema.hasColumn('users', 'recovery_email_verified_at');
    if (hasRecoveryVerified) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('recovery_email_verified_at');
      });
    }
  }

  const hasAssignments = await knex.schema.hasTable('user_role_assignments');
  if (hasAssignments) {
    await knex.schema.dropTable('user_role_assignments');
  }
}
