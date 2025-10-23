import { useEffect, useState } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

let liveRegion = null;

function ensureLiveRegion() {
  if (typeof document === 'undefined') {
    return null;
  }
  if (liveRegion) {
    return liveRegion;
  }
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  document.body.appendChild(region);
  liveRegion = region;
  return liveRegion;
}

export function announcePolite(message) {
  const region = ensureLiveRegion();
  if (!region) return;
  region.textContent = '';
  window.requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function trapFocus(container, { initialFocus } = {}) {
  if (!container) return () => {};
  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  );
  const previousActiveElement = typeof document !== 'undefined' ? document.activeElement : null;
  const target =
    (initialFocus && ('current' in initialFocus ? initialFocus.current : initialFocus)) ||
    focusable[0];
  if (target && typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return;
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus({ preventScroll: true });
    }
  };
}

export function useFocusTrap(ref, { enabled = true, initialFocus } = {}) {
  useEffect(() => {
    if (!enabled || !ref?.current) {
      return undefined;
    }
    return trapFocus(ref.current, { initialFocus });
  }, [enabled, ref, initialFocus]);
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {};
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefers(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefers;
}
