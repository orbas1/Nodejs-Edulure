import { beforeEach, describe, expect, it, vi } from 'vitest';

import db from '../src/config/database.js';
import { FeatureFlagGovernanceService } from '../src/services/FeatureFlagGovernanceService.js';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
}

describe('FeatureFlagGovernanceService', () => {
  let definitions;
  let overrides;
  let featureFlagModel;
  let tenantStateModel;
  let auditModel;
  let featureFlagService;
  let service;

  beforeEach(() => {
    definitions = [];
    overrides = [];

    featureFlagModel = {
      allWithOverrides: vi.fn(async () =>
        definitions.map((definition) => ({
          ...definition,
          tenantOverrides: overrides
            .filter((override) => override.flagId === definition.id)
            .map((override) => ({ ...override }))
        }))
      ),
      insert: vi.fn(async (definition) => {
        const id = definitions.length + 1;
        const stored = {
          id,
          ...definition
        };
        definitions.push(stored);
        return {
          ...stored,
          tenantOverrides: []
        };
      }),
      update: vi.fn(async (id, definition) => {
        const index = definitions.findIndex((item) => item.id === id);
        const updated = { ...definitions[index], ...definition };
        definitions[index] = updated;
        return {
          ...updated,
          tenantOverrides: overrides
            .filter((override) => override.flagId === updated.id)
            .map((override) => ({ ...override }))
        };
      }),
      findByKey: vi.fn(async (key) => {
        const entry = definitions.find((item) => item.key === key);
        if (!entry) {
          return null;
        }
        return {
          ...entry,
          tenantOverrides: overrides
            .filter((override) => override.flagId === entry.id)
            .map((override) => ({ ...override }))
        };
      })
    };

    tenantStateModel = {
      upsert: vi.fn(async ({ flagId, tenantId, environment, state, variantKey, metadata }) => {
        const existingIndex = overrides.findIndex(
          (override) =>
            override.flagId === flagId &&
            override.tenantId === tenantId &&
            override.environment === environment
        );

        if (existingIndex >= 0) {
          overrides[existingIndex] = {
            ...overrides[existingIndex],
            state,
            variantKey: variantKey ?? null,
            metadata: metadata ?? {},
            updatedBy: metadata?.updatedBy ?? null
          };
          return { ...overrides[existingIndex] };
        }

        const created = {
          id: overrides.length + 1,
          flagId,
          tenantId,
          environment,
          state,
          variantKey: variantKey ?? null,
          metadata: metadata ?? {},
          updatedBy: metadata?.updatedBy ?? null
        };
        overrides.push(created);
        return { ...created };
      }),
      remove: vi.fn(async ({ flagId, tenantId, environment }) => {
        const previousLength = overrides.length;
        overrides = overrides.filter(
          (override) =>
            !(override.flagId === flagId && override.tenantId === tenantId && override.environment === environment)
        );
        return previousLength - overrides.length;
      })
    };

    auditModel = {
      record: vi.fn(async () => {})
    };

    featureFlagService = {
      refresh: vi.fn(async () => {}),
      evaluateAll: vi.fn(() => ({})),
      evaluate: vi.fn(() => ({
        key: 'governance.flag',
        enabled: true,
        reason: 'enabled',
        variant: null,
        override: null,
        evaluatedAt: new Date().toISOString()
      }))
    };

    service = new FeatureFlagGovernanceService({
      manifest: [
        {
          key: 'governance.flag',
          name: 'Governance Flag',
          description: 'Controls access to governance tools.',
          enabled: true,
          rolloutStrategy: 'boolean',
          tenantDefaults: [
            {
              tenantId: 'tenant-ops',
              environment: 'production',
              state: 'enabled',
              notes: 'Required for operations tenants.'
            }
          ]
        }
      ],
      featureFlagModel,
      tenantStateModel,
      auditModel,
      featureFlagSvc: featureFlagService,
      loggerInstance: createLogger()
    });

    vi.spyOn(db, 'transaction').mockImplementation(async (handler) => handler(undefined));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('synchronises manifest definitions and tenant defaults', async () => {
    const summary = await service.syncDefinitions({ actor: 'tester' });

    expect(summary.created).toContain('governance.flag');
    expect(definitions).toHaveLength(1);
    expect(overrides).toHaveLength(1);
    expect(featureFlagService.refresh).toHaveBeenCalled();
    expect(auditModel.record).toHaveBeenCalled();
  });

  it('generates tenant snapshots with evaluation context', async () => {
    await service.syncDefinitions({ actor: 'tester' });
    featureFlagService.evaluateAll.mockReturnValue({
      'governance.flag': {
        key: 'governance.flag',
        enabled: true,
        reason: 'tenant-override-enabled',
        variant: null,
        overridden: true,
        override: {
          state: 'forced_on',
          tenantId: 'tenant-ops',
          environment: 'production',
          metadata: {}
        },
        evaluatedAt: new Date().toISOString()
      }
    });

    const snapshot = await service.generateTenantSnapshot({
      tenantId: 'tenant-ops',
      environment: 'production'
    });

    expect(snapshot.flags).toHaveLength(1);
    expect(snapshot.flags[0].override).toMatchObject({ state: 'forced_on', tenantId: 'tenant-ops' });
    expect(snapshot.summary.enabled).toBe(1);
  });

  it('applies tenant overrides and evaluates resulting state', async () => {
    await service.syncDefinitions({ actor: 'tester' });
    featureFlagService.evaluate.mockReturnValue({
      key: 'governance.flag',
      enabled: true,
      reason: 'tenant-override-enabled',
      override: { state: 'forced_on', tenantId: 'tenant-beta' },
      evaluatedAt: new Date().toISOString()
    });

    const result = await service.applyTenantOverride({
      flagKey: 'governance.flag',
      tenantId: 'tenant-beta',
      environment: 'staging',
      state: 'enabled',
      actor: 'tester'
    });

    expect(result.override).toMatchObject({ tenantId: 'tenant-beta', environment: 'staging' });
    expect(featureFlagService.refresh).toHaveBeenCalledTimes(2);
    expect(featureFlagService.evaluate).toHaveBeenCalledWith(
      'governance.flag',
      expect.objectContaining({ tenantId: 'tenant-beta', environment: 'staging' }),
      { includeDefinition: true }
    );
  });
});
