#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (!process.env.DB_CLIENT) {
  process.env.DB_CLIENT = 'sqlite3';
}

if (!process.env.DB_SQLITE_FILENAME) {
  const tempDir = path.resolve(projectRoot, '.tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  process.env.DB_SQLITE_FILENAME = path.join('.tmp', 'edulure.sqlite3');
}

let knexConfig;
try {
  knexConfig = require(path.resolve(projectRoot, 'knexfile.cjs'));
} catch (error) {
  console.error('Unable to load knex configuration.', error);
  process.exitCode = 1;
  return;
}

let knex;
try {
  knex = require('knex')(knexConfig);
} catch (error) {
  console.error('Unable to load the "knex" package. Did you run `npm install`?', error);
  process.exitCode = 1;
  return;
}

const [, , command = 'migrate:latest', ...rawArgs] = process.argv;

const hasFlag = (flag) => rawArgs.includes(flag);

async function run() {
  try {
    if (command === 'migrate:latest') {
      await knex.migrate.latest();
    } else if (command === 'migrate:rollback') {
      const all = hasFlag('--all');
      await knex.migrate.rollback(undefined, all);
    } else if (command === 'seed') {
      await knex.seed.run();
    } else {
      console.error(`Unknown database command: ${command}`);
      process.exitCode = 1;
      return;
    }
  } finally {
    await knex.destroy();
  }
}

run().catch((error) => {
  console.error('Database command failed.', error);
  process.exitCode = 1;
});
