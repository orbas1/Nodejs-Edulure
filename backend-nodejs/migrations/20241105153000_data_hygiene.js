import { applyTableDefaults, updatedAtDefault } from './_helpers/tableDefaults.js';

const MYSQL_REGEX = /mysql/i;

const isMySqlClient = (knex) => MYSQL_REGEX.test(knex?.client?.config?.client ?? '');

export async function up(knex) {
  const mysqlClient = isMySqlClient(knex);
  const hasUserDeletedAt = await knex.schema.hasColumn('users', 'deleted_at');
  if (!hasUserDeletedAt) {
    await knex.schema.alterTable('users', (table) => {
      const column = table.timestamp('deleted_at').nullable();
      if (mysqlClient && typeof column.after === 'function') {
        column.after('updated_at');
      }
    });
  }

  const hasSessionDeletedAt = await knex.schema.hasColumn('user_sessions', 'deleted_at');
  if (!hasSessionDeletedAt) {
    await knex.schema.alterTable('user_sessions', (table) => {
      const column = table.timestamp('deleted_at').nullable();
      if (mysqlClient && typeof column.after === 'function') {
        column.after('revoked_reason');
      }
    });
  }

  const hasPoliciesTable = await knex.schema.hasTable('data_retention_policies');
  if (!hasPoliciesTable) {
    await knex.schema.createTable('data_retention_policies', (table) => {
      table.increments('id').primary();
      table.string('entity_name', 120).notNullable().unique();
      table
        .enu('action', ['hard-delete', 'soft-delete', 'anonymize'], {
          useNative: true,
          enumName: 'data_retention_action_enum'
        })
        .notNullable()
        .defaultTo('hard-delete');
      table.integer('retention_period_days').unsigned().notNullable();
      table.boolean('active').notNullable().defaultTo(true);
      table.json('criteria').notNullable();
      table.string('description', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.index(['active']);
      table.index(['entity_name']);
      applyTableDefaults(table);
    });
  }

  const hasAuditTable = await knex.schema.hasTable('data_retention_audit_logs');
  if (!hasAuditTable) {
    await knex.schema.createTable('data_retention_audit_logs', (table) => {
      table.increments('id').primary();
      table
        .integer('policy_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('data_retention_policies')
        .onDelete('CASCADE');
      table.timestamp('enforced_at').notNullable().defaultTo(knex.fn.now());
      table.boolean('dry_run').notNullable().defaultTo(false);
      table.integer('rows_affected').unsigned().notNullable().defaultTo(0);
      table.json('details').notNullable();
      table.index(['policy_id', 'enforced_at']);
    });
  }

  const policies = [
    {
      entity_name: 'user_sessions',
      action: 'hard-delete',
      retention_period_days: 90,
      description: 'Remove expired or unused login refresh sessions after 90 days.',
      criteria: JSON.stringify({
        includeRevoked: true,
        mode: 'expiresAtOrUnused',
        staleLastUsedDays: 30
      })
    },
    {
      entity_name: 'user_email_verification_tokens',
      action: 'hard-delete',
      retention_period_days: 30,
      description: 'Drop stale email verification tokens to reduce database bloat.',
      criteria: JSON.stringify({
        mode: 'expiresAt'
      })
    },
    {
      entity_name: 'domain_events',
      action: 'hard-delete',
      retention_period_days: 365,
      description: 'Purge domain audit events older than 12 months (retained in cold storage).',
      criteria: JSON.stringify({
        mode: 'createdAt'
      })
    },
    {
      entity_name: 'content_asset_events',
      action: 'hard-delete',
      retention_period_days: 180,
      description: 'Remove low-value asset telemetry older than 6 months to keep tables lean.',
      criteria: JSON.stringify({
        mode: 'occurredAt'
      })
    },
    {
      entity_name: 'communities',
      action: 'soft-delete',
      retention_period_days: 730,
      description: 'Soft delete communities dormant for two years to enforce retention obligations.',
      criteria: JSON.stringify({
        mode: 'updatedAt',
        softDeleteColumn: 'deleted_at'
      })
    }
  ];

  for (const policy of policies) {
    const existing = await knex('data_retention_policies')
      .where('entity_name', policy.entity_name)
      .first();
    if (existing) {
      await knex('data_retention_policies')
        .where('id', existing.id)
        .update({
          action: policy.action,
          retention_period_days: policy.retention_period_days,
          description: policy.description,
          criteria: policy.criteria,
          active: true
        });
    } else {
      await knex('data_retention_policies').insert(policy);
    }
  }

  if (mysqlClient) {
    await knex.raw('DROP TRIGGER IF EXISTS trg_community_owner_membership_after_insert');
    await knex.raw(`
      CREATE TRIGGER trg_community_owner_membership_after_insert
      AFTER INSERT ON communities
      FOR EACH ROW
      BEGIN
        INSERT INTO community_members (community_id, user_id, role, status, joined_at, left_at)
        VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW(), NULL)
        ON DUPLICATE KEY UPDATE
          role = 'owner',
          status = 'active',
          joined_at = IFNULL(community_members.joined_at, NOW()),
          left_at = NULL,
          updated_at = NOW();
      END
    `);

    await knex.raw('DROP TRIGGER IF EXISTS trg_community_owner_membership_after_update');
    await knex.raw(`
      CREATE TRIGGER trg_community_owner_membership_after_update
      AFTER UPDATE ON communities
      FOR EACH ROW
      BEGIN
        IF NEW.owner_id <> OLD.owner_id THEN
          INSERT INTO community_members (community_id, user_id, role, status, joined_at, left_at)
          VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW(), NULL)
          ON DUPLICATE KEY UPDATE
            role = 'owner',
            status = 'active',
            joined_at = IFNULL(community_members.joined_at, NOW()),
            left_at = NULL,
            updated_at = NOW();

          UPDATE community_members
          SET role = 'admin',
              status = 'active',
              left_at = NULL,
              updated_at = NOW()
          WHERE community_id = NEW.id AND user_id = OLD.owner_id;
        END IF;
      END
    `);
  }
}

export async function down(knex) {
  if (isMySqlClient(knex)) {
    await knex.raw('DROP TRIGGER IF EXISTS trg_community_owner_membership_after_update');
    await knex.raw('DROP TRIGGER IF EXISTS trg_community_owner_membership_after_insert');
  }

  const hasAuditTable = await knex.schema.hasTable('data_retention_audit_logs');
  if (hasAuditTable) {
    await knex.schema.dropTable('data_retention_audit_logs');
  }

  const hasPoliciesTable = await knex.schema.hasTable('data_retention_policies');
  if (hasPoliciesTable) {
    await knex.schema.dropTable('data_retention_policies');
  }

  const hasSessionDeletedAt = await knex.schema.hasColumn('user_sessions', 'deleted_at');
  if (hasSessionDeletedAt) {
    await knex.schema.alterTable('user_sessions', (table) => {
      table.dropColumn('deleted_at');
    });
  }

  const hasUserDeletedAt = await knex.schema.hasColumn('users', 'deleted_at');
  if (hasUserDeletedAt) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('deleted_at');
    });
  }
}
