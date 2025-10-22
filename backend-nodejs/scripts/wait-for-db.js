#!/usr/bin/env node
import fs from 'fs';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import mysql from 'mysql2/promise';

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_INTERVAL_MS = 5000;

const require = createRequire(import.meta.url);
const PACKAGE_VERSION = (() => {
  try {
    const pkg = require('../package.json');
    return pkg?.version ?? '0.0.0';
  } catch (_error) {
    return '0.0.0';
  }
})();

const MYSQL_FATAL_ERROR_HINTS = new Map([
  [
    'ER_ACCESS_DENIED_ERROR',
    {
      reason: 'Authentication failed for the provided database credentials',
      resolution: 'Verify that the configured username and password are correct and active.'
    }
  ],
  [
    'ER_DBACCESS_DENIED_ERROR',
    {
      reason: 'The database user does not have permission to access the requested schema',
      resolution: 'Grant the user access to the target schema or choose a schema the user can access.'
    }
  ],
  [
    'ER_BAD_DB_ERROR',
    {
      reason: 'The specified database does not exist',
      resolution: 'Create the database or update DATABASE_URL to point at an existing schema.'
    }
  ],
  [
    'ER_ACCESS_DENIED_NO_PASSWORD_ERROR',
    {
      reason: 'The database rejected the connection because a password was not provided',
      resolution: 'Supply the correct password in DATABASE_URL or grant passwordless access explicitly.'
    }
  ],
  [
    'ER_NOT_SUPPORTED_AUTH_MODE',
    {
      reason: 'The database requires an authentication plugin that this client does not support',
      resolution: 'Enable a compatible authentication plugin (such as mysql_native_password) or upgrade the client.'
    }
  ]
]);

const MYSQL_FATAL_ERRNO_HINTS = new Map([
  [1045, MYSQL_FATAL_ERROR_HINTS.get('ER_ACCESS_DENIED_ERROR')],
  [1044, MYSQL_FATAL_ERROR_HINTS.get('ER_DBACCESS_DENIED_ERROR')],
  [1049, MYSQL_FATAL_ERROR_HINTS.get('ER_BAD_DB_ERROR')],
  [1251, MYSQL_FATAL_ERROR_HINTS.get('ER_NOT_SUPPORTED_AUTH_MODE')]
]);

const MYSQL_FATAL_SQLSTATE_HINTS = new Map([
  ['28000', MYSQL_FATAL_ERROR_HINTS.get('ER_ACCESS_DENIED_ERROR')],
  ['42000', MYSQL_FATAL_ERROR_HINTS.get('ER_DBACCESS_DENIED_ERROR')]
]);

const NODE_TLS_FATAL_HINTS = new Map([
  [
    'ERR_TLS_CERT_ALTNAME_INVALID',
    {
      reason: 'The database TLS certificate does not match the configured hostname',
      resolution: 'Update the DATABASE_URL host or install a certificate that contains the expected hostnames.'
    }
  ],
  [
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    {
      reason: 'The database TLS certificate chain is self-signed and was rejected',
      resolution: 'Install a trusted CA certificate or disable strict verification for development environments.'
    }
  ],
  [
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    {
      reason: 'The database TLS certificate chain could not be verified',
      resolution: 'Ensure the full CA chain is provided and trusted by the runtime environment.'
    }
  ]
]);

const TRANSIENT_ERROR_HINTS = new Map([
  [
    'ECONNREFUSED',
    {
      reason: 'The database service rejected the TCP connection',
      resolution: 'Confirm the database container or host is running and accepting connections.'
    }
  ],
  [
    'ECONNRESET',
    {
      reason: 'The database service reset the network connection during handshake',
      resolution: 'The database may still be booting; it will be retried automatically.'
    }
  ],
  [
    'ENOTFOUND',
    {
      reason: 'The database host could not be resolved via DNS',
      resolution: 'Ensure the DATABASE_URL host resolves in this environment.'
    }
  ],
  [
    'EHOSTUNREACH',
    {
      reason: 'The database host is unreachable from this environment',
      resolution: 'Verify network routing or VPN connectivity to the database host.'
    }
  ],
  [
    'ETIMEDOUT',
    {
      reason: 'The database did not respond before the network timeout elapsed',
      resolution: 'The database may still be starting up; it will be retried automatically.'
    }
  ],
  [
    'EAI_AGAIN',
    {
      reason: 'The DNS resolver timed out while looking up the database host',
      resolution: 'DNS should recover automatically; check upstream resolvers if the issue persists.'
    }
  ],
  [
    'PROTOCOL_CONNECTION_LOST',
    {
      reason: 'The database closed the connection unexpectedly during handshake',
      resolution: 'The database may still be initialising; retrying might succeed once it is ready.'
    }
  ]
]);

