import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

function normaliseNodeEnv(nodeEnv) {
  if (!nodeEnv) {
    return 'development';
  }

  const trimmed = String(nodeEnv).trim();
  return trimmed.length > 0 ? trimmed : 'development';
}

export function loadEnvironmentFiles({ nodeEnv = process.env.NODE_ENV, includeExample } = {}) {
  const resolvedNodeEnv = normaliseNodeEnv(nodeEnv);
  const shouldLoadExample =
    includeExample ?? (resolvedNodeEnv !== 'production' && !process.env.CI);

  const envFileDescriptors = [
    { filename: '.env', override: false },
    { filename: `.env.${resolvedNodeEnv}`, override: false },
    { filename: '.env.local', override: true },
    { filename: `.env.${resolvedNodeEnv}.local`, override: true }
  ];

  const loadedFiles = [];

  for (const descriptor of envFileDescriptors) {
    const { filename, override } = descriptor;
    if (!filename) {
      continue;
    }

    const filePath = path.resolve(projectRoot, filename);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    dotenv.config({ path: filePath, override });
    loadedFiles.push(filePath);
  }

  if (shouldLoadExample) {
    const examplePath = path.resolve(projectRoot, '.env.example');
    if (fs.existsSync(examplePath)) {
      dotenv.config({ path: examplePath, override: false });
      loadedFiles.push(examplePath);
    }
  }

  return loadedFiles;
}

export function resolveProjectRoot() {
  return projectRoot;
}
