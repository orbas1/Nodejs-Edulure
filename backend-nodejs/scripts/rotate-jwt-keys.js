#!/usr/bin/env node

import { constants as fsConstants } from 'node:fs';
import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  writeFile
} from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const ALGORITHMS = new Set(['HS256', 'HS384', 'HS512']);
const DEFAULT_KEYSET_PATH = 'config/jwt-keys.json';
const DEFAULT_SECRET_BYTES = 64;
const MIN_SECRET_BYTES = 32;
const LEGACY_STATUS = 'legacy';
const ACTIVE_STATUS = 'active';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [flag, value] = token.split('=', 2);
    if (value !== undefined) {
      args.set(flag.slice(2), value);
      continue;
    }

    const nextToken = argv[index + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      args.set(flag.slice(2), nextToken);
      index += 1;
    } else {
      args.set(flag.slice(2), 'true');
    }
  }

  return args;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalised = value.toString().trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalised)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalised)) {
    return false;
  }

  throw new Error(`Unable to parse boolean flag value "${value}".`);
}

function parseInteger(value, { name, min }) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected ${name} to be an integer but received "${value}".`);
  }

  if (min !== undefined && parsed < min) {
    throw new Error(`${name} must be greater than or equal to ${min}.`);
  }

  return parsed;
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadKeyset(filePath) {
  if (!(await fileExists(filePath))) {
    return { activeKeyId: null, keys: [] };
  }

  const raw = await readFile(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return sanitiseKeyset(parsed, filePath);
  } catch (error) {
    throw new Error(`Unable to parse keyset file at ${filePath}: ${error.message}`);
  }
}

function sanitiseKeyset(raw, filePath) {
  if (!Array.isArray(raw.keys)) {
    throw new Error('Existing keyset file is missing a "keys" array.');
  }

  const seenKids = new Set();
  const keys = raw.keys.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Key at index ${index} is not an object.`);
    }

    const kid = String(entry.kid ?? '').trim();
    if (!kid) {
      throw new Error(`Key at index ${index} is missing a valid "kid" value.`);
    }
    if (seenKids.has(kid)) {
      throw new Error(`Duplicate signing key id "${kid}" found in ${filePath}.`);
    }

    seenKids.add(kid);

    const secret = entry.secret ?? entry.value;
    if (typeof secret !== 'string' || secret.length === 0) {
      throw new Error(`Signing key "${kid}" is missing a "secret" string.`);
    }

    const createdAt = entry.createdAt ?? entry.created_at ?? new Date().toISOString();
    const rotatedAt = entry.rotatedAt ?? entry.rotated_at ?? null;
    const algorithm = (entry.algorithm ?? entry.alg ?? 'HS512').toUpperCase();
    if (!ALGORITHMS.has(algorithm)) {
      throw new Error(`Signing key "${kid}" uses unsupported algorithm "${algorithm}".`);
    }

    const status = entry.status === ACTIVE_STATUS ? ACTIVE_STATUS : LEGACY_STATUS;

    return {
      ...entry,
      kid,
      secret,
      createdAt,
      rotatedAt,
      algorithm,
      status
    };
  });

  const activeKeyId = raw.activeKeyId && seenKids.has(raw.activeKeyId)
    ? raw.activeKeyId
    : null;

  if (activeKeyId) {
    keys.forEach((key) => {
      key.status = key.kid === activeKeyId ? ACTIVE_STATUS : key.status;
    });
  }

  return {
    activeKeyId,
    keys
  };
}

