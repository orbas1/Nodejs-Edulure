import { describe, expect, it, vi } from 'vitest';

import { createReadinessTracker } from '../src/observability/readiness.js';

describe('createReadinessTracker', () => {
  it('tracks readiness states and aggregates service readiness', () => {
    const tracker = createReadinessTracker('test-service', ['component-a']);

    let snapshot = tracker.snapshot();
    expect(snapshot.ready).toBe(false);
    expect(snapshot.components).toHaveLength(1);
    expect(snapshot.components[0]).toMatchObject({ name: 'component-a', status: 'pending', ready: false });

    tracker.markReady('component-a');
    snapshot = tracker.snapshot();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.components[0].status).toBe('ready');

    tracker.markFailed('component-b', new Error('boom'));
    snapshot = tracker.snapshot();
    expect(snapshot.ready).toBe(false);
    const componentB = snapshot.components.find((component) => component.name === 'component-b');
    expect(componentB?.status).toBe('failed');
    expect(componentB?.ready).toBe(false);
    expect(componentB?.error?.message).toContain('boom');
  });

  it('allows marking components as degraded without failing readiness', () => {
    const tracker = createReadinessTracker('test-service', ['alpha', 'beta']);
    tracker.markReady('alpha');
    tracker.markDegraded('beta', 'operational with warnings');

    const snapshot = tracker.snapshot();
    expect(snapshot.ready).toBe(true);
    const beta = snapshot.components.find((component) => component.name === 'beta');
    expect(beta?.status).toBe('degraded');
    expect(beta?.ready).toBe(true);
    expect(beta?.message).toContain('warnings');
  });

  it('supports change subscriptions and lifecycle helpers', async () => {
    const tracker = createReadinessTracker('svc-observability', ['database']);
    const listener = vi.fn();
    const unsubscribe = tracker.onChange(listener);

    tracker.markReady('database', 'Primary database ready', { region: 'us-east-1' });
    await tracker.withComponent('queue-worker', async () => ({
      status: 'degraded',
      message: 'Backlog building',
      details: { lagSeconds: 42 }
    }));

    await expect(
      tracker.withComponent('search-index', async () => {
        throw new Error('Elasticsearch unavailable');
      })
    ).rejects.toThrow('Elasticsearch unavailable');

    tracker.markMaintenance('cdn', 'Planned maintenance');

    const snapshot = tracker.snapshot();
    expect(snapshot.ready).toBe(false);
    expect(tracker.listComponents()).toEqual(
      expect.arrayContaining(['database', 'queue-worker', 'search-index', 'cdn'])
    );

    const queueState = tracker.getComponentState('queue-worker');
    expect(queueState?.status).toBe('degraded');
    expect(queueState?.details).toEqual({ lagSeconds: 42 });

    const searchState = tracker.getComponentState('search-index');
    expect(searchState?.status).toBe('failed');
    expect(searchState?.error?.message).toContain('Elasticsearch unavailable');

    const maintenanceState = tracker.getComponentState('cdn');
    expect(maintenanceState?.status).toBe('maintenance');
    expect(maintenanceState?.ready).toBe(false);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
