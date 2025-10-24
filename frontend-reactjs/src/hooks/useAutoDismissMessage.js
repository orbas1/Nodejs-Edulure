import { useEffect, useRef, useState } from 'react';

function normaliseTimeout(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 6000;
}

export default function useAutoDismissMessage(message, onClear, options = {}) {
  const timeout = normaliseTimeout(options.timeout);
  const pauseOnHover = options.pauseOnHover ?? true;
  const pauseOnVisibilityChange = options.pauseOnVisibilityChange ?? true;
  const anchorRef = options.anchorRef ?? null;
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    if (typeof onClear !== 'function') {
      return undefined;
    }

    if (isPaused) {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      onClear();
    }, timeout);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, message, onClear, timeout]);

  useEffect(() => {
    if (!pauseOnHover || !anchorRef?.current) {
      return undefined;
    }

    const node = anchorRef.current;
    const handleEnter = () => setIsPaused(true);
    const handleLeave = () => setIsPaused(false);

    node.addEventListener('mouseenter', handleEnter);
    node.addEventListener('mouseleave', handleLeave);

    return () => {
      node.removeEventListener('mouseenter', handleEnter);
      node.removeEventListener('mouseleave', handleLeave);
    };
  }, [anchorRef, pauseOnHover]);

  useEffect(() => {
    if (!pauseOnVisibilityChange || typeof document === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      setIsPaused(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseOnVisibilityChange]);

  return {
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    isPaused
  };
}
