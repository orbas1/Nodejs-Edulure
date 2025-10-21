// React 18 warns when asynchronous updates are triggered outside `act`. Testing Library
// already wraps utilities with `act`, so we opt in to the new behavior to silence
// deprecation notices from dependencies such as jest-axe.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof window !== 'undefined') {
  if (!('matchMedia' in window)) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });
  }

  if (!('ResizeObserver' in window)) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}

import '@testing-library/jest-dom/vitest';
