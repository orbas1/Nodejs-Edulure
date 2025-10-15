import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, 'generated');

let cachedIndex;
const specCache = new Map();

function loadIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

  const indexPath = path.join(GENERATED_ROOT, 'index.json');
  const indexContent = readFileSync(indexPath, 'utf8');
  cachedIndex = JSON.parse(indexContent);
  return cachedIndex;
}

export function getServiceSpecIndex() {
  const index = loadIndex();
  return index.services.map(({ service, name, capability, version, description, basePath }) => ({
    service,
    name,
    capability,
    version,
    description,
    basePath
  }));
}

export function getServiceSpecDocument(service) {
  const index = loadIndex();
  const entry = index.services.find((item) => item.service === service || item.name === service);
  if (!entry) {
    return null;
  }

  if (specCache.has(entry.service)) {
    return specCache.get(entry.service);
  }

  const specPath = path.join(GENERATED_ROOT, entry.service, entry.version, 'openapi.json');
  const specContent = readFileSync(specPath, 'utf8');
  const parsed = JSON.parse(specContent);
  specCache.set(entry.service, parsed);
  return parsed;
}

export function clearServiceSpecCache() {
  cachedIndex = undefined;
  specCache.clear();
}

export default {
  getServiceSpecIndex,
  getServiceSpecDocument,
  clearServiceSpecCache
};
