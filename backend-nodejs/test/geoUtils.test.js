import { describe, expect, it } from 'vitest';

import { buildBounds, normaliseCountryCode, resolveCountryCoordinates } from '../src/utils/geo.js';

describe('geo utilities', () => {
  it('normalises ISO codes and alias inputs', () => {
    expect(normaliseCountryCode(' united states ')).toBe('US');
    expect(normaliseCountryCode({ country: 'canada' })).toBe('CA');
    expect(normaliseCountryCode('unknown-land')).toBeNull();
  });

  it('resolves centroid coordinates as numbers', () => {
    const info = resolveCountryCoordinates('us');
    expect(info).not.toBeNull();
    expect(info?.name).toBe('United States');
    expect(typeof info?.latitude).toBe('number');
    expect(typeof info?.longitude).toBe('number');
  });

  it('builds bounds with derived center and span', () => {
    const bounds = buildBounds([
      { latitude: '51.5074', longitude: '-0.1278' },
      { lat: 48.8566, lng: 2.3522 }
    ]);

    expect(bounds).not.toBeNull();
    expect(bounds?.markers).toHaveLength(2);
    expect(bounds?.center.latitude).toBeCloseTo((51.5074 + 48.8566) / 2, 4);
    expect(bounds?.span.longitude).toBeCloseTo(Math.abs(-0.1278 - 2.3522), 4);
  });
});
