import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const createConnectionMock = vi.hoisted(() => vi.fn());
const delayMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('mysql2/promise', () => ({
  __esModule: true,
  default: {
    createConnection: createConnectionMock
  }
}));

vi.mock('node:timers/promises', () => ({
  setTimeout: delayMock
}));

const waitForDbModulePromise = import('../../scripts/wait-for-db.js');

let classifyDatabaseError;
let parseCliArguments;
let parseDatabaseUrl;
let resolveWaitOptions;
let runCli;
let waitForDatabase;

const ENV_KEYS = [
  'DATABASE_URL',
  'DB_WAIT_TIMEOUT_MS',
  'DB_WAIT_INTERVAL_MS',
  'DB_WAIT_USE_SSL',
  'DB_WAIT_STRICT_SSL',
  'DB_WAIT_SSL_CA',
  'DB_WAIT_SSL_CERT',
  'DB_WAIT_SSL_KEY',
  'DB_WAIT_SSL_REJECT_UNAUTHORIZED',
  'DATABASE_URL_FILE',
  'DB_WAIT_URL_FILE'
];

const originalEnv = {};

beforeAll(async () => {
  ({
    classifyDatabaseError,
    parseCliArguments,
    parseDatabaseUrl,
    resolveWaitOptions,
    runCli,
    waitForDatabase
  } = await waitForDbModulePromise);
});

beforeEach(() => {
  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(originalEnv, key)) {
      continue;
    }
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }

  createConnectionMock.mockReset();
  delayMock.mockReset();
  delayMock.mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  vi.clearAllMocks();
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

  it('prioritises TLS override flags over environment configuration', () => {
    const config = parseDatabaseUrl('mysql://user:pass@mysql.example.com/app', {
      env: { DB_WAIT_USE_SSL: 'false' },
      tls: { useSsl: true, rejectUnauthorized: false }
    });

    expect(config.ssl).toBeDefined();
    expect(config.ssl.rejectUnauthorized).toBe(false);
  });

  it('enforces strict SSL when requested regardless of other overrides', () => {
    const config = parseDatabaseUrl('mysql://user:pass@mysql.example.com/app', {
      tls: { strictSsl: true, useSsl: false, rejectUnauthorized: false }
    });

    expect(config.ssl).toBeDefined();
    expect(config.ssl.rejectUnauthorized).toBe(true);
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

  it('loads the database url from a file when provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-url-'));
    try {
      const urlFile = path.join(tmpDir, 'db-url.txt');
      fs.writeFileSync(urlFile, 'mysql://user:pass@localhost/filedb');

      const options = resolveWaitOptions({ urlFile });

      expect(options.url).toBe('mysql://user:pass@localhost/filedb');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reads database url file paths from the environment', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-url-env-'));
    try {
      const urlFile = path.join(tmpDir, 'db-url.txt');
      fs.writeFileSync(urlFile, 'mysql://user:pass@localhost/envdb');
      process.env.DATABASE_URL_FILE = urlFile;

      const options = resolveWaitOptions();

      expect(options.url).toBe('mysql://user:pass@localhost/envdb');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws when the referenced database url file does not exist', () => {
    expect(() => resolveWaitOptions({ urlFile: '/does/not/exist' })).toThrow('Database URL file not found');
  });
});

describe('classifyDatabaseError', () => {
  it('identifies fatal authentication failures', () => {
    const result = classifyDatabaseError({
      code: 'ER_ACCESS_DENIED_ERROR',
      message: 'Access denied for user'
    });

    expect(result).toMatchObject({
      fatal: true,
      reason: expect.stringMatching(/Authentication failed/i)
    });
  });

  it('provides guidance for transient network issues', () => {
    const result = classifyDatabaseError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });

    expect(result).toMatchObject({
      fatal: false,
      reason: expect.stringMatching(/rejected the TCP connection/i),
      resolution: expect.stringMatching(/Confirm the database container or host/i)
    });
  });
});

describe('waitForDatabase', () => {
  it('fails fast for fatal authentication errors', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost/app';

    createConnectionMock.mockRejectedValue(
      Object.assign(new Error('Access denied for user'), { code: 'ER_ACCESS_DENIED_ERROR' })
    );

    await expect(waitForDatabase()).rejects.toMatchObject({
      message: expect.stringMatching(/Authentication failed/i)
    });
    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(delayMock).not.toHaveBeenCalled();
  });

  it('retries transient errors until a connection succeeds', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost/app';

    const connection = {
      ping: vi.fn().mockResolvedValue(undefined),
      end: vi.fn().mockResolvedValue(undefined)
    };

    createConnectionMock
      .mockRejectedValueOnce(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }))
      .mockResolvedValue(connection);

    const result = await waitForDatabase();

    expect(result.attempts).toBe(2);
    expect(createConnectionMock).toHaveBeenCalledTimes(2);
    expect(delayMock).toHaveBeenCalledTimes(1);
  });
});

describe('parseCliArguments', () => {
  it('parses connection, TLS, and output options correctly', () => {
    const parsed = parseCliArguments([
      '--url',
      'mysql://user:pass@localhost/app',
      '--timeout',
      '15000',
      '--interval=750',
      '--use-ssl',
      '--allow-unauthorized',
      '--ca',
      '/tmp/ca.pem',
      '--cert',
      'file:///tmp/cert.pem',
      '--key',
      'KEYDATA',
      '--json',
      '--env',
      'DB_WAIT_STRICT_SSL=true'
    ]);

    expect(parsed).toMatchObject({
      url: 'mysql://user:pass@localhost/app',
      timeoutMs: '15000',
      intervalMs: '750',
      output: 'json'
    });
    expect(parsed.tlsOverrides).toMatchObject({
      useSsl: true,
      rejectUnauthorized: false,
      ca: '/tmp/ca.pem',
      cert: 'file:///tmp/cert.pem',
      key: 'KEYDATA'
    });
    expect(parsed.envOverrides).toMatchObject({ DB_WAIT_STRICT_SSL: 'true' });
    expect(parsed.errors).toHaveLength(0);
  });

  it('collects unknown options as errors', () => {
    const parsed = parseCliArguments(['--unknown']);

    expect(parsed.errors).toEqual(['Unknown option: --unknown']);
  });
});

describe('runCli', () => {
  it('writes JSON output when requested and returns success', async () => {
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };
    const waitStub = vi.fn().mockResolvedValue({ attempts: 2, elapsedMs: 1350 });

    const exitCode = await runCli([
      '--url',
      'mysql://user:pass@localhost/app',
      '--json'
    ], {
      env: {},
      stdout,
      stderr,
      wait: waitStub
    });

    expect(exitCode).toBe(0);
    expect(waitStub).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'mysql://user:pass@localhost/app' }),
      {}
    );
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('"attempts": 2'));
    expect(stderr.write).not.toHaveBeenCalled();
  });

  it('returns an error code and logs details when the wait fails', async () => {
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };
    const waitError = Object.assign(new Error('Connection failed'), {
      cause: new Error('ECONNREFUSED')
    });
    const waitStub = vi.fn().mockRejectedValue(waitError);

    const exitCode = await runCli([
      '--url',
      'mysql://user:pass@localhost/app'
    ], {
      env: {},
      stdout,
      stderr,
      wait: waitStub
    });

    expect(exitCode).toBe(1);
    expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining('Connection failed'));
    expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining('Last error: ECONNREFUSED'));
  });
});
