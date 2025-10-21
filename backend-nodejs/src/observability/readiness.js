import assert from 'node:assert/strict';

function timestamp() {
  return new Date().toISOString();
}

function normaliseMessage(message, fallback) {
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return fallback;
}

function buildState({ status, ready, message, error, details }) {
  return {
    status,
    ready,
    message,
    details: details && typeof details === 'object' ? { ...details } : undefined,
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
  const listeners = new Set();
  const normalizedComponents = Array.from(new Set(components));

  normalizedComponents.forEach((component) => {
    if (typeof component !== 'string' || !component.trim()) {
      throw new Error('Component names must be non-empty strings.');
    }
    state.set(component, buildState({ status: 'pending', ready: false, message: 'Initialising' }));
  });

  function ensureComponent(component) {
    if (typeof component !== 'string' || !component.trim()) {
      throw new Error('Component names must be non-empty strings.');
    }

    if (!state.has(component)) {
      state.set(component, buildState({ status: 'pending', ready: false, message: 'Initialising' }));
    }
  }

  function notify() {
    if (!listeners.size) {
      return;
    }

    const snapshot = toJSON();
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('readiness listener error', error);
      }
    }
  }

  function mark(component, nextState) {
    ensureComponent(component);
    state.set(component, buildState(nextState));
    notify();
  }

  function markPending(component, message = 'Initialising') {
    mark(component, { status: 'pending', ready: false, message: normaliseMessage(message, 'Initialising') });
  }

  function markReady(component, message = 'Ready', details) {
    mark(component, {
      status: 'ready',
      ready: true,
      message: normaliseMessage(message, 'Ready'),
      details
    });
  }

  function markDegraded(component, message = 'Operational with limitations', details) {
    mark(component, {
      status: 'degraded',
      ready: true,
      message: normaliseMessage(message, 'Operational with limitations'),
      details
    });
  }

  function markMaintenance(component, message = 'Maintenance in progress', details) {
    mark(component, {
      status: 'maintenance',
      ready: false,
      message: normaliseMessage(message, 'Maintenance in progress'),
      details
    });
  }

  function markFailed(component, error, details) {
    const message = typeof error === 'string' ? error : error?.message ?? 'Unknown failure';
    mark(component, {
      status: 'failed',
      ready: false,
      message,
      error,
      details
    });
  }

  function getComponentState(component) {
    return state.get(component) ?? null;
  }

  function listComponents() {
    return Array.from(state.keys());
  }

  async function withComponent(component, handler, { pendingMessage = 'Initialising' } = {}) {
    if (typeof handler !== 'function') {
      throw new Error('withComponent requires an async handler function.');
    }

    markPending(component, pendingMessage);
    try {
      const result = await handler();
      if (result && typeof result === 'object') {
        if (result.status === 'degraded') {
          markDegraded(component, result.message, result.details);
          return result;
        }
        if (result.status === 'maintenance') {
          markMaintenance(component, result.message, result.details);
          return result;
        }
        if (result.status === 'failed') {
          markFailed(component, result.error ?? new Error(result.message ?? 'Failure'), result.details);
          return result;
        }
        if (typeof result.ready === 'boolean' && !result.ready) {
          markFailed(component, result.error ?? new Error(result.message ?? 'Component not ready'), result.details);
          return result;
        }
        markReady(component, result.message, result.details);
        return result;
      }

      markReady(component);
      return result;
    } catch (error) {
      markFailed(component, error);
      throw error;
    }
  }

  function toJSON() {
    const componentsState = Array.from(state.entries()).map(([name, componentState]) => ({
      name,
      ...componentState
    }));
    const ready =
      componentsState.length > 0 &&
      componentsState.every((component) => component.ready && component.status !== 'maintenance');
    return {
      service: serviceName,
      ready,
      components: componentsState,
      timestamp: timestamp()
    };
  }

  function onChange(listener) {
    if (typeof listener !== 'function') {
      throw new Error('onChange listener must be a function.');
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    markPending,
    markReady,
    markDegraded,
    markMaintenance,
    markFailed,
    snapshot: toJSON,
    isReady: () => toJSON().ready,
    getComponentState,
    listComponents,
    withComponent,
    onChange
  };
}
