import { Fragment, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Disclosure, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, session, logout } = useAuth();
  const { getConfigValue } = useRuntimeConfig();
  const supportEmail = getConfigValue('support.contact-email', 'support@edulure.com');

  const navigation = useMemo(() => {
    const role = session?.user?.role ?? null;
    const publicNavigation = [
      { name: 'Home', to: '/' },
      { name: 'About', to: '/about' }
    ];

    if (!isAuthenticated) {
      return publicNavigation;
    }

    const authedNavigation = [
      { name: 'Home', to: '/' },
      { name: 'Live Feed', to: '/feed' },
      { name: 'Explorer', to: '/explorer' },
      { name: 'Profile', to: '/profile' }
    ];
    if (isAuthenticated) {
      return [...base, { name: 'Content', to: '/content' }];
    }
    return base;
  }, [isAuthenticated]);

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

  const avatarClass = 'flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary';

  const handleProfileNavigation = () => {
    navigate('/profile');
  };

    if (role === 'instructor' || role === 'admin') {
      authedNavigation.push({ name: 'Content', to: '/content' });
    }

    if (analyticsDashboardEnabled && (role === 'instructor' || role === 'admin')) {
      authedNavigation.push({ name: 'Analytics', to: '/analytics' });
    }

    if (role === 'admin' && adminConsoleEnabled) {
      authedNavigation.push({ name: 'Admin', to: '/admin' });
    }

    authedNavigation.push({ name: 'About', to: '/about' });

    return authedNavigation;
  }, [isAuthenticated, session, adminConsoleEnabled, analyticsDashboardEnabled]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
              alt="Edulure logo"
              className="h-10 w-auto"
            />
          </a>
          <nav className="hidden items-center gap-6 md:flex">
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
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <div className="flex min-w-[240px] flex-col rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <button
                  type="button"
                  onClick={handleProfileNavigation}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className={avatarClass}>{initials}</span>
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                    {emailLabel ? <span className="text-xs text-slate-500">{emailLabel}</span> : null}
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">View profile</span>
                  </span>
                </button>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:border-primary hover:text-primary-dark"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
                >
                  Join the Community
                </NavLink>
              </>
            )}
          </div>
          <Disclosure as="div" className="md:hidden">
            {({ open }) => (
              <>
                <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:border-primary hover:text-primary">
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
                    <div className="flex flex-col gap-4">
                      {navigation.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.to}
                          className={({ isActive }) =>
                            `text-base font-semibold ${
                              isActive ? 'text-primary' : 'text-slate-600'
                            }`
                          }
                        >
                          {item.name}
                        </NavLink>
                      ))}
                      <div className="mt-4 flex flex-col gap-3">
                        {isAuthenticated ? (
                          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/profile');
                                document.activeElement?.blur();
                              }}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            >
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                              ) : (
                                <span className={avatarClass}>{initials}</span>
                              )}
                              <span className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                                {emailLabel ? <span className="text-xs text-slate-500">{emailLabel}</span> : null}
                                <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">View profile</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={logout}
                              className="w-full rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              Log out
                            </button>
                          </div>
                        ) : (
                          <>
                            <NavLink
                              to="/login"
                              className="rounded-full border border-primary/30 px-5 py-2 text-center text-sm font-semibold text-primary hover:border-primary hover:text-primary-dark"
                            >
                              Log in
                            </NavLink>
                            <NavLink
                              to="/register"
                              className="rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
                            >
                              Join the Community
                            </NavLink>
                          </>
                        )}
                      </div>
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        </div>
      </header>
      <main className="bg-white">
        <Outlet key={location.pathname} />
      </main>
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
    </div>
  );
}
