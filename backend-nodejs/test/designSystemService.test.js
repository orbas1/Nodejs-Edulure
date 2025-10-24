import { describe, expect, it, beforeEach } from 'vitest';

import DesignSystemService from '../src/services/DesignSystemService.js';

describe('DesignSystemService', () => {
  beforeEach(() => {
    DesignSystemService.clearCache();
  });

  it('returns manifest metadata and groups', async () => {
    const manifest = await DesignSystemService.describeTokens();
    expect(manifest).toBeDefined();
    expect(manifest.metadata).toHaveProperty('version');
    expect(Array.isArray(manifest.groups)).toBe(true);
    expect(manifest.groups.length).toBeGreaterThan(0);
    const firstGroup = manifest.groups[0];
    expect(firstGroup).toHaveProperty('tokens');
    expect(Array.isArray(firstGroup.tokens)).toBe(true);
  });

  it('memoises manifest reads', async () => {
    const first = await DesignSystemService.describeTokens();
    const second = await DesignSystemService.describeTokens();
    expect(second).toBe(first);
  });
});
