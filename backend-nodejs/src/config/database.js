import createKnex from 'knex';

import { env } from './env.js';
import logger from './logger.js';

const databaseConfig = env?.database ?? {};

const connectionDefaults = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  name: 'edulure',
  poolMin: 0,
  poolMax: 10
};

const resolvedConfig = {
  host: databaseConfig.host ?? connectionDefaults.host,
  port: databaseConfig.port ?? connectionDefaults.port,
  user: databaseConfig.user ?? connectionDefaults.user,
  password: databaseConfig.password ?? connectionDefaults.password,
  name: databaseConfig.name ?? connectionDefaults.name,
  poolMin: databaseConfig.poolMin ?? connectionDefaults.poolMin,
  poolMax: databaseConfig.poolMax ?? connectionDefaults.poolMax
};

const db = createKnex({
  client: 'mysql2',
  connection: {
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    user: resolvedConfig.user,
    password: resolvedConfig.password,
    database: resolvedConfig.name,
    ssl: false
  },
  pool: {
    min: resolvedConfig.poolMin,
    max: resolvedConfig.poolMax,
    afterCreate: (conn, done) => {
      conn.query("SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION'", (err) => {
        if (err) {
          logger.error({ err }, 'Failed to enforce strict SQL mode');
        }
        done(err, conn);
      });
    }
  },
  migrations: {
    tableName: 'schema_migrations'
  }
});

export const healthcheck = async () => {
  await db.raw('select 1 as health_check');
};

export default db;
