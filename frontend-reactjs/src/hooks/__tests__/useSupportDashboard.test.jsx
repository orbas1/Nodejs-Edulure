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
  fetchSupportOverview: vi.fn(),
  fetchSupportTenants: vi.fn()
}));

describe('useSupportDashboard', () => {
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

  it('loads support overview for the default tenant', async () => {
    const { fetchSupportOverview, fetchSupportTenants } = await import('../../api/operatorDashboardApi.js');
    fetchSupportTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchSupportOverview.mockResolvedValue({
      queue: {
        stats: { open: 12, breached: 1, awaitingAssignment: 2, csat: 0.89 },
        items: [
          {
            id: 'ticket-1',
            subject: 'Login issue',
            priority: 'high',
            channel: 'chat',
            requester: { name: 'Alex' }
          }
        ]
      },
      communications: { scheduled: [], recent: [] },
      knowledgeBase: { flaggedArticles: [], totalArticles: 20, drafts: [] },
      settings: { notificationPolicies: [] },
      onboarding: { checklists: [] }
    });

    const { default: useSupportDashboard } = await import('../useSupportDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useSupportDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenants).toHaveLength(1);
    expect(result.current.tenantId).toBe('tenant-1');
    expect(result.current.data?.queue?.stats?.open).toBe(12);
    expect(result.current.data?.queue?.items?.[0]?.subject).toBe('Login issue');
  });

  it('falls back to cached overview when refresh fails', async () => {
    const { fetchSupportOverview, fetchSupportTenants } = await import('../../api/operatorDashboardApi.js');
    fetchSupportTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchSupportOverview.mockResolvedValueOnce({
      queue: { stats: { open: 5 }, items: [] },
      communications: { scheduled: [], recent: [] },
      knowledgeBase: { flaggedArticles: [], totalArticles: 10, drafts: [] },
      settings: { notificationPolicies: [] },
      onboarding: { checklists: [] }
    });

    const { default: useSupportDashboard } = await import('../useSupportDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useSupportDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.queue?.stats?.open).toBe(5);

    fetchSupportOverview.mockRejectedValueOnce(new Error('Network offline'));

    result.current.refresh();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data?.queue?.stats?.open).toBe(5);
  });

  it('updates ticket metadata locally without requesting the API', async () => {
    const { fetchSupportOverview, fetchSupportTenants } = await import('../../api/operatorDashboardApi.js');
    fetchSupportTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchSupportOverview.mockResolvedValue({
      queue: {
        stats: { open: 3 },
        items: [
          { id: 'ticket-1', subject: 'Login issue', status: 'open' },
          { id: 'ticket-2', subject: 'Billing question', status: 'open' }
        ]
      },
      communications: { scheduled: [], recent: [] },
      knowledgeBase: { flaggedArticles: [], totalArticles: 12, drafts: [] },
      settings: { notificationPolicies: [] },
      onboarding: { checklists: [] }
    });

    const { default: useSupportDashboard } = await import('../useSupportDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useSupportDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.queue?.items?.[0]?.status).toBe('open');

    act(() => {
      result.current.updateTicket('ticket-1', (ticket) => ({ ...ticket, status: 'resolved' }));
    });

    expect(result.current.data?.queue?.items?.[0]?.status).toBe('resolved');
  });

  it('updates notification policies in local state', async () => {
    const { fetchSupportOverview, fetchSupportTenants } = await import('../../api/operatorDashboardApi.js');
    fetchSupportTenants.mockResolvedValue({
      items: [{ id: 'tenant-1', name: 'Tenant One' }],
      defaultTenantId: 'tenant-1'
    });
    fetchSupportOverview.mockResolvedValue({
      queue: { stats: { open: 0 }, items: [] },
      communications: { scheduled: [], recent: [] },
      knowledgeBase: { flaggedArticles: [], totalArticles: 0, drafts: [] },
      settings: {
        notificationPolicies: [
          {
            id: 'policy-1',
            name: '24/7 Tier 1',
            channels: { email: true, sms: false, push: true, inApp: true }
          }
        ]
      },
      onboarding: { checklists: [] }
    });

    const { default: useSupportDashboard } = await import('../useSupportDashboard.js');
    const { AuthProvider } = await import('../../context/AuthContext.jsx');
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useSupportDashboard({ pollIntervalMs: 0 }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.settings?.notificationPolicies?.[0]?.channels?.sms).toBe(false);

    act(() => {
      result.current.updateNotificationPolicy('policy-1', (policy) => ({
        ...policy,
        channels: { ...policy.channels, sms: true }
      }));
    });

    expect(result.current.data?.settings?.notificationPolicies?.[0]?.channels?.sms).toBe(true);
  });
});