const TRANSIENT_SQLSTATE_HINTS = new Map([
  [
    '08S01',
    {
      reason: 'The connection to the database was lost during handshake',
      resolution: 'The database may be restarting; the wait script will retry.'
    }
  ]
]);

const TRANSIENT_ERRNO_HINTS = new Map([
  [
    1042,
    {
      reason: 'The client could not resolve the database hostname',
      resolution: 'Verify DNS configuration or use a direct IP address in DATABASE_URL.'
    }
  ]
]);

const FATAL_MESSAGE_HINTS = [
  {
    test: /access denied/i,
    ...MYSQL_FATAL_ERROR_HINTS.get('ER_ACCESS_DENIED_ERROR')
  },
  {
    test: /unknown database/i,
    ...MYSQL_FATAL_ERROR_HINTS.get('ER_BAD_DB_ERROR')
  },
  {
    test: /does not support authentication protocol/i,
    ...MYSQL_FATAL_ERROR_HINTS.get('ER_NOT_SUPPORTED_AUTH_MODE')
  },
  {
    test: /bad handshake/i,
    reason: 'The server rejected the TLS or authentication handshake',
    resolution: 'Check the TLS configuration and authentication plugins exposed by the database server.'
  }
];

const TRANSIENT_MESSAGE_HINTS = [
  {
    test: /server has gone away/i,
    reason: 'The database closed the connection before the handshake completed',
    resolution: 'The database may still be warming up; the wait script will retry.'
  },
  {
    test: /handshake inactivity timeout/i,
    reason: 'The database did not complete the handshake in time',
    resolution: 'This is usually transient while the database allocates resources.'
  }
];

function lookupHint(value, ...lookups) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = typeof value === 'string' ? value.toUpperCase() : value;
  for (const lookup of lookups) {
    if (!lookup) continue;
    const hint = lookup instanceof Map ? lookup.get(normalized) : undefined;
    if (hint) {
      return hint;
    }
  }

  return undefined;
}

export function classifyDatabaseError(error) {
  if (!error || typeof error !== 'object') {
    return { fatal: false, reason: undefined, resolution: undefined };
  }

  const code = typeof error.code === 'string' ? error.code.toUpperCase() : undefined;
  const errno = typeof error.errno === 'number' ? error.errno : undefined;
  const sqlState = typeof error.sqlState === 'string' ? error.sqlState.toUpperCase() : undefined;
  const message = typeof error.message === 'string' ? error.message : '';

  const fatalHint =
    lookupHint(code, MYSQL_FATAL_ERROR_HINTS, NODE_TLS_FATAL_HINTS) ||
    lookupHint(errno, MYSQL_FATAL_ERRNO_HINTS) ||
    lookupHint(sqlState, MYSQL_FATAL_SQLSTATE_HINTS) ||
    FATAL_MESSAGE_HINTS.find((entry) => entry.test.test(message));

  if (fatalHint || error.fatal === true) {
    const hint = fatalHint ?? {
      reason: 'The database server returned a fatal error during connection establishment',
      resolution: 'Inspect the database logs for details and resolve the misconfiguration before retrying.'
    };

    return {
      fatal: true,
      reason: hint.reason,
      resolution: hint.resolution
    };
  }

  const transientHint =
    lookupHint(code, TRANSIENT_ERROR_HINTS) ||
    lookupHint(errno, TRANSIENT_ERRNO_HINTS) ||
    lookupHint(sqlState, TRANSIENT_SQLSTATE_HINTS) ||
    TRANSIENT_MESSAGE_HINTS.find((entry) => entry.test.test(message));

  return {
    fatal: false,
    reason: transientHint?.reason,
    resolution: transientHint?.resolution ?? 'The wait script will retry automatically until the timeout elapses.'
  };
}

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
  const env = overrides.env ?? process.env;
  const timeoutSource = overrides.timeoutMs ?? env?.DB_WAIT_TIMEOUT_MS;
  const intervalSource = overrides.intervalMs ?? env?.DB_WAIT_INTERVAL_MS;

  const timeoutMs = toPositiveInteger(timeoutSource, DEFAULT_TIMEOUT_MS, { minimum: 1000 });
  const intervalMs = toPositiveInteger(intervalSource, DEFAULT_INTERVAL_MS, { minimum: 250 });

  const effectiveInterval = Math.min(intervalMs, timeoutMs);

  const url = resolveDatabaseUrl(overrides, env);
  if (!url) {
    throw new Error('DATABASE_URL must be set');
  }

  return {
    url,
    timeoutMs,
    intervalMs: effectiveInterval
  };
}

