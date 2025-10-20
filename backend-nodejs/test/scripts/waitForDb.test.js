import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseDatabaseUrl, resolveWaitOptions } from '../../scripts/wait-for-db.js';

const ENV_KEYS = [
  'DATABASE_URL',
  'DB_WAIT_TIMEOUT_MS',
  'DB_WAIT_INTERVAL_MS',
  'DB_WAIT_USE_SSL',
  'DB_WAIT_STRICT_SSL',
  'DB_WAIT_SSL_CA',
  'DB_WAIT_SSL_CERT',
  'DB_WAIT_SSL_KEY',
  'DB_WAIT_SSL_REJECT_UNAUTHORIZED'
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

  it('loads TLS materials from file paths, URLs, and base64 payloads', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-for-db-'));
    try {
      const caPath = path.join(tmpDir, 'ca.pem');
      const certPath = path.join(tmpDir, 'client-cert.pem');
      const caContent = '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----';
      const certContent = '-----BEGIN CERTIFICATE-----\nCLIENT\n-----END CERTIFICATE-----';
      fs.writeFileSync(caPath, caContent);
      fs.writeFileSync(certPath, certContent);
      const keyContent = '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----';
      const keyBase64 = Buffer.from(keyContent).toString('base64');

      const config = parseDatabaseUrl(
        `mysql://user:pass@mysql.example.com/app?ssl=true&ca=${encodeURIComponent(caPath)}` +
        `&cert=${encodeURIComponent(pathToFileURL(certPath).toString())}&key=${keyBase64}`
      );

      expect(config.ssl).toBeDefined();
      expect(config.ssl.ca).toBe(caContent);
      expect(config.ssl.cert).toBe(certContent);
      expect(config.ssl.key).toBe(keyContent);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('forces TLS when the environment flag is set', () => {
    process.env.DB_WAIT_USE_SSL = 'true';

    const config = parseDatabaseUrl('mysql://user:pass@mysql.example.com/app');

    expect(config.ssl).toBeDefined();
    expect(config.ssl.rejectUnauthorized).toBe(true);
  });

  it('honors TLS environment overrides when query params are absent', () => {
    process.env.DB_WAIT_USE_SSL = 'true';
    process.env.DB_WAIT_SSL_CA = Buffer.from('-----BEGIN CERT-----\nENV CA\n-----END CERT-----').toString('base64');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-for-db-env-'));
    try {
      const certPath = path.join(tmpDir, 'cert.pem');
      fs.writeFileSync(certPath, '-----BEGIN CERTIFICATE-----\nENV CERT\n-----END CERTIFICATE-----');
      process.env.DB_WAIT_SSL_CERT = pathToFileURL(certPath).toString();
      process.env.DB_WAIT_SSL_KEY = '-----BEGIN PRIVATE KEY-----\nENV KEY\n-----END PRIVATE KEY-----';
      process.env.DB_WAIT_SSL_REJECT_UNAUTHORIZED = 'false';

      const config = parseDatabaseUrl('mysql://user:pass@mysql.example.com/app');

      expect(config.ssl).toBeDefined();
      expect(config.ssl.rejectUnauthorized).toBe(false);
      expect(config.ssl.ca).toContain('ENV CA');
      expect(config.ssl.cert).toContain('ENV CERT');
      expect(config.ssl.key).toContain('ENV KEY');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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
