import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import AppTopBar from '../components/navigation/AppTopBar.jsx';
import AppNotificationPanel from '../components/navigation/AppNotificationPanel.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';
import { PRIMARY_NAVIGATION, QUICK_CREATE_ACTIONS, NOTIFICATION_GROUPS } from '../navigation/routes.js';
import {
  deriveQuickActions,
  buildShellNotifications,
  derivePresence,
  mergeAnnexQuickActions
} from '../navigation/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { NavigationMetadataProvider, useNavigationMetadata } from '../context/NavigationMetadataContext.jsx';
import {
  trackNavigationImpression,
  trackNavigationSelect,
  trackNotificationOpen,
  trackNotificationPreferenceChange
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

export function MainLayoutContent({
  session,
  isAuthenticated,
  logout,
  navigate,
  getConfigValue,
  realtimeConnected,
  variant = 'app'
}) {
  const { classes, resolvedMode } = useTheme();
  const { initiatives } = useNavigationMetadata();
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => buildShellNotifications(session));
  const [notificationPreferences, setNotificationPreferences] = useState({
    communities: true,
    courses: session?.user?.role === 'instructor',
    payouts: session?.user?.role === 'admin'
  });

  useEffect(() => {
    PRIMARY_NAVIGATION.forEach((item, index) => {
      trackNavigationImpression(item.id, { position: index });
    });
  }, []);

  useEffect(() => {
    setNotifications(buildShellNotifications(session));
    setNotificationPreferences((prev) => ({
      ...prev,
      courses: session?.user?.role === 'instructor',
      payouts: session?.user?.role === 'admin'
    }));
  }, [session]);

  const quickActionIds = useMemo(
    () => deriveQuickActions(session?.user?.role ?? (isAuthenticated ? 'user' : null)),
    [session?.user?.role, isAuthenticated]
  );

  const annexQuickActions = useMemo(() => {
    const annexItems = Array.isArray(initiatives?.quickActions) ? initiatives.quickActions : [];
    const filteredAnnex = annexItems.filter((item) => quickActionIds.includes(item.id));
    const filteredStatic = QUICK_CREATE_ACTIONS.filter((action) => quickActionIds.includes(action.id));
    return mergeAnnexQuickActions(filteredStatic, filteredAnnex);
  }, [initiatives?.quickActions, quickActionIds]);

  const quickActions = useMemo(
    () => (isAuthenticated ? annexQuickActions.quickActions : []),
    [annexQuickActions.quickActions, isAuthenticated]
  );

  const callToAction = useMemo(
    () => (isAuthenticated ? annexQuickActions.callToAction : null),
    [annexQuickActions.callToAction, isAuthenticated]
  );

  const notificationCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications]
  );

  const presence = useMemo(() => derivePresence(session, realtimeConnected), [session, realtimeConnected]);

  const handleNavigate = useCallback(
    (path) => {
      if (!path) return;
      trackNavigationSelect(path, { origin: 'main-shell' });
      navigate(path);
    },
    [navigate]
  );

  const handleSearchSubmit = useCallback(
    (value) => {
      const trimmed = value.trim();
      setSearchTerm(trimmed);
      if (!trimmed) return;
      navigate(`/explorer?query=${encodeURIComponent(trimmed)}`);
    },
    [navigate]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      if (!suggestion) {
        return false;
      }
      trackNavigationSelect('global-search-suggestion', {
        origin: 'main-shell',
        type: suggestion.type,
        label: suggestion.label
      });
      if (suggestion.target?.entityType && suggestion.target?.entityId) {
        navigate(
          `/explorer?entity=${encodeURIComponent(suggestion.target.entityType)}&highlight=${encodeURIComponent(
            suggestion.target.entityId
          )}`
        );
        return false;
      }
      if (suggestion.query) {
        handleSearchSubmit(suggestion.query);
      }
      return false;
    },
    [handleSearchSubmit, navigate]
  );

  const handleOpenNotifications = useCallback(() => {
    setNotificationsOpen(true);
    notifications.forEach((notification) => {
      if (notification.unread) {
        trackNotificationOpen(notification.id, { groupId: notification.groupId });
      }
    });
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  }, [notifications]);

  const handleUpdateNotificationPreference = useCallback((groupId, enabled) => {
    setNotificationPreferences((prev) => ({ ...prev, [groupId]: enabled }));
    trackNotificationPreferenceChange(groupId, enabled);
  }, []);

  const supportEmail = getConfigValue('support.contact-email', 'support@edulure.com');

  const shellBackground =
    variant === 'marketing'
      ? resolvedMode === 'dark'
        ? 'bg-slate-950 text-slate-100'
        : 'bg-white text-slate-900'
      : classes.surface;

  const mainShellClassName =
    variant === 'marketing'
      ? 'flex w-full flex-1 flex-col px-0 pb-20 pt-10 sm:px-0'
      : 'mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8';

  const footerBackground =
    variant === 'marketing'
      ? shellBackground
      : classes.panel;
  const footerBase = 'border-t border-slate-200 px-6 py-10 text-sm shadow-sm dark:border-slate-800 sm:px-8 lg:px-12 xl:px-20';
  const footerContentClass =
    variant === 'marketing'
      ? 'flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between'
      : 'mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between';

  return (
    <div className={`flex min-h-screen flex-col ${shellBackground}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
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
        searchLoading={false}
        notificationCount={notificationCount}
        presence={presence}
        showQuickCreate={isAuthenticated}
        callToAction={callToAction}
        fullWidth={variant === 'marketing'}
      />
      <ServiceHealthBanner />
      <main id="main-content" tabIndex={-1} className={mainShellClassName}>
        <Outlet />
      </main>
      <footer className={`${footerBase} ${footerBackground}`}>
        <div className={footerContentClass}>
          <p className="text-center md:text-left">&copy; {new Date().getFullYear()} Edulure. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center md:justify-end md:text-left">
            <a className="transition hover:text-primary" href="/privacy">
              Privacy
            </a>
            <a className="transition hover:text-primary" href="/terms">
              Terms
            </a>
            <a className="transition hover:text-primary" href="/legal/contact">
              Legal contact
            </a>
            <a className="transition hover:text-primary" href={`mailto:${supportEmail}`}>
              Support
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

export default function MainLayout({ variant = 'app' }) {
  const navigate = useNavigate();
  const { session, isAuthenticated, logout } = useAuth();
  const { getConfigValue } = useRuntimeConfig();
  const { connected: realtimeConnected } = useRealtime();

  const metadataRole = session?.user?.role ?? (isAuthenticated ? 'user' : 'guest');
  const metadataToken = session?.tokens?.accessToken ?? undefined;
  const annexMetadataEnabled = !isCustomerRole(session?.user?.role) && isAuthenticated && variant !== 'marketing';

  return (
    <NavigationMetadataProvider role={metadataRole} token={metadataToken} enabled={annexMetadataEnabled}>
      <MainLayoutContent
        session={session}
        isAuthenticated={isAuthenticated}
        logout={logout}
        navigate={navigate}
        getConfigValue={getConfigValue}
        realtimeConnected={realtimeConnected}
        variant={variant}
      />
    </NavigationMetadataProvider>
  );
}
