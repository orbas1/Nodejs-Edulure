import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSloSummaries,
  getSloSummary,
  recordHttpSloObservation,
  resetSloRegistry
} from '../src/observability/sloRegistry.js';

describe('SLO registry', () => {
  beforeEach(() => {
    resetSloRegistry();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes availability, burn rate, and latency summaries for provider transition SLOs', () => {
    for (let i = 0; i < 50; i += 1) {
      recordHttpSloObservation({
        route: '/api/v1/provider-transition/announcements',
        method: 'GET',
        statusCode: 200,
        durationMs: 100 + i
      });
    }

    recordHttpSloObservation({
      route: '/api/v1/provider-transition/announcements',
      method: 'GET',
      statusCode: 503,
      durationMs: 450
    });

    const snapshot = getSloSummary('provider-transition-availability', { includeDefinition: true });
    expect(snapshot).toBeTruthy();
    expect(snapshot.status).toBe('warning');
    expect(snapshot.annotations.some((item) => item.code === 'burn-rate-warning')).toBe(true);
    expect(snapshot.measuredAvailability).toBeCloseTo(50 / 51, 5);
    expect(snapshot.errorCount).toBe(1);
    expect(snapshot.errorBudget).toBeCloseTo((1 - 0.995) * 51, 3);
    expect(snapshot.errorBudgetRemaining).toBe(0);
    expect(snapshot.latency).toBeTruthy();
    expect(snapshot.latency.sampleSize).toBe(51);
    expect(snapshot.latency.maxMs).toBe(450);
    expect(snapshot.latency.minMs).toBe(100);
    expect(snapshot.latency.averageMs).toBeGreaterThan(100);
    expect(snapshot.definition.indicator.routePattern).toContain('/api/v1/provider-transition');
  });

  it('provides no-data snapshots when no events have been recorded', () => {
    const summaries = getSloSummaries({ includeDefinition: false });
    expect(Array.isArray(summaries.slo)).toBe(true);
    expect(summaries.slo.length).toBeGreaterThan(0);

    const graphqlSnapshot = getSloSummary('graphql-gateway-availability', { includeDefinition: false });
    expect(graphqlSnapshot.status).toBe('no_data');
    expect(graphqlSnapshot.definition).toBeUndefined();
    expect(graphqlSnapshot.totalRequests).toBe(0);
    expect(graphqlSnapshot.latency).toBeNull();
  });
});
