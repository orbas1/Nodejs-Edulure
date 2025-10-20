#!/usr/bin/env node
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

function decodeMaybeBase64(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('-----BEGIN')) {
    return trimmed;
  }

  try {
    return Buffer.from(trimmed, 'base64').toString('utf8');
  } catch (_error) {
    return trimmed;
  }
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
  const rejectUnauthorizedParam = params.get('rejectUnauthorized');
  const caParam = params.get('ca');
  const certParam = params.get('cert');
  const keyParam = params.get('key');

  const envForceSsl = process.env.DB_WAIT_USE_SSL === 'true';
  const envDisableSsl = process.env.DB_WAIT_USE_SSL === 'false';
  const strictSsl = process.env.DB_WAIT_STRICT_SSL === 'true';

  const ca = decodeMaybeBase64(caParam);
  const cert = decodeMaybeBase64(certParam);
  const key = decodeMaybeBase64(keyParam);

  const shouldEnableSslFromUrl = sslFlag === 'true' || ['require', 'verify-ca', 'verify-full'].includes(sslMode);
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
