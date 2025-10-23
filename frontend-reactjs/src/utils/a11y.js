const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',');

function hasDocument() {
  return typeof document !== 'undefined';
}

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getFocusableElements(container) {
  if (!container || !hasDocument()) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (element) => element.offsetParent !== null || element instanceof SVGElement
  );
}

export function trapFocus(container, { initialFocus, returnFocus } = {}) {
  if (!container || !hasDocument()) {
    return () => {};
  }

  const previouslyFocused = document.activeElement;
  const focusTarget = initialFocus || getFocusableElements(container)[0];

  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus({ preventScroll: true });
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (event.shiftKey) {
      nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    }

    event.preventDefault();
    focusable[nextIndex].focus({ preventScroll: true });
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    const focusReturnTarget = returnFocus || previouslyFocused;
    if (
      focusReturnTarget &&
      typeof focusReturnTarget.focus === 'function' &&
      hasDocument()
    ) {
      focusReturnTarget.focus({ preventScroll: true });
    }
  };
}

export function prefersReducedMotion() {
  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function observePrefersReducedMotion(onChange) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    onChange(false);
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (event) => {
    onChange(event.matches);
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
  } else {
    mediaQuery.addListener(handler);
  }

  onChange(mediaQuery.matches);

  return () => {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.removeListener(handler);
    }
  };
}

export function observeHighContrast(onChange) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    onChange(false);
    return () => {};
  }

  const query = window.matchMedia('(forced-colors: active)');
  const handler = (event) => onChange(event.matches);

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
  } else {
    query.addListener(handler);
  }

  onChange(query.matches);

  return () => {
    if (typeof query.removeEventListener === 'function') {
      query.removeEventListener('change', handler);
    } else {
      query.removeListener(handler);
    }
  };
}

export function getBreakpointValue(name) {
  if (!hasWindow() || !hasDocument()) {
    return null;
  }
  const computed = window.getComputedStyle(document.documentElement);
  const value = computed.getPropertyValue(`--breakpoint-${name}`);
  return value ? value.trim() || null : null;
}

export function getBreakpointQuery(name, { type = 'min', offset = 0 } = {}) {
  const value = getBreakpointValue(name);
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && offset !== 0) {
    const unit = value.replace(String(parsed), '').trim() || 'px';
    const adjusted = parsed + offset;
    return `(${type}-width: ${adjusted}${unit})`;
  }

  return `(${type}-width: ${value})`;
}

export function observeBreakpoint(name, onChange, options = {}) {
  if (typeof onChange !== 'function') {
    return () => {};
  }
  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    onChange(false);
    return () => {};
  }

  const query = getBreakpointQuery(name, options);
  if (!query) {
    onChange(false);
    return () => {};
  }

  const mediaQuery = window.matchMedia(query);
  const handler = (event) => onChange(event.matches);

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
  } else {
    mediaQuery.addListener(handler);
  }

  onChange(mediaQuery.matches);

  return () => {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.removeListener(handler);
    }
  };
}
