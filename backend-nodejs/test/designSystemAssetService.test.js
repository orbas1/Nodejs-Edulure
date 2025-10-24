import { beforeEach, describe, expect, it } from 'vitest';

import DesignSystemAssetService from '../src/services/DesignSystemAssetService.js';

describe('DesignSystemAssetService', () => {
  beforeEach(() => {
    DesignSystemAssetService.resetCache();
  });

  it('loads design token manifest and research insights', async () => {
    const payload = await DesignSystemAssetService.describeAssets();

    expect(payload.generatedAt).toBeTruthy();
    expect(Array.isArray(payload.tokens.tokens)).toBe(true);
    expect(payload.tokens.tokens.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.research.insights)).toBe(true);
    expect(payload.research.insights.length).toBeGreaterThan(0);
    expect(payload.summary.total).toBe(payload.tokens.tokens.length);
    expect(payload.researchByTag.support).toContain('learner-support-sla');
  });

  it('reuses cached manifest on subsequent calls', async () => {
    const first = await DesignSystemAssetService.describeAssets();
    const second = await DesignSystemAssetService.describeAssets();

    expect(second.tokens.generatedAt).toBe(first.tokens.generatedAt);
    expect(second.research.generatedAt).toBe(first.research.generatedAt);
    expect(second.summary.total).toBe(first.summary.total);
  });
});
