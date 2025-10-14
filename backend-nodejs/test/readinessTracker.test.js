import { describe, expect, it } from 'vitest';

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
});