export function parseDatabaseUrl(urlString, { env = process.env, tls: tlsOverrides = {} } = {}) {
  if (!urlString) {
    throw new Error('DATABASE_URL must be set');
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
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
    env?.DB_WAIT_SSL_REJECT_UNAUTHORIZED
  );

  const caParam = coalesceNonBlank(
    params.get('ca'),
    params.get('sslca'),
    params.get('ssl-ca'),
    tlsOverrides.ca,
    env?.DB_WAIT_SSL_CA
  );
  const certParam = coalesceNonBlank(
    params.get('cert'),
    params.get('sslcert'),
    params.get('ssl-cert'),
    tlsOverrides.cert,
    env?.DB_WAIT_SSL_CERT
  );
  const keyParam = coalesceNonBlank(
    params.get('key'),
    params.get('sslkey'),
    params.get('ssl-key'),
    tlsOverrides.key,
    env?.DB_WAIT_SSL_KEY
  );

  const ca = caParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(caParam)) : undefined;
  const cert = certParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(certParam)) : undefined;
  const key = keyParam ? decodeMaybeBase64OrFile(decodeUriComponentSafe(keyParam)) : undefined;

  const overrideUseSsl = typeof tlsOverrides.useSsl === 'boolean' ? tlsOverrides.useSsl : undefined;
  const overrideStrictSsl = typeof tlsOverrides.strictSsl === 'boolean' ? tlsOverrides.strictSsl : undefined;
  const overrideRejectUnauthorized =
    typeof tlsOverrides.rejectUnauthorized === 'boolean' ? tlsOverrides.rejectUnauthorized : undefined;

  const envUseSsl = normalizeBoolean(env?.DB_WAIT_USE_SSL);
  const envStrictSsl = normalizeBoolean(env?.DB_WAIT_STRICT_SSL);

  const strictSsl = overrideStrictSsl ?? envStrictSsl ?? false;

  const shouldEnableSslFromUrl = sslFlag === 'true' || ['require', 'verify-ca', 'verify-full'].includes(sslMode) || !!(ca || cert || key);
  const shouldDisableSslFromUrl = sslFlag === 'false' || sslMode === 'disable';
  const explicitReject = typeof rejectUnauthorizedParam === 'string'
    ? rejectUnauthorizedParam.trim().toLowerCase()
    : undefined;

  let ssl;

  const preferDisableSsl = overrideUseSsl === false || envUseSsl === false;
  const preferEnableSsl = strictSsl || overrideUseSsl === true || envUseSsl === true;

  if (preferEnableSsl || (!preferDisableSsl && (shouldEnableSslFromUrl || ca || cert || key))) {
    const rejectUnauthorized = strictSsl
      ? true
      : overrideRejectUnauthorized ??
        (explicitReject === undefined
          ? true
          : explicitReject !== 'false' && explicitReject !== '0');

    ssl = { rejectUnauthorized };
  } else if (shouldDisableSslFromUrl || preferDisableSsl) {
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

export async function waitForDatabase(overrides = {}, env = process.env) {
  const { tls, env: overrideEnv, ...waitOverrides } = overrides ?? {};
  const effectiveEnv = overrideEnv ?? env ?? process.env;
  const { url, timeoutMs, intervalMs } = resolveWaitOptions({ ...waitOverrides, env: effectiveEnv });
  const connectionConfig = parseDatabaseUrl(url, { env: effectiveEnv, tls });
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
      const classification = classifyDatabaseError(error);

      if (classification.fatal) {
        const fatalError = new Error(
          `${classification.reason} while connecting to ${host}/${database}. ${classification.resolution} Last error: ${error.message}`
        );
        fatalError.cause = error;
        fatalError.details = {
          host,
          database,
          attempts: attempt,
          elapsedMs,
          fatal: true
        };
        throw fatalError;
      }

      if (elapsedMs + intervalMs > timeoutMs) {
        const timeoutError = new Error(
          `Timed out waiting for database after ${Math.round(timeoutMs / 1000)} seconds`
        );
        timeoutError.cause = error;
        timeoutError.details = {
          host,
          database,
          attempts: attempt,
          elapsedMs,
          fatal: false
        };
        throw timeoutError;
      }

      const advisoryParts = [
        `Database not ready (attempt ${attempt}) for ${host}/${database}: ${error.message}`
      ];
      if (classification.reason) {
        advisoryParts.push(`Reason: ${classification.reason}.`);
      }
      if (classification.resolution) {
        advisoryParts.push(classification.resolution);
      }

      console.warn(advisoryParts.join(' '));
      await delay(intervalMs);
    }
  }

  const elapsedMs = Date.now() - start;
  const timeoutError = new Error(`Timed out waiting for database after ${Math.round(timeoutMs / 1000)} seconds`);
  timeoutError.details = { host, database, attempts: attempt, elapsedMs };
  throw timeoutError;
}

