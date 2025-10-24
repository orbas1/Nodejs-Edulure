import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { generate } from 'openapi-typescript-codegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const defaultSpecPath = path.resolve(repoRoot, 'backend-nodejs/src/docs/openapi.json');
const defaultOutputDir = path.resolve(projectRoot, 'src/generated');
const defaultHashFile = path.join(defaultOutputDir, '.openapi-hash');

const DEFAULT_GENERATOR_OPTIONS = {
  httpClient: 'fetch',
  useUnionTypes: true,
  exportCore: true,
  exportServices: true,
  exportModels: true
};

function parseArgs(argv) {
  const options = {
    spec: defaultSpecPath,
    out: defaultOutputDir,
    force: false,
    summary: false,
    dryRun: false
  };

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--summary') {
      options.summary = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    const [flag, value] = arg.split('=');
    if (!value) {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
    if (flag === '--spec') {
      options.spec = path.resolve(repoRoot, value);
      continue;
    }
    if (flag === '--out') {
      options.out = path.resolve(repoRoot, value);
      continue;
    }
    throw new Error(`Unsupported CLI flag: ${flag}`);
  }

  return options;
}

async function ensureSpecExists(specPath) {
  try {
    await fs.access(specPath);
  } catch (error) {
    throw new Error(`OpenAPI spec not found at ${specPath}: ${error.message}`);
  }
}

async function readExistingHash(hashFilePath) {
  try {
    const hash = await fs.readFile(hashFilePath, 'utf8');
    return hash.trim();
  } catch (_error) {
    return null;
  }
}

async function writeHash(hashFilePath, hash) {
  await fs.mkdir(path.dirname(hashFilePath), { recursive: true });
  await fs.writeFile(hashFilePath, hash, 'utf8');
}

async function directoryExists(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch (_error) {
    return false;
  }
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

function getGeneratorVersion(pkgJson) {
  return (
    pkgJson.devDependencies?.['openapi-typescript-codegen'] ||
    pkgJson.dependencies?.['openapi-typescript-codegen'] ||
    'unknown'
  );
}

function countOperations(openApiSpec) {
  const paths = openApiSpec.paths ?? {};
  return Object.values(paths).reduce((count, pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return count;
    }
    return (
      count +
      Object.keys(pathItem).filter((method) =>
        ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'].includes(method)
      ).length
    );
  }, 0);
}

async function readSpecMetadata(specPath) {
  const specContent = await fs.readFile(specPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(specContent);
  } catch (error) {
    throw new Error(`Unable to parse OpenAPI spec at ${specPath}: ${error.message}`);
  }

  const info = parsed.info ?? {};
  const hash = createHash('sha256').update(specContent).digest('hex');
  return {
    hash,
    title: info.title || 'Unnamed API',
    version: info.version || '0.0.0',
    operationCount: countOperations(parsed),
    raw: parsed
  };
}

async function listGeneratedArtifacts(outputDir) {
  const servicesDir = path.join(outputDir, 'services');
  const modelsDir = path.join(outputDir, 'models');

  async function listEntries(dir, extensions) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => extensions.some((ext) => name.endsWith(ext)))
        .map((name) => {
          for (const ext of extensions) {
            if (name.endsWith(ext)) {
              return name.slice(0, -ext.length);
            }
          }
          return name;
        })
        .sort((a, b) => a.localeCompare(b));
    } catch (_error) {
      return [];
    }
  }

  const services = await listEntries(servicesDir, ['.ts', '.js', '.d.ts']);
  const models = await listEntries(modelsDir, ['.ts', '.js', '.d.ts']);

  return {
    services,
    serviceCount: services.length,
    models,
    modelCount: models.length
  };
}

async function writeManifest({
  manifestPath,
  metadata,
  generatorVersion,
  outputDir,
  specPath
}) {
  const artifacts = await listGeneratedArtifacts(outputDir);
  const manifest = {
    generatedAt: new Date().toISOString(),
    specHash: metadata.hash,
    specTitle: metadata.title,
    specVersion: metadata.version,
    operationCount: metadata.operationCount,
    generatorVersion,
    specPath: path.relative(repoRoot, specPath),
    outputDir: path.relative(repoRoot, outputDir),
    services: artifacts.services,
    serviceCount: artifacts.serviceCount,
    modelCount: artifacts.modelCount
  };

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function logSummary(manifest, options) {
  console.log('[api-sdk] Generation summary');
  console.table({
    specTitle: manifest.specTitle,
    specVersion: manifest.specVersion,
    operationCount: manifest.operationCount,
    specHash: manifest.specHash.slice(0, 12),
    generator: manifest.generatorVersion,
    outputDir: manifest.outputDir,
    specPath: manifest.specPath,
    force: options.force,
    dryRun: options.dryRun
  });
}

async function generateSdk(options) {
  await ensureSpecExists(options.spec);
  const [metadata, pkgJsonRaw] = await Promise.all([
    readSpecMetadata(options.spec),
    fs.readFile(path.resolve(projectRoot, 'package.json'), 'utf8')
  ]);
  const packageJson = JSON.parse(pkgJsonRaw);
  const generatorVersion = getGeneratorVersion(packageJson);
  const hashFilePath = options.out === defaultOutputDir ? defaultHashFile : path.join(options.out, '.openapi-hash');
  const existingHash = await readExistingHash(hashFilePath);
  const manifestPath = path.join(options.out, '.manifest.json');

  const shouldRegenerate =
    options.force ||
    metadata.hash !== existingHash ||
    !(await directoryExists(options.out));

  if (!shouldRegenerate && !(await fileExists(manifestPath))) {
    console.log('[api-sdk] Manifest missing; refreshing metadata.');
  }

  if (shouldRegenerate && options.dryRun) {
    console.log('[api-sdk] Dry run requested. SDK would be regenerated.');
  }

  if (shouldRegenerate && !options.dryRun) {
    console.log('[api-sdk] Generating TypeScript SDK from OpenAPI spec.');
    await fs.rm(options.out, { recursive: true, force: true });
    await generate({
      input: options.spec,
      output: options.out,
      ...DEFAULT_GENERATOR_OPTIONS
    });
    await writeHash(hashFilePath, metadata.hash);
  } else if (!shouldRegenerate) {
    console.log('[api-sdk] OpenAPI spec unchanged; skipping regeneration.');
  }

  if (!options.dryRun) {
    const manifest = await writeManifest({
      manifestPath,
      metadata,
      generatorVersion,
      outputDir: options.out,
      specPath: options.spec
    });
    if (options.summary) {
      await logSummary(manifest, options);
    }
  } else if (options.summary) {
    await logSummary(
      {
        specTitle: metadata.title,
        specVersion: metadata.version,
        operationCount: metadata.operationCount,
        specHash: metadata.hash,
        generatorVersion,
        specPath: path.relative(repoRoot, options.spec),
        outputDir: path.relative(repoRoot, options.out)
      },
      options
    );
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  await generateSdk(options);
} catch (error) {
  console.error('[api-sdk] Generation failed:', error);
  process.exitCode = 1;
}
