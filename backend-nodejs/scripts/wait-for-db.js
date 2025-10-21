#!/usr/bin/env node
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL must be set');
  process.exit(2);
}

const timeoutMs = Number.parseInt(process.env.DB_WAIT_TIMEOUT_MS ?? '120000', 10);
const retryDelayMs = Number.parseInt(process.env.DB_WAIT_RETRY_MS ?? '5000', 10);

function createClient() {
  return new pg.Client({ connectionString: url });
}

async function wait() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const client = createClient();
    try {
      await client.connect();
      await client.query('select 1');
      console.log('Database connection established');
      return;
    } catch (error) {
      console.warn('Database not ready yet:', error.message);
      await new Promise((resolve) => {
        setTimeout(resolve, retryDelayMs);
      });
    } finally {
      await client.end().catch(() => {});
    }
  }
  console.error(`Timed out waiting for database after ${timeoutMs / 1000}s`);
  process.exit(1);
}

wait();
