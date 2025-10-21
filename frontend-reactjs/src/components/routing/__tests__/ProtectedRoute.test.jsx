import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '../ProtectedRoute.jsx';

const useAuthMock = vi.fn();
const useDashboardMock = vi.fn();

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

vi.mock('../../../context/DashboardContext.jsx', () => ({
  useDashboard: () => useDashboardMock()
}));

function renderWithRouter(element) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/private' }]}> 
      <Routes>
        <Route path="/private" element={element} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Public home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useDashboardMock.mockReset();
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-1', role: 'admin', roles: [] } },
      isLoading: false
    });
    useDashboardMock.mockReturnValue({
      roles: [],
      loading: false,
      error: null,
      refresh: vi.fn()
    });
  });

  it('renders children when the session role matches an allowed role', async () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Secret area</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Secret area')).toBeInTheDocument();
  });

  it('accepts allowedRoles supplied as a string value', async () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles="admin">
        <div>String accepted</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('String accepted')).toBeInTheDocument();
  });

  it('accepts allowedRoles supplied as a Set of role names', async () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={new Set(['admin'])}>
        <div>Set accepted</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Set accepted')).toBeInTheDocument();
  });

  it('uses dashboard roles to authorise access when session roles do not match', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-1', role: 'learner', roles: [] } },
      isLoading: false
    });
    useDashboardMock.mockReturnValue({
      roles: [{ id: 'ops-admin' }],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ops-admin']}>
        <div>Operational metrics</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Operational metrics')).toBeInTheDocument();
  });

  it('honours dashboard role permissions when authorising access', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-1', role: 'learner', roles: [] } },
      isLoading: false
    });
    useDashboardMock.mockReturnValue({
      roles: [{ id: 'analytics-viewer', permissions: ['manage-insights'] }],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['perm:manage-insights']}>
        <div>Insights centre</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Insights centre')).toBeInTheDocument();
  });

  it('grants access when membership roles satisfy allowed roles', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-42', membership: { role: 'community', status: 'active' } } },
      isLoading: false
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['community']}>
        <div>Community lounge</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Community lounge')).toBeInTheDocument();
  });

  it('grants access when user permissions satisfy prefixed allowed roles', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-99', permissions: ['manage-users'] } },
      isLoading: false
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['perm:manage-users']}>
        <div>User management</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('User management')).toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to the login page', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, session: null, isLoading: false });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Should not render</div>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows a loading state while verifying access', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, session: { user: { id: 'user-1' } }, isLoading: true });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Hidden</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-route-loading')).toBeInTheDocument();
  });

  it('presents an access restricted message when the user lacks required roles', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      session: { user: { id: 'user-1', role: 'learner', roles: [] } },
      isLoading: false
    });
    useDashboardMock.mockReturnValue({
      roles: [],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Hidden</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Access restricted')).toBeInTheDocument();
    });
    expect(screen.getByText('Required access')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});

