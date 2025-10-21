import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const centroidsData = require('../data/countryCentroids.json');

const countryCentroids = new Map(
  Object.entries(centroidsData.countries).map(([code, value]) => [code.toUpperCase(), value])
);

const aliasToCode = new Map(
  Object.entries(centroidsData.aliases).map(([alias, code]) => [alias.trim().toLowerCase(), code.toUpperCase()])
);

const FALLBACK_ALIAS_KEYS = ['code', 'country', 'countryCode', 'iso', 'iso2', 'isoCode'];
const MAX_METADATA_DEPTH = 3;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractCountryCandidate(input, depth = 0) {
  if (depth > MAX_METADATA_DEPTH) {
    return null;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    return String(input);
  }

  if (isPlainObject(input)) {
    for (const key of FALLBACK_ALIAS_KEYS) {
      if (input[key]) {
        return extractCountryCandidate(input[key], depth + 1);
      }
    }
  }

  return null;
}

function toAliasKey(value) {
  return value.trim().toLowerCase();
}

export function normaliseCountryCode(input) {
  const candidate = extractCountryCandidate(input);
  if (!candidate) {
    return null;
  }

  const cleaned = candidate.replace(/[^a-z0-9]/gi, '');
  const upper = cleaned.toUpperCase();
  if (upper.length === 0) {
    return null;
  }

  if (countryCentroids.has(upper)) {
    return upper;
  }

  const aliasMatch = aliasToCode.get(toAliasKey(candidate));
  if (aliasMatch) {
    return aliasMatch;
  }

  const fallbackAlias = aliasToCode.get(toAliasKey(upper));
  return fallbackAlias ?? null;
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
    latitude: Number(centroid.latitude),
    longitude: Number(centroid.longitude)
  };
}

function toFiniteNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normaliseMarker(marker) {
  if (!marker) {
    return null;
  }

  const latitude =
    toFiniteNumber(marker.latitude ?? marker.lat) ?? toFiniteNumber(marker.y ?? marker.Latitude);
  const longitude =
    toFiniteNumber(marker.longitude ?? marker.lng ?? marker.lon) ??
    toFiniteNumber(marker.x ?? marker.Longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function buildBounds(markers) {
  if (!Array.isArray(markers) || markers.length === 0) {
    return null;
  }

  const normalised = markers
    .map(normaliseMarker)
    .filter(Boolean);

  if (normalised.length === 0) {
    return null;
  }

  const initial = {
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY
  };

  const bounds = normalised.reduce((acc, marker) => ({
    minLat: Math.min(acc.minLat, marker.latitude),
    maxLat: Math.max(acc.maxLat, marker.latitude),
    minLng: Math.min(acc.minLng, marker.longitude),
    maxLng: Math.max(acc.maxLng, marker.longitude)
  }), initial);

  if (!Number.isFinite(bounds.minLat) || !Number.isFinite(bounds.minLng)) {
    return null;
  }

  const center = {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2
  };

  const span = {
    latitude: Math.max(bounds.maxLat - bounds.minLat, 0),
    longitude: Math.max(bounds.maxLng - bounds.minLng, 0)
  };

  return {
    ...bounds,
    center,
    span,
    markers: normalised
  };
}

export default {
  normaliseCountryCode,
  resolveCountryCoordinates,
  buildBounds
};
