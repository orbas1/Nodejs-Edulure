import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const centroidsData = require('../data/countryCentroids.json');
const isoAlpha3ToAlpha2Data = require('../data/isoAlpha3ToAlpha2.json');

const isoAlpha3ToAlpha2 = new Map(
  Object.entries(isoAlpha3ToAlpha2Data ?? {}).map(([alpha3, alpha2]) => [
    String(alpha3 ?? '')
      .trim()
      .toUpperCase(),
    String(alpha2 ?? '')
      .trim()
      .toUpperCase()
  ])
);

const customIsoAlpha3ToAlpha2 = new Map();

const GEO_CONFIG_DEFAULTS = Object.freeze({
  cacheTtlMs: 15 * 60 * 1000,
  cacheMaxEntries: 2048
});

let geoConfiguration = { ...GEO_CONFIG_DEFAULTS };

function removeDiacritics(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .normalize('NFC');
}

function normaliseAliasKey(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const withoutDiacritics = removeDiacritics(trimmed);
  return withoutDiacritics
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normaliseAlpha2(code) {
  if (!code) {
    return null;
  }
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normaliseAlpha3(code) {
  if (!code) {
    return null;
  }
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

const countryCentroids = new Map();
const customCountryCentroids = new Map();
const aliasToCode = new Map();
const customAliasToCode = new Map();
const countryCodeCache = new Map();

function hasRegisteredCountry(code) {
  return countryCentroids.has(code) || customCountryCentroids.has(code);
}

function registerAlias(alias, code, aliasStore, { allowOverride = false } = {}) {
  const normalizedCode = normaliseAlpha2(code);
  if (!normalizedCode || !hasRegisteredCountry(normalizedCode)) {
    return;
  }
  const key = normaliseAliasKey(alias);
  if (!key) {
    return;
  }

  if (!allowOverride && aliasStore.has(key)) {
    return;
  }

  aliasStore.set(key, normalizedCode);
}

function decodeFlagEmoji(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const codePoints = Array.from(trimmed, (char) => char.codePointAt(0));
  if (codePoints.length !== 2) {
    return null;
  }
  const base = 127397;
  const letters = codePoints.map((point) => String.fromCharCode(point - base)).join('');
  return /^[A-Z]{2}$/.test(letters) ? letters : null;
}

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

function normaliseLatitude(value) {
  const coerced = coerceNumber(value);
  return coerced !== null && coerced >= -90 && coerced <= 90 ? coerced : null;
}

function normaliseLongitude(value) {
  const coerced = coerceNumber(value);
  return coerced !== null && coerced >= -180 && coerced <= 180 ? coerced : null;
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

for (const [code, value] of Object.entries(centroidsData?.countries ?? {})) {
  const entry = sanitiseCentroidEntry(code, value);
  if (entry) {
    countryCentroids.set(entry.code, entry);
    registerAlias(entry.name, entry.code, aliasToCode);
    registerAlias(entry.code, entry.code, aliasToCode);
  }
}

for (const [alias, code] of Object.entries(centroidsData?.aliases ?? {})) {
  registerAlias(alias, code, aliasToCode);
}

for (const [alpha3, alpha2] of isoAlpha3ToAlpha2.entries()) {
  registerAlias(alpha3, alpha2, aliasToCode);
}

const REGION_DISPLAY_LOCALES = ['en', 'fr', 'es'];

for (const locale of REGION_DISPLAY_LOCALES) {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    for (const code of countryCentroids.keys()) {
      const display = displayNames.of(code);
      if (display) {
        registerAlias(display, code, aliasToCode);
      }
    }
  } catch (_error) {
    // Some runtimes may not have locale data installed. Fail silently and rely on bundled aliases.
  }
}

function normaliseCountryCodeFromString(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const emojiCode = decodeFlagEmoji(trimmed);
  if (emojiCode && hasRegisteredCountry(emojiCode)) {
    return emojiCode;
  }

  const normalizedAlpha2 = normaliseAlpha2(trimmed);
  if (normalizedAlpha2 && hasRegisteredCountry(normalizedAlpha2)) {
    return normalizedAlpha2;
  }

  const upper = trimmed.toUpperCase();

  if (upper.length === 3) {
    const iso2 = customIsoAlpha3ToAlpha2.get(upper) ?? isoAlpha3ToAlpha2.get(upper);
    if (iso2 && hasRegisteredCountry(iso2)) {
      return iso2;
    }
  }

  const aliasKey = normaliseAliasKey(trimmed);
  if (aliasKey) {
    if (customAliasToCode.has(aliasKey)) {
      return customAliasToCode.get(aliasKey);
    }

    if (aliasToCode.has(aliasKey)) {
      return aliasToCode.get(aliasKey);
    }
  }

  return null;
}

function extractCandidatesFromObject(value) {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const fields = [
    'code',
    'countryCode',
    'country',
    'country_code',
    'country_name',
    'iso',
    'iso2',
    'iso3',
    'alpha2',
    'alpha3',
    'cca2',
    'cca3',
    'id',
    'label',
    'name'
  ];

  const candidates = [];
  for (const field of fields) {
    if (value[field] !== undefined && value[field] !== null) {
      candidates.push(value[field]);
    }
  }
  if (value.value !== undefined && value.value !== null) {
    candidates.push(value.value);
  }
  if (value.metadata?.country) {
    candidates.push(value.metadata.country);
  }
  return candidates;
}

function normaliseIterable(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input;
  }
  if (input instanceof Set) {
    return Array.from(input.values());
  }
  if (typeof input[Symbol.iterator] === 'function' && typeof input !== 'string') {
    return Array.from(input);
  }
  return [];
}

function readCacheEntry(key) {
  if (!key) {
    return undefined;
  }

  if (geoConfiguration.cacheTtlMs <= 0 || geoConfiguration.cacheMaxEntries <= 0) {
    return undefined;
  }

  const cached = countryCodeCache.get(key);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    countryCodeCache.delete(key);
    return undefined;
  }

  return cached.code;
}

function writeCacheEntry(key, code) {
  if (!key) {
    return;
  }

  if (geoConfiguration.cacheTtlMs <= 0 || geoConfiguration.cacheMaxEntries <= 0) {
    return;
  }

  if (!countryCodeCache.has(key) && countryCodeCache.size >= geoConfiguration.cacheMaxEntries) {
    const oldestKey = countryCodeCache.keys().next().value;
    if (oldestKey !== undefined) {
      countryCodeCache.delete(oldestKey);
    }
  }

  const expiresAt = Date.now() + geoConfiguration.cacheTtlMs;
  countryCodeCache.set(key, { code, expiresAt });
}

function clearCacheIfDisabled() {
  if (geoConfiguration.cacheTtlMs <= 0 || geoConfiguration.cacheMaxEntries <= 0) {
    countryCodeCache.clear();
  }
}

function cacheKeyFor(input) {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === 'string') {
    return `s:${input.trim().toLowerCase()}`;
  }
  if (Array.isArray(input)) {
    return `a:${input.map((entry) => cacheKeyFor(entry) ?? '').join('|')}`;
  }
  if (typeof input === 'object') {
    try {
      return `o:${JSON.stringify(
        Object.keys(input)
          .sort()
          .reduce((acc, key) => ({ ...acc, [key]: input[key] }), {})
      )}`;
    } catch (_error) {
      return null;
    }
  }
  return String(input);
}

