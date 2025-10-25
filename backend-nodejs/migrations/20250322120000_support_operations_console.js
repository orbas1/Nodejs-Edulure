import { applyTableDefaults, updatedAtDefault } from './_helpers/tableDefaults.js';
import { jsonDefault } from './_helpers/utils.js';

const TABLES = {
  tenants: 'support_operations_tenants',
  communications: 'support_operations_communications',
  playbooks: 'support_operations_playbooks',
  workflows: 'support_automation_workflows',
  notificationPolicies: 'support_notification_policies',
  onboardingChecklists: 'support_onboarding_checklists',
  onboardingPlaybooks: 'support_onboarding_playbooks'
};

export async function up(knex) {
  const hasTenants = await knex.schema.hasTable(TABLES.tenants);
  if (!hasTenants) {
    await knex.schema.createTable(TABLES.tenants, (table) => {
      table.string('tenant_id', 64).primary();
      table.string('name', 160).notNullable();
      table.string('slug', 160).notNullable();
      table.string('region', 64).notNullable().defaultTo('US');
      table.string('timezone', 64).notNullable().defaultTo('UTC');
      table.string('status', 32).notNullable().defaultTo('active');
      table.boolean('is_primary').notNullable().defaultTo(false);
      table.integer('display_order').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      applyTableDefaults(table);
    });
  }

  const hasCommunications = await knex.schema.hasTable(TABLES.communications);
  if (!hasCommunications) {
    await knex.schema.createTable(TABLES.communications, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('title', 200).notNullable();
      table.string('channel', 40).notNullable().defaultTo('in-app');
      table.string('status', 32).notNullable().defaultTo('scheduled');
      table.integer('audience_size').unsigned().nullable();
      table.timestamp('scheduled_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.string('author', 160).nullable();
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id', 'status'], 'idx_support_comms_tenant_status');
      applyTableDefaults(table);
    });
  }

  const hasPlaybooks = await knex.schema.hasTable(TABLES.playbooks);
  if (!hasPlaybooks) {
    await knex.schema.createTable(TABLES.playbooks, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('name', 160).notNullable();
      table.string('category', 80).notNullable().defaultTo('general');
      table.string('audience', 80).nullable();
      table.string('description', 500).nullable();
      table.string('link', 512).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id', 'category'], 'idx_support_playbooks_category');
      applyTableDefaults(table);
    });
  }

  const hasWorkflows = await knex.schema.hasTable(TABLES.workflows);
  if (!hasWorkflows) {
    await knex.schema.createTable(TABLES.workflows, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('name', 160).notNullable();
      table.string('status', 32).notNullable().defaultTo('active');
      table.decimal('success_rate', 5, 2).notNullable().defaultTo(0);
      table.timestamp('last_run_at').nullable();
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id', 'status'], 'idx_support_workflows_status');
      applyTableDefaults(table);
    });
  }

  const hasNotificationPolicies = await knex.schema.hasTable(TABLES.notificationPolicies);
  if (!hasNotificationPolicies) {
    await knex.schema.createTable(TABLES.notificationPolicies, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('name', 160).notNullable();
      table.string('description', 500).nullable();
      table.integer('sla_minutes').unsigned().nullable();
      table.json('channels').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('escalation_targets').notNullable().defaultTo(jsonDefault(knex, []));
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id'], 'idx_support_notification_policies_tenant');
      applyTableDefaults(table);
    });
  }

  const hasOnboardingChecklists = await knex.schema.hasTable(TABLES.onboardingChecklists);
  if (!hasOnboardingChecklists) {
    await knex.schema.createTable(TABLES.onboardingChecklists, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('name', 160).notNullable();
      table.decimal('progress', 5, 2).notNullable().defaultTo(0);
      table.string('owner', 160).nullable();
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id'], 'idx_support_onboarding_checklists_tenant');
      applyTableDefaults(table);
    });
  }

  const hasOnboardingPlaybooks = await knex.schema.hasTable(TABLES.onboardingPlaybooks);
  if (!hasOnboardingPlaybooks) {
    await knex.schema.createTable(TABLES.onboardingPlaybooks, (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 64).notNullable().defaultTo('global');
      table.string('name', 160).notNullable();
      table.string('link', 512).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.foreign('tenant_id').references('tenant_id').inTable(TABLES.tenants).onDelete('CASCADE');
      table.index(['tenant_id'], 'idx_support_onboarding_playbooks_tenant');
      applyTableDefaults(table);
    });
  }

  const hasLearnerSupportCases = await knex.schema.hasTable('learner_support_cases');
  if (hasLearnerSupportCases) {
    const hasTenantColumn = await knex.schema.hasColumn('learner_support_cases', 'tenant_id');
    if (!hasTenantColumn) {
      await knex.schema.alterTable('learner_support_cases', (table) => {
        table.string('tenant_id', 64).notNullable().defaultTo('global');
        table.index(['tenant_id', 'status'], 'idx_learner_support_tenant_status');
      });
      await knex('learner_support_cases').update({ tenant_id: 'global' });
    }
  }

  const hasSupportArticlesTable = await knex.schema.hasTable('support_articles');
  if (hasSupportArticlesTable) {
    const hasPendingReviewColumn = await knex.schema.hasColumn('support_articles', 'pending_review');
    if (!hasPendingReviewColumn) {
      await knex.schema.alterTable('support_articles', (table) => {
        table.boolean('pending_review').notNullable().defaultTo(false);
        table.boolean('is_draft').notNullable().defaultTo(false);
      });
    }
  }
}

export async function down(knex) {
  const hasSupportArticlesTable = await knex.schema.hasTable('support_articles');
  if (hasSupportArticlesTable) {
    const hasPendingReviewColumn = await knex.schema.hasColumn('support_articles', 'pending_review');
    const hasDraftColumn = await knex.schema.hasColumn('support_articles', 'is_draft');
    if (hasPendingReviewColumn || hasDraftColumn) {
      await knex.schema.alterTable('support_articles', (table) => {
        if (hasPendingReviewColumn) {
          table.dropColumn('pending_review');
        }
        if (hasDraftColumn) {
          table.dropColumn('is_draft');
        }
      });
    }
  }

  const hasLearnerSupportCases = await knex.schema.hasTable('learner_support_cases');
  if (hasLearnerSupportCases) {
    const hasTenantColumn = await knex.schema.hasColumn('learner_support_cases', 'tenant_id');
    if (hasTenantColumn) {
      await knex.schema.alterTable('learner_support_cases', (table) => {
        table.dropIndex(['tenant_id', 'status'], 'idx_learner_support_tenant_status');
        table.dropColumn('tenant_id');
      });
    }
  }

  await knex.schema.dropTableIfExists(TABLES.onboardingPlaybooks);
  await knex.schema.dropTableIfExists(TABLES.onboardingChecklists);
  await knex.schema.dropTableIfExists(TABLES.notificationPolicies);
  await knex.schema.dropTableIfExists(TABLES.workflows);
  await knex.schema.dropTableIfExists(TABLES.playbooks);
  await knex.schema.dropTableIfExists(TABLES.communications);
  await knex.schema.dropTableIfExists(TABLES.tenants);
}
