import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { deriveQuickActions, buildShellNotifications, derivePresence, mergeAnnexQuickActions } from '../navigation/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { NavigationMetadataProvider, NavigationMetadataContext } from '../context/NavigationMetadataContext.jsx';
import {
  trackNavigationSelect,
  trackNotificationOpen,
  trackNotificationPreferenceChange,
  trackDashboardSurfaceView
} from '../lib/analytics.js';
import { useTheme } from '../providers/ThemeProvider.jsx';

const CUSTOMER_ROLES = new Set(['learner', 'guardian', 'student']);

function normaliseRole(role) {
  if (typeof role !== 'string') {
    return null;
  }
  const trimmed = role.trim().toLowerCase();
  return trimmed || null;
}

function isCustomerRole(role) {
  const resolved = normaliseRole(role);
  if (!resolved) {
    return true;
  }
  return CUSTOMER_ROLES.has(resolved);
}

function coerceNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function coerceTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  try {
    const parsed = new Date(value);
    const time = parsed.getTime();
    return Number.isFinite(time) ? time : null;
  } catch (_error) {
    return null;
  }
}

function formatCount(value) {
  const amount = coerceNumber(value, 0);
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toString();
}

function buildSurfaceRegistry(dashboard, role) {
  if (!dashboard || typeof dashboard !== 'object') {
    return {};
  }

  const now = Date.now();
  const baseHealth = dashboard.serviceHealth ?? dashboard.health ?? {};
  const resolvedRole = role?.toLowerCase() ?? 'learner';

  const registry = {};

  const registerSurface = (id, descriptor = {}) => {
    if (!id) return;
    const lastSyncedAt = coerceTimestamp(descriptor.lastSyncedAt ?? descriptor.syncedAt ?? dashboard.syncedAt ?? null);
    const metrics = Array.isArray(descriptor.metrics) ? descriptor.metrics : [];
    registry[id] = {
      id,
      role: resolvedRole,
      title: descriptor.title ?? null,
      description: descriptor.description ?? descriptor.summary ?? null,
      unreadCount: coerceNumber(descriptor.unreadCount ?? descriptor.unread ?? 0),
      pendingCount: coerceNumber(descriptor.pendingCount ?? descriptor.pending ?? descriptor.unread ?? 0),
      lastSyncedAt,
      stale: typeof lastSyncedAt === 'number' ? now - lastSyncedAt > 5 * 60 * 1000 : false,
      metrics,
      service: descriptor.service ?? id,
      serviceHealth:
        descriptor.serviceHealth ?? baseHealth[id] ?? baseHealth[descriptor.service] ?? baseHealth.default ?? 'operational',
      status: descriptor.status ?? null,
      trend: descriptor.trend ?? null,
      nextAction: descriptor.nextAction ?? null
    };
  };

  const learnerData = dashboard.learner ?? {};
  const instructorData = dashboard.instructor ?? {};

  const bookingsData =
    dashboard.bookings ??
    learnerData.bookings ??
    instructorData.bookings ??
    dashboard.fieldServices ??
    null;
  registerSurface('bookings', {
    title: resolvedRole === 'instructor' ? 'Tutor bookings' : 'Learner bookings',
    description:
      resolvedRole === 'instructor'
        ? 'Coordinate tutor availability, dispatch conflicts, and learner reschedules.'
        : 'Track upcoming sessions, reschedule requests, and concierge handoffs.',
    unreadCount: bookingsData?.unreadCount ?? bookingsData?.openConflicts ?? bookingsData?.pendingCount,
    pendingCount: bookingsData?.pendingCount ?? bookingsData?.openRequests,
    metrics: [
      {
        label: 'Pending',
        value: formatCount(bookingsData?.pendingCount ?? bookingsData?.pending?.length ?? 0)
      },
      {
        label: 'Scheduled',
        value: formatCount(bookingsData?.scheduledCount ?? bookingsData?.scheduled?.length ?? 0)
      },
      {
        label: 'Conflicts',
        value: formatCount(bookingsData?.openConflicts ?? bookingsData?.conflicts?.length ?? 0)
      }
    ],
    lastSyncedAt: bookingsData?.lastSyncedAt ?? bookingsData?.updatedAt ?? bookingsData?.refreshedAt,
    service: 'field-services'
  });

  const ebooksData = dashboard.ebooks ?? learnerData.ebooks ?? instructorData.ebooks ?? null;
  registerSurface('ebooks', {
    title: 'E-book workspace',
    description:
      resolvedRole === 'instructor'
        ? 'Manage publications, monetisation, and reader feedback.'
        : 'Resume reading, sync highlights, and download offline collections.',
    unreadCount: ebooksData?.unreadCount ?? ebooksData?.inReview ?? 0,
    metrics: [
      { label: 'Library', value: formatCount(ebooksData?.libraryCount ?? ebooksData?.library?.length ?? 0) },
      { label: 'In progress', value: formatCount(ebooksData?.inProgressCount ?? ebooksData?.inProgress ?? 0) },
      { label: 'Completed', value: formatCount(ebooksData?.completedCount ?? ebooksData?.completed ?? 0) }
    ],
    lastSyncedAt: ebooksData?.syncedAt ?? ebooksData?.updatedAt ?? ebooksData?.refreshedAt,
    service: 'catalogue'
  });

  const affiliateData = dashboard.affiliate ?? instructorData.affiliate ?? null;
  registerSurface('affiliate', {
    title: 'Affiliate partners',
    description: 'Analyse partner performance, manage payouts, and export campaign ledgers.',
    unreadCount: affiliateData?.alerts ?? affiliateData?.openTasks ?? 0,
    pendingCount: affiliateData?.outstandingPayouts ?? affiliateData?.pending ?? 0,
    metrics: [
      { label: 'Active', value: formatCount(affiliateData?.summary?.activeChannels ?? affiliateData?.active ?? 0) },
      { label: 'Outstanding', value: affiliateData?.summary?.outstanding ?? affiliateData?.outstanding ?? '—' },
      { label: 'Total', value: formatCount(affiliateData?.summary?.totalChannels ?? affiliateData?.total ?? 0) }
    ],
    lastSyncedAt: affiliateData?.syncedAt ?? affiliateData?.updatedAt,
    service: 'commerce'
  });

  const assessmentsData = dashboard.assessments ?? learnerData.assessments ?? null;
  registerSurface('assessments', {
    title: 'Assessment planner',
    description: 'Review checkpoints, grading queues, and certification readiness.',
    unreadCount: assessmentsData?.awaitingGrading ?? assessmentsData?.pending ?? 0,
    pendingCount: assessmentsData?.dueSoon ?? assessmentsData?.overdue ?? 0,
    metrics: [
      { label: 'Due soon', value: formatCount(assessmentsData?.dueSoon ?? 0) },
      { label: 'Overdue', value: formatCount(assessmentsData?.overdue ?? 0) },
      { label: 'Completed', value: formatCount(assessmentsData?.completed ?? assessmentsData?.completedCount ?? 0) }
    ],
    lastSyncedAt: assessmentsData?.syncedAt ?? assessmentsData?.updatedAt,
    service: 'learning'
  });

  const inboxData = dashboard.inbox ?? dashboard.support ?? instructorData.inbox ?? null;
  registerSurface('inbox', {
    title: resolvedRole === 'instructor' ? 'Community inbox' : 'Support inbox',
    description:
      resolvedRole === 'instructor'
        ? 'Moderate community threads, respond to learners, and escalate incidents.'
        : 'Triage learner support tickets, automate follow-ups, and surface escalations.',
    unreadCount: inboxData?.unreadCount ?? inboxData?.openTickets ?? 0,
    pendingCount: inboxData?.pendingCount ?? inboxData?.backlog ?? 0,
    metrics: [
      { label: 'Open', value: formatCount(inboxData?.openTickets ?? inboxData?.open ?? 0) },
      { label: 'Waiting', value: formatCount(inboxData?.waiting ?? inboxData?.awaitingResponse ?? 0) },
      { label: 'SLA risk', value: formatCount(inboxData?.slaRisk ?? inboxData?.breached ?? 0) }
    ],
    lastSyncedAt: inboxData?.syncedAt ?? inboxData?.updatedAt,
    service: 'support'
  });

  const courseViewerData = dashboard.course ?? learnerData.course ?? null;
  registerSurface('course-viewer', {
    title: 'Course workspace',
    description: 'Monitor module progression, live sessions, and certificate readiness.',
    unreadCount: courseViewerData?.unreadAnnouncements ?? 0,
    pendingCount: courseViewerData?.nextLessons ?? 0,
    metrics: [
      { label: 'Active modules', value: formatCount(courseViewerData?.activeModules ?? 0) },
      { label: 'Completed', value: formatCount(courseViewerData?.completedLessons ?? 0) },
      { label: 'Certificates', value: formatCount(courseViewerData?.certificatesReady ?? 0) }
    ],
    lastSyncedAt: courseViewerData?.syncedAt ?? courseViewerData?.updatedAt,
    service: 'learning'
  });

  return registry;
}

