import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const centroidsData = require('../data/countryCentroids.json');

function isFiniteNumber(value) {
  return Number.isFinite(value) || (!Number.isNaN(Number(value)) && Number.isFinite(Number(value)));
}

function coerceNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitiseCentroidEntry(code, raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const normalizedCode = String(code ?? '').trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length !== 2) {
    return null;
  }

  const name = String(raw.name ?? '').trim();
  if (!name) {
    return null;
  }

  const latitude = coerceNumber(raw.latitude);
  const longitude = coerceNumber(raw.longitude);
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return Object.freeze({
    code: normalizedCode,
    name,
    latitude,
    longitude
  });
}

const countryCentroids = new Map();
for (const [code, value] of Object.entries(centroidsData?.countries ?? {})) {
  const entry = sanitiseCentroidEntry(code, value);
  if (entry) {
    countryCentroids.set(entry.code, entry);
  }
}

const aliasToCode = new Map();
for (const [alias, code] of Object.entries(centroidsData?.aliases ?? {})) {
  const sanitizedAlias = String(alias ?? '').trim().toLowerCase();
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  if (!sanitizedAlias || sanitizedAlias.length < 2) {
    continue;
  }
  if (!countryCentroids.has(normalizedCode)) {
    continue;
  }
  aliasToCode.set(sanitizedAlias, normalizedCode);
}

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
