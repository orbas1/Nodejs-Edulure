import { describe, expect, it } from 'vitest';

import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  ensureObject,
  normaliseListResponse
} from '../../src/api/apiUtils.js';

describe('apiUtils', () => {
  describe('assertToken', () => {
    it('returns the token when present', () => {
      expect(assertToken('abc', 'run tests')).toBe('abc');
    });

    it('throws when token is missing', () => {
      expect(() => assertToken('', 'perform action')).toThrow(/Authentication token is required/);
    });
  });

  describe('assertId', () => {
    it('returns the identifier when present', () => {
      expect(assertId('id-1', 'Identifier')).toBe('id-1');
    });

    it('throws when the identifier is empty', () => {
      expect(() => assertId('', 'Identifier')).toThrow(/Identifier is required/);
    });
  });

  describe('normaliseListResponse', () => {
    it('normalises missing fields into sensible defaults', () => {
      const result = normaliseListResponse(null);
      expect(result).toEqual({ data: [], meta: {}, pagination: null });
    });

    it('maps response objects with arrays and pagination', () => {
      const response = {
        data: [{ id: 1 }],
        meta: { pagination: { page: 2 } }
      };
      const result = normaliseListResponse(response);
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.meta).toEqual({ pagination: { page: 2 } });
      expect(result.pagination).toEqual({ page: 2 });
    });
  });

  describe('ensureObject', () => {
    it('returns an empty object when value is not an object', () => {
      expect(ensureObject(null)).toEqual({});
    });

    it('returns the original object when provided', () => {
      const value = { foo: 'bar' };
      expect(ensureObject(value)).toBe(value);
    });
  });

  describe('createListCacheConfig', () => {
    it('creates a cache descriptor with sensible defaults', () => {
      const config = createListCacheConfig('tag');
      expect(config).toEqual({ ttl: 15_000, tags: ['tag'], varyByToken: true });
    });

    it('returns undefined when tag is empty', () => {
      expect(createListCacheConfig('')).toBeUndefined();
    });
  });

  describe('createInvalidationConfig', () => {
    it('wraps tags in an invalidation descriptor', () => {
      expect(createInvalidationConfig(['tag-a', 'tag-b'])).toEqual({ invalidateTags: ['tag-a', 'tag-b'] });
    });

    it('returns undefined when tags are missing', () => {
      expect(createInvalidationConfig(null)).toBeUndefined();
    });
  });
});
