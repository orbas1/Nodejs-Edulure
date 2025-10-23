#!/usr/bin/env node
import { parseArgs } from 'node:util';

import '../src/config/env.js';
import logger from '../src/config/logger.js';
import { searchClusterService } from '../src/services/SearchClusterService.js';
import { SearchIngestionService } from '../src/services/SearchIngestionService.js';
import { SUPPORTED_ENTITIES } from '../src/services/search/entityConfig.js';

const KNOWN_INDEXES = [...SUPPORTED_ENTITIES];

function parseCliArguments(argv) {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      since: { type: 'string' },
      index: { type: 'string', multiple: true },
      indexes: { type: 'string', multiple: true }
    }
  });

  const requestedIndexes = [];
  for (const entry of [values.index, values.indexes]) {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        item
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .forEach((value) => requestedIndexes.push(value));
      }
    } else if (typeof entry === 'string') {
      entry
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => requestedIndexes.push(value));
    }
  }

  const dedupedIndexes = Array.from(new Set(requestedIndexes));
  const invalidIndexes = dedupedIndexes.filter((name) => !KNOWN_INDEXES.includes(name));
  if (invalidIndexes.length > 0) {
    throw new Error(`Unknown search indexes requested: ${invalidIndexes.join(', ')}. Known indexes: ${KNOWN_INDEXES.join(', ')}`);
  }

  const since = values.since ? new Date(values.since) : null;
  if (since && Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since value "${values.since}". Expected an ISO-8601 date.`);
  }

  return {
    since,
    indexes: dedupedIndexes.length > 0 ? dedupedIndexes : undefined
  };
}

(async () => {
  let options;
  try {
    options = parseCliArguments(process.argv);
  } catch (error) {
    logger.error({ err: error }, 'Invalid CLI arguments for search ingestion');
    process.exit(1);
    return;
  }

  const ingestionService = new SearchIngestionService({ loggerInstance: logger });
  const startedAt = Date.now();
  try {
    await searchClusterService.start();
    await ingestionService.fullReindex(options);
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    logger.info({ options, durationSeconds }, 'Explorer search ingestion completed successfully');
  } catch (error) {
    logger.error({ err: error, options }, 'Explorer search ingestion failed');
    process.exitCode = 1;
  } finally {
    searchClusterService.stop();
  }
})();
