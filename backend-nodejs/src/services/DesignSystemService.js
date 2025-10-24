import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, '..', '..', '..', 'docs', 'design-system', 'tokens.json');

let cachedManifest = null;

function normaliseManifest(raw) {
  if (!raw || typeof raw !== 'object') {
    return { metadata: {}, groups: [], overrides: {} };
  }
  const overrides = raw.overrides ?? {};
  return {
    metadata: raw.metadata ?? {},
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    overrides: {
      media: Array.isArray(overrides.media) ? overrides.media : [],
      dataAttributes: Array.isArray(overrides.dataAttributes) ? overrides.dataAttributes : [],
      colorSchemes: Array.isArray(overrides.colorSchemes) ? overrides.colorSchemes : []
    }
  };
}

export default class DesignSystemService {
  static async describeTokens() {
    if (cachedManifest) {
      return cachedManifest;
    }
    const file = await readFile(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(file);
    cachedManifest = normaliseManifest(parsed);
    return cachedManifest;
  }

  static clearCache() {
    cachedManifest = null;
  }
}
