#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import mysql from 'mysql2/promise';
import knex from 'knex';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

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

const knexConfig = createRequire(import.meta.url)('../knexfile.cjs');

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
  const db = knex(knexConfig);
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
    await provisionDatabase();
    await runMigrations({ skipMigrate: values['skip-migrate'], skipSeed: values['skip-seed'] });
  } catch (error) {
    console.error('Failed to provision database', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected database installation failure', error);
  process.exit(1);
});
