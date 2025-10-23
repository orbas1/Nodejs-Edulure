import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import AppTopBar from '../components/navigation/AppTopBar.jsx';
import AppSidebar from '../components/navigation/AppSidebar.jsx';
import AppNotificationPanel from '../components/navigation/AppNotificationPanel.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import {
  PRIMARY_NAVIGATION,
  QUICK_CREATE_ACTIONS,
  NOTIFICATION_GROUPS,
  getDashboardNavigation
} from '../navigation/routes.js';
import { deriveQuickActions, buildShellNotifications, derivePresence } from '../navigation/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import {
  trackNavigationSelect,
  trackNotificationOpen,
  trackNotificationPreferenceChange
} from '../lib/analytics.js';

function buildDashboardNotifications(session, dashboard) {
  const baseNotifications = buildShellNotifications(session);
  if (!Array.isArray(dashboard?.alerts) || dashboard.alerts.length === 0) {
    return baseNotifications;
  }
  const supplemental = dashboard.alerts.slice(0, 3).map((alert, index) => ({
    id: `dashboard-alert-${index}`,
    title: alert.title ?? 'Dashboard alert',
    summary: alert.message ?? 'An important update requires your attention.',
    timestamp: alert.timestamp ?? 'Recently',
    groupId: alert.groupId ?? 'communities',
    unread: alert.severity === 'critical',
    type: alert.severity === 'warning' || alert.severity === 'critical' ? 'warning' : 'default',
    href: alert.href ?? null
  }));
  return [...supplemental, ...baseNotifications];
}

function deriveSidebarStatuses(dashboard, role) {
  if (!dashboard) return {};
  const statuses = {};
  const normalisedRole = role?.toLowerCase();
  if (dashboard.liveSessions?.activeCount && normalisedRole !== 'admin') {
    const target = normalisedRole === 'instructor' ? 'instructor-live' : 'learner-live';
    statuses[target] = `${dashboard.liveSessions.activeCount} live`;
  }
  if (dashboard.financial?.overdueInvoices && normalisedRole === 'admin') {
    statuses['admin-ads'] = 'Action';
  }
  if (dashboard.support?.openTickets && normalisedRole !== 'learner') {
    statuses[normalisedRole === 'admin' ? 'admin-support' : 'instructor-inbox'] = `${dashboard.support.openTickets} open`;
  }
  return statuses;
}

