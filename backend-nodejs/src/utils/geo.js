import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const centroidsData = require('../data/countryCentroids.json');

const countryCentroids = new Map(
  Object.entries(centroidsData.countries).map(([code, value]) => [code.toUpperCase(), value])
);

const aliasToCode = new Map(
  Object.entries(centroidsData.aliases).map(([alias, code]) => [alias.trim().toLowerCase(), code.toUpperCase()])
);

export function normaliseCountryCode(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const upper = trimmed.toUpperCase();
  if (countryCentroids.has(upper)) {
    return upper;
  }
  const aliasMatch = aliasToCode.get(trimmed.toLowerCase());
  return aliasMatch ?? null;
}

export function resolveCountryCoordinates(input) {
  const code = normaliseCountryCode(input);
  if (!code) {
    return null;
  }
  const centroid = countryCentroids.get(code);
  if (!centroid) {
    return null;
  }
  return {
    code,
    name: centroid.name,
    latitude: centroid.latitude,
    longitude: centroid.longitude
  };
}

export function buildBounds(markers) {
  if (!Array.isArray(markers) || markers.length === 0) {
    return null;
  }
  const initial = {
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY
  };
  const bounds = markers.reduce((acc, marker) => {
    const { latitude, longitude } = marker;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return acc;
    }
    return {
      minLat: Math.min(acc.minLat, latitude),
      maxLat: Math.max(acc.maxLat, latitude),
      minLng: Math.min(acc.minLng, longitude),
      maxLng: Math.max(acc.maxLng, longitude)
    };
  }, initial);

  if (!Number.isFinite(bounds.minLat) || !Number.isFinite(bounds.minLng)) {
    return null;
  }

  return bounds;
}

export default {
  normaliseCountryCode,
  resolveCountryCoordinates,
  buildBounds
};
