import { afterAll, describe, expect, it, vi } from 'vitest';

import logger from '../src/config/logger.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseBoolean,
  normaliseOptionalString,
  normaliseSlug,
  readJsonColumn,
  safeJsonParse,
  safeJsonStringify,
  writeJsonColumn
} from '../src/utils/modelUtils.js';

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

describe('modelUtils.normalisers', () => {
  it('normalises slug values safely', () => {
    expect(normaliseSlug(' Featured News ')).toBe('featured-news');
  });

  it('enforces non-empty string requirements', () => {
    expect(() => ensureNonEmptyString('   ', { fieldName: 'name' })).toThrow(/name is required/i);
  });

  it('caps integer ranges and defaults sensibly', () => {
    expect(ensureIntegerInRange(undefined, { defaultValue: 5 })).toBe(5);
    expect(() => ensureIntegerInRange(100, { max: 10, fieldName: 'limit' })).toThrow(/limit/i);
  });

  it('normalises boolean-like inputs', () => {
    expect(normaliseBoolean('YES')).toBe(true);
    expect(normaliseBoolean('off', true)).toBe(false);
  });

  it('normalises optional strings to null when empty', () => {
    expect(normaliseOptionalString('')).toBeNull();
    expect(normaliseOptionalString(' value ')).toBe('value');
  });
});

describe('modelUtils JSON column helpers', () => {
  it('reads JSON columns defensively', () => {
    expect(readJsonColumn('{"key":1}', {})).toEqual({ key: 1 });
    expect(readJsonColumn('[1,2,3]', { fallback: true })).toEqual({ fallback: true });
  });

  it('writes JSON columns from objects and strings', () => {
    expect(writeJsonColumn({ safe: true })).toBe('{"safe":true}');
    expect(writeJsonColumn('{"safe":false}')).toBe('{"safe":false}');
  });
});

