import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NavigationMetadataContext from '../../src/context/NavigationMetadataContext.jsx';
import { DashboardLayoutInner } from '../../src/layouts/DashboardLayout.jsx';

const mockSetActiveRole = vi.fn();

vi.mock('../../src/context/AuthContext.jsx', () => ({
  __esModule: true,
  useAuth: () => ({
    session: {
      user: {
        role: 'instructor',
        unreadCommunityCount: 0,
        pendingPayouts: 0,
        pinnedNavigation: []
      },
      tokens: { accessToken: 'token-123' }
    },
    logout: vi.fn()
  })
}));

vi.mock('../../src/context/DashboardContext.jsx', () => ({
  __esModule: true,
  useDashboard: () => ({
    roles: [{ id: 'Instructor' }],
    dashboards: {
      instructor: {
        serviceHealth: {},
        preferences: { pinnedNavigation: ['instructor-home'] }
      }
    },
    activeRole: 'Instructor',
    setActiveRole: mockSetActiveRole,
    loading: false,
    error: null,
    refresh: vi.fn()
  })
}));

vi.mock('../../src/context/RuntimeConfigContext.jsx', () => ({
  __esModule: true,
  useRuntimeConfig: () => ({ getConfigValue: () => 'support@edulure.com' })
}));

vi.mock('../../src/context/RealtimeContext.jsx', () => ({
  __esModule: true,
  useRealtime: () => ({ connected: true })
}));

vi.mock('../../src/components/navigation/AppSidebar.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="app-sidebar" />
}));

vi.mock('../../src/components/navigation/AppNotificationPanel.jsx', () => ({
  __esModule: true,
  default: () => null
}));

vi.mock('../../src/components/status/ServiceHealthBanner.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="service-health-banner" />
}));

vi.mock('../../src/components/dashboard/DashboardStateMessage.jsx', () => ({
  __esModule: true,
  default: () => null
}));

vi.mock('../../src/lib/analytics.js', () => ({
  __esModule: true,
  trackNavigationImpression: vi.fn(),
  trackNavigationSelect: vi.fn(),
  trackNotificationOpen: vi.fn(),
  trackNotificationPreferenceChange: vi.fn(),
  trackDashboardSurfaceView: vi.fn()
}));

function buildMetadata(overrides = {}) {
  return {
    initiatives: {
      primary: [],
      quickActions: [],
      dashboard: [],
      ...(overrides.initiatives ?? {})
    },
    operationsChecklist: [],
    designDependencies: { tokens: [], qa: [], references: [] },
    strategyNarratives: [],
    productBacklog: [],
    status: 'loaded',
    error: null,
    refresh: vi.fn(),
    ...overrides
  };
}

function renderDashboard(metadataOverrides = {}) {
  const metadata = buildMetadata(metadataOverrides);
  return render(
    <NavigationMetadataContext.Provider value={metadata}>
      <MemoryRouter initialEntries={['/dashboard/instructor']}>
        <Routes>
          <Route path="/dashboard/:role/*" element={<DashboardLayoutInner />}>
            <Route index element={<div data-testid="dashboard-home" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </NavigationMetadataContext.Provider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DashboardLayoutInner', () => {
  it('displays annex quick action CTA when metadata is present', () => {
    renderDashboard({
      initiatives: {
        primary: [],
        dashboard: [],
        quickActions: [
          {
            id: 'launch-session',
            label: 'Coordinate launch readiness',
            to: '/dashboard/instructor/live-classes?annex=ops-221',
            category: 'quick_action',
            initiative: {
              product: { epicId: 'OPS-221', summary: 'Ready', backlogRef: null },
              operations: { runbookSection: 'navigation', owner: 'Ops', tasks: [] },
              design: { tokens: [], qa: [], references: [] },
              strategy: { pillar: 'Activation', narrative: 'Live session readiness', metrics: [] }
            }
          }
        ]
      }
    });

    expect(
      screen.getByRole('button', { name: /coordinate launch readiness/i, hidden: true })
    ).toBeInTheDocument();
  });

  it('falls back to static quick action CTA when annex metadata is absent', () => {
    renderDashboard();

    expect(screen.getByRole('button', { name: /new post/i, hidden: true })).toBeInTheDocument();
  });
});

