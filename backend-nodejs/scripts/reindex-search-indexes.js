#!/usr/bin/env node
import '../src/config/env.js';
import logger from '../src/config/logger.js';
import { searchClusterService } from '../src/services/SearchClusterService.js';
import { SearchIngestionService } from '../src/services/SearchIngestionService.js';

function parseCliArguments(argv) {
  const args = argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--since=')) {
      options.since = arg.substring('--since='.length);
    } else if (arg.startsWith('--indexes=')) {
      options.indexes = arg
        .substring('--indexes='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }
  return options;
}

(async () => {
  const options = parseCliArguments(process.argv);
  const ingestionService = new SearchIngestionService({ loggerInstance: logger });
  try {
    await searchClusterService.start();
    await ingestionService.fullReindex(options);
    logger.info({ options }, 'Explorer search ingestion completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error, options }, 'Explorer search ingestion failed');
    process.exit(1);
  } finally {
    searchClusterService.stop();
  }
})();
