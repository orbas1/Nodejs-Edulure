#!/usr/bin/env node

import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import { loadEnvironmentFiles } from '../src/config/loadEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadedEnvFiles = loadEnvironmentFiles({ includeExample: true });

if (loadedEnvFiles.length === 0) {
  console.warn('No environment files found. Falling back to existing process environment.');
}

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing database environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const dbPort = Number(process.env.DB_PORT);
if (!Number.isInteger(dbPort) || dbPort <= 0) {
  console.error('DB_PORT must be a positive integer.');
  process.exit(1);
}

async function ensureSocketPathAccessible(socketPath) {
  try {
    await fs.access(socketPath);
  } catch (error) {
    const reason = error?.code === 'ENOENT' ? 'does not exist' : 'is not accessible';
    throw new Error(`MySQL socket path "${socketPath}" ${reason}. Start the MySQL server or update DB_SOCKET_PATH.`);
  }
}

async function ensurePortReachable({ host, port, timeoutMs }) {
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000;

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    const onError = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.once('error', onError);
    socket.once('connect', () => {
      socket.end();
      resolve();
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      reject(new Error(`Timed out after ${timeout}ms attempting to connect to ${host}:${port}`));
    });
  });
}

async function ensureServerReachable() {
  if (process.env.DB_SOCKET_PATH) {
    await ensureSocketPathAccessible(process.env.DB_SOCKET_PATH);
    return;
  }

  const host = process.env.DB_HOST;
  const port = dbPort;

  try {
    await ensurePortReachable({ host, port, timeoutMs: Number(process.env.DB_CONNECT_TIMEOUT_MS) });
  } catch (error) {
    const message =
      error.code === 'ECONNREFUSED'
        ? `Unable to reach MySQL at ${host}:${port}. Ensure the database server is running and accepting TCP connections.`
        : error.message;
    throw new Error(message);
  }
}

const knexConfig = createRequire(import.meta.url)('../knexfile.cjs');

let cachedMysqlClient = null;
let cachedKnexFactory = null;

async function resolveMysqlClient() {
  if (cachedMysqlClient) {
    return cachedMysqlClient;
  }

  try {
    const mysqlModule = await import('mysql2/promise');
    cachedMysqlClient = mysqlModule?.default ?? mysqlModule;
    return cachedMysqlClient;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'The mysql2 driver is not installed. Run "npm install" (or pnpm/yarn install) before executing db:install.'
      );
    }

    throw error;
  }
}

async function resolveKnexFactory() {
  if (cachedKnexFactory) {
    return cachedKnexFactory;
  }

  try {
    const knexModule = await import('knex');
    cachedKnexFactory = knexModule?.default ?? knexModule;
    return cachedKnexFactory;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
      throw new Error('Knex is not installed. Install project dependencies before running db:install.');
    }

    throw error;
  }
}

function validateIdentifier(value, label, { allowWildcard = false } = {}) {
  const pattern = allowWildcard ? /^[A-Za-z0-9_%.-]+$/ : /^[A-Za-z0-9_-]+$/;
  if (!pattern.test(value)) {
    throw new Error(
      allowWildcard
        ? `${label} may only include letters, numbers, percent (%), dot (.), or hyphen characters.`
        : `${label} may only include letters, numbers, underscores, or hyphens.`
    );
  }
}

async function provisionDatabase() {
  const dbName = process.env.DB_NAME;
  validateIdentifier(dbName, 'DB_NAME');

  const mysql = await resolveMysqlClient();
  const rootConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: dbPort,
    user: process.env.DB_ROOT_USER ?? process.env.DB_USER,
    password: process.env.DB_ROOT_PASSWORD ?? process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );

    if (process.env.DB_PROVISION_USER === 'true') {
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;
      const dbHost = process.env.DB_USER_HOST ?? '%';
      validateIdentifier(dbUser, 'DB_USER');
      validateIdentifier(dbHost, 'DB_USER_HOST', { allowWildcard: true });
      await rootConnection.query(
        `CREATE USER IF NOT EXISTS '${dbUser}'@'${dbHost}' IDENTIFIED BY '${dbPassword}';`
      );
      await rootConnection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'${dbHost}';`);
      await rootConnection.query('FLUSH PRIVILEGES;');
    }
  } finally {
    await rootConnection.end();
  }
}

async function runMigrations({ skipMigrate, skipSeed } = {}) {
  const knexFactory = await resolveKnexFactory();
  const db = knexFactory(knexConfig);
  try {
    if (!skipMigrate) {
      await db.migrate.latest();
      console.log('Database migrations applied successfully');
    }
    if (!skipSeed) {
      await db.seed.run();
      console.log('Database seeds executed successfully');
    }
  } finally {
    await db.destroy();
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      'skip-migrate': { type: 'boolean', default: false },
      'skip-seed': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false }
    }
  });

  const isProduction = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  if (isProduction && !values.force) {
    console.error('Refusing to install database in production without --force.');
    process.exit(1);
    return;
  }

  try {
    await ensureServerReachable();
    await provisionDatabase();
    await runMigrations({ skipMigrate: values['skip-migrate'], skipSeed: values['skip-seed'] });
  } catch (error) {
    console.error('Failed to provision database', error.message ?? error);
    if (error?.code === 'ECONNREFUSED') {
      console.error(
        'MySQL refused the connection. Start the database service or update DB_HOST/DB_PORT before re-running db:install.'
      );
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected database installation failure', error);
  process.exit(1);
});
