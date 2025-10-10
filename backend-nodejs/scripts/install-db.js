import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
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
    port: Number(process.env.DB_PORT),
    user: process.env.DB_ROOT_USER ?? process.env.DB_USER,
    password: process.env.DB_ROOT_PASSWORD ?? process.env.DB_PASSWORD,
    multipleStatements: true
  });

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

  await rootConnection.end();
}

async function runMigrations() {
  const db = knex(knexConfig);
  try {
    await db.migrate.latest();
    console.log('Database migrations applied successfully');
    await db.seed.run();
    console.log('Database seeds executed successfully');
  } finally {
    await db.destroy();
  }
}

provisionDatabase()
  .then(runMigrations)
  .catch((error) => {
    console.error('Failed to provision database', error);
    process.exit(1);
  });
