import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/persistentCache.js', () => {
  const stores = new Map();

  function getStore(namespace) {
    if (!stores.has(namespace)) {
      stores.set(namespace, new Map());
    }
    return stores.get(namespace);
  }

  function createPersistentCache(namespace, { ttlMs } = {}) {
    const store = getStore(namespace);
    return {
      async read(key) {
        return store.get(key) ?? null;
      },
      async write(key, value) {
        const entry = {
          value,
          storedAt: Date.now(),
          expiresAt: ttlMs ? Date.now() + ttlMs : null
        };
        store.set(key, entry);
        return entry;
      },
      async clear(key) {
        store.delete(key);
      }
    };
  }

  return {
    __esModule: true,
    default: createPersistentCache,
    createPersistentCache,
    __stores: stores
  };
});

vi.mock('../../api/operatorDashboardApi.js', () => ({
  fetchExecutiveOverview: vi.fn(),
  fetchExecutiveTenants: vi.fn()
}));

describe('useExecutiveDashboard', () => {
  beforeEach(async () => {
    vi.resetModules();
    window.localStorage.clear();
    window.localStorage.setItem(
      'edulure.session',
      JSON.stringify({
        user: { id: 'user-1', role: 'admin' },
        tokens: { accessToken: 'token-123' }
      })
    );
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    });
    const { __stores } = await import('../../utils/persistentCache.js');
    __stores.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads tenants and overview metrics', async () => {
    const { fetchExecutiveOverview, fetchExecutiveTenants } = await import('../../api/operatorDashboardApi.js');
    fetchExecutiveTenants.mockResolvedValue({
      items: [
        { id: 'tenant-1', name: 'Tenant One' }
      ],
      defaultTenantId: 'tenant-1'
    });
    fetchExecutiveOverview.mockResolvedValue({
      kpis: [
        { id: 'arr', label: 'ARR', value: 1250000, formatter: 'currency', change: 4.2 }
      ],
      incidents: { stats: { totalOpen: 0 }, active: [], timeline: [] },
      releases: { upcoming: [], readiness: {} },
      operations: {}
    });

    const { default: useExecutiveDashboard } = await import('../useExecutiveDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useExecutiveDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenants).toHaveLength(1);
    expect(result.current.tenantId).toBe('tenant-1');
    expect(result.current.data?.kpis?.[0]?.value).toBe(1250000);
    expect(result.current.data?.incidents?.stats?.totalOpen).toBe(0);
  });

  it('falls back to cached overview when refresh fails', async () => {
    const { fetchExecutiveOverview, fetchExecutiveTenants } = await import('../../api/operatorDashboardApi.js');
    fetchExecutiveTenants.mockResolvedValue({
      items: [
        { id: 'tenant-1', name: 'Tenant One' }
      ],
      defaultTenantId: 'tenant-1'
    });
    fetchExecutiveOverview.mockResolvedValue({
      kpis: [
        { id: 'arr', label: 'ARR', value: 980000, formatter: 'currency', change: -3.1 }
      ],
      incidents: { stats: { totalOpen: 2 }, active: [], timeline: [] },
      releases: { upcoming: [], readiness: {} },
      operations: {}
    });

    const { default: useExecutiveDashboard } = await import('../useExecutiveDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useExecutiveDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.kpis?.[0]?.value).toBe(980000);

    fetchExecutiveOverview.mockRejectedValueOnce(new Error('Network offline'));

    result.current.refresh();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stale).toBe(true);
    expect(result.current.data?.kpis?.[0]?.value).toBe(980000);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

