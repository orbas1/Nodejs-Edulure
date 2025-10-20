import { describe, expect, it } from 'vitest';

import AdsCampaignMetricModel from '../../src/models/AdsCampaignMetricModel.js';

describe('AdsCampaignMetricModel.deserialize', () => {
  it('coerces numeric metrics and parses metadata', () => {
    const metricDate = '2024-05-10T00:00:00.000Z';
    const record = {
      id: 10,
      campaignId: 5,
      metricDate,
      impressions: '12345',
      clicks: '789',
      conversions: '55',
      spendCents: '9100',
      revenueCents: '15200',
      metadata: '{"source":"facebook"}'
    };

    const metric = AdsCampaignMetricModel.deserialize(record);

    expect(metric.impressions).toBe(12345);
    expect(metric.clicks).toBe(789);
    expect(metric.conversions).toBe(55);
    expect(metric.spendCents).toBe(9100);
    expect(metric.revenueCents).toBe(15200);
    expect(metric.metadata).toEqual({ source: 'facebook' });
    expect(metric.metricDate).toBeInstanceOf(Date);
    expect(metric.metricDate.toISOString()).toBe(metricDate);
  });
});
