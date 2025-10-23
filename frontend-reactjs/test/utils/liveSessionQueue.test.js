import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLiveSessionQueue,
  enqueueLiveSessionAction,
  flushLiveSessionQueue,
  loadLiveSessionQueue
} from '../../src/utils/liveSessionQueue.js';

function createStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

describe('liveSessionQueue utilities', () => {
  let originalWindow;

  beforeEach(() => {
    const storage = createStorageMock();
    originalWindow = globalThis.window;
    globalThis.window = {
      localStorage: storage,
      navigator: { onLine: true }
    };
    globalThis.localStorage = storage;
    clearLiveSessionQueue();
  });

  afterEach(() => {
    globalThis.localStorage = undefined;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('enqueues actions and persists them to storage', () => {
    const entry = enqueueLiveSessionAction({ sessionId: 'session-1', action: 'join' });

    expect(entry).toMatchObject({ sessionId: 'session-1', action: 'join' });
    expect(typeof entry.enqueuedAt).toBe('string');

    const stored = loadLiveSessionQueue();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: entry.id, sessionId: 'session-1', action: 'join' });
  });

  it('flushes queued actions and removes fulfilled entries', async () => {
    const first = enqueueLiveSessionAction({ sessionId: 'session-2', action: 'join' });
    const second = enqueueLiveSessionAction({ sessionId: 'session-3', action: 'check-in' });

    const executor = vi
      .fn()
      .mockImplementationOnce(async ({ sessionId, action, token }) => {
        expect(sessionId).toBe('session-2');
        expect(action).toBe('join');
        expect(token).toBe('token-123');
      })
      .mockImplementationOnce(async () => {
        throw new Error('offline');
      });

    const results = await flushLiveSessionQueue({ token: 'token-123', executor });

    expect(results).toEqual([
      { id: first.id, status: 'fulfilled' },
      { id: second.id, status: 'rejected', reason: expect.any(Error) }
    ]);

    const remaining = loadLiveSessionQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      id: second.id,
      sessionId: 'session-3',
      action: 'check-in',
      attempts: 1,
      lastError: 'offline'
    });
  });

  it('skips flushing when executor or token missing', async () => {
    enqueueLiveSessionAction({ sessionId: 'session-4', action: 'join' });

    const withoutExecutor = await flushLiveSessionQueue({ token: 'token-123' });
    expect(withoutExecutor).toEqual([]);

    const withoutToken = await flushLiveSessionQueue({ executor: vi.fn() });
    expect(withoutToken).toEqual([]);

    expect(loadLiveSessionQueue()).toHaveLength(1);
  });
});
