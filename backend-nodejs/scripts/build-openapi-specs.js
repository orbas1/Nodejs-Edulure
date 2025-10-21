#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { generateServiceSpecs } from '../src/docs/builders/openapiBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../src/docs/generated');

async function ensureDirectoryExists(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function cleanOutputDirectory(directory) {
  await fs.rm(directory, { recursive: true, force: true });
}

function buildGeneratorOptions({ version, baseSpecPath, services }) {
  const options = { outputDir: OUTPUT_DIR };
  if (typeof version === 'string' && version.trim().length > 0) {
    options.version = version.trim();
  }
  if (baseSpecPath) {
    options.baseSpecPath = baseSpecPath;
  }
  if (Array.isArray(services) && services.length > 0) {
    options.services = services;
  }
  return options;
}

async function main() {
  const { values } = parseArgs({
    options: {
      clean: { type: 'boolean', default: false },
      version: { type: 'string' },
      base: { type: 'string' },
      service: { type: 'string', multiple: true }
    }
  });

  const baseSpecPath = values.base ? path.resolve(process.cwd(), values.base) : undefined;

  if (baseSpecPath) {
    try {
      await fs.access(baseSpecPath);
    } catch (error) {
      console.error(`[openapi] Unable to access base specification at ${baseSpecPath}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  if (values.clean) {
    await cleanOutputDirectory(OUTPUT_DIR);
  }

  await ensureDirectoryExists(OUTPUT_DIR);

  try {
    const services = generateServiceSpecs(
      buildGeneratorOptions({
        version: values.version,
        baseSpecPath,
        services: values.service
      })
    );

    if (!services.length) {
      console.warn(
        '[openapi] No service specs were generated. Ensure the base OpenAPI document contains path definitions or adjust filters.'
      );
      process.exitCode = 1;
    } else {
      console.log(`[openapi] Generated ${services.length} service-specific OpenAPI documents in ${OUTPUT_DIR}`);
      if (Array.isArray(values.service) && values.service.length > 0) {
        console.log(`[openapi] Service filters applied: ${values.service.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('[openapi] Failed to generate service OpenAPI documents:', error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[openapi] Unexpected failure:', error);
  process.exitCode = 1;
});
