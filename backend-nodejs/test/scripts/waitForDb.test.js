import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseDatabaseUrl, resolveWaitOptions } from '../../scripts/wait-for-db.js';

const ENV_KEYS = [
  'DATABASE_URL',
  'DB_WAIT_TIMEOUT_MS',
  'DB_WAIT_INTERVAL_MS',
  'DB_WAIT_USE_SSL',
  'DB_WAIT_STRICT_SSL'
];

const originalEnv = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(originalEnv, key)) {
      continue;
    }
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('parseDatabaseUrl', () => {
  it('parses standard mysql connection strings', () => {
    const config = parseDatabaseUrl('mysql://edulure:launch@db.example.com:3307/platform');

    expect(config).toMatchObject({
      host: 'db.example.com',
      port: 3307,
      user: 'edulure',
      password: 'launch',
      database: 'platform'
    });
    expect(config.ssl).toBeUndefined();
  });

  it('decodes percent-encoded credentials and defaults the port', () => {
    const config = parseDatabaseUrl('mysql://encoded%20user:enc%23pass@localhost/tenant_db');

    expect(config).toMatchObject({
      host: 'localhost',
      port: 3306,
      user: 'encoded user',
      password: 'enc#pass',
      database: 'tenant_db'
    });
  });

  it('includes socket path overrides when provided', () => {
    const config = parseDatabaseUrl('mysql://user:pass@localhost/platform?socketPath=%2Fvar%2Frun%2Fmysql.sock');

    expect(config.socketPath).toBe('/var/run/mysql.sock');
  });

  it('enables TLS when requested via query parameters', () => {
    const certificate = Buffer.from('-----BEGIN CERT-----\nfake\n-----END CERT-----').toString('base64');
    const config = parseDatabaseUrl(
      `mysql://user:pass@mysql.example.com/app?sslmode=require&rejectUnauthorized=false&ca=${certificate}`
    );

    expect(config.ssl).toBeDefined();
    expect(config.ssl.rejectUnauthorized).toBe(false);
    expect(config.ssl.ca).toContain('BEGIN CERT');
  });

  it('forces TLS when the environment flag is set', () => {
    process.env.DB_WAIT_USE_SSL = 'true';

    const config = parseDatabaseUrl('mysql://user:pass@mysql.example.com/app');

    expect(config.ssl).toBeDefined();
    expect(config.ssl.rejectUnauthorized).toBe(true);
  });

  it('throws when a non-mysql protocol is provided', () => {
    expect(() => parseDatabaseUrl('postgres://user:pass@localhost/db')).toThrow('mysql or mysql2 protocol');
  });
});

describe('resolveWaitOptions', () => {
  it('uses defaults when environment overrides are not provided', () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost/app';

    const options = resolveWaitOptions();

    expect(options).toEqual({
      url: 'mysql://user:pass@localhost/app',
      timeoutMs: 120000,
      intervalMs: 5000
    });
  });

  it('prefers explicit overrides and clamps the interval to the timeout window', () => {
    const options = resolveWaitOptions({
      url: 'mysql://user:pass@localhost/app',
      timeoutMs: 2000,
      intervalMs: 5000
    });

    expect(options.timeoutMs).toBe(2000);
    expect(options.intervalMs).toBe(2000);
  });

  it('throws when no database url is available', () => {
    expect(() => resolveWaitOptions()).toThrow('DATABASE_URL must be set');
  });
});