function buildKid(providedKid) {
  if (providedKid) {
    return providedKid;
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `edulure-${timestamp}`;
}

function rotateKeyset(keyset, { kid, algorithm, secretBytes }) {
  const nowIso = new Date().toISOString();
  const existingKeyIndex = keyset.keys.findIndex((key) => key.kid === kid);
  if (existingKeyIndex !== -1) {
    throw new Error(`A signing key with id ${kid} already exists. Choose a different --kid value.`);
  }

  if (keyset.activeKeyId) {
    const active = keyset.keys.find((key) => key.kid === keyset.activeKeyId);
    if (active) {
      active.status = LEGACY_STATUS;
      active.rotatedAt = nowIso;
      if (!active.legacyVersion) {
        active.legacyVersion = 1;
      } else {
        active.legacyVersion += 1;
      }
    }
  }

  const byteLength = Number.isInteger(secretBytes) ? secretBytes : DEFAULT_SECRET_BYTES;
  const secret = randomBytes(byteLength).toString('base64url');
  const newKey = {
    kid,
    secret,
    algorithm,
    status: ACTIVE_STATUS,
    createdAt: nowIso,
    rotatedAt: null,
    byteLength
  };

  keyset.keys.push(newKey);
  keyset.activeKeyId = kid;

  return { keyset, newKey };
}

function pruneLegacyKeys(keyset, legacyLimit) {
  if (!legacyLimit || legacyLimit < 1) {
    return { removed: [] };
  }

  const legacyKeys = keyset.keys.filter((key) => key.status === LEGACY_STATUS);
  if (legacyKeys.length <= legacyLimit) {
    return { removed: [] };
  }

  const sortable = legacyKeys.map((key) => ({
    key,
    sortValue: key.rotatedAt ?? key.createdAt ?? '1970-01-01T00:00:00.000Z'
  }));

  sortable.sort((a, b) => new Date(a.sortValue) - new Date(b.sortValue));

  const toRemoveCount = legacyKeys.length - legacyLimit;
  const toRemoveKids = sortable.slice(0, toRemoveCount).map((entry) => entry.key.kid);

  keyset.keys = keyset.keys.filter((key) => !toRemoveKids.includes(key.kid));

  return { removed: toRemoveKids };
}

function toBase64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const keysetPath = path.resolve(process.cwd(), args.get('keyset') ?? DEFAULT_KEYSET_PATH);
  const algorithm = (args.get('algorithm') ?? 'HS512').toUpperCase();
  const dryRun = parseBoolean(args.get('dry-run'), false);
  const shouldBackup = parseBoolean(args.get('backup'), true);
  const legacyLimit = parseInteger(args.get('legacy-limit'), { name: '--legacy-limit', min: 1 });
  const envOutputPath = args.get('env-output');
  const secretBytes = parseInteger(args.get('secret-bytes'), { name: '--secret-bytes', min: MIN_SECRET_BYTES }) ?? DEFAULT_SECRET_BYTES;

  if (!ALGORITHMS.has(algorithm)) {
    throw new Error(`Unsupported algorithm ${algorithm}. Allowed values: ${Array.from(ALGORITHMS).join(', ')}`);
  }

  const kid = buildKid(args.get('kid'));

  const keyset = await loadKeyset(keysetPath);
  const { keyset: rotatedKeyset, newKey } = rotateKeyset(keyset, { kid, algorithm, secretBytes });
  const { removed: prunedKeys } = pruneLegacyKeys(rotatedKeyset, legacyLimit);

  const serialisedKeyset = `${JSON.stringify(rotatedKeyset, null, 2)}\n`;

  let backupPath;
  if (!dryRun) {
    await ensureParentDirectory(keysetPath);

    if (shouldBackup && (await fileExists(keysetPath))) {
      backupPath = buildBackupPath(keysetPath);
      await copyFile(keysetPath, backupPath);
    }

    await writeFile(keysetPath, serialisedKeyset, { encoding: 'utf8', mode: 0o600 });
    await chmod(keysetPath, 0o600).catch(() => {});
  }

  const base64Payload = toBase64(rotatedKeyset);

  if (envOutputPath) {
    const envContent = `JWT_KEYSET=${base64Payload}\nJWT_ACTIVE_KEY_ID=${kid}\n`;
    if (!dryRun) {
      await ensureParentDirectory(envOutputPath);
      await writeFile(envOutputPath, envContent, { encoding: 'utf8', mode: 0o600 });
      await chmod(envOutputPath, 0o600).catch(() => {});
    }
  }

  const operationLabel = dryRun ? 'Dry-run complete. No files were modified.' : 'JWT signing key rotation complete.';
  process.stdout.write(`\n✅ ${operationLabel}\n`);
  process.stdout.write(`• Keyset location: ${keysetPath}\n`);
  process.stdout.write(`• Active key id: ${kid}\n`);
  process.stdout.write(`• Algorithm: ${algorithm}\n`);
  process.stdout.write(`• Secret byte length: ${secretBytes}\n`);
  if (legacyLimit) {
    process.stdout.write(`• Legacy retention limit: ${legacyLimit}\n`);
  }
  if (prunedKeys.length > 0) {
    process.stdout.write(`• Removed legacy keys: ${prunedKeys.join(', ')}\n`);
  }
  if (backupPath) {
    process.stdout.write(`• Backup created at: ${backupPath}\n`);
  } else if (!shouldBackup) {
    process.stdout.write('• Backup creation skipped (--backup=false)\n');
  } else if (dryRun) {
    process.stdout.write('• Backup creation skipped (dry-run)\n');
  }
  if (envOutputPath) {
    const envOutputLabel = dryRun ? `${envOutputPath} (dry-run only, no file written)` : envOutputPath;
    process.stdout.write(`• Environment output: ${envOutputLabel}\n`);
  }

  process.stdout.write('\nStore the following secret in your secure vault and update deployment variables immediately:\n');
  process.stdout.write(`  kid: ${kid}\n`);
  process.stdout.write(`  secret: ${newKey.secret}\n`);
  if (dryRun) {
    process.stdout.write('  note: secret shown above is simulated and will not match production output.\n');
  }

  process.stdout.write('\nEnvironment variable payload (base64 encoded):\n');
  process.stdout.write(`  JWT_KEYSET=${base64Payload}\n`);
  process.stdout.write(`  JWT_ACTIVE_KEY_ID=${kid}\n`);
  if (dryRun) {
    process.stdout.write('  note: values shown above are simulated for validation only.\n');
  }
  process.stdout.write('\n⚠️ Do not commit the keyset file or the secret above to source control.\n');
}

main().catch((error) => {
  process.stderr.write(`\nJWT key rotation failed: ${error.message}\n`);
  process.exitCode = 1;
});

async function ensureParentDirectory(filePath) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
}

function buildBackupPath(originalPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { dir, name, ext } = path.parse(originalPath);
  const suffix = ext ? `${name}${ext}` : name;
  return path.join(dir, `${suffix}.backup-${timestamp}`);
}
