#!/usr/bin/env node

import { constants as fsConstants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const ALGORITHMS = new Set(['HS256', 'HS384', 'HS512']);

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
    if (!Array.isArray(parsed.keys)) {
      throw new Error('Existing keyset file is missing a "keys" array.');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Unable to parse keyset file at ${filePath}: ${error.message}`);
  }
}

function buildKid(providedKid) {
  if (providedKid) {
    return providedKid;
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `edulure-${timestamp}`;
}

function rotateKeyset(keyset, { kid, algorithm }) {
  const nowIso = new Date().toISOString();
  const existingKeyIndex = keyset.keys.findIndex((key) => key.kid === kid);
  if (existingKeyIndex !== -1) {
    throw new Error(`A signing key with id ${kid} already exists. Choose a different --kid value.`);
  }

  if (keyset.activeKeyId) {
    const active = keyset.keys.find((key) => key.kid === keyset.activeKeyId);
    if (active) {
      active.status = 'legacy';
      active.rotatedAt = nowIso;
    }
  }

  const secret = randomBytes(64).toString('base64url');
  const newKey = {
    kid,
    secret,
    algorithm,
    status: 'active',
    createdAt: nowIso
  };

  keyset.keys.push(newKey);
  keyset.activeKeyId = kid;

  return { keyset, newKey };
}

function toBase64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const keysetPath = path.resolve(process.cwd(), args.get('keyset') ?? 'config/jwt-keys.json');
  const algorithm = (args.get('algorithm') ?? 'HS512').toUpperCase();

  if (!ALGORITHMS.has(algorithm)) {
    throw new Error(`Unsupported algorithm ${algorithm}. Allowed values: ${Array.from(ALGORITHMS).join(', ')}`);
  }

  const kid = buildKid(args.get('kid'));

  const keyset = await loadKeyset(keysetPath);
  const { keyset: rotatedKeyset, newKey } = rotateKeyset(keyset, { kid, algorithm });
  await writeFile(keysetPath, `${JSON.stringify(rotatedKeyset, null, 2)}\n`, 'utf8');

  const base64Payload = toBase64(rotatedKeyset);

  process.stdout.write('\n✅ JWT signing key rotation complete.\n');
  process.stdout.write(`• Keyset file updated at: ${keysetPath}\n`);
  process.stdout.write(`• Active key id: ${kid}\n`);
  process.stdout.write(`• Algorithm: ${algorithm}\n`);
  process.stdout.write('\nStore the following secret in your secure vault and update deployment variables immediately:\n');
  process.stdout.write(`  kid: ${kid}\n`);
  process.stdout.write(`  secret: ${newKey.secret}\n`);
  process.stdout.write('\nEnvironment variable payload (base64 encoded):\n');
  process.stdout.write(`  JWT_KEYSET=${base64Payload}\n`);
  process.stdout.write(`  JWT_ACTIVE_KEY_ID=${kid}\n`);
  process.stdout.write('\n⚠️ Do not commit the keyset file or the secret above to source control.\n');
}

main().catch((error) => {
  process.stderr.write(`\nJWT key rotation failed: ${error.message}\n`);
  process.exitCode = 1;
});
