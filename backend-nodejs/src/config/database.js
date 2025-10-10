import createKnex from 'knex';

import { env } from './env.js';
import logger from './logger.js';

const db = createKnex({
  client: 'mysql2',
  connection: {
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    ssl: false
  },
  pool: {
    min: env.database.poolMin,
    max: env.database.poolMax,
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