export function parseCliArguments(argv = []) {
  const args = Array.from(argv);
  const result = {
    url: undefined,
    urlFile: undefined,
    timeoutMs: undefined,
    intervalMs: undefined,
    tlsOverrides: {},
    output: 'text',
    showHelp: false,
    showVersion: false,
    errors: [],
    envOverrides: {}
  };

  function consumeValue(index, currentArg) {
    const value = args[index + 1];
    if (value === undefined) {
      result.errors.push(`Option ${currentArg} requires a value`);
      return undefined;
    }
    args.splice(index + 1, 1);
    return value;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg || typeof arg !== 'string') {
      continue;
    }

    if (arg.startsWith('--')) {
      const [flag, inlineValue] = arg.split('=', 2);
      let value = inlineValue;

      switch (flag) {
        case '--help':
          result.showHelp = true;
          break;
        case '--version':
          result.showVersion = true;
          break;
        case '--url':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.url = value;
          }
          break;
        case '--url-file':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.urlFile = value;
          }
          break;
        case '--timeout':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.timeoutMs = value;
          }
          break;
        case '--interval':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.intervalMs = value;
          }
          break;
        case '--use-ssl':
          result.tlsOverrides.useSsl = true;
          break;
        case '--no-ssl':
          result.tlsOverrides.useSsl = false;
          break;
        case '--strict-ssl':
          result.tlsOverrides.strictSsl = true;
          break;
        case '--allow-unauthorized':
          result.tlsOverrides.rejectUnauthorized = false;
          break;
        case '--reject-unauthorized':
          result.tlsOverrides.rejectUnauthorized = true;
          break;
        case '--ca':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.tlsOverrides.ca = value;
          }
          break;
        case '--cert':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.tlsOverrides.cert = value;
          }
          break;
        case '--key':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            result.tlsOverrides.key = value;
          }
          break;
        case '--json':
          result.output = 'json';
          break;
        case '--output':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'json' || normalized === 'text') {
              result.output = normalized;
            } else {
              result.errors.push(`Unsupported output format: ${value}`);
            }
          }
          break;
        case '--env':
          if (value === undefined) {
            value = consumeValue(i, flag);
          }
          if (value !== undefined) {
            const [envKey, envValue] = value.split('=', 2);
            if (!envKey) {
              result.errors.push('Environment overrides require KEY=VALUE syntax');
            } else {
              result.envOverrides[envKey] = envValue;
            }
          }
          break;
        default:
          result.errors.push(`Unknown option: ${flag}`);
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      switch (arg) {
        case '-h':
          result.showHelp = true;
          break;
        case '-v':
          result.showVersion = true;
          break;
        case '-j':
          result.output = 'json';
          break;
        default:
          result.errors.push(`Unknown option: ${arg}`);
      }
      continue;
    }

    result.errors.push(`Unexpected argument: ${arg}`);
  }

  result.envOverrides = { ...result.envOverrides };
  return result;
}

