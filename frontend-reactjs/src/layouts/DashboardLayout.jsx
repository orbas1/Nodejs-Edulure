import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  PlayCircleIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { useDashboard } from '../context/DashboardContext.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';

const navigationByRole = {
  learner: (basePath) => [
    { name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    { name: 'Communities', to: `${basePath}/communities`, icon: UserGroupIcon },
    { name: 'Courses', to: `${basePath}/courses`, icon: PlayCircleIcon },
    { name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon },
    { name: 'Tutor bookings', to: `${basePath}/bookings`, icon: UsersIcon },
    { name: 'E-books', to: `${basePath}/ebooks`, icon: BookOpenIcon },
    { name: 'Financial', to: `${basePath}/financial`, icon: ChartBarIcon },
    { name: 'Become an instructor', to: `${basePath}/become-instructor`, icon: ArrowTopRightOnSquareIcon }
  ],
  instructor: (basePath) => [
    { name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    { name: 'Create community', to: `${basePath}/communities/create`, icon: UserGroupIcon },
    { name: 'Manage communities', to: `${basePath}/communities/manage`, icon: Cog6ToothIcon },
    { name: 'Webinars', to: `${basePath}/communities/webinars`, icon: PlayCircleIcon },
    { name: 'Podcasts', to: `${basePath}/communities/podcasts`, icon: MicrophoneIcon },
    { name: 'Create course', to: `${basePath}/courses/create`, icon: DocumentTextIcon },
    { name: 'Recorded library', to: `${basePath}/courses/library`, icon: PlayCircleIcon },
    { name: 'Manage courses', to: `${basePath}/courses/manage`, icon: Cog6ToothIcon },
    { name: 'Monetisation', to: `${basePath}/pricing`, icon: BanknotesIcon },
    { name: 'Lesson schedule', to: `${basePath}/lesson-schedule`, icon: CalendarDaysIcon },
    { name: 'Tutor bookings', to: `${basePath}/bookings`, icon: UsersIcon },
    { name: 'Tutor schedule', to: `${basePath}/tutor-schedule`, icon: CalendarDaysIcon },
    { name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon },
    { name: 'E-books', to: `${basePath}/ebooks`, icon: BookOpenIcon },
    { name: 'Create e-books', to: `${basePath}/ebooks/create`, icon: DocumentTextIcon },
    { name: 'Edulure Ads', to: `${basePath}/ads`, icon: MegaphoneIcon }
  ]
};

function MicrophoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 14.25a3.75 3.75 0 0 0 3.75-3.75V6a3.75 3.75 0 1 0-7.5 0v4.5A3.75 3.75 0 0 0 12 14.25Zm6-3.75a6 6 0 0 1-12 0M9.75 19.5h4.5M12 17.25v2.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardLayout() {
  const { role } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole, setActiveRole, roles, dashboards, searchIndex, loading, error, refresh } = useDashboard();
  const allowedRoles = useMemo(() => roles.map((r) => r.id), [roles]);
  const resolvedRole = allowedRoles.length > 0 ? (allowedRoles.includes(role) ? role : allowedRoles[0]) : null;
  const basePath = resolvedRole ? `/dashboard/${resolvedRole}` : '/dashboard';

  useEffect(() => {
    if (resolvedRole && role && !allowedRoles.includes(role)) {
      navigate(basePath, { replace: true });
    }
  }, [role, allowedRoles, basePath, navigate, resolvedRole]);

  useEffect(() => {
    if (resolvedRole && resolvedRole !== activeRole) {
      setActiveRole(resolvedRole);
    }
  }, [resolvedRole, activeRole, setActiveRole]);

  const [searchQuery, setSearchQuery] = useState('');
  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return searchIndex
      .filter((item) => item.role === resolvedRole)
      .filter((item) => item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query));
  }, [searchQuery, searchIndex, resolvedRole]);

  const navigation = useMemo(() => {
    const builder = navigationByRole[resolvedRole];
    return builder ? builder(basePath) : [];
  }, [resolvedRole, basePath]);

  const currentDashboard = resolvedRole ? dashboards[resolvedRole] ?? null : null;
  const resolvedRoleMeta = resolvedRole ? roles.find((r) => r.id === resolvedRole) : null;

  let mainContent;
  if (loading && !currentDashboard) {
    mainContent = (
      <DashboardStateMessage
        variant="loading"
        title="Loading your dashboard"
        description="We are fetching the latest metrics, sessions, and community data."
      />
    );
  } else if (error) {
    mainContent = (
      <DashboardStateMessage
        variant="error"
        title="We couldn't load your dashboard"
        description={error.message ?? 'An unexpected error occurred while retrieving your data.'}
        actionLabel="Retry"
        onAction={() => refresh()}
      />
    );
  } else if (!resolvedRole) {
    mainContent = (
      <DashboardStateMessage
        title="No dashboards available"
        description="Your account is not associated with an active learner or instructor workspace yet."
      />
    );
  } else if (!currentDashboard) {
    mainContent = (
      <DashboardStateMessage
        title="Dashboard data unavailable"
        description="We couldn't find any configured data for this role yet. Configure sources and try again."
        actionLabel="Refresh"
        onAction={() => refresh()}
      />
    );
  } else {
    mainContent = <Outlet context={{ role: resolvedRole, dashboard: currentDashboard, refresh }} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <img
            src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
            alt="Edulure"
            className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-100"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Edulure</p>
            <p className="text-xs text-slate-500">Operational Command Center</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary-dark shadow-sm shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-5 w-5 text-slate-400 group-hover:text-primary" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <a
            href="/"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            <span>Return to site</span>
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
          </a>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search across your dashboard data"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </button>
                )}
                {filteredResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-14 z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search results</p>
                    <ul className="space-y-2">
                      {filteredResults.map((result) => (
                        <li key={result.id}>
                          <NavLink
                            to={result.url}
                            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/5 hover:text-primary-dark"
                            onClick={() => setSearchQuery('')}
                          >
                            <span className="font-semibold text-slate-900">{result.title}</span>
                            <span className="text-xs uppercase tracking-wide text-slate-500">{result.type}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                {roles.map((roleOption) => {
                  const target = `/dashboard/${roleOption.id}`;
                  const isActive = resolvedRole === roleOption.id;
                  return (
                    <NavLink
                      key={roleOption.id}
                      to={target}
                      className={`rounded-2xl px-4 py-2 transition ${
                        isActive ? 'bg-primary/10 text-primary-dark shadow-sm shadow-primary/20' : 'hover:bg-white hover:text-primary-dark'
                      }`}
                    >
                      {roleOption.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-wide text-slate-500">
              <span>
                {resolvedRoleMeta?.label ?? 'Dashboard'} dashboard ·{' '}
                {currentDashboard ? 'All systems green' : loading ? 'Syncing data' : 'Awaiting configuration'}
              </span>
              <span>
                Route ·
                {resolvedRole
                  ? location.pathname.replace(`/dashboard/${resolvedRole}`, '') || '/overview'
                  : ' /'}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-gradient-to-b from-slate-50 via-slate-50 to-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
            {mainContent}
          </div>
        </main>
      </div>
    </div>
  );
}