function deriveAnnexSidebarStatuses(initiatives = []) {
  const statuses = {};
  initiatives.forEach((initiative) => {
    if (!initiative?.id) {
      return;
    }
    const primaryTask = initiative.initiative?.operations?.tasks?.[0] ?? null;
    if (primaryTask?.label) {
      statuses[initiative.id] = {
        label: primaryTask.label,
        tone: 'alert',
        health: null
      };
      return;
    }
    const strategyMetric = initiative.initiative?.strategy?.metrics?.[0] ?? null;
    if (strategyMetric?.label) {
      statuses[initiative.id] = {
        label: strategyMetric.label,
        tone: 'notice',
        health: null
      };
    }
  });
  return statuses;
}

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

function deriveSidebarStatuses(surfaceRegistry, role) {
  if (!surfaceRegistry) return {};
  const statuses = {};
  const normalisedRole = role?.toLowerCase();

  const bookingsSurface = surfaceRegistry.bookings;
  if (bookingsSurface && bookingsSurface.pendingCount > 0) {
    const targetId = normalisedRole === 'instructor' ? 'instructor-bookings' : 'learner-bookings';
    statuses[targetId] = {
      label: `${bookingsSurface.pendingCount} pending`,
      tone: bookingsSurface.pendingCount > 5 ? 'alert' : 'notice',
      health: bookingsSurface.serviceHealth
    };
  }

  const inboxSurface = surfaceRegistry.inbox;
  if (inboxSurface && inboxSurface.pendingCount > 0) {
    const targetId = normalisedRole === 'admin' ? 'admin-support' : normalisedRole === 'instructor' ? 'instructor-inbox' : null;
    if (targetId) {
      statuses[targetId] = {
        label: `${inboxSurface.pendingCount} queue`,
        tone: inboxSurface.pendingCount > 10 ? 'critical' : 'notice',
        health: inboxSurface.serviceHealth
      };
    }
  }

  const assessmentsSurface = surfaceRegistry.assessments;
  if (assessmentsSurface && assessmentsSurface.pendingCount > 0 && normalisedRole === 'learner') {
    statuses['learner-assessments'] = {
      label: `${assessmentsSurface.pendingCount} due`,
      tone: assessmentsSurface.pendingCount > 3 ? 'alert' : 'notice',
      health: assessmentsSurface.serviceHealth
    };
  }

  return statuses;
}

