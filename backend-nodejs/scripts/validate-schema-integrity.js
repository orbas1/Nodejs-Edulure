import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import SchemaDiffService from '../src/services/schema/SchemaDiffService.js';
import MySqlSchemaInspector from '../src/services/schema/MySqlSchemaInspector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function loadSnapshot(filePath) {
  const snapshotRaw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(snapshotRaw);
}

async function main() {
  dotenv.config({ path: path.resolve(projectRoot, '.env') });

  const snapshotPath = path.resolve(projectRoot, 'database', 'schema.snapshot.json');
  const log = logger.child({ module: 'schema-validate' });

  try {
    const [snapshot, actual] = await Promise.all([
      loadSnapshot(snapshotPath),
      new MySqlSchemaInspector({ knex: db }).describe()
    ]);

    const diffService = new SchemaDiffService({ snapshot, actual });
    const diff = diffService.diff();

    const hasDrift =
      diff.missingTables.length > 0 ||
      diff.extraTables.length > 0 ||
      diff.columnDrift.length > 0 ||
      diff.indexDrift.length > 0 ||
      diff.enumDrift.length > 0 ||
      diff.viewDrift.length > 0;

    if (hasDrift) {
      log.error({ diff }, 'Schema drift detected');
      process.exitCode = 1;
    } else {
      log.info('Schema matches snapshot definition');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to validate database schema');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
