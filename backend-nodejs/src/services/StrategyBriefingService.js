import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import NavigationAnnexRepository from '../repositories/NavigationAnnexRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, '..', '..', '..', 'valuation', 'annex_a56.json');

let cachedManifest = null;

async function loadManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  cachedManifest = {
    metadata: parsed.metadata ?? {},
    valuation: parsed.valuation ?? {},
    stakeholders: Array.isArray(parsed.stakeholders) ? parsed.stakeholders : [],
    cadences: Array.isArray(parsed.cadences) ? parsed.cadences : [],
    messaging: Array.isArray(parsed.messaging) ? parsed.messaging : []
  };
  return cachedManifest;
}

function buildMetricIndex(strategyNarratives) {
  const index = new Map();
  strategyNarratives.forEach((pillar) => {
    (pillar.metrics ?? []).forEach((metric) => {
      if (!metric?.id) {
        return;
      }
      index.set(metric.id, { ...metric, pillar: pillar.pillar });
    });
  });
  return index;
}

export default class StrategyBriefingService {
  static async getBriefing({ role } = {}) {
    const [manifest, annex] = await Promise.all([
      loadManifest(),
      NavigationAnnexRepository.describe({ role })
    ]);

    const metricIndex = buildMetricIndex(annex.strategyNarratives ?? []);

    const cadences = (manifest.cadences ?? []).map((cadence) => {
      const metric = cadence.metricKey ? metricIndex.get(cadence.metricKey) : null;
      return {
        ...cadence,
        metric: metric ?? null
      };
    });

    return {
      metadata: manifest.metadata,
      valuation: manifest.valuation,
      stakeholders: manifest.stakeholders,
      messaging: manifest.messaging,
      cadences,
      strategyPillars: annex.strategyNarratives ?? [],
      annexRefreshedAt: annex.refreshedAt
    };
  }

  static clearCache() {
    cachedManifest = null;
  }
}
