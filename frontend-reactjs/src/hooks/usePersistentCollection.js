import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  deletePersistentState,
  loadPersistentState,
  savePersistentState
} from '../utils/persistentState.js';

const normalise = (value) => {
  if (typeof value === 'function') {
    return value();
  }
  return value;
};

const toArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return fallback;
};

const generateId = (prefix = 'item') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export default function usePersistentCollection(storageKey, initialValue = []) {
  const fallbackRef = useRef(toArray(normalise(initialValue), []));

  const resolvedInitial = useMemo(() => {
    const persisted = loadPersistentState(storageKey, null);
    if (Array.isArray(persisted)) {
      return persisted;
    }
    return fallbackRef.current;
  }, [storageKey]);

  const [items, setItems] = useState(resolvedInitial);
  const previousKeyRef = useRef(storageKey);

  useEffect(() => {
    savePersistentState(storageKey, items);
  }, [items, storageKey]);

  useEffect(() => {
    if (previousKeyRef.current === storageKey) {
      return;
    }

    previousKeyRef.current = storageKey;
    const persisted = loadPersistentState(storageKey, null);
    if (Array.isArray(persisted)) {
      setItems(persisted);
      return;
    }
    setItems(fallbackRef.current);
  }, [storageKey]);

  useEffect(() => {
    const nextFallback = toArray(normalise(initialValue), []);
    fallbackRef.current = nextFallback;
    setItems((previous) => {
      if (previous.length > 0) {
        return previous;
      }
      return nextFallback;
    });
  }, [initialValue]);

  const addItem = useCallback(
    (item) => {
      const payload = { ...item, id: item?.id ?? generateId(storageKey) };
      setItems((previous) => [...previous, payload]);
      return payload;
    },
    [storageKey]
  );

  const updateItem = useCallback((id, updates) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const nextUpdates = typeof updates === 'function' ? updates(item) : updates;
        return { ...item, ...nextUpdates, id };
      })
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const replaceItems = useCallback((nextItems) => {
    setItems(toArray(nextItems, fallbackRef.current));
  }, []);

  const reset = useCallback(() => {
    deletePersistentState(storageKey);
    setItems(fallbackRef.current);
  }, [storageKey]);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    replaceItems,
    reset
  };
}
