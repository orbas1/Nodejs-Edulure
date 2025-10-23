import { loadPersistentState, savePersistentState } from './persistentState.js';

const STORAGE_KEY = 'edulure:live-session-queue';
const MAX_QUEUE_LENGTH = 25;

function normaliseQueue(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      if (!item.sessionId || !item.action) {
        return null;
      }
      return {
        id: item.id ?? `${item.sessionId}:${item.action}:${Date.now().toString(36)}`,
        sessionId: item.sessionId,
        action: item.action,
        payload: item.payload ?? null,
        enqueuedAt: item.enqueuedAt ?? new Date().toISOString(),
        attempts: Number.isFinite(Number(item.attempts)) ? Number(item.attempts) : 0,
        lastError: item.lastError ?? null
      };
    })
    .filter(Boolean);
}

export function loadLiveSessionQueue() {
  const stored = loadPersistentState(STORAGE_KEY, []);
  return normaliseQueue(stored);
}

function persistQueue(queue) {
  const trimmed = normaliseQueue(queue).slice(-MAX_QUEUE_LENGTH);
  savePersistentState(STORAGE_KEY, trimmed);
  return trimmed;
}

export function clearLiveSessionQueue() {
  savePersistentState(STORAGE_KEY, []);
}

export function enqueueLiveSessionAction({ sessionId, action, payload } = {}) {
  if (!sessionId || !action) {
    return null;
  }
  const queue = loadLiveSessionQueue();
  const entry = {
    id: `${sessionId}:${action}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`,
    sessionId,
    action,
    payload: payload ?? null,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null
  };
  persistQueue([...queue, entry]);
  return entry;
}

export async function flushLiveSessionQueue({ executor, token } = {}) {
  if (typeof executor !== 'function' || !token) {
    return [];
  }

  let queue = loadLiveSessionQueue();
  if (!queue.length) {
    return [];
  }

  const results = [];

  for (const entry of queue) {
    try {
      await executor({ ...entry, token });
      results.push({ id: entry.id, status: 'fulfilled' });
      queue = queue.filter((item) => item.id !== entry.id);
      persistQueue(queue);
    } catch (error) {
      queue = queue.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              attempts: (item.attempts ?? 0) + 1,
              lastError: error instanceof Error ? error.message : String(error)
            }
          : item
      );
      persistQueue(queue);
      results.push({ id: entry.id, status: 'rejected', reason: error });
    }
  }

  return results;
}
