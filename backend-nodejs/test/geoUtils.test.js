import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildBounds,
  normaliseCountryCode,
  resolveCountryCoordinates,
  configureGeoCaching,
  getGeoConfiguration,
  getGeoDiagnostics,
  registerCustomCountryAlias,
  registerCustomCountryCentroid,
  registerCustomIsoMapping,
  clearCustomCountryData,
  resetGeoConfiguration
} from '../src/utils/geo.js';

describe('geo helpers', () => {
  afterEach(() => {
    clearCustomCountryData();
    resetGeoConfiguration();
    vi.useRealTimers();
  });

  it('normalises ISO codes, ISO3 aliases, emoji flags and object descriptors', () => {
    expect(normaliseCountryCode('lt')).toBe('LT');
    expect(normaliseCountryCode(' lithuania ')).toBe('LT');
    expect(normaliseCountryCode('usa')).toBe('US');
    expect(normaliseCountryCode('🇫🇷')).toBe('FR');
    expect(normaliseCountryCode({ countryCode: 'se' })).toBe('SE');
    expect(normaliseCountryCode({ country: 'Côte d’Ivoire' })).toBe('CI');
    expect(normaliseCountryCode(['invalid', 'ad'])).toBe('AD');
    expect(normaliseCountryCode('unknown')).toBeNull();
  });

  it('resolves coordinates for valid inputs including ISO3 and emoji flags', () => {
    const lithuania = resolveCountryCoordinates('LT');
    expect(lithuania).toEqual({
      code: 'LT',
      name: 'Lithuania',
      latitude: 56,
      longitude: 24
    });

    expect(resolveCountryCoordinates('usa')).toMatchObject({
      code: 'US',
      latitude: expect.any(Number),
      longitude: expect.any(Number)
    });

    expect(resolveCountryCoordinates('🇫🇷')).toMatchObject({ code: 'FR' });
    expect(resolveCountryCoordinates('unknown')).toBeNull();
  });

  it('builds geographic bounds while ignoring invalid markers and exposes metadata', () => {
    const bounds = buildBounds(
      [
        { latitude: 10, longitude: 10 },
        { latitude: -5, longitude: 50 },
        { latitude: 'invalid', longitude: 0 }
      ],
      { paddingKilometers: 0 }
    );

    expect(bounds).toMatchObject({
      minLat: -5,
      maxLat: 10,
      minLng: 10,
      maxLng: 50,
      points: 2
    });
    expect(bounds.center).toEqual({ latitude: 2.5, longitude: 30 });
    expect(bounds.span).toEqual({ latitude: 15, longitude: 40 });
  });

  it('supports complex marker inputs and geographic padding', () => {
    const bounds = buildBounds(
      [
        { location: { lat: '40.7128', lng: '-74.0060' } },
        [34.0522, -118.2437],
        '51.5074, -0.1278',
        { latitude: 90, longitude: '181' }
      ],
      { paddingKilometers: 10 }
    );

    expect(bounds?.points).toBe(3);
    expect(bounds.minLat).toBeLessThan(34.0522);
    expect(bounds.maxLat).toBeGreaterThan(51.5074);
    expect(bounds.minLng).toBeLessThan(-118.2437);
    expect(bounds.maxLng).toBeGreaterThan(-0.1278);
    expect(bounds.span.latitude).toBeGreaterThan(17.5);
    expect(bounds.span.longitude).toBeGreaterThan(118);
    expect(bounds.center.latitude).toBeGreaterThan(42);
    expect(bounds.center.latitude).toBeLessThan(44);
    expect(bounds.center.longitude).toBeGreaterThan(-60);
    expect(bounds.center.longitude).toBeLessThan(-58);
  });

  it('returns null when markers lack valid coordinates', () => {
    expect(
      buildBounds([
        { latitude: 'nan', longitude: 'nan' },
        { coordinates: ['abc', 'def'] }
      ])
    ).toBeNull();
  });

  it('supports registering custom country metadata and aliases at runtime', () => {
    const custom = registerCustomCountryCentroid({
      code: 'XZ',
      name: 'Xylophone Islands',
      latitude: 12.34,
      longitude: 56.78,
      aliases: ['Xylophone Isles'],
      iso3: 'XYZ'
    });

    expect(custom).toMatchObject({ code: 'XZ', name: 'Xylophone Islands' });
    expect(normaliseCountryCode('xylophone islands')).toBe('XZ');
    expect(normaliseCountryCode('xylophone isles')).toBe('XZ');
    expect(normaliseCountryCode('xyz')).toBe('XZ');
    expect(resolveCountryCoordinates('XZ')).toEqual({
      code: 'XZ',
      name: 'Xylophone Islands',
      latitude: 12.34,
      longitude: 56.78
    });

    clearCustomCountryData();
    expect(normaliseCountryCode('xylophone islands')).toBeNull();
  });

  it('allows custom aliases for existing countries with override controls', () => {
    const normalized = registerCustomCountryAlias('Lithuania Prime', 'LT');
    expect(normalized).toBe('LT');
    expect(normaliseCountryCode('lithuania prime')).toBe('LT');

    const diagnostics = getGeoDiagnostics();
    expect(diagnostics.aliases.custom).toBeGreaterThanOrEqual(1);

    expect(() => registerCustomCountryAlias('Nowhere Land', 'ZZ')).toThrow(/Unknown country code/);
  });

  it('configures caching limits and respects disabling the cache', () => {
    configureGeoCaching({ cacheTtlMs: 100, cacheMaxEntries: 2 });
    expect(getGeoConfiguration()).toMatchObject({ cacheTtlMs: 100, cacheMaxEntries: 2 });

    expect(normaliseCountryCode('lt')).toBe('LT');
    expect(getGeoDiagnostics().cache.size).toBeGreaterThan(0);

    configureGeoCaching({ cacheMaxEntries: 0 });
    expect(getGeoConfiguration().cacheMaxEntries).toBe(0);
    expect(getGeoDiagnostics().cache.size).toBe(0);

    configureGeoCaching({ cacheMaxEntries: 5, cacheTtlMs: 20 });
    vi.useFakeTimers();
    expect(normaliseCountryCode('lt')).toBe('LT');
    expect(getGeoDiagnostics().cache.size).toBe(1);

    vi.advanceTimersByTime(25);
    expect(normaliseCountryCode('lt')).toBe('LT');
    expect(getGeoDiagnostics().cache.size).toBe(1);
  });

  it('rejects invalid caching configuration values', () => {
    expect(() => configureGeoCaching({ cacheTtlMs: -1 })).toThrow('cacheTtlMs must be a non-negative number');
    expect(() => configureGeoCaching({ cacheMaxEntries: -5 })).toThrow('cacheMaxEntries must be a non-negative number');
  });

  it('supports manual ISO alpha-3 overrides for custom countries', () => {
    const custom = registerCustomCountryCentroid({
      code: 'QP',
      name: 'Quantum Plains',
      latitude: -12.21,
      longitude: 48.55
    });

    expect(custom.code).toBe('QP');
    registerCustomIsoMapping('QPP', 'QP');

    expect(normaliseCountryCode('QPP')).toBe('QP');
  });
});
