import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NavigationMetadataContext from '../../src/context/NavigationMetadataContext.jsx';
import { MainLayoutContent } from '../../src/layouts/MainLayout.jsx';

vi.mock('../../src/lib/analytics.js', () => ({
  __esModule: true,
  trackNavigationImpression: vi.fn(),
  trackNavigationSelect: vi.fn(),
  trackNotificationOpen: vi.fn(),
  trackNotificationPreferenceChange: vi.fn()
}));

vi.mock('../../src/components/navigation/AppNotificationPanel.jsx', () => ({
  __esModule: true,
  default: () => null
}));

vi.mock('../../src/components/status/ServiceHealthBanner.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="service-health-banner" />
}));

function renderMainLayout({ metadata, session, isAuthenticated = true }) {
  return render(
    <NavigationMetadataContext.Provider value={metadata}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <MainLayoutContent
                session={session}
                isAuthenticated={isAuthenticated}
                logout={vi.fn()}
                navigate={vi.fn()}
                getConfigValue={() => 'support@edulure.com'}
                realtimeConnected={false}
              />
            }
          >
            <Route index element={<div data-testid="main-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </NavigationMetadataContext.Provider>
  );
}

function buildSession(role = 'instructor') {
  return {
    user: {
      role,
      unreadCommunityCount: 0,
      pendingPayouts: 0
    },
    tokens: {
      accessToken: 'token-123'
    }
  };
}

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

afterEach(() => {
  vi.clearAllMocks();
});

describe('MainLayoutContent', () => {
  it('shows annex-provided quick action CTA when available', () => {
    const metadata = buildMetadata({
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
              product: { epicId: 'OPS-221', backlogRef: null, summary: 'Ready' },
              operations: { runbookSection: 'navigation', owner: 'Ops', tasks: [] },
              design: { tokens: [], qa: [], references: [] },
              strategy: { pillar: 'Activation', narrative: 'Live session readiness', metrics: [] }
            }
          }
        ]
      }
    });

    renderMainLayout({ metadata, session: buildSession('Instructor') });

    expect(
      screen.getByRole('button', { name: /coordinate launch readiness/i, hidden: true })
    ).toBeInTheDocument();
  });

  it('falls back to static quick action CTA when annex data is missing', () => {
    const metadata = buildMetadata();

    renderMainLayout({ metadata, session: buildSession('Instructor') });

    expect(screen.getByRole('button', { name: /new post/i, hidden: true })).toBeInTheDocument();
  });
});

