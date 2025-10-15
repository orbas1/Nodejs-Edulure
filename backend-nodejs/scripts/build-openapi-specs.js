#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';

import { generateServiceSpecs } from '../src/docs/builders/openapiBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../src/docs/generated');

try {
  const services = generateServiceSpecs({ outputDir: OUTPUT_DIR });
  if (!services.length) {
    console.warn('[openapi] No service specs were generated. Ensure the base OpenAPI document contains path definitions.');
    process.exitCode = 1;
  } else {
    console.log(`[openapi] Generated ${services.length} service-specific OpenAPI documents in ${OUTPUT_DIR}`);
  }
} catch (error) {
  console.error('[openapi] Failed to generate service OpenAPI documents:', error);
  process.exitCode = 1;
}
