import assert from 'node:assert/strict';

function timestamp() {
  return new Date().toISOString();
}

function buildState({ status, ready, message, error }) {
  return {
    status,
    ready,
    message,
    error: error
      ? {
          name: error.name ?? 'Error',
          message: error.message ?? String(error),
          stack: error.stack ?? null
        }
      : undefined,
    updatedAt: timestamp()
  };
}

export function createReadinessTracker(serviceName, components = []) {
  assert.ok(typeof serviceName === 'string' && serviceName.trim().length > 0, 'serviceName is required');

  const state = new Map();
  const normalizedComponents = Array.from(new Set(components));

  normalizedComponents.forEach((component) => {
    if (typeof component !== 'string' || !component.trim()) {
      throw new Error('Component names must be non-empty strings.');
    }
    state.set(component, buildState({ status: 'pending', ready: false, message: 'Initialising' }));
  });

  function ensureComponent(component) {
    if (!state.has(component)) {
      state.set(component, buildState({ status: 'pending', ready: false, message: 'Initialising' }));
    }
  }

  function mark(component, nextState) {
    ensureComponent(component);
    state.set(component, buildState(nextState));
  }

  function markPending(component, message = 'Initialising') {
    mark(component, { status: 'pending', ready: false, message });
  }

  function markReady(component, message = 'Ready') {
    mark(component, { status: 'ready', ready: true, message });
  }

  function markDegraded(component, message = 'Operational with limitations') {
    mark(component, { status: 'degraded', ready: true, message });
  }

  function markFailed(component, error) {
    const message = typeof error === 'string' ? error : error?.message ?? 'Unknown failure';
    mark(component, { status: 'failed', ready: false, message, error });
  }

  function toJSON() {
    const componentsState = Array.from(state.entries()).map(([name, componentState]) => ({
      name,
      ...componentState
    }));
    const ready = componentsState.length > 0 && componentsState.every((component) => component.ready);
    return {
      service: serviceName,
      ready,
      components: componentsState,
      timestamp: timestamp()
    };
  }

  return {
    markPending,
    markReady,
    markDegraded,
    markFailed,
    snapshot: toJSON,
    isReady: () => toJSON().ready
  };
}