export default function DashboardLayout() {
  const { role: rawRole } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { roles, dashboards, activeRole, setActiveRole, loading, error, refresh } = useDashboard();
  const { getConfigValue } = useRuntimeConfig();
  const { connected: realtimeConnected } = useRealtime();

  const availableRoles = useMemo(
    () => roles.map((role) => role.id.toLowerCase()),
    [roles]
  );
  const paramRole = rawRole?.toLowerCase() ?? null;
  const fallbackRole = activeRole?.toLowerCase() ?? roles[0]?.id?.toLowerCase() ?? 'learner';
  const resolvedRole = availableRoles.includes(paramRole) ? paramRole : fallbackRole;

  useEffect(() => {
    if (!roles.length) return;
    if (paramRole && paramRole !== resolvedRole) {
      navigate(`/dashboard/${resolvedRole}`, { replace: true });
    }
    setActiveRole(resolvedRole);
  }, [paramRole, resolvedRole, roles, navigate, setActiveRole]);

  const basePath = `/dashboard/${resolvedRole}`;
  const sidebarNavigation = useMemo(
    () => getDashboardNavigation(resolvedRole, basePath),
    [resolvedRole, basePath]
  );

  const dashboardData = dashboards?.[resolvedRole] ?? null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    communities: true,
    courses: resolvedRole !== 'admin',
    payouts: resolvedRole === 'admin'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(() => buildDashboardNotifications(session, dashboardData));

  useEffect(() => {
    setNotifications(buildDashboardNotifications(session, dashboardData));
  }, [session, dashboardData]);

  useEffect(() => {
    setNotificationPreferences({
      communities: true,
      courses: resolvedRole !== 'admin',
      payouts: resolvedRole === 'admin'
    });
  }, [resolvedRole]);

  const quickActionIds = useMemo(() => deriveQuickActions(session?.user?.role ?? resolvedRole), [session?.user?.role, resolvedRole]);
  const quickActions = useMemo(
    () => QUICK_CREATE_ACTIONS.filter((action) => quickActionIds.includes(action.id)),
    [quickActionIds]
  );

  const notificationCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications]
  );

  const presence = useMemo(() => derivePresence(session, realtimeConnected), [session, realtimeConnected]);

  const sidebarStatuses = useMemo(
    () => deriveSidebarStatuses(dashboardData, resolvedRole),
    [dashboardData, resolvedRole]
  );

  const pinnedNavigation = useMemo(() => {
    const pinned = dashboardData?.preferences?.pinnedNavigation ?? session?.user?.pinnedNavigation ?? [];
    return Array.isArray(pinned) ? pinned : [];
  }, [dashboardData?.preferences?.pinnedNavigation, session?.user?.pinnedNavigation]);

  const handleNavigate = useCallback(
    (path) => {
      if (!path) return;
      trackNavigationSelect(path, { origin: 'dashboard-shell', role: resolvedRole });
      navigate(path);
    },
    [navigate, resolvedRole]
  );

  const handleSidebarNavigate = useCallback(
    (path) => {
      if (!path) return;
      trackNavigationSelect(path, { origin: 'dashboard-sidebar', role: resolvedRole });
      navigate(path);
    },
    [navigate, resolvedRole]
  );

  const handleSearchSubmit = useCallback(
    (value) => {
      const trimmed = value.trim();
      setSearchTerm(trimmed);
      if (!trimmed) return;
      navigate(`${basePath}/search?query=${encodeURIComponent(trimmed)}`);
    },
    [navigate, basePath]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      if (!suggestion) {
        return false;
      }
      trackNavigationSelect('dashboard-search-suggestion', {
        origin: resolvedRole,
        type: suggestion.type,
        label: suggestion.label
      });
      if (suggestion.target?.entityType && suggestion.target?.entityId) {
        navigate(
          `${basePath}/search?entity=${encodeURIComponent(suggestion.target.entityType)}&highlight=${encodeURIComponent(suggestion.target.entityId)}`
        );
        return false;
      }
      if (suggestion.query) {
        handleSearchSubmit(suggestion.query);
      }
      return false;
    },
    [basePath, handleSearchSubmit, navigate, resolvedRole]
  );

  const handleOpenNotifications = useCallback(() => {
    setNotificationsOpen(true);
    notifications.forEach((notification) => {
      if (notification.unread) {
        trackNotificationOpen(notification.id, { groupId: notification.groupId, role: resolvedRole });
      }
    });
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  }, [notifications, resolvedRole]);

  const handleUpdateNotificationPreference = useCallback((groupId, enabled) => {
    setNotificationPreferences((prev) => ({ ...prev, [groupId]: enabled }));
    trackNotificationPreferenceChange(groupId, enabled);
  }, []);

  const supportEmail = getConfigValue('support.contact-email', 'support@edulure.com');

  const showEmptyState = !loading && !error && !dashboardData;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a className="skip-link" href="#dashboard-main">
        Skip to dashboard content
      </a>
      <AppTopBar
        session={session}
        onLogout={logout}
        primaryNavigation={PRIMARY_NAVIGATION}
        quickActions={quickActions}
        onNavigate={handleNavigate}
        onOpenNotifications={handleOpenNotifications}
        searchValue={searchTerm}
        onSearchChange={(value) => setSearchTerm(value)}
        onSearchSubmit={handleSearchSubmit}
        onSuggestionSelect={handleSuggestionSelect}
        notificationCount={notificationCount}
        presence={presence}
        showQuickCreate
        showSidebarToggle
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <ServiceHealthBanner />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          navigation={sidebarNavigation}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          onNavigate={handleSidebarNavigate}
          activePath={location.pathname}
          statusByRoute={sidebarStatuses}
          pinnedIds={pinnedNavigation}
        />
        <main
          id="dashboard-main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-slate-25 px-4 pb-16 pt-6 sm:px-6 lg:px-8"
        >
          {loading ? (
            <DashboardStateMessage
              variant="loading"
              title="Loading your workspace"
              description="Aggregating dashboards, cohorts, and monetisation signals."
            />
          ) : error ? (
            <DashboardStateMessage
              variant="error"
              title="Unable to load dashboard"
              description={error.message ?? 'Something went wrong while loading your workspace.'}
              actionLabel="Retry"
              onAction={refresh}
            />
          ) : showEmptyState ? (
            <DashboardStateMessage
              variant="empty"
              title="No dashboard data yet"
              description="Start enrolling learners, launching communities, or scheduling sessions to populate this workspace."
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Edulure. Operated workspaces.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <a className="transition hover:text-primary" href={`mailto:${supportEmail}`}>
              Support
            </a>
            <a className="transition hover:text-primary" href="/privacy">
              Privacy
            </a>
            <a className="transition hover:text-primary" href="/terms">
              Terms
            </a>
          </div>
        </div>
      </footer>
      <AppNotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        groups={NOTIFICATION_GROUPS}
        preferences={notificationPreferences}
        onUpdatePreference={handleUpdateNotificationPreference}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

