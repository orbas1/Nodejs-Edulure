#!/usr/bin/env node
import fs from 'fs';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import mysql from 'mysql2/promise';

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_INTERVAL_MS = 5000;

function toPositiveInteger(value, fallback, { minimum } = {}) {
  const min = typeof minimum === 'number' && minimum > 0 ? minimum : 1;
  if (value === undefined || value === null) {
    return Math.max(min, fallback);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return Math.max(min, fallback);
  }

  return parsed;
}

function coalesceNonBlank(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const value = typeof candidate === 'string' ? candidate.trim() : candidate;
    if (typeof value === 'string') {
      if (value !== '') {
        return value;
      }
    } else if (value) {
      return value;
    }
  }

  return undefined;
}

function decodeUriComponentSafe(value) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function readFileContents(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read TLS material from ${filePath}: ${error.message}`);
  }
}

function decodeMaybeBase64OrFile(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('file://')) {
    let filePath;
    try {
      filePath = fileURLToPath(new URL(trimmed));
    } catch (error) {
      throw new Error(`Failed to resolve TLS material URL ${trimmed}: ${error.message}`);
    }

    return readFileContents(filePath);
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    const resolvedPath = path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(resolvedPath)) {
      return readFileContents(resolvedPath);
    }
  }

  if (trimmed.includes('-----BEGIN')) {
    return trimmed;
  }

  const looksBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length % 4 === 0;
  if (looksBase64) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.trim()) {
        return decoded;
      }
    } catch (_error) {
      // ignore, fall back to raw string
    }
  }

  return trimmed;
}

export function resolveWaitOptions(overrides = {}) {
  const timeoutSource = overrides.timeoutMs ?? process.env.DB_WAIT_TIMEOUT_MS;
  const intervalSource = overrides.intervalMs ?? process.env.DB_WAIT_INTERVAL_MS;

  const timeoutMs = toPositiveInteger(timeoutSource, DEFAULT_TIMEOUT_MS, { minimum: 1000 });
  const intervalMs = toPositiveInteger(intervalSource, DEFAULT_INTERVAL_MS, { minimum: 250 });

  const effectiveInterval = Math.min(intervalMs, timeoutMs);

  const url = overrides.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL must be set');
  }

  return {
    url,
    timeoutMs,
    intervalMs: effectiveInterval
  };
}

export function parseDatabaseUrl(urlString) {
  if (!urlString) {
    throw new Error('DATABASE_URL must be set');
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid connection string');
  }

  const protocol = parsed.protocol?.toLowerCase();
  if (!['mysql:', 'mysql2:'].includes(protocol)) {
    throw new Error('DATABASE_URL must use the mysql or mysql2 protocol');
  }

  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  const databasePath = parsed.pathname?.replace(/^\//, '') ?? '';
  const database = databasePath ? decodeURIComponent(databasePath) : undefined;

  const connectionConfig = {
    host: parsed.hostname || undefined,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
    user: username,
    password,
    database
  };

  const params = parsed.searchParams;
  const socketPath = params.get('socketPath') ?? params.get('socket_path');
  if (socketPath) {
    connectionConfig.socketPath = decodeURIComponent(socketPath);
  }

  const sslMode = (params.get('sslmode') ?? '').toLowerCase();
  const sslFlag = (params.get('ssl') ?? '').toLowerCase();
  const rejectUnauthorizedParam = coalesceNonBlank(
    params.get('rejectUnauthorized'),
    params.get('reject_unauthorized'),
    process.env.DB_WAIT_SSL_REJECT_UNAUTHORIZED
  );

  const caParam = coalesceNonBlank(
    params.get('ca'),
    params.get('sslca'),
    params.get('ssl-ca'),
    process.env.DB_WAIT_SSL_CA
  );
  const certParam = coalesceNonBlank(
    params.get('cert'),
    params.get('sslcert'),
    params.get('ssl-cert'),
    process.env.DB_WAIT_SSL_CERT
  );
  const keyParam = coalesceNonBlank(
    params.get('key'),
    params.get('sslkey'),
    params.get('ssl-key'),
    process.env.DB_WAIT_SSL_KEY
  );

  const ca = caParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(caParam)) : undefined;
  const cert = certParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(certParam)) : undefined;
  const key = keyParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(keyParam)) : undefined;

  const envForceSsl = process.env.DB_WAIT_USE_SSL === 'true';
  const envDisableSsl = process.env.DB_WAIT_USE_SSL === 'false';
  const strictSsl = process.env.DB_WAIT_STRICT_SSL === 'true';

  const shouldEnableSslFromUrl = sslFlag === 'true' || ['require', 'verify-ca', 'verify-full'].includes(sslMode) || !!(ca || cert || key);
  const shouldDisableSslFromUrl = sslFlag === 'false' || sslMode === 'disable';
  const explicitReject = typeof rejectUnauthorizedParam === 'string'
    ? rejectUnauthorizedParam.trim().toLowerCase()
    : undefined;

  let ssl;

  if (strictSsl || envForceSsl || (!envDisableSsl && (shouldEnableSslFromUrl || ca || cert || key))) {
    const rejectUnauthorized = strictSsl
      ? true
      : explicitReject === undefined
        ? true
        : explicitReject !== 'false' && explicitReject !== '0';

    ssl = { rejectUnauthorized };
  } else if (shouldDisableSslFromUrl || envDisableSsl) {
    ssl = undefined;
  }

  if (strictSsl && !ssl) {
    ssl = { rejectUnauthorized: true };
  } else if (strictSsl && ssl) {
    ssl.rejectUnauthorized = true;
  }

  if (ssl) {
    if (ca) {
      ssl.ca = ca;
    }
    if (cert) {
      ssl.cert = cert;
    }
    if (key) {
      ssl.key = key;
    }

    connectionConfig.ssl = ssl;
  }

  return connectionConfig;
}

export async function waitForDatabase(overrides = {}) {
  const { url, timeoutMs, intervalMs } = resolveWaitOptions(overrides);
  const connectionConfig = parseDatabaseUrl(url);
  const connectTimeout = Math.min(Math.max(intervalMs, 1000), 30000);
  connectionConfig.connectTimeout = connectTimeout;
  const host = connectionConfig.socketPath ? connectionConfig.socketPath : `${connectionConfig.host}:${connectionConfig.port}`;
  const database = connectionConfig.database ?? '<default>';

  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start <= timeoutMs) {
    attempt += 1;
    let connection;
    try {
      connection = await mysql.createConnection(connectionConfig);
      await connection.ping();
      await connection.end();

      const elapsedMs = Date.now() - start;
      return { attempts: attempt, elapsedMs };
    } catch (error) {
      await connection?.end().catch(() => {});

      const elapsedMs = Date.now() - start;
      if (elapsedMs + intervalMs > timeoutMs) {
        const timeoutError = new Error(
          `Timed out waiting for database after ${Math.round(timeoutMs / 1000)} seconds`
        );
        timeoutError.cause = error;
        timeoutError.details = {
          host,
          database,
          attempts: attempt,
          elapsedMs
        };
        throw timeoutError;
      }

      console.warn(
        `Database not ready (attempt ${attempt}) for ${host}/${database}: ${error.message}`
      );
      await delay(intervalMs);
    }
  }

  const elapsedMs = Date.now() - start;
  const timeoutError = new Error(`Timed out waiting for database after ${Math.round(timeoutMs / 1000)} seconds`);
  timeoutError.details = { host, database, attempts: attempt, elapsedMs };
  throw timeoutError;
}

async function runCli() {
  try {
    const result = await waitForDatabase();
    console.log(
      `Database connection established after ${Math.round(result.elapsedMs / 100) / 10}s (attempt ${result.attempts})`
    );
  } catch (error) {
    console.error(error.message);
    if (error.cause) {
      console.error(`Last error: ${error.cause.message}`);
    }
    process.exit(1);
  }
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath && modulePath === invokedPath) {
  runCli();
}
