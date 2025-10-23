import { isPostgres } from './_helpers/utils.js';

const JOB_FLAGS = [
  {
    key: 'platform.jobs.telemetry',
    name: 'Background Jobs – Telemetry Export',
    description: 'Enables telemetry aggregation and export jobs that ship analytics events to downstream systems.',
    metadata: {
      owner: 'Data Platform',
      tags: ['jobs', 'telemetry'],
      escalationChannel: '#data-platform',
      runbook: 'https://runbooks.edulure.internal/data/telemetry-jobs',
      docs: 'https://docs.edulure.internal/platform/telemetry-jobs'
    }
  },
  {
    key: 'platform.jobs.monetisation',
    name: 'Background Jobs – Monetisation Reconciliation',
    description: 'Gates the monetisation reconciliation and payout preparation schedulers executed by the worker service.',
    metadata: {
      owner: 'Revenue Operations',
      tags: ['jobs', 'revenue'],
      escalationChannel: '#revenue-ops',
      runbook: 'https://runbooks.edulure.internal/revenue/monetisation-jobs',
      docs: 'https://docs.edulure.internal/platform/monetisation-jobs'
    }
  },
  {
    key: 'platform.jobs.analytics',
    name: 'Background Jobs – Analytics Pipelines',
    description: 'Controls analytics aggregation and warehousing jobs that hydrate dashboards and campaign insights.',
    metadata: {
      owner: 'Insights Engineering',
      tags: ['jobs', 'analytics'],
      escalationChannel: '#insights-eng',
      runbook: 'https://runbooks.edulure.internal/insights/analytics-jobs',
      docs: 'https://docs.edulure.internal/platform/analytics-jobs'
    }
  },
  {
    key: 'platform.jobs.ads',
    name: 'Background Jobs – Ads Delivery',
    description: 'Gates ads pacing, budget reconciliation, and campaign eligibility schedulers.',
    metadata: {
      owner: 'Ads Platform',
      tags: ['jobs', 'ads'],
      escalationChannel: '#ads-platform',
      runbook: 'https://runbooks.edulure.internal/ads/campaign-jobs',
      docs: 'https://docs.edulure.internal/platform/ads-jobs'
    }
  }
];

function jsonValue(knex, value) {
  if (isPostgres(knex)) {
    return knex.raw('?::jsonb', JSON.stringify(value ?? {}));
  }
  return JSON.stringify(value ?? {});
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function up(knex) {
  for (const flag of JOB_FLAGS) {
    const payload = {
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: false,
      kill_switch: false,
      rollout_strategy: 'boolean',
      rollout_percentage: 100,
      segment_rules: jsonValue(knex, {}),
      variants: jsonValue(knex, []),
      environments: jsonValue(knex, ['development', 'staging', 'production']),
      metadata: jsonValue(knex, flag.metadata),
      created_at: now(),
      updated_at: now()
    };

    const existing = await knex('feature_flags').where({ key: flag.key }).first();
    if (existing) {
      await knex('feature_flags')
        .where({ id: existing.id })
        .update({
          name: flag.name,
          description: flag.description,
          enabled: false,
          kill_switch: false,
          rollout_strategy: 'boolean',
          rollout_percentage: 100,
          segment_rules: jsonValue(knex, {}),
          variants: jsonValue(knex, []),
          environments: jsonValue(knex, ['development', 'staging', 'production']),
          metadata: jsonValue(knex, flag.metadata),
          updated_at: knex.fn.now()
        });
    } else {
      await knex('feature_flags').insert(payload);
    }
  }
}

export async function down(knex) {
  await knex('feature_flags')
    .whereIn(
      'key',
      JOB_FLAGS.map((flag) => flag.key)
    )
    .update({ enabled: false, kill_switch: false });
}