export async function runCli(argv = process.argv.slice(2), {
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  wait = waitForDatabase
} = {}) {
  const parsed = parseCliArguments(argv);
  if (parsed.errors.length > 0) {
    for (const message of parsed.errors) {
      stderr.write(`${message}\n`);
    }
    if (!parsed.showHelp) {
      stderr.write('Use --help to see available options.\n');
    }
    return 1;
  }

  if (parsed.showHelp) {
    stdout.write(`Usage: wait-for-db [options]\n`);
    stdout.write(`\n`);
    stdout.write(`Options:\n`);
    stdout.write(`  --url <connection-string>        Override the database connection string\n`);
    stdout.write(`  --url-file <path>                Load the database connection string from a file\n`);
    stdout.write(`  --timeout <ms>                   Override the wait timeout (default ${DEFAULT_TIMEOUT_MS})\n`);
    stdout.write(`  --interval <ms>                  Override the retry interval (default ${DEFAULT_INTERVAL_MS})\n`);
    stdout.write(`  --use-ssl / --no-ssl             Force enabling or disabling TLS\n`);
    stdout.write(`  --strict-ssl                     Enforce certificate validation regardless of other flags\n`);
    stdout.write(`  --allow-unauthorized             Allow self-signed certificates when TLS is enabled\n`);
    stdout.write(`  --reject-unauthorized            Require trusted certificates when TLS is enabled\n`);
    stdout.write(`  --ca --cert --key <value>        Provide TLS materials as file paths, URLs, or base64\n`);
    stdout.write(`  --json | --output <json|text>    Choose the output format\n`);
    stdout.write(`  --env KEY=VALUE                  Provide additional environment overrides\n`);
    stdout.write(`  -h, --help                       Show this help message\n`);
    stdout.write(`  -v, --version                    Show the script version\n`);
    return 0;
  }

  if (parsed.showVersion) {
    stdout.write(`${PACKAGE_VERSION}\n`);
    return 0;
  }

  const effectiveEnv = { ...(env ?? {}), ...parsed.envOverrides };

  try {
    const result = await wait(
      {
        url: parsed.url,
        urlFile: parsed.urlFile,
        timeoutMs: parsed.timeoutMs,
        intervalMs: parsed.intervalMs,
        tls: parsed.tlsOverrides,
        env: effectiveEnv
      },
      effectiveEnv
    );

    if (parsed.output === 'json') {
      stdout.write(
        `${JSON.stringify({ attempts: result.attempts, elapsedMs: result.elapsedMs }, null, 2)}\n`
      );
    } else {
      stdout.write(
        `Database connection established after ${Math.round(result.elapsedMs / 100) / 10}s (attempt ${result.attempts})\n`
      );
    }

    return 0;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    if (error.cause) {
      stderr.write(`Last error: ${error.cause.message}\n`);
    }
    return 1;
  }
}

function resolveDatabaseUrl(overrides, env) {
  const directUrl = coalesceNonBlank(overrides.url);
  if (directUrl) {
    return directUrl;
  }

  const fileSource = coalesceNonBlank(overrides.urlFile, env?.DB_WAIT_URL_FILE, env?.DATABASE_URL_FILE);
  if (fileSource) {
    return readDatabaseUrlFromFile(fileSource);
  }

  return coalesceNonBlank(env?.DATABASE_URL);
}

function readDatabaseUrlFromFile(source) {
  let filePath = source?.trim();
  if (!filePath) {
    return undefined;
  }

  if (filePath.startsWith('file://')) {
    try {
      filePath = fileURLToPath(new URL(filePath));
    } catch (error) {
      throw new Error(`Failed to resolve database URL file ${source}: ${error.message}`);
    }
  } else if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Database URL file not found: ${filePath}`);
  }

  const contents = fs.readFileSync(filePath, 'utf8').trim();
  if (!contents) {
    throw new Error(`Database URL file ${filePath} is empty`);
  }

  return contents;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath && modulePath === invokedPath) {
  runCli()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
