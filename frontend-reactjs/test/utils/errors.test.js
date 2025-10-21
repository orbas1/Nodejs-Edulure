import { describe, expect, it } from 'vitest';

import { isAbortError, normaliseError, toErrorMessage } from '../../src/utils/errors.js';

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

describe('normaliseError', () => {
  it('returns enriched details from http errors', () => {
    const result = normaliseError({
      message: 'Request failed',
      response: { status: 429, data: { message: 'Rate limited', code: 'RATE_LIMITED' } }
    });

    expect(result).toEqual(
      expect.objectContaining({ message: 'Rate limited', status: 429, code: 'RATE_LIMITED' })
    );
  });

  it('falls back to sensible defaults', () => {
    expect(normaliseError(null).message).toMatch(/unknown/i);
    expect(toErrorMessage('Custom message')).toBe('Custom message');
  });
});
