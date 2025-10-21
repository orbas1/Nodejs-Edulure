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
});
