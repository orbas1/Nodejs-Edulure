import { describe, expect, it } from 'vitest';

import { apiRouteMetadata } from '../../src/routes/routeMetadata.js';
import { apiRouteRegistry } from '../../src/routes/routeRegistry.js';

function expectString(value) {
  expect(typeof value).toBe('string');
  expect(value.trim().length).toBeGreaterThan(0);
}

describe('apiRouteMetadata', () => {
  it('exposes frozen, fully described route descriptors', () => {
    expect(apiRouteMetadata.length).toBeGreaterThan(0);

    for (const descriptor of apiRouteMetadata) {
      expect(Object.isFrozen(descriptor)).toBe(true);
      expectString(descriptor.name);
      expectString(descriptor.capability);
      expectString(descriptor.description);
      expectString(descriptor.flagKey);
      expect(descriptor.basePath.startsWith('/')).toBe(true);
      if (descriptor.basePath.length > 1) {
        expect(descriptor.basePath.endsWith('/')).toBe(false);
      }
      expect(typeof descriptor.fallbackStatus).toBe('number');
      expect(descriptor.fallbackStatus).toBeGreaterThanOrEqual(100);
      expect(descriptor.fallbackStatus).toBeLessThanOrEqual(599);
      expectString(descriptor.disabledMessage);
      expect(Object.isFrozen(descriptor.cors)).toBe(true);
      expect(Array.isArray(descriptor.cors.allowedOrigins)).toBe(true);
      expect(descriptor.cors.allowedOrigins.length).toBeGreaterThan(0);
      expect(Array.isArray(descriptor.cors.allowedMethods)).toBe(true);
      expect(descriptor.cors.allowedMethods).toContain('OPTIONS');
      expect(new Set(descriptor.cors.allowedMethods).size).toBe(descriptor.cors.allowedMethods.length);
      expect(Object.isFrozen(descriptor.rbac)).toBe(true);
      expect(Array.isArray(descriptor.rbac.allowedRoles)).toBe(true);
      expect(descriptor.rbac.allowedRoles.length).toBeGreaterThan(0);
      expect(descriptor.rbac.allowedRoles).toContain(descriptor.rbac.defaultRole);
      expect(descriptor.audience).toBe(descriptor.rbac.defaultRole);
      expect(Object.isFrozen(descriptor.owners)).toBe(true);
      expect(descriptor.owners.length).toBeGreaterThan(0);
      expect(Object.isFrozen(descriptor.tags)).toBe(true);
      expect(descriptor.tags).toContain('api');
      if (descriptor.serviceTier === 'critical') {
        expectString(descriptor.runbookUrl);
      }
    }
  });

  it('maintains unique identifiers across the catalog', () => {
    const seenNames = new Set();
    const seenPaths = new Set();
    const seenFlags = new Set();

    for (const descriptor of apiRouteMetadata) {
      expect(seenNames.has(descriptor.name)).toBe(false);
      expect(seenPaths.has(descriptor.basePath)).toBe(false);
      expect(seenFlags.has(descriptor.flagKey)).toBe(false);

      seenNames.add(descriptor.name);
      seenPaths.add(descriptor.basePath);
      seenFlags.add(descriptor.flagKey);
    }
  });

  it('remains aligned with the runtime route registry', () => {
    expect(apiRouteRegistry).toHaveLength(apiRouteMetadata.length);

    const registryNames = new Set(apiRouteRegistry.map((entry) => entry.name));
    const registryPaths = new Set(apiRouteRegistry.map((entry) => entry.basePath));

    for (const descriptor of apiRouteMetadata) {
      expect(registryNames.has(descriptor.name)).toBe(true);
      expect(registryPaths.has(descriptor.basePath)).toBe(true);
    }
  });
});
