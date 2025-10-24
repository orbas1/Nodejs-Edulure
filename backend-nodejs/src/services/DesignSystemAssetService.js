import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_MANIFEST_PATH = path.resolve(__dirname, '../../../docs/design-system/tokens.generated.json');
const RESEARCH_MANIFEST_PATH = path.resolve(__dirname, '../../../docs/design-system/ux_research_insights.json');

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;

async function loadJson(filePath, label) {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Failed to read ${label} at ${filePath}: ${error.message}`);
  }
}

function buildSummary(tokens) {
  const total = tokens.length;
  const byGroup = new Map();
  const byMode = new Map();

  tokens.forEach((token) => {
    byGroup.set(token.group, (byGroup.get(token.group) ?? 0) + 1);
    byMode.set(token.mode, (byMode.get(token.mode) ?? 0) + 1);
  });

  return {
    total,
    byGroup: Object.fromEntries([...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    byMode: Object.fromEntries([...byMode.entries()].sort((a, b) => a[0].localeCompare(b[0])))
  };
}

function mapResearchByTag(insights) {
  return insights.reduce((acc, insight) => {
    for (const tag of insight.tags ?? []) {
      const bucket = acc[tag] ?? (acc[tag] = []);
      bucket.push(insight.id);
    }
    return acc;
  }, {});
}

export default class DesignSystemAssetService {
  static async describeAssets() {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return cache.payload;
    }

    const [tokensManifest, researchManifest] = await Promise.all([
      loadJson(TOKENS_MANIFEST_PATH, 'design token manifest'),
      loadJson(RESEARCH_MANIFEST_PATH, 'UX research manifest')
    ]);

    const summary = buildSummary(tokensManifest.tokens ?? []);
    const researchByTag = mapResearchByTag(researchManifest.insights ?? []);

    const payload = {
      generatedAt: new Date().toISOString(),
      tokens: tokensManifest,
      research: researchManifest,
      summary,
      researchByTag
    };

    cache = { timestamp: Date.now(), payload };
    return payload;
  }

  static resetCache() {
    cache = null;
  }
}
