const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function loadPersistentState(key, fallback) {
  if (!isBrowser()) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed ?? (typeof fallback === 'function' ? fallback() : fallback);
  } catch (error) {
    console.warn('Failed to load persistent state', { key, error });
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

export function savePersistentState(key, value) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to persist state', { key, error, value });
  }
}

export function deletePersistentState(key) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove persistent state', { key, error });
  }
}
