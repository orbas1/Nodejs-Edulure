import fs from 'fs';
import path from 'path';

import logger from './logger.js';

const DEFAULT_CONFIG = {
  entities: {
    communities: {
      defaultSort: 'trending',
      scoreWeights: {
        members: 0.35,
        posts: 2,
        resources: 1.6,
        events: 2.4,
        reactions: 0.5
      }
    },
    courses: { defaultSort: 'relevance' },
    ebooks: { defaultSort: 'relevance' },
    tutors: { defaultSort: 'relevance' }
  }
};

let cachedConfig = null;

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') {
    return { ...base };
  }
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(base?.[key] ?? {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadConfigFromDisk() {
  const configPath = path.resolve(process.cwd(), 'backend-nodejs/config/searchRanking.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    logger.warn({ err: error, configPath }, 'Failed to load search ranking config from disk');
    return null;
  }
}

export function getSearchRankingConfig() {
  if (!cachedConfig) {
    const diskConfig = loadConfigFromDisk();
    cachedConfig = deepMerge(DEFAULT_CONFIG, diskConfig ?? {});
  }
  return cachedConfig;
}

export function refreshSearchRankingConfig() {
  cachedConfig = null;
  return getSearchRankingConfig();
}

export function getEntityConfig(entity) {
  if (!entity) {
    return {};
  }
  const config = getSearchRankingConfig();
  return config.entities?.[entity] ?? {};
}

export function getEntityDefaultSort(entity) {
  const entityConfig = getEntityConfig(entity);
  return entityConfig.defaultSort ?? null;
}

export function getEntityScoreWeights(entity) {
  const entityConfig = getEntityConfig(entity);
  const weights = entityConfig.scoreWeights ?? {};
  return {
    members: Number.isFinite(Number(weights.members)) ? Number(weights.members) : DEFAULT_CONFIG.entities.communities.scoreWeights.members,
    posts: Number.isFinite(Number(weights.posts)) ? Number(weights.posts) : DEFAULT_CONFIG.entities.communities.scoreWeights.posts,
    resources: Number.isFinite(Number(weights.resources)) ? Number(weights.resources) : DEFAULT_CONFIG.entities.communities.scoreWeights.resources,
    events: Number.isFinite(Number(weights.events)) ? Number(weights.events) : DEFAULT_CONFIG.entities.communities.scoreWeights.events,
    reactions: Number.isFinite(Number(weights.reactions)) ? Number(weights.reactions) : DEFAULT_CONFIG.entities.communities.scoreWeights.reactions
  };
}
