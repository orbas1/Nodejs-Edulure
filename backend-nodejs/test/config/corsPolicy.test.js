import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  createCorsOriginValidator,
  parseCorsOrigins
} from '../../src/config/corsPolicy.js';

const originalNodeEnv = process.env.NODE_ENV;

describe('parseCorsOrigins', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('normalises comma and whitespace separated lists', () => {
    const origins = parseCorsOrigins('https://app.edulure.com, https://status.edulure.com  https://docs.edulure.com');
    expect(origins).toEqual([
      'https://app.edulure.com',
      'https://status.edulure.com',
      'https://docs.edulure.com'
    ]);
  });

  it('returns an empty array for invalid inputs', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins(null)).toEqual([]);
    expect(parseCorsOrigins(42)).toEqual([]);
  });
});

describe('createCorsOriginValidator', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows all origins when no configuration is provided', () => {
    const policy = createCorsOriginValidator(undefined);
    expect(policy.allowAll).toBe(true);
    expect(policy.isOriginAllowed('https://any.example')).toBe(true);
  });

  it('permits configured origins and expands localhost aliases in development', () => {
    const policy = createCorsOriginValidator('https://app.edulure.com', {
      allowDevelopmentOrigins: true,
      developmentPortHints: [3000, 5173]
    });

    expect(policy.allowAll).toBe(false);
    expect(policy.isOriginAllowed('https://app.edulure.com')).toBe(true);
    expect(policy.isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(policy.isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
    expect(policy.isOriginAllowed('https://malicious.example')).toBe(false);

    const description = policy.describe();
    expect(description.exactOrigins).toContain('https://app.edulure.com');
    expect(description.exactOrigins).toEqual(expect.arrayContaining(['http://localhost:3000']));
  });

  it('supports wildcard domain patterns and www alias generation', () => {
    const policy = createCorsOriginValidator(['https://*.edulure.com'], {
      allowDevelopmentOrigins: false
    });

    expect(policy.isOriginAllowed('https://studio.edulure.com')).toBe(true);
    expect(policy.isOriginAllowed('https://www.edulure.com')).toBe(true);
    expect(policy.isOriginAllowed('https://api.partner-edulure.com')).toBe(false);
    expect(policy.getWildcardOrigins()).toEqual(['https://*.edulure.com']);
  });

  it('adds www aliases for apex domains by default', () => {
    const policy = createCorsOriginValidator(['https://example.com']);

    expect(policy.isOriginAllowed('https://www.example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://blog.example.com')).toBe(false);
  });

  it('honours includeWwwAliases=false for strict allow lists', () => {
    const policy = createCorsOriginValidator(['https://example.com'], {
      includeWwwAliases: false
    });

    expect(policy.isOriginAllowed('https://example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://www.example.com')).toBe(false);
  });

  it('allows explicit null origins when configured', () => {
    const policy = createCorsOriginValidator(['null']);

    expect(policy.isOriginAllowed('null')).toBe(true);
    expect(policy.isOriginAllowed(null)).toBe(true);
    expect(policy.isOriginAllowed('https://example.com')).toBe(false);
  });

  it('normalises localhost entries without protocols', () => {
    const policy = createCorsOriginValidator(['localhost:4000'], {
      allowDevelopmentOrigins: false
    });

    expect(policy.isOriginAllowed('http://localhost:4000')).toBe(true);
    expect(policy.isOriginAllowed('https://localhost:4000')).toBe(true);
    expect(policy.isOriginAllowed('http://localhost:3000')).toBe(false);
  });

  it('disables development aliases when explicitly requested', () => {
    const policy = createCorsOriginValidator(['http://localhost:5173'], {
      allowDevelopmentOrigins: false,
      developmentPortHints: [3000]
    });

    expect(policy.isOriginAllowed('http://127.0.0.1:5173')).toBe(false);
    expect(policy.isOriginAllowed('http://localhost:3000')).toBe(false);
  });
});
