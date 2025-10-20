import { describe, expect, it } from 'vitest';

import AdsCampaignModel from '../../src/models/AdsCampaignModel.js';

describe('AdsCampaignModel.deserialize', () => {
  it('normalises numeric fields and JSON payloads from database rows', () => {
    const record = {
      id: 5,
      publicId: 'pub-5',
      createdBy: 42,
      name: 'Spring Launch',
      objective: 'awareness',
      status: 'active',
      budgetCurrency: 'USD',
      budgetDailyCents: '4500',
      spendCurrency: 'USD',
      spendTotalCents: '3200',
      performanceScore: '0.87',
      ctr: '2.4',
      cpcCents: '130',
      cpaCents: '950',
      targetingKeywords: '["growth","education"]',
      targetingAudiences: '[{"id":"beta","name":"Beta Cohort"}]',
      targetingLocations: '["US","CA"]',
      targetingLanguages: null,
      creativeHeadline: 'Grow with Edulure',
      creativeDescription: 'Learning reinvented',
      creativeUrl: 'https://edulure.example/launch',
      startAt: '2024-04-01T00:00:00Z',
      endAt: '2024-04-30T23:59:59Z',
      metadata: '{"placement":"feed","brandSafety":"strict"}',
      createdAt: '2024-03-15T12:00:00Z',
      updatedAt: '2024-03-15T12:00:00Z'
    };

    const campaign = AdsCampaignModel.deserialize(record);

    expect(campaign.budgetDailyCents).toBe(4500);
    expect(campaign.spendTotalCents).toBe(3200);
    expect(campaign.performanceScore).toBeCloseTo(0.87);
    expect(campaign.targetingKeywords).toEqual(['growth', 'education']);
    expect(campaign.targetingAudiences).toEqual([{ id: 'beta', name: 'Beta Cohort' }]);
    expect(campaign.targetingLanguages).toEqual([]);
    expect(campaign.metadata).toEqual({ placement: 'feed', brandSafety: 'strict' });
  });
});
