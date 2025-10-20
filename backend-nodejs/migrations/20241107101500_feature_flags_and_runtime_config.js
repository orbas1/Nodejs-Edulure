import { isPostgres, jsonDefault } from './_utils.js';

export async function up(knex) {
  const hasFeatureFlagsTable = await knex.schema.hasTable('feature_flags');
  if (!hasFeatureFlagsTable) {
    await knex.schema.createTable('feature_flags', (table) => {
      table.increments('id').primary();
      table.string('key', 128).notNullable().unique();
      table.string('name', 180).notNullable();
      table.string('description', 512).notNullable();
      table.boolean('enabled').notNullable().defaultTo(true);
      table.boolean('kill_switch').notNullable().defaultTo(false);
      table
        .enu('rollout_strategy', ['boolean', 'percentage', 'segment', 'schedule'], {
          useNative: true,
          enumName: 'feature_flag_rollout_strategy'
        })
        .notNullable()
        .defaultTo('boolean');
      table.integer('rollout_percentage').unsigned().notNullable().defaultTo(100);
      table.json('segment_rules');
      table.json('variants');
      table
        .json('environments')
        .notNullable()
        .defaultTo(jsonDefault(knex, ['development', 'staging', 'production']));
      table.json('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['enabled', 'kill_switch']);
    });
  }

  const hasFeatureFlagAuditsTable = await knex.schema.hasTable('feature_flag_audits');
  if (!hasFeatureFlagAuditsTable) {
    await knex.schema.createTable('feature_flag_audits', (table) => {
      table.increments('id').primary();
      table
        .integer('flag_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('feature_flags')
        .onDelete('CASCADE');
      table.string('change_type', 80).notNullable();
      table.string('changed_by', 120);
      table.json('payload').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['flag_id', 'created_at']);
    });
  }

  const hasConfigurationEntriesTable = await knex.schema.hasTable('configuration_entries');
  if (!hasConfigurationEntriesTable) {
    await knex.schema.createTable('configuration_entries', (table) => {
      table.increments('id').primary();
      table.string('key', 128).notNullable();
      table
        .enu('environment_scope', ['global', 'development', 'staging', 'production'], {
          useNative: true,
          enumName: 'configuration_environment_scope'
        })
        .notNullable()
        .defaultTo('global');
      table
        .enu('value_type', ['string', 'number', 'boolean', 'json'], {
          useNative: true,
          enumName: 'configuration_value_type'
        })
        .notNullable()
        .defaultTo('string');
      table.text('value').notNullable();
      table.string('description', 512).notNullable();
      table
        .enu('exposure_level', ['public', 'ops', 'internal', 'private'], {
          useNative: true,
          enumName: 'configuration_exposure_level'
        })
        .notNullable()
        .defaultTo('internal');
      table.boolean('sensitive').notNullable().defaultTo(false);
      table.json('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['key', 'environment_scope']);
      table.index(['environment_scope', 'exposure_level']);
    });
  }

  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

  const featureFlags = [
    {
      key: 'admin.operational-console',
      name: 'Admin Operational Console',
      description: 'Gates access to the administrative operations console and related React routes.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'segment',
      rollout_percentage: 100,
      segment_rules: JSON.stringify({
        allowedRoles: ['admin'],
        allowedTenants: ['edulure-internal'],
        schedule: { start: '2024-10-01T00:00:00.000Z' }
      }),
      environments: JSON.stringify(['staging', 'production']),
      metadata: JSON.stringify({ owner: 'Platform Ops', jiraKey: 'OPS-1124', escalationChannel: '#ops-war-room' }),
      variants: JSON.stringify([
        { key: 'core', weight: 80 },
        { key: 'beta-insights', weight: 20 }
      ]),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'commerce.checkout-v2',
      name: 'Commerce Checkout v2',
      description: 'Rolls out the redesigned checkout flow with split payments and tax compliance hooks.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'percentage',
      rollout_percentage: 35,
      environments: JSON.stringify(['staging', 'production']),
      metadata: JSON.stringify({ owner: 'Commerce', jiraKey: 'PAY-872', experimentId: 'exp_checkout_v2' }),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'learning.live-classrooms',
      name: 'Live Classroom Availability',
      description: 'Enables Agora-backed live classrooms for operators that have passed readiness reviews.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'segment',
      rollout_percentage: 70,
      segment_rules: JSON.stringify({
        allowedRoles: ['admin', 'instructor'],
        allowedTenants: ['learning-ops-guild', 'creator-growth-lab'],
        percentage: 70,
        schedule: { start: '2024-09-15T08:00:00.000Z' }
      }),
      environments: JSON.stringify(['development', 'staging', 'production']),
      metadata: JSON.stringify({ owner: 'Learning', jiraKey: 'LIVE-304', rolloutDoc: 'https://ops.edulure.live-classrooms' }),
      created_at: now(),
      updated_at: now()
    }
  ];

  for (const flag of featureFlags) {
    const existingFlag = await knex('feature_flags').where({ key: flag.key }).first();
    if (existingFlag) {
      await knex('feature_flags')
        .where({ id: existingFlag.id })
        .update({
          name: flag.name,
          description: flag.description,
          enabled: flag.enabled,
          kill_switch: flag.kill_switch,
          rollout_strategy: flag.rollout_strategy,
          rollout_percentage: flag.rollout_percentage,
          segment_rules: flag.segment_rules,
          variants: flag.variants,
          environments: flag.environments,
          metadata: flag.metadata,
          updated_at: knex.fn.now()
        });
    } else {
      await knex('feature_flags').insert(flag);
    }
  }

  const configEntries = [
    {
      key: 'support.contact-email',
      environment_scope: 'global',
      value_type: 'string',
      value: 'support@edulure.com',
      description: 'Primary support email surfaced in public runtime configuration payloads.',
      exposure_level: 'public',
      sensitive: false,
      metadata: JSON.stringify({ team: 'Support' }),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'admin.console.escalation-channel',
      environment_scope: 'production',
      value_type: 'string',
      value: '#admin-escalations',
      description: 'Slack channel where admin console incidents are triaged.',
      exposure_level: 'ops',
      sensitive: false,
      metadata: JSON.stringify({ pagerDutyService: 'edulure-admin' }),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'live-classrooms.max-concurrent-rooms',
      environment_scope: 'production',
      value_type: 'number',
      value: '35',
      description: 'Operational ceiling for concurrent Agora classrooms per tenant.',
      exposure_level: 'ops',
      sensitive: false,
      metadata: JSON.stringify({ owner: 'Learning Ops' }),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'commerce.checkout-v2.guardrail',
      environment_scope: 'staging',
      value_type: 'json',
      value: JSON.stringify({ minVersion: '2.5.0', fallback: 'checkout-v1' }),
      description: 'Front-end guardrail instructing clients when to fall back to legacy checkout.',
      exposure_level: 'internal',
      sensitive: false,
      metadata: JSON.stringify({ owner: 'Commerce' }),
      created_at: now(),
      updated_at: now()
    },
    {
      key: 'billing.stripe.secret-key',
      environment_scope: 'production',
      value_type: 'string',
      value: 'sk_live_placeholder',
      description: 'Stripe secret key stored for operational use only; redacted from runtime payloads.',
      exposure_level: 'private',
      sensitive: true,
      metadata: JSON.stringify({ rotationDate: '2024-11-30' }),
      created_at: now(),
      updated_at: now()
    }
  ];

  for (const entry of configEntries) {
    const existingEntry = await knex('configuration_entries')
      .where({ key: entry.key, environment_scope: entry.environment_scope })
      .first();
    if (existingEntry) {
      await knex('configuration_entries')
        .where({ id: existingEntry.id })
        .update({
          value: entry.value,
          value_type: entry.value_type,
          description: entry.description,
          exposure_level: entry.exposure_level,
          sensitive: entry.sensitive,
          metadata: entry.metadata,
          updated_at: knex.fn.now()
        });
    } else {
      await knex('configuration_entries').insert(entry);
    }
  }
}

export async function down(knex) {
  const hasConfigTable = await knex.schema.hasTable('configuration_entries');
  if (hasConfigTable) {
    await knex.schema.dropTable('configuration_entries');
  }

  const hasFlagAudits = await knex.schema.hasTable('feature_flag_audits');
  if (hasFlagAudits) {
    await knex.schema.dropTable('feature_flag_audits');
  }

  const hasFlags = await knex.schema.hasTable('feature_flags');
  if (hasFlags) {
    await knex.schema.dropTable('feature_flags');
  }

  if (isPostgres(knex)) {
    await knex.raw('DROP TYPE IF EXISTS configuration_environment_scope');
    await knex.raw('DROP TYPE IF EXISTS configuration_value_type');
    await knex.raw('DROP TYPE IF EXISTS configuration_exposure_level');
    await knex.raw('DROP TYPE IF EXISTS feature_flag_rollout_strategy');
  }
}
