import { describe, expect, it } from 'vitest';
import { Router } from 'express';

import { buildRouteRegistry } from '../../src/routes/registryValidator.js';

function createDescriptor(overrides = {}) {
  return {
    name: 'test-route',
    capability: 'test-capability',
    basePath: '/test',
    flagKey: 'platform.api.v1.test',
    defaultState: 'enabled',
    ...overrides
  };
}

describe('buildRouteRegistry', () => {
  it('returns a validated registry with express routers attached', () => {
    const metadata = [createDescriptor()];
    const routers = { 'test-route': Router() };

    const registry = buildRouteRegistry({ metadata, routers, loggerInstance: { debug() {}, error() {} } });

    expect(registry).toHaveLength(1);
    expect(registry[0].router).toBeDefined();
    expect(typeof registry[0].router.use).toBe('function');
    expect(registry[0].defaultState).toBe('enabled');
    expect(registry[0].basePath).toBe('/test');
  });

  it('normalises missing defaults and trailing slashes', () => {
    const metadata = [
      createDescriptor({
        name: 'secondary',
        basePath: '/secondary/',
        defaultState: undefined,
        flagKey: 'platform.api.v1.secondary'
      })
    ];
    const routers = { secondary: Router() };

    const registry = buildRouteRegistry({ metadata, routers, loggerInstance: { debug() {}, error() {} } });

    expect(registry[0].defaultState).toBe('disabled');
    expect(registry[0].basePath).toBe('/secondary');
  });

  it('throws an aggregate error when duplicate names are provided', () => {
    const metadata = [createDescriptor(), createDescriptor({ basePath: '/another' })];
    const routers = { 'test-route': Router() };

    expect(() =>
      buildRouteRegistry({ metadata, routers, loggerInstance: { debug() {}, error() {} } })
    ).toThrowError(AggregateError);
  });

  it('throws an aggregate error when base paths collide or routers are invalid', () => {
    const metadata = [
      createDescriptor({ name: 'one', basePath: '/shared' }),
      createDescriptor({ name: 'two', basePath: '/shared' })
    ];
    const routers = { one: Router(), two: {} };

    try {
      buildRouteRegistry({ metadata, routers, loggerInstance: { debug() {}, error() {} } });
      throw new Error('Expected buildRouteRegistry to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect(error.errors.length).toBeGreaterThanOrEqual(2);
      expect(error.errors.map((err) => err.message)).toEqual(
        expect.arrayContaining([
          'Duplicate base path detected: `/shared`.',
          'Router for `two` does not expose the expected Express interface.'
        ])
      );
    }
  });

  it('raises an error when metadata is missing or empty', () => {
    expect(() => buildRouteRegistry({ metadata: [], routers: {}, loggerInstance: { debug() {}, error() {} } })).toThrow(
      /non-empty array/
    );
  });
});
