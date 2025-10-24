import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import StrategyBriefingService from '../src/services/StrategyBriefingService.js';
import NavigationAnnexRepository from '../src/repositories/NavigationAnnexRepository.js';

describe('StrategyBriefingService', () => {
  beforeEach(() => {
    StrategyBriefingService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges annex strategy metrics with briefing manifest', async () => {
    const annexResponse = {
      strategyNarratives: [
        {
          pillar: 'Retention',
          narratives: ['Increase weekly streak engagement'],
          metrics: [
            {
              id: 'nav-click-depth',
              label: 'Navigation click depth',
              baseline: '4.1',
              target: '5.0',
              unit: 'clicks'
            }
          ]
        }
      ],
      refreshedAt: '2025-05-20T10:00:00Z'
    };

    vi.spyOn(NavigationAnnexRepository, 'describe').mockResolvedValue(annexResponse);

    const briefing = await StrategyBriefingService.getBriefing();
    expect(briefing.valuation.midpoint).toBe(900000);
    expect(Array.isArray(briefing.stakeholders)).toBe(true);
    expect(Array.isArray(briefing.messaging)).toBe(true);
    expect(Array.isArray(briefing.cadences)).toBe(true);
    const cadence = briefing.cadences.find((item) => item.metricKey === 'nav-click-depth');
    expect(cadence).toBeDefined();
    expect(cadence.metric).toEqual(
      expect.objectContaining({
        id: 'nav-click-depth',
        label: 'Navigation click depth'
      })
    );
    expect(briefing.strategyPillars[0].pillar).toBe('Retention');
    expect(briefing.annexRefreshedAt).toBe(annexResponse.refreshedAt);
  });
});
