import { describe, expect, it } from 'vitest';

import {
  buildBounds,
  normaliseCountryCode,
  resolveCountryCoordinates
} from '../src/utils/geo.js';

describe('geo helpers', () => {
  it('normalises ISO codes and known aliases', () => {
    expect(normaliseCountryCode('lt')).toBe('LT');
    expect(normaliseCountryCode(' lithuania ')).toBe('LT');
    expect(normaliseCountryCode('unknown')).toBeNull();
  });

  it('resolves coordinates for valid countries', () => {
    const result = resolveCountryCoordinates('LT');
    expect(result).toEqual({
      code: 'LT',
      name: 'Lithuania',
      latitude: 56,
      longitude: 24
    });
  });

  it('builds geographic bounds while ignoring invalid markers', () => {
    const bounds = buildBounds([
      { latitude: 10, longitude: 10 },
      { latitude: -5, longitude: 50 },
      { latitude: 'invalid', longitude: 0 }
    ]);

    expect(bounds).toEqual({
      minLat: -5,
      maxLat: 10,
      minLng: 10,
      maxLng: 50
    });
  });
});
