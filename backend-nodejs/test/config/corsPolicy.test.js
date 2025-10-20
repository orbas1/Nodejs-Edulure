import { describe, expect, it } from 'vitest';

import { createCorsOriginValidator } from '../../src/config/corsPolicy.js';

describe('createCorsOriginValidator', () => {
  it('allows all origins when wildcard is provided', () => {
    const policy = createCorsOriginValidator(['*']);

    expect(policy.allowAll).toBe(true);
    expect(policy.isOriginAllowed('https://example.com')).toBe(true);
    expect(policy.isOriginAllowed('http://another.test')).toBe(true);
  });

  it('permits explicitly configured origins', () => {
    const policy = createCorsOriginValidator(['https://app.example.com']);

    expect(policy.allowAll).toBe(false);
    expect(policy.isOriginAllowed('https://app.example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://APP.EXAMPLE.COM')).toBe(true);
    expect(policy.isOriginAllowed('https://other.example.com')).toBe(false);
  });

  it('supports wildcard subdomain origins and includes the root domain', () => {
    const policy = createCorsOriginValidator(['https://*.example.com']);

    expect(policy.isOriginAllowed('https://embed.example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://media.sub.example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://example.com')).toBe(true);
    expect(policy.isOriginAllowed('https://example.org')).toBe(false);
  });

  it('treats null origins as configurable entries', () => {
    const policy = createCorsOriginValidator(['null']);

    expect(policy.isOriginAllowed('null')).toBe(true);
    expect(policy.isOriginAllowed(null)).toBe(true);
    expect(policy.isOriginAllowed('https://example.com')).toBe(false);
  });

  it('normalizes localhost origins without explicit protocols', () => {
    const policy = createCorsOriginValidator(['localhost:3000']);

    expect(policy.isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(policy.isOriginAllowed('https://localhost:3000')).toBe(true);
    expect(policy.isOriginAllowed('http://localhost:4000')).toBe(false);
  });
});
