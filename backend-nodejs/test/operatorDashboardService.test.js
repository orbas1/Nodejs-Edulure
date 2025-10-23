import { describe, expect, it } from 'vitest';

import {
  buildComplianceRiskHeatmap,
  buildOverviewHelperText,
  summariseIncidentQueue
} from '../src/services/operatorDashboardHelpers.js';

describe('buildOverviewHelperText', () => {
  it('highlights highest operator priorities from live signals', () => {
    const text = buildOverviewHelperText({
      queueSummary: {
        totalOpen: 7,
        severityCounts: { critical: 2, high: 3, medium: 1, low: 1 }
      },
      complianceSnapshot: {
        queue: new Array(5).fill({}),
        attestations: { totals: { outstanding: 4 } }
      },
      integrationStats: { critical: 1, degraded: 2 },
      serviceHealth: { summary: { impactedServices: 2 } },
      storageUsage: { usedPercentage: 88 }
    });

    expect(text).toContain('clearing 2 critical incidents');
    expect(text).toContain('collecting 4 policy attestations');
    expect(text).toContain('stabilising 1 critical integration');
    expect(text).toContain('operations handbook');
  });

  it('deduplicates repeated tasks and limits the helper text to top priorities', () => {
    const text = buildOverviewHelperText({
      queueSummary: {
        totalOpen: 3,
        severityCounts: { critical: 0, high: 1, medium: 2, low: 0 }
      },
      complianceSnapshot: {
        queue: new Array(2).fill({}),
        attestations: { totals: { outstanding: 2 } }
      },
      integrationStats: { critical: 0, degraded: 5 },
      serviceHealth: { summary: { impactedServices: 4 } },
      storageUsage: { usedPercentage: 20 }
    });

    expect(text.startsWith('Prioritise')).toBe(true);
    const priorities = text.match(/Prioritise (.*)\. Use/)[1];
    const parts = priorities.split(/, | and /);
    const uniqueParts = new Set(parts);
    expect(parts.length).toBeLessThanOrEqual(3);
    expect(uniqueParts.size).toBe(parts.length);
    expect(priorities).toContain('working 3 open incidents');
    expect(priorities).toContain('collecting 2 policy attestations');
    expect(priorities).toContain('reviewing 2 KYC cases');
  });

  it('returns a steady-state helper when no priorities remain', () => {
    const text = buildOverviewHelperText({
      queueSummary: { totalOpen: 0, severityCounts: {} },
      complianceSnapshot: { queue: [], attestations: { totals: { outstanding: 0 } } },
      integrationStats: { critical: 0, degraded: 0 },
      serviceHealth: { summary: { impactedServices: 0 } },
      storageUsage: { usedPercentage: 30 }
    });

    expect(text).toBe(
      'All systems operational — export saved revenue views for finance checks and use the operations handbook links when incidents arise.'
    );
  });
});

describe('summariseIncidentQueue', () => {
  it('aggregates severity counts, acknowledgement metrics, and channel insights', () => {
    const now = new Date('2024-10-15T12:00:00Z');
    const queue = summariseIncidentQueue(
      [
        {
          severity: 'critical',
          reportedAt: '2024-10-15T10:00:00Z',
          acknowledgement: { acknowledgedAt: '2024-10-15T10:20:00Z', ackBreached: true },
          resolution: { resolutionBreached: false },
          metadata: { watchers: 2, detectionChannel: 'pagerduty' }
        },
        {
          severity: 'high',
          reportedAt: '2024-10-14T12:00:00Z',
          acknowledgement: { acknowledgedAt: '2024-10-14T12:45:00Z' },
          resolution: { resolutionBreached: true },
          metadata: { watchers: 1 },
          source: 'monitoring'
        }
      ],
      { now }
    );

    expect(queue.totalOpen).toBe(2);
    expect(queue.severityCounts).toMatchObject({ critical: 1, high: 1, medium: 0, low: 0 });
    expect(queue.medianAckMinutes).toBe(33);
    expect(queue.ackBreaches).toBe(1);
    expect(queue.resolutionBreaches).toBe(1);
    expect(queue.watchers).toBe(3);
    expect(queue.averageOpenHours).toBe(13);
    expect(queue.oldestOpenAt).toBe('2024-10-14T12:00:00.000Z');
    expect(queue.detectionChannels).toEqual([
      { channel: 'pagerduty', count: 1 },
      { channel: 'monitoring', count: 1 }
    ]);
  });
});

describe('buildComplianceRiskHeatmap', () => {
  it('groups incidents by category and severity for heatmap rendering', () => {
    const heatmap = buildComplianceRiskHeatmap([
      { category: 'fraud', severity: 'high' },
      { category: 'fraud', severity: 'critical' },
      { category: 'fraud', severity: 'critical' },
      { category: 'scam', severity: 'medium' },
      { category: 'scam', severity: 'low' }
    ]);

    expect(heatmap).toContainEqual({
      category: 'fraud',
      label: 'Payments & fraud',
      total: 3,
      breakdown: { critical: 2, high: 1, medium: 0, low: 0 }
    });
    expect(heatmap).toContainEqual({
      category: 'scam',
      label: 'Marketplace scams',
      total: 2,
      breakdown: { critical: 0, high: 0, medium: 1, low: 1 }
    });
  });
});
