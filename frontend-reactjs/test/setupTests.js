// React 18 warns when asynchronous updates are triggered outside `act`. Testing Library
// already wraps utilities with `act`, so we opt in to the new behavior to silence
// deprecation notices from dependencies such as jest-axe.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import '@testing-library/jest-dom/vitest';
