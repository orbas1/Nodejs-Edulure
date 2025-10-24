import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  BoltIcon,
  PlusIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';

import GlobalSearchBar from '../search/GlobalSearchBar.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import UserMenu from './UserMenu.jsx';
import ThemeModeToggle from '../common/ThemeModeToggle.jsx';
import { buildFocusOrder } from '../../navigation/routes.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function AppTopBar({
  session,
  primaryNavigation,
  quickActions,
  onNavigate,
  onOpenNotifications,
  onToggleSidebar,
  isSidebarCollapsed,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSuggestionSelect,
  searchLoading,
  notificationCount,
  presence,
  callToAction,
  onLogout,
  showSidebarToggle = false,
  showQuickCreate = true,
  showSearch = true,
  className
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const focusOrder = useMemo(
    () => buildFocusOrder(primaryNavigation, showQuickCreate ? quickActions : []),
    [primaryNavigation, quickActions, showQuickCreate]
  );

  const handleNavigate = (path) => {
    if (!path) return;
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const activePresenceCta = useMemo(() => {
    if (presence?.liveSession) {
      return {
        id: 'presence-live-session',
        label: presence.liveSession.label ?? 'Launch classroom',
        description: presence.liveSession.description ?? 'Jump back into the live classroom that is in progress.',
        to: presence.liveSession.to ?? '/dashboard/instructor/live-classes'
      };
    }
    if (presence?.pendingPayout) {
      return {
        id: 'presence-payout',
        label: presence.pendingPayout.label ?? 'Review payout',
        description: presence.pendingPayout.description ?? 'A monetisation payout needs approval.',
        to: presence.pendingPayout.to ?? '/dashboard/admin/finance'
      };
    }
    return null;
  }, [presence]);

  const resolvedCallToAction = callToAction ?? activePresenceCta;

  return (
    <header
      className={classNames(
        'sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {showSidebarToggle ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          ) : null}
          <Link to="/" className="flex items-center gap-2 rounded-2xl px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            <RectangleStackIcon className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">Edulure</span>
          </Link>
        </div>
        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNavigation.map((item, index) => {
            const tabIndex = focusOrder.indexOf(item.id) + 1;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={({ isActive }) =>
                  classNames(
                    'relative rounded-2xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isActive || location.pathname.startsWith(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-100'
                  )
                }
                aria-describedby={`${item.id}-description`}
                tabIndex={tabIndex}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {showSearch ? (
          <div className="hidden flex-1 lg:block">
            <GlobalSearchBar
              value={searchValue}
              onChange={onSearchChange}
              onSubmit={(query) => onSearchSubmit?.(query)}
              onSuggestionSelect={onSuggestionSelect}
              placeholder="Search courses, tutors, communities…"
              loading={searchLoading}
            />
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {resolvedCallToAction ? (
            <button
              type="button"
              onClick={() => handleNavigate(resolvedCallToAction.to)}
              className="hidden items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 lg:inline-flex"
            >
              <BoltIcon className="h-4 w-4" />
              <span>{resolvedCallToAction.label}</span>
            </button>
          ) : null}
          {showQuickCreate && quickActions.length > 0 ? (
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <PlusIcon className="h-5 w-5" />
                <span>Create</span>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-50 mt-3 w-80 origin-top-right rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick actions</p>
                  <ul className="mt-2 space-y-2">
                    {quickActions.map((action, index) => {
                      const tabIndex = focusOrder.indexOf(action.id) + 1;
                      return (
                        <Menu.Item key={action.id}>
                          {({ active }) => (
                            <button
                              type="button"
                              tabIndex={tabIndex}
                              onClick={() => handleNavigate(action.to)}
                              className={classNames(
                                'flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                                active ? 'bg-primary/10 text-primary' : 'text-slate-700'
                              )}
                            >
                              {action.icon ? <action.icon className="mt-1 h-5 w-5" /> : null}
                              <span className="flex-1">
                                <span className="block text-sm font-semibold">{action.label}</span>
                                <span className="mt-1 block text-xs text-slate-500">{action.description}</span>
                              </span>
                            </button>
                          )}
                        </Menu.Item>
                      );
                    })}
                  </ul>
                </Menu.Items>
              </Transition>
            </Menu>
          ) : null}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Open notifications panel"
          >
            <BellIcon className="h-5 w-5" />
            {notificationCount ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : null}
          </button>
          <ThemeModeToggle className="hidden lg:inline-flex" />
          <LanguageSelector size="compact" variant="light" align="end" showLabel={false} />
          {session?.user ? (
            <UserMenu session={session} onNavigate={handleNavigate} onLogout={onLogout} />
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Join Edulure
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500 sm:px-6 lg:hidden" aria-live="polite">
        {primaryNavigation.map((item) => (
          <p key={item.id} id={`${item.id}-description`} className="sr-only">
            {item.description}
          </p>
        ))}
      </div>
      {showSearch ? (
        <div className="border-t border-slate-100 px-4 py-3 lg:hidden">
          <GlobalSearchBar
            value={searchValue}
            onChange={onSearchChange}
            onSubmit={(query) => onSearchSubmit?.(query)}
            onSuggestionSelect={onSuggestionSelect}
            placeholder="Search courses, tutors, communities…"
            loading={searchLoading}
          />
        </div>
      ) : null}
    </header>
  );
}

AppTopBar.propTypes = {
  session: PropTypes.object,
  primaryNavigation: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ).isRequired,
  quickActions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      to: PropTypes.string,
      icon: PropTypes.elementType
    })
  ),
  onNavigate: PropTypes.func,
  onOpenNotifications: PropTypes.func,
  onToggleSidebar: PropTypes.func,
  isSidebarCollapsed: PropTypes.bool,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onSearchSubmit: PropTypes.func,
  onSuggestionSelect: PropTypes.func,
  searchLoading: PropTypes.bool,
  notificationCount: PropTypes.number,
  presence: PropTypes.object,
  callToAction: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    to: PropTypes.string.isRequired
  }),
  onLogout: PropTypes.func,
  showSidebarToggle: PropTypes.bool,
  showQuickCreate: PropTypes.bool,
  showSearch: PropTypes.bool,
  className: PropTypes.string
};

AppTopBar.defaultProps = {
  session: null,
  quickActions: [],
  onNavigate: null,
  onOpenNotifications: null,
  onToggleSidebar: null,
  isSidebarCollapsed: false,
  searchValue: undefined,
  onSearchChange: null,
  onSearchSubmit: null,
  onSuggestionSelect: null,
  searchLoading: false,
  notificationCount: 0,
  presence: null,
  callToAction: null,
  onLogout: () => {},
  showSidebarToggle: false,
  showQuickCreate: true,
  showSearch: true,
  className: ''
};

