import { describe, expect, it } from 'vitest';

import { isAbortError } from '../../src/utils/errors.js';

describe('isAbortError', () => {
  it('detects DOM and fetch abort errors', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ name: 'CanceledError' })).toBe(true);
    expect(isAbortError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortError({ message: 'canceled' })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError({ name: 'TypeError' })).toBe(false);
  });
});
