import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import AppTopBar from '../components/navigation/AppTopBar.jsx';
import AppNotificationPanel from '../components/navigation/AppNotificationPanel.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';
import { PRIMARY_NAVIGATION, QUICK_CREATE_ACTIONS, NOTIFICATION_GROUPS } from '../navigation/routes.js';
import { deriveQuickActions, buildShellNotifications, derivePresence } from '../navigation/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { NavigationMetadataProvider } from '../context/NavigationMetadataContext.jsx';
import {
  trackNavigationImpression,
  trackNavigationSelect,
  trackNotificationOpen,
  trackNotificationPreferenceChange
} from '../lib/analytics.js';

export default function MainLayout() {
  const navigate = useNavigate();
  const { session, isAuthenticated, logout } = useAuth();
  const { getConfigValue } = useRuntimeConfig();
  const { connected: realtimeConnected } = useRealtime();

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

  const quickActionIds = useMemo(() => deriveQuickActions(session?.user?.role), [session?.user?.role]);
  const quickActions = useMemo(
    () => QUICK_CREATE_ACTIONS.filter((action) => quickActionIds.includes(action.id)),
    [quickActionIds]
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
          `/explorer?entity=${encodeURIComponent(suggestion.target.entityType)}&highlight=${encodeURIComponent(suggestion.target.entityId)}`
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

  const metadataRole = session?.user?.role ?? (isAuthenticated ? 'user' : 'guest');
  const metadataToken = session?.tokens?.accessToken ?? undefined;

  return (
    <NavigationMetadataProvider role={metadataRole} token={metadataToken}>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppTopBar
          session={session}
          onLogout={logout}
          primaryNavigation={PRIMARY_NAVIGATION}
          quickActions={isAuthenticated ? quickActions : []}
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
          callToAction={null}
        />
        <ServiceHealthBanner />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Edulure. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <a className="transition hover:text-primary" href="/privacy">
                Privacy
              </a>
              <a className="transition hover:text-primary" href="/terms">
                Terms
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
    </NavigationMetadataProvider>
  );
}

