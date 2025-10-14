import { Fragment, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Disclosure, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

import { useAuth } from '../context/AuthContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import LanguageSelector from '../components/navigation/LanguageSelector.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import UserMenu from '../components/navigation/UserMenu.jsx';
import { useServiceHealth } from '../context/ServiceHealthContext.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';

const DASHBOARD_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  instructor: '/dashboard/instructor',
  learner: '/dashboard/learner',
  user: '/dashboard/learner',
  moderator: '/dashboard/admin'
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, session, logout } = useAuth();
  const { getConfigValue, isFeatureEnabled } = useRuntimeConfig();
  const { t } = useLanguage();
  const { alerts, manifest } = useServiceHealth();
  const supportEmail = getConfigValue('support.contact-email', 'support@edulure.com');
  const analyticsDashboardEnabled = isFeatureEnabled('analytics.explorer-dashboard', true);
  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console', false);
  const contentLibraryEnabled = isFeatureEnabled('content.library', true);

  const navigation = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { name: 'Home', to: '/' },
        { name: 'Blog', to: '/blog' },
        { name: 'About', to: '/about' }
      ];
    }

    const resolvedRole = (session?.user?.role ?? 'learner').toLowerCase();
    const baseDashboardPath = DASHBOARD_PATH_BY_ROLE[resolvedRole] ?? '/dashboard/learner';
    const communitiesPath =
      resolvedRole === 'instructor'
        ? `${baseDashboardPath}/communities/manage`
        : `${baseDashboardPath}/communities`;

    const items = [
      { name: 'Home', to: '/' },
      { name: 'Live feed', to: '/feed' },
      { name: 'Communities', to: '/communities' },
      { name: 'Explorer', to: '/explorer' },
      { name: 'Profile', to: '/profile' },
      { name: 'Blog', to: '/blog' },
      { name: 'Dashboard', to: baseDashboardPath },
      { name: 'Community Learnspace', to: communitiesPath },
      { name: 'About', to: '/about' }
    ];

    if (!items.some((item) => item.to === communitiesPath)) {
      items.splice(3, 0, { name: 'My communities', to: communitiesPath });
    }

    if (contentLibraryEnabled && (resolvedRole === 'instructor' || resolvedRole === 'admin')) {
      items.splice(4, 0, { name: 'Content', to: '/content' });
    }

    if (analyticsDashboardEnabled && (resolvedRole === 'instructor' || resolvedRole === 'admin')) {
      items.splice(4, 0, { name: 'Analytics', to: '/analytics' });
    }

    if (adminConsoleEnabled && resolvedRole === 'admin') {
      items.splice(4, 0, { name: 'Admin console', to: '/admin' });
    }

    return items;
  }, [
    isAuthenticated,
    session,
    contentLibraryEnabled,
    analyticsDashboardEnabled,
    adminConsoleEnabled
  ]);

  const avatarUrl = session?.user?.avatarUrl;
  const displayName = session?.user?.firstName
    ? `${session.user.firstName}${session.user.lastName ? ` ${session.user.lastName}` : ''}`
    : session?.user?.email ?? 'Your profile';
  const emailLabel = session?.user?.email;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'ED';

  const avatarClass =
    'flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary';

  const dashboardPath =
    DASHBOARD_PATH_BY_ROLE[(session?.user?.role ?? 'learner').toLowerCase()] ?? '/dashboard/learner';

  const healthSummary = useMemo(() => {
    if (!manifest) {
      return {
        label: 'Monitoring services',
        tone: 'neutral',
        message: 'Fetching latest readiness telemetry.'
      };
    }

    const criticalAlert = alerts.find((alert) => alert.level === 'critical');
    if (criticalAlert) {
      return {
        label: 'Service interruption',
        tone: 'critical',
        message: criticalAlert.message
      };
    }

    const warningAlert = alerts.find((alert) => alert.level === 'warning');
    if (warningAlert) {
      return {
        label: 'Performance degraded',
        tone: 'warning',
        message: warningAlert.message
      };
    }

    const infoAlert = alerts.find((alert) => alert.level === 'info');
    if (infoAlert) {
      return {
        label: 'Capability updates active',
        tone: 'info',
        message: infoAlert.message
      };
    }

    return {
      label: 'All systems operational',
      tone: 'success',
      message: 'All monitored services are available.'
    };
  }, [alerts, manifest]);

  const statusBadgeClasses = useMemo(() => {
    switch (healthSummary.tone) {
      case 'critical':
        return 'border border-rose-200 bg-rose-100 text-rose-700';
      case 'warning':
        return 'border border-amber-200 bg-amber-100 text-amber-700';
      case 'info':
        return 'border border-sky-200 bg-sky-100 text-sky-700';
      case 'success':
        return 'border border-emerald-200 bg-emerald-100 text-emerald-700';
      default:
        return 'border border-slate-200 bg-slate-100 text-slate-600';
    }
  }, [healthSummary.tone]);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
              alt="Edulure logo"
              className="h-10 w-auto"
            />
          </a>
          <div className="hidden items-center gap-4 lg:flex">
            {isAuthenticated ? (
              <nav className="flex items-center gap-6">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) =>
                      `text-sm font-semibold transition-colors duration-200 hover:text-primary-dark ${
                        isActive ? 'text-primary' : 'text-slate-600'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses}`}
            >
              {healthSummary.label}
            </span>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector size="compact" variant="light" align="end" showLabel={false} />
            {isAuthenticated ? (
              <UserMenu session={session} onNavigate={navigate} onLogout={logout} />
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                >
                  {t('navigation.login')}
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                >
                  {t('navigation.register')}
                </NavLink>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 lg:hidden">
            <LanguageSelector size="compact" variant="subtle" align="end" showLabel={false} />
            <Disclosure as="div" className="lg:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/70 p-2 text-slate-600 shadow-sm transition hover:border-primary hover:text-primary">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="h-6 w-6" />
                    ) : (
                      <Bars3Icon className="h-6 w-6" />
                    )}
                  </Disclosure.Button>
                  <Transition
                    as={Fragment}
                    enter="transition duration-200 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-150 ease-in"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel className="absolute inset-x-4 top-20 z-50 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur">
                      <div className="flex flex-col gap-5">
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                          <p
                            className={`inline-flex w-full items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses}`}
                          >
                            {healthSummary.label}
                          </p>
                          <p className="mt-2 text-xs text-slate-600">{healthSummary.message}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                          <LanguageSelector size="compact" variant="light" align="start" fullWidth />
                        </div>
                        {isAuthenticated ? (
                          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                            ) : (
                              <span className={avatarClass}>{initials}</span>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                              {emailLabel ? <p className="text-xs text-slate-500">{emailLabel}</p> : null}
                              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Secure session</p>
                            </div>
                          </div>
                        ) : null}

                        {isAuthenticated ? (
                          <div className="space-y-3">
                            {navigation.map((item) => (
                              <NavLink
                                key={item.name}
                                to={item.to}
                                className={({ isActive }) =>
                                  `block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition ${
                                    isActive ? 'border-primary bg-primary/10 text-primary' : 'text-slate-600 hover:border-primary'
                                  }`
                                }
                              >
                                {item.name}
                              </NavLink>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <NavLink
                              to="/login"
                              className="rounded-full border border-primary/30 px-5 py-2 text-center text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                            >
                              {t('navigation.login')}
                            </NavLink>
                            <NavLink
                              to="/register"
                              className="rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                            >
                              {t('navigation.register')}
                            </NavLink>
                          </div>
                        )}

                        {isAuthenticated ? (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/profile');
                                document.activeElement?.blur();
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                            >
                              View profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`${dashboardPath}/settings`);
                                document.activeElement?.blur();
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                            >
                              Settings
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                logout();
                                document.activeElement?.blur();
                              }}
                              className="w-full rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              Sign out
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          </div>
        </div>
      </header>
      <ServiceHealthBanner />
      <main className="bg-white">
        <Outlet key={location.pathname} />
      </main>
      {!isAuthenticated ? (
        <footer className="border-t border-slate-200 bg-slate-50/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Edulure. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href={`mailto:${supportEmail}`}>Support</a>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
