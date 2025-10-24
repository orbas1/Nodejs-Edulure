import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/repositories/NavigationAnnexRepository.js', () => ({
  __esModule: true,
  default: {
    describe: vi.fn()
  }
}));

const NavigationAnnexRepository = (await import('../src/repositories/NavigationAnnexRepository.js')).default;
const NavigationAnnexService = (await import('../src/services/NavigationAnnexService.js')).default;

describe('NavigationAnnexService.describeStrategyBriefing', () => {
  beforeEach(() => {
    NavigationAnnexRepository.describe.mockReset();
    NavigationAnnexService.resetStrategyCache();
  });

  it('merges annex narratives with valuation metadata', async () => {
    NavigationAnnexRepository.describe.mockResolvedValue({
      refreshedAt: '2025-10-22T00:00:00Z',
      strategyNarratives: [
        {
          pillar: 'Retention',
          narratives: ['Reduce clicks to reach the feed after sign-in.'],
          metrics: [
            {
              id: 'nav-click-depth',
              label: 'Average click depth to reach feed updates',
              baseline: '3.2',
              target: '2.1',
              unit: 'clicks'
            },
            {
              id: 'return-visit-rate',
              label: '30-day returning learner rate',
              baseline: '41%',
              target: '48%',
              unit: 'percentage'
            }
          ]
        }
      ]
    });

    const briefing = await NavigationAnnexService.describeStrategyBriefing({ role: 'admin' });

    expect(briefing.role).toBe('admin');
    expect(briefing.version).toBe('2025.10');
    expect(briefing.pillars).toHaveLength(1);
    expect(briefing.pillars[0].stakeholders).toContain('Product');
    expect(briefing.pillars[0].metrics[0].valuationNotes).toMatch(/reduction/);
    expect(briefing.pillars[0].metrics[0].owner).toBe('Navigation PM');
    expect(briefing.pillars[0].communications[0].channel).toBe('Weekly exec stand-up');
  });
});
