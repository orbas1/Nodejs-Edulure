import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { generate } from 'openapi-typescript-codegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const specPath = path.resolve(repoRoot, 'backend-nodejs/src/docs/openapi.json');
const outputDir = path.resolve(projectRoot, 'src/generated');
const hashFile = path.join(outputDir, '.openapi-hash');

async function ensureSpecExists() {
  try {
    await fs.access(specPath);
  } catch (error) {
    throw new Error(`OpenAPI spec not found at ${specPath}: ${error.message}`);
  }
}

async function readExistingHash() {
  try {
    const hash = await fs.readFile(hashFile, 'utf8');
    return hash.trim();
  } catch (_error) {
    return null;
  }
}

async function writeHash(hash) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(hashFile, hash, 'utf8');
}

async function generateSdk() {
  await ensureSpecExists();
  const specContent = await fs.readFile(specPath, 'utf8');
  const specHash = createHash('sha256').update(specContent).digest('hex');
  const existingHash = await readExistingHash();

  if (existingHash === specHash && (await directoryExists(outputDir))) {
    console.log('[api-sdk] OpenAPI spec unchanged; skipping regeneration.');
    return;
  }

  console.log('[api-sdk] Generating TypeScript SDK from OpenAPI spec.');
  await fs.rm(outputDir, { recursive: true, force: true });
  await generate({
    input: specPath,
    output: outputDir,
    httpClient: 'fetch',
    useUnionTypes: true,
    exportCore: true,
    exportServices: true,
    exportModels: true
  });
  await writeHash(specHash);
}

async function directoryExists(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch (_error) {
    return false;
  }
}

await generateSdk();
