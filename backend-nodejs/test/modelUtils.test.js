import { afterAll, describe, expect, it, vi } from 'vitest';

import logger from '../src/config/logger.js';
import { safeJsonParse, safeJsonStringify } from '../src/utils/modelUtils.js';

const childSpy = vi.spyOn(logger, 'child').mockReturnValue({
  warn: vi.fn()
});

afterAll(() => {
  childSpy.mockRestore();
});

describe('modelUtils.safeJsonParse', () => {
  it('returns fallback when parsing fails', () => {
    const fallback = { name: 'fallback' };
    const result = safeJsonParse('not-json{', fallback);
    expect(result).toBe(fallback);
  });

  it('passes through objects without cloning', () => {
    const payload = { key: 'value' };
    expect(safeJsonParse(payload, {})).toBe(payload);
  });
});

describe('modelUtils.safeJsonStringify', () => {
  it('serialises plain objects', () => {
    expect(safeJsonStringify({ hello: 'world' })).toBe('{"hello":"world"}');
  });

  it('falls back when encountering circular references', () => {
    const circular = {};
    circular.self = circular;
    expect(safeJsonStringify(circular)).toBe('{}');
  });

  it('rejects invalid JSON strings', () => {
    expect(safeJsonStringify('nope{')).toBe('{}');
  });
});

