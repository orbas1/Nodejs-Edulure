const DEFAULT_ENVIRONMENT = {
  key: 'local',
  name: 'Local Development',
  tier: 'development',
  region: 'local',
  workspace: null
};

async function addEnvironmentColumns(knex, tableName, { includeUniqueIndex = null } = {}) {
  await knex.schema.alterTable(tableName, (table) => {
    table.string('environment_key', 80).notNullable().defaultTo(DEFAULT_ENVIRONMENT.key);
    table.string('environment_name', 160).notNullable().defaultTo(DEFAULT_ENVIRONMENT.name);
    table.string('environment_tier', 60).defaultTo(DEFAULT_ENVIRONMENT.tier);
    table.string('environment_region', 120).defaultTo(DEFAULT_ENVIRONMENT.region);
    table.string('environment_workspace', 160).defaultTo(null);
    table.index(['environment_key'], `${tableName}_environment_key_idx`);
  });

  await knex(tableName).update({
    environment_key: DEFAULT_ENVIRONMENT.key,
    environment_name: DEFAULT_ENVIRONMENT.name,
    environment_tier: DEFAULT_ENVIRONMENT.tier,
    environment_region: DEFAULT_ENVIRONMENT.region,
    environment_workspace: DEFAULT_ENVIRONMENT.workspace
  });

  if (includeUniqueIndex) {
    const { drop, add } = includeUniqueIndex;
    if (drop) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropUnique(drop.columns, drop.name);
      });
    }
    if (add) {
      await knex.schema.alterTable(tableName, (table) => {
        table.unique(add.columns, add.name);
      });
    }
  }
}

async function removeEnvironmentColumns(knex, tableName, { restoreUniqueIndex = null } = {}) {
  if (restoreUniqueIndex?.drop) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropUnique(restoreUniqueIndex.drop.columns, restoreUniqueIndex.drop.name);
    });
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.dropIndex(['environment_key'], `${tableName}_environment_key_idx`);
    table.dropColumn('environment_key');
    table.dropColumn('environment_name');
    table.dropColumn('environment_tier');
    table.dropColumn('environment_region');
    table.dropColumn('environment_workspace');
  });

  if (restoreUniqueIndex?.add) {
    await knex.schema.alterTable(tableName, (table) => {
      table.unique(restoreUniqueIndex.add.columns, restoreUniqueIndex.add.name);
    });
  }
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    await addEnvironmentColumns(trx, 'explorer_search_events');

    await addEnvironmentColumns(trx, 'explorer_search_daily_metrics', {
      includeUniqueIndex: {
        drop: { columns: ['metric_date', 'entity_type'], name: 'explorer_search_daily_metrics_metric_date_entity_type_unique' },
        add: {
          columns: ['environment_key', 'metric_date', 'entity_type'],
          name: 'explorer_search_daily_metrics_env_date_entity_unique'
        }
      }
    });

    await addEnvironmentColumns(trx, 'analytics_alerts', {
      includeUniqueIndex: null
    });

    await trx.schema.alterTable('analytics_alerts', (table) => {
      table.index(['environment_key', 'alert_code'], 'analytics_alerts_env_code_idx');
    });

    await addEnvironmentColumns(trx, 'analytics_forecasts', {
      includeUniqueIndex: {
        drop: { columns: ['forecast_code', 'target_date'], name: 'analytics_forecasts_forecast_code_target_date_unique' },
        add: {
          columns: ['environment_key', 'forecast_code', 'target_date'],
          name: 'analytics_forecasts_env_code_date_unique'
        }
      }
    });

    await trx.schema.alterTable('analytics_forecasts', (table) => {
      table.index(['environment_key', 'forecast_code'], 'analytics_forecasts_env_code_idx');
    });
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.alterTable('analytics_forecasts', (table) => {
      table.dropIndex(['environment_key', 'forecast_code'], 'analytics_forecasts_env_code_idx');
    });

    await removeEnvironmentColumns(trx, 'analytics_forecasts', {
      restoreUniqueIndex: {
        drop: {
          columns: ['environment_key', 'forecast_code', 'target_date'],
          name: 'analytics_forecasts_env_code_date_unique'
        },
        add: {
          columns: ['forecast_code', 'target_date'],
          name: 'analytics_forecasts_forecast_code_target_date_unique'
        }
      }
    });

    await trx.schema.alterTable('analytics_alerts', (table) => {
      table.dropIndex(['environment_key', 'alert_code'], 'analytics_alerts_env_code_idx');
    });

    await removeEnvironmentColumns(trx, 'analytics_alerts');

    await removeEnvironmentColumns(trx, 'explorer_search_daily_metrics', {
      restoreUniqueIndex: {
        drop: {
          columns: ['environment_key', 'metric_date', 'entity_type'],
          name: 'explorer_search_daily_metrics_env_date_entity_unique'
        },
        add: {
          columns: ['metric_date', 'entity_type'],
          name: 'explorer_search_daily_metrics_metric_date_entity_type_unique'
        }
      }
    });

    await removeEnvironmentColumns(trx, 'explorer_search_events');
  });
}
