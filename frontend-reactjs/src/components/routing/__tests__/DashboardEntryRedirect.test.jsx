import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';

import DashboardEntryRedirect from '../DashboardEntryRedirect.jsx';

const useDashboardMock = vi.hoisted(() => vi.fn());

vi.mock('../../../context/DashboardContext.jsx', () => ({
  useDashboard: useDashboardMock
}));

function renderWithRouter() {
  function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
  }

  function AppShell() {
    return (
      <div>
        <Outlet />
        <LocationProbe />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<DashboardEntryRedirect />} />
          <Route path="dashboard/:role" element={<div>Role dashboard</div>} />
          <Route path="feed" element={<div>Feed route</div>} />
          <Route path="settings/security/verification" element={<div>Verification route</div>} />
          <Route path="settings/security/mfa" element={<div>MFA route</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardEntryRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while dashboards are preparing', () => {
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [],
      loading: true,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter();

    expect(screen.getByText('Preparing your workspace')).toBeInTheDocument();
    expect(
      screen.getByText('We are syncing your dashboards and permissions.')
    ).toBeInTheDocument();
  });

  it('redirects once a role is available', async () => {
    useDashboardMock.mockReturnValue({
      activeRole: 'instructor',
      roles: [{ id: 'instructor' }],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/dashboard/instructor');
    });
  });

  it('allows retrying when dashboard fails to load', async () => {
    const refreshMock = vi.fn();
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [],
      loading: false,
      error: new Error('Network down'),
      refresh: refreshMock
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('offers navigation to the feed when no dashboards are assigned', async () => {
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('No dashboards assigned yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /browse community/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/feed');
    });
  });

  it('prompts identity verification when required by the role', async () => {
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [{ id: 'admin', name: 'Admin', requiresVerification: true, status: 'pending' }],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('Verify your identity')).toBeInTheDocument();
    expect(
      screen.getByText('We need to verify your identity before granting access to the Admin workspace.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start verification/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/settings/security/verification');
    });
  });

  it('guides the user to enable MFA when the role enforces it', async () => {
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [
        {
          id: 'operations',
          name: 'Operations',
          requiresTwoFactor: true,
          status: 'pending'
        }
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('Secure your account')).toBeInTheDocument();
    expect(
      screen.getByText('Enable multi-factor authentication to unlock the Operations dashboard.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /secure account/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/settings/security/mfa');
    });
  });

  it('displays a pending message when the dashboard is awaiting approval', async () => {
    const refreshMock = vi.fn();
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [{ id: 'learner', name: 'Learner', status: 'pending' }],
      loading: false,
      error: null,
      refresh: refreshMock
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('Access awaiting approval')).toBeInTheDocument();
    expect(
      screen.getByText("Your Learner dashboard access is pending approval. We'll notify you once it's ready.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /check again/i }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('shows a suspension message and opens the support channel when access is paused', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [
        {
          id: 'community',
          name: 'Community',
          status: 'suspended',
          suspensionReason: 'Compliance review in progress'
        }
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    const user = userEvent.setup();
    renderWithRouter();

    expect(screen.getByText('Dashboard access paused')).toBeInTheDocument();
    expect(screen.getByText('Compliance review in progress')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /contact support/i }));
    expect(openSpy).toHaveBeenCalledWith('mailto:support@edulure.com', '_blank', 'noopener');

    openSpy.mockRestore();
  });

  it('communicates when a dashboard role has expired', () => {
    useDashboardMock.mockReturnValue({
      activeRole: null,
      roles: [
        {
          id: 'campaigns',
          name: 'Campaigns',
          status: 'expired',
          expiresAt: new Date('2024-02-01T12:00:00Z').toISOString()
        }
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter();

    expect(screen.getByText('Dashboard access expired')).toBeInTheDocument();
    expect(screen.getByText(/Access to the Campaigns dashboard/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request renewal/i })).toBeInTheDocument();
  });
});
