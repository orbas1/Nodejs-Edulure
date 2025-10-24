import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import NavigationAnnexRepository from '../repositories/NavigationAnnexRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STRATEGY_TARGETS_PATH = path.resolve(__dirname, '../../../valuation/navigation_strategy_targets.json');
const STRATEGY_CACHE_TTL_MS = 5 * 60 * 1000;

let strategyCache = null;

async function loadStrategyTargets() {
  if (strategyCache && Date.now() - strategyCache.timestamp < STRATEGY_CACHE_TTL_MS) {
    return strategyCache.payload;
  }

  try {
    const contents = await fs.readFile(STRATEGY_TARGETS_PATH, 'utf8');
    const payload = JSON.parse(contents);
    strategyCache = { timestamp: Date.now(), payload };
    return payload;
  } catch (error) {
    throw new Error(`Failed to read navigation strategy targets at ${STRATEGY_TARGETS_PATH}: ${error.message}`);
  }
}

function indexStrategyTargets(pillars = []) {
  const map = new Map();
  for (const pillar of pillars) {
    if (!pillar?.id) {
      continue;
    }
    map.set(String(pillar.id).toLowerCase(), pillar);
  }
  return map;
}

function mapMetrics(metrics = [], targetMeta) {
  return metrics.map((metric) => {
    const meta = targetMeta?.metrics?.[metric.id] ?? null;
    return {
      ...metric,
      weight: meta?.weight ?? null,
      targetDate: meta?.targetDate ?? null,
      valuationNotes: meta?.valuationNotes ?? null,
      owner: meta?.owner ?? null,
      reporting: meta?.reporting ?? null
    };
  });
}

function buildPillarBriefing(narratives = [], targetsIndex) {
  return narratives.map((pillar) => {
    const key = String(pillar.pillar ?? '').toLowerCase();
    const target = targetsIndex.get(key);
    return {
      pillar: pillar.pillar,
      narratives: pillar.narratives ?? [],
      metrics: mapMetrics(pillar.metrics ?? [], target),
      stakeholders: target?.stakeholders ?? [],
      summary: target?.summary ?? null,
      communications: target?.communications ?? [],
      meta: {
        targetDateRange: Object.values(target?.metrics ?? {}).reduce(
          (range, entry) => {
            if (!entry?.targetDate) {
              return range;
            }
            const nextRange = range ?? { earliest: entry.targetDate, latest: entry.targetDate };
            return {
              earliest: nextRange.earliest <= entry.targetDate ? nextRange.earliest : entry.targetDate,
              latest: nextRange.latest >= entry.targetDate ? nextRange.latest : entry.targetDate
            };
          },
          null
        )
      }
    };
  });
}

export default class NavigationAnnexService {
  static async describeAnnex({ role } = {}) {
    return NavigationAnnexRepository.describe({ role });
  }

  static async describeStrategyBriefing({ role } = {}) {
    const [annex, targets] = await Promise.all([
      NavigationAnnexRepository.describe({ role }),
      loadStrategyTargets()
    ]);

    const targetsIndex = indexStrategyTargets(targets?.pillars ?? []);
    const pillars = buildPillarBriefing(annex.strategyNarratives ?? [], targetsIndex);

    return {
      generatedAt: new Date().toISOString(),
      annexRefreshedAt: annex.refreshedAt ?? null,
      version: targets?.version ?? null,
      owner: targets?.owner ?? null,
      pillars,
      role: role ?? null
    };
  }

  static resetStrategyCache() {
    strategyCache = null;
  }
}
