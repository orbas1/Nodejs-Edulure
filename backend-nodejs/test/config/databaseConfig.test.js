import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('knex', () => ({
  default: vi.fn(() => ({
    raw: vi.fn().mockResolvedValue([{ health_check: 1 }])
  }))
}));

vi.mock('../../src/config/logger.js', () => {
  const createLogger = () => {
    const instance = {
      fatal: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn()
    };
    instance.child = vi.fn(() => createLogger());
    return instance;
  };

  const rootLogger = createLogger();
  rootLogger.child.mockReturnValue(createLogger());

  return { default: rootLogger };
});

const baseSsl = {
  mode: 'disable',
  rejectUnauthorized: true,
  ca: null,
  cert: null,
  key: null,
  passphrase: null,
  minVersion: 'TLSv1.2'
};

const buildEnv = (overrides = {}) => {
  const { ssl: sslOverrides, ...rest } = overrides;
  return {
    url: null,
    readReplicaUrls: [],
    host: 'localhost',
    port: 3306,
    user: 'edulure',
    password: 'edulure-secret',
    name: 'edulure_app',
    socketPath: null,
    timezone: 'UTC',
    poolMin: 1,
    poolMax: 8,
    poolIdleTimeoutMs: 60000,
    poolAcquireTimeoutMs: 60000,
    poolCreateTimeoutMs: 30000,
    connectTimeoutMs: 10000,
    statementTimeoutMs: 0,
    debug: false,
    migrations: { tableName: 'schema_migrations' },
    ssl: { ...baseSsl, ...(sslOverrides ?? {}) },
    ...rest
  };
};

const requiredEnv = {
  APP_URL: 'https://app.test',
  JWT_REFRESH_SECRET: 'test_refresh_secret_that_is_long_enough_1234567890',
  JWT_SECRET: 'legacy_jwt_secret_value_that_is_long_enough_123456',
  DB_HOST: 'localhost',
  DB_USER: 'tester',
  DB_PASSWORD: 'tester-secret',
  DB_NAME: 'edulure_test',
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_PUBLIC_BUCKET: 'public-bucket',
  R2_PRIVATE_BUCKET: 'private-bucket',
  R2_UPLOADS_BUCKET: 'uploads-bucket',
  R2_QUARANTINE_BUCKET: 'quarantine-bucket',
  STRIPE_SECRET_KEY: 'sk_test_1234567890',
  PAYPAL_CLIENT_ID: 'paypal_client_id_12345',
  PAYPAL_CLIENT_SECRET: 'paypal_client_secret_12345',
  SMTP_HOST: 'smtp.test',
  SMTP_USER: 'smtp-user',
  SMTP_PASSWORD: 'smtp-password',
  SMTP_FROM_EMAIL: 'noreply@test.com',
  SMTP_FROM_NAME: 'Test Sender',
  EMAIL_VERIFICATION_URL: 'https://verify.test',
  MEILISEARCH_HOSTS: 'https://search.test',
  MEILISEARCH_ADMIN_API_KEY: 'search-admin-key',
  MEILISEARCH_SEARCH_API_KEY: 'search-public-key'
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const { buildKnexConfig, initialiseConnection } = await import('../../src/config/database.js');

describe('buildKnexConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds a MySQL configuration with TLS material and explicit overrides', () => {
    const config = buildEnv({
      url: 'mysql://example:secret@db.internal:3306/app?statement_timeout=12000',
      host: 'primary.db.edulure',
      port: 3307,
      timezone: 'UTC',
      statementTimeoutMs: 7000,
      debug: true,
      migrations: { tableName: 'custom_schema_history' },
      ssl: {
        mode: 'verify-full',
        rejectUnauthorized: true,
        ca: '---CA---',
        cert: '---CERT---',
        key: '---KEY---',
        passphrase: 'top-secret'
      }
    });

    const result = buildKnexConfig(config);

    expect(result.knex.client).toBe('mysql2');
    expect(result.knex.connection.host).toBe('primary.db.edulure');
    expect(result.knex.connection.port).toBe(3307);
    expect(result.knex.connection.timezone).toBe('Z');
    expect(result.knex.connection.ssl).toMatchObject({
      rejectUnauthorized: true,
      cert: '---CERT---',
      key: '---KEY---',
      passphrase: 'top-secret',
      minVersion: 'TLSv1.2'
    });
    expect(result.knex.connection.ssl.ca).toEqual(['---CA---']);
    expect(result.knex.pool.min).toBe(1);
    expect(result.knex.pool.max).toBe(8);
    expect(result.knex.migrations.tableName).toBe('custom_schema_history');
    expect(result.session.statementTimeoutMs).toBe(7000);
    expect(Array.isArray(result.replicas)).toBe(true);
  });

  it('derives configuration from connection URL when explicit values are missing', () => {
    const env = buildEnv({
      url: 'mysql://reader:pw@readonly.db:3308/reporting?timezone=Europe/Paris&statement_timeout=9000',
      host: undefined,
      port: undefined,
      user: undefined,
      password: undefined,
      name: undefined,
      timezone: undefined,
      statementTimeoutMs: undefined
    });

    const result = buildKnexConfig(env);

    expect(result.knex.connection.host).toBe('readonly.db');
    expect(result.knex.connection.port).toBe(3308);
    expect(result.knex.connection.user).toBe('reader');
    expect(result.knex.connection.database).toBe('reporting');
    expect(result.session.timezone).toBe('Europe/Paris');
    expect(result.session.statementTimeoutMs).toBe(9000);
  });

  it('omits TLS configuration entirely when disabled', () => {
    const env = buildEnv({
      ssl: {
        mode: 'disable',
        rejectUnauthorized: true,
        ca: null,
        cert: null,
        key: null,
        passphrase: null
      }
    });

    const result = buildKnexConfig(env);

    expect(result.knex.connection.ssl).toBeUndefined();
  });

  it('prefers socket connections when socketPath is supplied', () => {
    const env = buildEnv({ socketPath: '/var/run/mysqld/mysqld.sock' });
    const result = buildKnexConfig(env);

    expect(result.knex.connection.socketPath).toBe('/var/run/mysqld/mysqld.sock');
    expect(result.knex.connection.host).toBeUndefined();
    expect(result.knex.connection.port).toBeUndefined();
  });
});

describe('initialiseConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the bootstrap statements in order', async () => {
    const query = vi.fn().mockResolvedValue([[], []]);
    const connection = {
      promise: () => ({ query })
    };

    await initialiseConnection(connection, { timezone: 'America/New_York', statementTimeoutMs: 15000 });

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0]).toEqual(['SET time_zone = ?', ['America/New_York']]);
    expect(query.mock.calls[1][0]).toContain('SET SESSION sql_mode');
    expect(query.mock.calls[2][0]).toBe('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    expect(query.mock.calls[3]).toEqual(['SET SESSION MAX_EXECUTION_TIME = ?', [15000]]);
  });

  it('throws a descriptive error when a bootstrap statement fails', async () => {
    const error = new Error('permission denied');
    const query = vi
      .fn()
      .mockResolvedValueOnce([[], []])
      .mockRejectedValueOnce(error);
    const connection = {
      promise: () => ({ query })
    };

    await expect(initialiseConnection(connection, { timezone: 'UTC' })).rejects.toThrow(
      /Failed to run bootstrap statement "SET SESSION sql_mode/ 
    );
  });
});