export function normaliseCountryCode(input) {
  if (input === null || input === undefined) {
    return null;
  }

  const key = cacheKeyFor(input);
  const cached = readCacheEntry(key);
  if (cached !== undefined) {
    return cached;
  }

  let resolved = null;

  if (typeof input === 'string') {
    resolved = normaliseCountryCodeFromString(input);
  } else if (Array.isArray(input) || input instanceof Set) {
    for (const candidate of normaliseIterable(input)) {
      resolved = normaliseCountryCode(candidate);
      if (resolved) {
        break;
      }
    }
  } else if (typeof input === 'object') {
    for (const candidate of extractCandidatesFromObject(input)) {
      resolved = normaliseCountryCode(candidate);
      if (resolved) {
        break;
      }
    }
  }

  if (key) {
    writeCacheEntry(key, resolved);
  }

  return resolved;
}

export function resolveCountryCoordinates(input) {
  const code = normaliseCountryCode(input);
  if (!code) {
    return null;
  }
  const centroid = customCountryCentroids.get(code) ?? countryCentroids.get(code);
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

const KM_PER_LAT = 110.574;
const KM_PER_LNG_AT_EQUATOR = 111.32;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pickCoordinate(candidates, normaliser) {
  for (const candidate of candidates) {
    const resolved = normaliser(candidate);
    if (resolved !== null) {
      return resolved;
    }
  }
  return null;
}

function extractCoordinates(marker) {
  if (marker === null || marker === undefined) {
    return null;
  }

  if (typeof marker === 'string') {
    const parts = marker.split(',');
    if (parts.length >= 2) {
      const latitude = normaliseLatitude(parts[0]);
      const longitude = normaliseLongitude(parts[1]);
      if (latitude !== null && longitude !== null) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  if (Array.isArray(marker)) {
    if (marker.length >= 2) {
      const latitude = normaliseLatitude(marker[0]);
      const longitude = normaliseLongitude(marker[1]);
      if (latitude !== null && longitude !== null) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  if (typeof marker === 'object') {
    const latitude = pickCoordinate([
      marker.latitude,
      marker.lat,
      marker.latDeg,
      marker.y
    ], normaliseLatitude);
    const longitude = pickCoordinate([
      marker.longitude,
      marker.lng,
      marker.lon,
      marker.long,
      marker.x
    ], normaliseLongitude);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }

    if (marker.coordinates !== undefined) {
      const nested = extractCoordinates(marker.coordinates);
      if (nested) {
        return nested;
      }
    }

    if (marker.location !== undefined) {
      const nested = extractCoordinates(marker.location);
      if (nested) {
        return nested;
      }
    }

    if (typeof marker.toArray === 'function') {
      const nested = extractCoordinates(marker.toArray());
      if (nested) {
        return nested;
      }
    }

    if (typeof marker.toJSON === 'function') {
      const nested = extractCoordinates(marker.toJSON());
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function buildBounds(markers, options = {}) {
  if (!Array.isArray(markers) || markers.length === 0) {
    return null;
  }

  const coordinates = markers
    .map((marker) => extractCoordinates(marker))
    .filter((coordinate) => coordinate && typeof coordinate.latitude === 'number' && typeof coordinate.longitude === 'number');

  if (!coordinates.length) {
    return null;
  }

  const initial = {
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY
  };

  const rawBounds = coordinates.reduce(
    (acc, { latitude, longitude }) => ({
      minLat: Math.min(acc.minLat, latitude),
      maxLat: Math.max(acc.maxLat, latitude),
      minLng: Math.min(acc.minLng, longitude),
      maxLng: Math.max(acc.maxLng, longitude)
    }),
    initial
  );

  if (!Number.isFinite(rawBounds.minLat) || !Number.isFinite(rawBounds.minLng)) {
    return null;
  }

  const centerLat = (rawBounds.minLat + rawBounds.maxLat) / 2;
  const centerLng = (rawBounds.minLng + rawBounds.maxLng) / 2;

  const paddingKilometers = Math.max(0, Number(options.paddingKilometers ?? 0));
  const paddingDegrees = Math.max(0, Number(options.paddingDegrees ?? 0));

  const latPaddingFromKm = paddingKilometers / KM_PER_LAT;
  const cosLatitude = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.01);
  const lngPaddingFromKm = paddingKilometers / (KM_PER_LNG_AT_EQUATOR * cosLatitude);

  const latPadding = paddingDegrees + latPaddingFromKm;
  const lngPadding = paddingDegrees + lngPaddingFromKm;

  const minLat = clamp(rawBounds.minLat - latPadding, -90, 90);
  const maxLat = clamp(rawBounds.maxLat + latPadding, -90, 90);
  const minLng = clamp(rawBounds.minLng - lngPadding, -180, 180);
  const maxLng = clamp(rawBounds.maxLng + lngPadding, -180, 180);

  const center = Object.freeze({
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2
  });

  const span = Object.freeze({
    latitude: maxLat - minLat,
    longitude: maxLng - minLng
  });

  return Object.freeze({
    minLat,
    maxLat,
    minLng,
    maxLng,
    center,
    span,
    points: coordinates.length
  });
}

export function clearGeoCaches() {
  countryCodeCache.clear();
}

export function configureGeoCaching(overrides = {}) {
  const next = { ...geoConfiguration };

  if (Object.prototype.hasOwnProperty.call(overrides, 'cacheTtlMs')) {
    const ttl = Number(overrides.cacheTtlMs);
    if (!Number.isFinite(ttl) || ttl < 0) {
      throw new Error('cacheTtlMs must be a non-negative number');
    }
    next.cacheTtlMs = ttl;
  }

  if (Object.prototype.hasOwnProperty.call(overrides, 'cacheMaxEntries')) {
    const max = Number(overrides.cacheMaxEntries);
    if (!Number.isFinite(max) || max < 0) {
      throw new Error('cacheMaxEntries must be a non-negative number');
    }
    next.cacheMaxEntries = Math.floor(max);
  }

  geoConfiguration = next;

  clearCacheIfDisabled();

  if (geoConfiguration.cacheMaxEntries > 0) {
    while (countryCodeCache.size > geoConfiguration.cacheMaxEntries) {
      const oldestKey = countryCodeCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      countryCodeCache.delete(oldestKey);
    }
  }

  return { ...geoConfiguration };
}

export function resetGeoConfiguration() {
  geoConfiguration = { ...GEO_CONFIG_DEFAULTS };
  clearGeoCaches();
}

export function getGeoConfiguration() {
  return { ...geoConfiguration };
}

export function clearCustomCountryAliases() {
  customAliasToCode.clear();
  clearGeoCaches();
}

export function clearCustomIsoMappings() {
  customIsoAlpha3ToAlpha2.clear();
  clearGeoCaches();
}

export function clearCustomCountryData() {
  customCountryCentroids.clear();
  clearCustomCountryAliases();
  clearCustomIsoMappings();
}

export function registerCustomCountryAlias(alias, code, { override = true } = {}) {
  const normalizedCode = normaliseAlpha2(code);
  if (!normalizedCode || !hasRegisteredCountry(normalizedCode)) {
    throw new Error('Unknown country code for alias registration');
  }

  const key = normaliseAliasKey(alias);
  if (!key) {
    throw new Error('Alias must be a non-empty string');
  }

  if (!override && customAliasToCode.has(key)) {
    return customAliasToCode.get(key);
  }

  customAliasToCode.set(key, normalizedCode);
  clearGeoCaches();
  return normalizedCode;
}

export function registerCustomIsoMapping(alpha3, alpha2, { override = true } = {}) {
  const normalizedAlpha3 = normaliseAlpha3(alpha3);
  const normalizedAlpha2 = normaliseAlpha2(alpha2);

  if (!normalizedAlpha3) {
    throw new Error('Invalid ISO alpha-3 code');
  }
  if (!normalizedAlpha2 || !hasRegisteredCountry(normalizedAlpha2)) {
    throw new Error('Unknown country for ISO alpha-3 mapping');
  }

  if (!override && customIsoAlpha3ToAlpha2.has(normalizedAlpha3)) {
    return customIsoAlpha3ToAlpha2.get(normalizedAlpha3);
  }

  customIsoAlpha3ToAlpha2.set(normalizedAlpha3, normalizedAlpha2);
  clearGeoCaches();
  return normalizedAlpha2;
}

export function registerCustomCountryCentroid(entry, { override = false } = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid centroid payload');
  }

  const candidateCode = entry.code ?? entry.iso2 ?? entry.countryCode ?? entry.alpha2;
  const sanitized = sanitiseCentroidEntry(candidateCode, entry);
  if (!sanitized) {
    throw new Error('Invalid centroid payload');
  }

  if (!override && hasRegisteredCountry(sanitized.code)) {
    throw new Error(`Country ${sanitized.code} already registered`);
  }

  customCountryCentroids.set(sanitized.code, sanitized);

  registerAlias(sanitized.name, sanitized.code, customAliasToCode, { allowOverride: true });
  registerAlias(sanitized.code, sanitized.code, customAliasToCode, { allowOverride: true });

  if (Array.isArray(entry.aliases)) {
    for (const alias of entry.aliases) {
      registerAlias(alias, sanitized.code, customAliasToCode, { allowOverride: true });
    }
  }

  if (entry.iso3) {
    registerCustomIsoMapping(entry.iso3, sanitized.code, { override: true });
  }

  clearGeoCaches();
  return sanitized;
}

export function getGeoDiagnostics() {
  return Object.freeze({
    cache: {
      size: countryCodeCache.size,
      ttlMs: geoConfiguration.cacheTtlMs,
      maxEntries: geoConfiguration.cacheMaxEntries
    },
    aliases: {
      builtIn: aliasToCode.size,
      custom: customAliasToCode.size
    },
    countries: {
      builtIn: countryCentroids.size,
      custom: customCountryCentroids.size
    },
    isoMappings: {
      builtIn: isoAlpha3ToAlpha2.size,
      custom: customIsoAlpha3ToAlpha2.size
    }
  });
}

export default {
  normaliseCountryCode,
  resolveCountryCoordinates,
  buildBounds,
  configureGeoCaching,
  resetGeoConfiguration,
  clearGeoCaches,
  registerCustomCountryAlias,
  registerCustomIsoMapping,
  registerCustomCountryCentroid,
  clearCustomCountryData,
  clearCustomCountryAliases,
  clearCustomIsoMappings,
  getGeoConfiguration,
  getGeoDiagnostics
};
