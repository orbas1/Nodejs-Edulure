#!/usr/bin/env node
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL must be set');
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
const start = Date.now();
const timeoutMs = parseInt(process.env.DB_WAIT_TIMEOUT_MS ?? '120000', 10);

async function wait() {
  while (Date.now() - start < timeoutMs) {
    try {
      await client.connect();
      await client.query('select 1');
      await client.end();
      console.log('Database connection established');
      return;
    } catch (error) {
      console.warn('Database not ready yet:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } finally {
      if (client._connected) {
        await client.end().catch(() => {});
      }
    }
  }
  console.error(`Timed out waiting for database after ${timeoutMs / 1000}s`);
  process.exit(1);
}

wait();
