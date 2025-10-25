import createKnex from 'knex';

import { env } from './env.js';
import logger from './logger.js';

const SQL_MODE = "STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION";
const CHARSET_STATEMENT = "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci";

const dbLogger = logger.child({ module: 'database' });

function normaliseKnexEvent(event) {
  if (!event) {
    return { message: '' };
  }

  if (typeof event === 'string') {
    return { message: event };
  }

  if (event.message) {
    return { message: event.message, ...event };
  }

  return { ...event };
}

function logKnexEvent(level, event) {
  const payload = normaliseKnexEvent(event);
  if (payload?.message) {
    dbLogger[level](payload, `Knex ${level} event`);
  } else {
    dbLogger[level]({ event: payload }, `Knex ${level} event`);
  }
}

function parseDatabaseUrl(urlString) {
  if (!urlString) {
    return {};
  }

  try {
    const parsed = new URL(urlString);
    const database = parsed.pathname ? decodeURIComponent(parsed.pathname.replace(/^\//, '')) : undefined;
    const searchParams = parsed.searchParams ?? new URLSearchParams();

    const options = {
      host: parsed.hostname || undefined,
      port: parsed.port ? Number(parsed.port) : undefined,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: database || undefined
    };

    for (const [key, value] of searchParams.entries()) {
      const lowered = key.toLowerCase();
      if (lowered === 'socketpath' || lowered === 'socket_path') {
        options.socketPath = value;
      } else if (lowered === 'timezone' || lowered === 'time_zone') {
        options.timezone = value;
      } else if (lowered === 'statement_timeout' || lowered === 'max_execution_time') {
        const timeout = Number(value);
        if (Number.isFinite(timeout) && timeout >= 0) {
          options.statementTimeoutMs = timeout;
        }
      } else if (lowered === 'sslmode' || lowered === 'ssl-mode') {
        options.sslMode = value;
      }
    }

    return options;
  } catch (error) {
    throw new Error(`Invalid DB_URL provided: ${error.message}`);
  }
}

function normalizeTimezoneInput(value) {
  if (!value) {
    return 'UTC';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'UTC';
  }

  if (trimmed === 'Z') {
    return 'UTC';
  }

  if (/^utc$/i.test(trimmed)) {
    return 'UTC';
  }

  if (/^system$/i.test(trimmed) || /^local$/i.test(trimmed)) {
    return 'SYSTEM';
  }

  if (/^[+-]\d{4}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}:${trimmed.slice(3)}`;
  }

  if (/^[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function resolveDriverTimezone(normalizedTimezone) {
  return normalizedTimezone === 'UTC' ? 'Z' : 'local';
}

function buildSslOptions(sslConfig = {}) {
  const requestedMode = (sslConfig.mode ?? 'prefer').toString().toLowerCase().replace(/_/g, '-');
  const allowedModes = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);
  const mode = allowedModes.has(requestedMode) ? requestedMode : 'prefer';

  if (mode === 'disable') {
    return false;
  }

  const hasCertificates = Boolean(sslConfig.ca || sslConfig.cert || sslConfig.key);
  const sslOptions = {
    minVersion: sslConfig.minVersion ?? 'TLSv1.2'
  };

  if (sslConfig.ca) {
    sslOptions.ca = Array.isArray(sslConfig.ca) ? sslConfig.ca : [sslConfig.ca];
  }

  if (sslConfig.cert) {
    sslOptions.cert = sslConfig.cert;
  }

  if (sslConfig.key) {
    sslOptions.key = sslConfig.key;
  }

  if (sslConfig.passphrase) {
    sslOptions.passphrase = sslConfig.passphrase;
  }

  let rejectUnauthorized = sslConfig.rejectUnauthorized;
  if (rejectUnauthorized === undefined) {
    if (mode === 'verify-ca' || mode === 'verify-full' || mode === 'require') {
      rejectUnauthorized = true;
    } else if (mode === 'allow' || mode === 'prefer') {
      rejectUnauthorized = hasCertificates;
    } else {
      rejectUnauthorized = false;
    }
  }

  if ((mode === 'verify-ca' || mode === 'verify-full') && !sslOptions.ca) {
    dbLogger.warn(
      { mode },
      'Database SSL verify mode configured without CA bundle. Certificate validation may fail.'
    );
  }

  sslOptions.rejectUnauthorized = Boolean(rejectUnauthorized);

  if (!hasCertificates && (mode === 'allow' || mode === 'prefer')) {
    // mysql2 expects an object when TLS should be attempted. Provide a minimal definition.
    sslOptions.ca = undefined;
  }

  return sslOptions;
}

async function executeStatement(connection, sql, bindings = []) {
  if (typeof connection.promise === 'function') {
    const driver = connection.promise();
    await driver.query(sql, bindings);
    return;
  }

  await new Promise((resolve, reject) => {
    connection.query(sql, bindings, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function initialiseConnection(connection, options = {}) {
  const timezone = normalizeTimezoneInput(options.timezone ?? 'UTC');
  const formattedTimezone = timezone === 'UTC' ? '+00:00' : timezone;
  const statementTimeoutMs = Number.isFinite(options.statementTimeoutMs)
    ? Math.max(0, Number(options.statementTimeoutMs))
    : 0;

  const statements = [
    { sql: 'SET time_zone = ?', bindings: [formattedTimezone] },
    { sql: `SET SESSION sql_mode='${SQL_MODE}'` },
    { sql: CHARSET_STATEMENT }
  ];

  if (statementTimeoutMs > 0) {
    statements.push({ sql: 'SET SESSION MAX_EXECUTION_TIME = ?', bindings: [statementTimeoutMs] });
  }

  for (const statement of statements) {
    try {
      await executeStatement(connection, statement.sql, statement.bindings ?? []);
    } catch (error) {
      error.message = `Failed to run bootstrap statement "${statement.sql}": ${error.message}`;
      throw error;
    }
  }

  return connection;
}

export function buildKnexConfig(databaseEnv = env.database) {
  const normalizedClient = String(databaseEnv.client ?? '').toLowerCase();
  const isTestEnvironment = env.nodeEnv === 'test';
  const prefersSqlite =
    normalizedClient === 'sqlite3' ||
    (isTestEnvironment && normalizedClient !== 'mysql' && normalizedClient !== 'mysql2');

  if (prefersSqlite) {
    const sqliteConfig = {
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      pool: {
        min: 1,
        max: 1,
        idleTimeoutMillis: 500
      },
      useNullAsDefault: true,
      log: {
        warn: (event) => logKnexEvent('warn', event),
        error: (event) => logKnexEvent('error', event),
        deprecate: (event) => logKnexEvent('warn', { ...normaliseKnexEvent(event), deprecation: true }),
        debug: (event) => logKnexEvent('debug', event)
      },
      migrations: {
        tableName: databaseEnv.migrations?.tableName ?? 'schema_migrations'
      }
    };

    return {
      knex: sqliteConfig,
      session: { timezone: 'UTC', statementTimeoutMs: 0 },
      replicas: []
    };
  }

  const urlSettings = databaseEnv.url ? parseDatabaseUrl(databaseEnv.url) : {};
  const timezone = normalizeTimezoneInput(databaseEnv.timezone ?? urlSettings.timezone ?? 'UTC');
  const driverTimezone = resolveDriverTimezone(timezone);
  const statementTimeoutMs = Number.isFinite(databaseEnv.statementTimeoutMs)
    ? Math.max(0, Number(databaseEnv.statementTimeoutMs))
    : Number.isFinite(urlSettings.statementTimeoutMs)
      ? Math.max(0, Number(urlSettings.statementTimeoutMs))
      : 0;

  const sslOptions = buildSslOptions({
    ...databaseEnv.ssl,
    mode: urlSettings.sslMode ?? databaseEnv.ssl?.mode
  });

  const connection = {
    host: databaseEnv.host ?? urlSettings.host ?? '127.0.0.1',
    port: Number(databaseEnv.port ?? urlSettings.port ?? 3306),
    user: databaseEnv.user ?? urlSettings.user,
    password: databaseEnv.password ?? urlSettings.password,
    database: databaseEnv.name ?? urlSettings.database,
    charset: 'utf8mb4',
    timezone: driverTimezone,
    supportBigNumbers: true,
    bigNumberStrings: false,
    decimalNumbers: true,
    multipleStatements: false,
    connectTimeout: databaseEnv.connectTimeoutMs,
    ssl: sslOptions || undefined
  };

  const socketPath = databaseEnv.socketPath ?? urlSettings.socketPath;
  if (socketPath) {
    connection.socketPath = socketPath;
    delete connection.host;
    delete connection.port;
  }

  const session = { timezone, statementTimeoutMs };

  const pool = {
    min: databaseEnv.poolMin,
    max: databaseEnv.poolMax,
    idleTimeoutMillis: databaseEnv.poolIdleTimeoutMs,
    createTimeoutMillis: databaseEnv.poolCreateTimeoutMs,
    acquireTimeoutMillis: databaseEnv.poolAcquireTimeoutMs,
    afterCreate: (conn, done) => {
      initialiseConnection(conn, session)
        .then(() => done(null, conn))
        .catch((error) => {
          dbLogger.error({ err: error }, 'Failed to initialise MySQL session');
          done(error, conn);
        });
    }
  };

  const knexConfig = {
    client: 'mysql2',
    connection,
    pool,
    acquireConnectionTimeout: databaseEnv.poolAcquireTimeoutMs,
    debug: Boolean(databaseEnv.debug),
    log: {
      warn: (event) => logKnexEvent('warn', event),
      error: (event) => logKnexEvent('error', event),
      deprecate: (event) => logKnexEvent('warn', { ...normaliseKnexEvent(event), deprecation: true }),
      debug: (event) => logKnexEvent('debug', event)
    },
    migrations: {
      tableName: databaseEnv.migrations?.tableName ?? 'schema_migrations'
    }
  };

  return {
    knex: knexConfig,
    session,
    replicas: Array.isArray(databaseEnv.readReplicaUrls) ? databaseEnv.readReplicaUrls : []
  };
}

const { knex: knexConfiguration } = buildKnexConfig();

const db = createKnex(knexConfiguration);

export const healthcheck = async () => {
  await db.raw('select 1 as health_check');
};

export default db;
