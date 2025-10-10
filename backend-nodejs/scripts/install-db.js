import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function run() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  const rootConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_ROOT_USER ?? process.env.DB_USER,
    password: process.env.DB_ROOT_PASSWORD ?? process.env.DB_PASSWORD,
    multipleStatements: true
  });

  const installSql = fs.readFileSync(path.resolve(__dirname, '../database/install.sql'), 'utf8');
  await rootConnection.query(installSql);
  await rootConnection.end();

  const dbConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const migrationsDir = path.resolve(__dirname, '../database/migrations');
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migration of migrations) {
    const sql = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
    await dbConnection.query(sql);
    console.log(`Executed migration: ${migration}`);
  }

  const seedersDir = path.resolve(__dirname, '../database/seeders');
  const seeders = fs
    .readdirSync(seedersDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const seeder of seeders) {
    const sql = fs.readFileSync(path.join(seedersDir, seeder), 'utf8');
    await dbConnection.query(sql);
    console.log(`Executed seeder: ${seeder}`);
  }

  await dbConnection.end();
}

run().catch((error) => {
  console.error('Failed to install database', error);
  process.exit(1);
});
