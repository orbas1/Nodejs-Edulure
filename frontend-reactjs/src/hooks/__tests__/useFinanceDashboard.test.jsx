import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
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
  fetchFinanceOverview: vi.fn(),
  fetchFinanceTenants: vi.fn()
}));

describe('useFinanceDashboard', () => {
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

  it('loads finance overview for the default tenant', async () => {
    const { fetchFinanceOverview, fetchFinanceTenants } = await import('../../api/operatorDashboardApi.js');
    fetchFinanceTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchFinanceOverview.mockResolvedValue({
      revenue: {
        summary: [{ id: 'arr', label: 'ARR', value: 1500000, formatter: 'currency', change: 3.2 }],
        collections: { agingBuckets: [], totalOutstanding: 0 },
        breakdowns: { products: [], regions: [] }
      },
      payouts: { queue: [], stats: {} },
      ledger: { settlements: [], disputes: [], reconciliation: {} },
      experiments: { active: [], toggles: [] },
      pricing: { catalogues: [], guardrails: {}, pendingApprovals: [] }
    });

    const { default: useFinanceDashboard } = await import('../useFinanceDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useFinanceDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenants).toHaveLength(1);
    expect(result.current.tenantId).toBe('tenant-1');
    expect(result.current.data?.revenue?.summary?.[0]?.value).toBe(1500000);
  });

  it('falls back to cached overview when refresh fails', async () => {
    const { fetchFinanceOverview, fetchFinanceTenants } = await import('../../api/operatorDashboardApi.js');
    fetchFinanceTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchFinanceOverview.mockResolvedValueOnce({
      revenue: {
        summary: [{ id: 'arr', label: 'ARR', value: 980000 }],
        collections: { agingBuckets: [], totalOutstanding: 0 },
        breakdowns: { products: [], regions: [] }
      },
      payouts: { queue: [], stats: {} },
      ledger: { settlements: [], disputes: [], reconciliation: {} },
      experiments: { active: [], toggles: [] },
      pricing: { catalogues: [], guardrails: {}, pendingApprovals: [] }
    });

    const { default: useFinanceDashboard } = await import('../useFinanceDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useFinanceDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.revenue?.summary?.[0]?.value).toBe(980000);

    fetchFinanceOverview.mockRejectedValueOnce(new Error('Network offline'));

    result.current.refresh();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stale).toBe(true);
    expect(result.current.data?.revenue?.summary?.[0]?.value).toBe(980000);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('supports local data updates without requesting the API', async () => {
    const { fetchFinanceOverview, fetchFinanceTenants } = await import('../../api/operatorDashboardApi.js');
    fetchFinanceTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchFinanceOverview.mockResolvedValue({
      revenue: { summary: [], collections: { agingBuckets: [], totalOutstanding: 0 }, breakdowns: { products: [], regions: [] } },
      payouts: { queue: [{ id: 'payout-1', programme: 'Default', amount: 1200, currency: 'USD' }], stats: { awaitingApproval: 1, flagged: 0 } },
      ledger: { settlements: [], disputes: [], reconciliation: {} },
      experiments: { active: [], toggles: [] },
      pricing: { catalogues: [], guardrails: {}, pendingApprovals: [] }
    });

    const { default: useFinanceDashboard } = await import('../useFinanceDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useFinanceDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payouts?.queue).toHaveLength(1);

    act(() => {
      result.current.updateData((current) => ({
        ...current,
        payouts: { ...current.payouts, queue: [] }
      }));
    });

    expect(result.current.data?.payouts?.queue).toHaveLength(0);
  });
});
