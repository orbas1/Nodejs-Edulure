import { useEffect } from 'react';

function normaliseTimeout(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 6000;
}

export default function useAutoDismissMessage(message, onClear, options = {}) {
  const timeout = normaliseTimeout(options.timeout);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    if (typeof onClear !== 'function') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClear();
    }, timeout);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, onClear, timeout]);
}