export function DashboardLayoutInner() {
  const { role: rawRole } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { roles, dashboards, activeRole, setActiveRole, loading, error, refresh } = useDashboard();
  const { getConfigValue } = useRuntimeConfig();
  const { connected: realtimeConnected } = useRealtime();
  const navigationMetadata = useContext(NavigationMetadataContext);
  const navigationInitiatives = navigationMetadata?.initiatives ?? { quickActions: [], dashboard: [] };
  const { classes, resolvedMode } = useTheme();

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

  const sidebarPreferenceKey = `dashboard:sidebar-collapsed:${resolvedRole}`;

  const dashboardData = dashboards?.[resolvedRole] ?? null;
  const surfaceRegistry = useMemo(
    () => buildSurfaceRegistry(dashboardData, resolvedRole),
    [dashboardData, resolvedRole]
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(sidebarPreferenceKey);
    return stored === 'true';
  });
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
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(sidebarPreferenceKey);
    setIsSidebarCollapsed(stored === 'true');
  }, [sidebarPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(sidebarPreferenceKey, isSidebarCollapsed ? 'true' : 'false');
  }, [isSidebarCollapsed, sidebarPreferenceKey]);

  useEffect(() => {
    setNotificationPreferences({
      communities: true,
      courses: resolvedRole !== 'admin',
      payouts: resolvedRole === 'admin'
    });
  }, [resolvedRole]);

  const quickActionIds = useMemo(
    () => deriveQuickActions(session?.user?.role ?? resolvedRole),
    [session?.user?.role, resolvedRole]
  );

  const annexQuickActions = useMemo(() => {
    const annexItems = Array.isArray(navigationInitiatives.quickActions)
      ? navigationInitiatives.quickActions
      : [];
    const filteredAnnex = annexItems.filter((item) => quickActionIds.includes(item.id));
    const filteredStatic = QUICK_CREATE_ACTIONS.filter((action) => quickActionIds.includes(action.id));
    return mergeAnnexQuickActions(filteredStatic, filteredAnnex);
  }, [navigationInitiatives.quickActions, quickActionIds]);

  const quickActions = useMemo(() => annexQuickActions.quickActions, [annexQuickActions.quickActions]);

  const callToAction = useMemo(() => annexQuickActions.callToAction, [annexQuickActions.callToAction]);

  const notificationCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications]
  );

  const presence = useMemo(() => derivePresence(session, realtimeConnected), [session, realtimeConnected]);

  const annexSidebarStatuses = useMemo(
    () => deriveAnnexSidebarStatuses(navigationInitiatives.dashboard),
    [navigationInitiatives.dashboard]
  );

  const baseSidebarStatuses = useMemo(
    () => deriveSidebarStatuses(surfaceRegistry, resolvedRole),
    [surfaceRegistry, resolvedRole]
  );

  const sidebarStatuses = useMemo(
    () => ({ ...baseSidebarStatuses, ...annexSidebarStatuses }),
    [baseSidebarStatuses, annexSidebarStatuses]
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

  useEffect(() => {
    const surfaceEntries = Object.values(surfaceRegistry ?? {});
    surfaceEntries.forEach((surface) => {
      if (!surface) return;
      trackDashboardSurfaceView(surface.id, {
        role: resolvedRole,
        origin: 'dashboard-shell',
        stale: surface.stale,
        pending: surface.pendingCount
      });
    });
  }, [surfaceRegistry, resolvedRole]);

  const outletContext = useMemo(
    () => ({
      role: resolvedRole,
      dashboard: dashboardData,
      refresh,
      surfaceRegistry
    }),
    [resolvedRole, dashboardData, refresh, surfaceRegistry]
  );

  return (
    <div className={`flex min-h-screen flex-col ${classes.surface}`}>
      <a className="skip-link" href="#dashboard-main">
        Skip to dashboard content
      </a>
      <AppTopBar
        session={session}
        onLogout={logout}
        primaryNavigation={PRIMARY_NAVIGATION}
        quickActions={quickActions}
        callToAction={callToAction}
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
            <Outlet context={outletContext} />
          )}
        </main>
      </div>
      <footer
        className={`border-t px-4 py-6 text-sm sm:px-6 lg:px-8 ${
          resolvedMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
        } ${classes.panel}`}
      >
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

export default function DashboardLayout() {
  const { session, isAuthenticated } = useAuth();
  const metadataRole = session?.user?.role ?? (isAuthenticated ? 'user' : 'guest');
  const metadataToken = session?.tokens?.accessToken ?? undefined;
  const annexMetadataEnabled = !isCustomerRole(session?.user?.role) && isAuthenticated;

  return (
    <NavigationMetadataProvider role={metadataRole} token={metadataToken} enabled={annexMetadataEnabled}>
      <DashboardLayoutInner />
    </NavigationMetadataProvider>
  );
}

