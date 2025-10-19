import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  Bars3Icon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  IdentificationIcon,
  InboxStackIcon,
  MapIcon,
  MegaphoneIcon,
  PuzzlePieceIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import DashboardNavigation from '../components/dashboard/DashboardNavigation.jsx';
import UserMenu from '../components/navigation/UserMenu.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';
import { useServiceHealth } from '../context/ServiceHealthContext.jsx';
import {
  generateCourseOutline,
  importFromNotion,
  syncFromLms,
  routeTutorRequest,
  sendMentorInvite,
  exportPricing
} from '../api/instructorOrchestrationApi.js';

const navigationByRole = {
  learner: (basePath) => [
    { type: 'link', id: 'learner-overview', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'learner-social',
      name: 'Social',
      icon: UserGroupIcon,
      children: [
        { id: 'learner-communities', name: 'Communities', to: `${basePath}/communities`, icon: UserGroupIcon },
        { id: 'learner-inbox', name: 'Inbox', to: `${basePath}/inbox`, icon: InboxStackIcon }
      ]
    },
    {
      type: 'section',
      id: 'learner-study',
      name: 'Study',
      icon: AcademicCapIcon,
      children: [
        { id: 'learner-courses', name: 'Courses', to: `${basePath}/courses`, icon: PlayCircleIcon },
        { id: 'learner-assessments', name: 'Assess', to: `${basePath}/assessments`, icon: AcademicCapIcon },
        { id: 'learner-live', name: 'Live', to: `${basePath}/live-classes`, icon: VideoCameraIcon },
        { id: 'learner-calendar', name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon }
      ]
    },
    {
      type: 'section',
      id: 'learner-support',
      name: 'Support',
      icon: UsersIcon,
      children: [
        { id: 'learner-bookings', name: 'Bookings', to: `${basePath}/bookings`, icon: UsersIcon },
        { id: 'learner-field', name: 'Field', to: `${basePath}/field-services`, icon: MapIcon },
        { id: 'learner-ebooks', name: 'Ebooks', to: `${basePath}/ebooks`, icon: BookOpenIcon },
        { id: 'learner-financial', name: 'Finance', to: `${basePath}/financial`, icon: ChartBarIcon }
      ]
    },
    {
      type: 'section',
      id: 'learner-growth',
      name: 'Growth',
      icon: SparklesIcon,
      children: [
        { id: 'learner-affiliate', name: 'Affiliate', to: `${basePath}/affiliate`, icon: UserPlusIcon },
        { id: 'learner-settings', name: 'Settings', to: `${basePath}/settings`, icon: Cog6ToothIcon },
        { id: 'learner-teach', name: 'Teach', to: `${basePath}/become-instructor`, icon: ArrowTopRightOnSquareIcon }
      ]
    }
  ],
  instructor: (basePath) => [
    { type: 'link', id: 'instructor-overview', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'instructor-create',
      name: 'Create',
      icon: SparklesIcon,
      children: [
        { id: 'instructor-studio', name: 'Studio', to: `${basePath}/creation-studio`, icon: SparklesIcon },
        { id: 'instructor-course-build', name: 'Course', to: `${basePath}/courses/create`, icon: DocumentTextIcon },
        { id: 'instructor-library', name: 'Library', to: `${basePath}/courses/library`, icon: PlayCircleIcon },
        { id: 'instructor-ebooks', name: 'Ebooks', to: `${basePath}/ebooks`, icon: BookOpenIcon },
        { id: 'instructor-writer', name: 'Writer', to: `${basePath}/ebooks/create`, icon: DocumentTextIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-teach',
      name: 'Teach',
      icon: AcademicCapIcon,
      children: [
        { id: 'instructor-manage', name: 'Manage', to: `${basePath}/courses/manage`, icon: Cog6ToothIcon },
        { id: 'instructor-assess', name: 'Assess', to: `${basePath}/assessments`, icon: AcademicCapIcon },
        { id: 'instructor-schedule', name: 'Schedule', to: `${basePath}/lesson-schedule`, icon: CalendarDaysIcon },
        { id: 'instructor-live', name: 'Live', to: `${basePath}/live-classes`, icon: VideoCameraIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-clients',
      name: 'Clients',
      icon: UsersIcon,
      children: [
        { id: 'instructor-inbox', name: 'Inbox', to: `${basePath}/inbox`, icon: InboxStackIcon },
        { id: 'instructor-bookings', name: 'Bookings', to: `${basePath}/bookings`, icon: UsersIcon },
        { id: 'instructor-tutor', name: 'Tutor', to: `${basePath}/tutor-management`, icon: IdentificationIcon },
        { id: 'instructor-roster', name: 'Roster', to: `${basePath}/tutor-schedule`, icon: CalendarDaysIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-services',
      name: 'Services',
      icon: BriefcaseIcon,
      children: [
        { id: 'instructor-field', name: 'Field', to: `${basePath}/field-services`, icon: MapIcon },
        { id: 'instructor-suite', name: 'Suite', to: `${basePath}/services`, icon: BriefcaseIcon },
        { id: 'instructor-projects', name: 'Projects', to: `${basePath}/projects`, icon: ClipboardDocumentListIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-community',
      name: 'Community',
      icon: UserGroupIcon,
      children: [
        { id: 'instructor-launch', name: 'Launch', to: `${basePath}/communities/create`, icon: UserGroupIcon },
        { id: 'instructor-manage-communities', name: 'Manage', to: `${basePath}/communities/manage`, icon: Cog6ToothIcon },
        { id: 'instructor-webinars', name: 'Webinars', to: `${basePath}/communities/webinars`, icon: VideoCameraIcon },
        { id: 'instructor-podcasts', name: 'Podcasts', to: `${basePath}/communities/podcasts`, icon: MicrophoneIcon }
      ]
    },
    {
      type: 'section',
      id: 'instructor-growth',
      name: 'Growth',
      icon: ChartBarIcon,
      children: [
        { id: 'instructor-pricing', name: 'Pricing', to: `${basePath}/pricing`, icon: BanknotesIcon },
        { id: 'instructor-affiliate', name: 'Affiliate', to: `${basePath}/affiliate`, icon: UserPlusIcon },
        { id: 'instructor-ads', name: 'Ads', to: `${basePath}/ads`, icon: MegaphoneIcon },
        { id: 'instructor-calendar', name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon }
      ]
    }
  ],
  admin: (basePath) => [
    { type: 'link', id: 'admin-overview', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'admin-control',
      name: 'Control',
      icon: ShieldCheckIcon,
      children: [
        { id: 'admin-command', name: 'Command', to: `${basePath}/operator`, icon: ShieldExclamationIcon },
        { id: 'admin-integrations', name: 'Integrations', to: `${basePath}/integrations`, icon: PuzzlePieceIcon },
        { id: 'admin-governance', name: 'Governance', to: `${basePath}/governance`, icon: ShieldCheckIcon }
      ]
    },
    {
      type: 'section',
      id: 'admin-network',
      name: 'Network',
      icon: UserGroupIcon,
      children: [
        { id: 'admin-communities', name: 'Communities', to: `${basePath}/communities`, icon: UserGroupIcon },
        { id: 'admin-inbox', name: 'Inbox', to: `${basePath}/inbox`, icon: InboxStackIcon }
      ]
    },
    {
      type: 'section',
      id: 'admin-catalogue',
      name: 'Catalog',
      icon: PlayCircleIcon,
      children: [
        { id: 'admin-courses', name: 'Courses', to: `${basePath}/courses`, icon: PlayCircleIcon },
        { id: 'admin-ebooks', name: 'Ebooks', to: `${basePath}/ebooks`, icon: BookOpenIcon },
        { id: 'admin-calendar', name: 'Calendar', to: `${basePath}/calendar`, icon: CalendarDaysIcon },
        { id: 'admin-bookings', name: 'Bookings', to: `${basePath}/bookings`, icon: UsersIcon }
      ]
    },
    {
      type: 'section',
      id: 'admin-finance',
      name: 'Finance',
      icon: BanknotesIcon,
      children: [
        { id: 'admin-finance-centre', name: 'Finance centre', to: `${basePath}/finance`, icon: BanknotesIcon },
        { id: 'admin-ads', name: 'Ads', to: `${basePath}/ads`, icon: MegaphoneIcon }
      ]
    },
    {
      type: 'section',
      id: 'admin-support',
      name: 'Support & comms',
      icon: InboxStackIcon,
      children: [
        { id: 'admin-support-hub', name: 'Support hub', to: `${basePath}/support`, icon: InboxStackIcon }
      ]
    }
  ],
  community: (basePath) => [
    { type: 'link', id: 'community-overview', name: 'Overview', to: basePath, icon: Squares2X2Icon, end: true },
    {
      type: 'section',
      id: 'community-manage',
      name: 'Manage',
      icon: Cog6ToothIcon,
      children: [
        { id: 'community-operations', name: 'Ops', to: `${basePath}/operations`, icon: Cog6ToothIcon },
        { id: 'community-programming', name: 'Plan', to: `${basePath}/programming`, icon: CalendarDaysIcon },
        { id: 'community-revenue', name: 'Revenue', to: `${basePath}/monetisation`, icon: BanknotesIcon },
        { id: 'community-safety', name: 'Safety', to: `${basePath}/safety`, icon: ShieldCheckIcon },
        { id: 'community-broadcast', name: 'Broadcast', to: `${basePath}/communications`, icon: MegaphoneIcon }
      ]
    }
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
  const { session, logout } = useAuth();
  const { activeRole, setActiveRole, roles, dashboards, searchIndex, loading, error, refresh } = useDashboard();
  const { alerts, manifest } = useServiceHealth();
  const token = session?.tokens?.accessToken;

  const allowedRoles = useMemo(() => roles.map((r) => r.id), [roles]);
  const resolvedRole = useMemo(() => {
    if (allowedRoles.length === 0) {
      return null;
    }
    if (role && allowedRoles.includes(role)) {
      return role;
    }
    return allowedRoles[0];
  }, [allowedRoles, role]);

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleRoleSelect = useCallback(
    (event) => {
      const targetRole = event.target.value;
      if (targetRole && targetRole !== resolvedRole) {
        navigate(`/dashboard/${targetRole}`);
      }
    },
    [navigate, resolvedRole]
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, resolvedRole]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return searchIndex
      .filter((item) => item.role === resolvedRole)
      .filter((item) => item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query));
  }, [searchQuery, searchIndex, resolvedRole]);

  const healthHeadline = useMemo(() => {
    if (!manifest) {
      return { label: 'Checking platform health', tone: 'neutral' };
    }
    if (alerts.some((alert) => alert.level === 'critical')) {
      return { label: 'Service interruption in progress', tone: 'critical' };
    }
    if (alerts.some((alert) => alert.level === 'warning')) {
      return { label: 'Some services degraded', tone: 'warning' };
    }
    if (alerts.some((alert) => alert.level === 'info')) {
      return { label: 'Capability updates active', tone: 'info' };
    }
    return { label: 'All systems operational', tone: 'success' };
  }, [alerts, manifest]);

  const healthToneClass = useMemo(() => {
    switch (healthHeadline.tone) {
      case 'critical':
        return 'text-rose-600';
      case 'warning':
        return 'text-amber-600';
      case 'info':
        return 'text-sky-600';
      case 'success':
        return 'text-emerald-600';
      default:
        return 'text-slate-500';
    }
  }, [healthHeadline.tone]);

  const navigation = useMemo(() => {
    const builder = resolvedRole ? navigationByRole[resolvedRole] : null;
    return builder ? builder(basePath) : [];
  }, [resolvedRole, basePath]);

  const instructorOrchestration = useMemo(() => {
    const unauthenticated = () =>
      Promise.reject(new Error('Authentication required to perform this action.'));
    if (!token) {
      return {
        generateCourseOutline: unauthenticated,
        importFromNotion: unauthenticated,
        syncFromLms: unauthenticated,
        routeTutorRequest: unauthenticated,
        inviteMentor: unauthenticated,
        exportPricing: unauthenticated
      };
    }
    return {
      generateCourseOutline: (payload) => generateCourseOutline({ token, payload }),
      importFromNotion: (payload) => importFromNotion({ token, payload }),
      syncFromLms: (payload) => syncFromLms({ token, payload }),
      routeTutorRequest: (payload) => routeTutorRequest({ token, payload }),
      inviteMentor: (payload) => sendMentorInvite({ token, payload }),
      exportPricing: (payload) => exportPricing({ token, payload })
    };
  }, [token]);

  const breadcrumbs = useMemo(() => {
    if (!resolvedRole) {
      return [];
    }
    const roleBasePath = `/dashboard/${resolvedRole}`;
    const relativePath = location.pathname.startsWith(roleBasePath)
      ? location.pathname.slice(roleBasePath.length)
      : location.pathname;
    const segments = relativePath.split('/').filter(Boolean);
    const crumbs = [
      {
        label: 'Overview',
        to: roleBasePath,
        isCurrent: segments.length === 0
      }
    ];

    let accumulator = roleBasePath;
    segments.forEach((segment, index) => {
      accumulator += `/${segment}`;
      const label = segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      crumbs.push({
        label,
        to: accumulator,
        isCurrent: index === segments.length - 1
      });
    });

    return crumbs;
  }, [location.pathname, resolvedRole]);

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
        description="Your account is not associated with an active learner or instructor Learnspace yet."
      />
    );
  } else if (!currentDashboard && resolvedRole !== 'admin') {
    mainContent = (
      <DashboardStateMessage
        title="Dashboard data unavailable"
        description="We couldn't find any configured data for this role yet. Configure sources and try again."
        actionLabel="Refresh"
        onAction={() => refresh()}
      />
    );
  } else {
    mainContent = (
      <Outlet
        context={{
          role: resolvedRole,
          dashboard: currentDashboard,
          refresh,
          instructorOrchestration
        }}
      />
    );
  }

  return (
    <div className="dashboard-shell flex">
      <aside className="dashboard-aside">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <Link to="/" className="inline-flex items-center" aria-label="Edulure home">
            <img src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png" alt="Edulure" className="h-9 w-auto" />
          </Link>
        </div>
        <DashboardNavigation navigation={navigation} />
        <div className="border-t border-slate-200 p-4">
          <a
            href="/"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <span>Return to site</span>
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
          </a>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {resolvedRoleMeta?.label ?? 'Dashboard'}
                </p>
                <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600" aria-label="Breadcrumb">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={crumb.to} className="flex items-center gap-2">
                      {index > 0 && <ChevronRightIcon className="h-4 w-4 text-slate-300" aria-hidden="true" />}
                      {crumb.isCurrent ? (
                        <span className="text-primary">{crumb.label}</span>
                      ) : (
                        <NavLink to={crumb.to} className="hover:text-primary">
                          {crumb.label}
                        </NavLink>
                      )}
                    </span>
                  ))}
                </nav>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                {roles.length > 0 && (
                  <div className="lg:hidden">
                    <label htmlFor="dashboard-role" className="sr-only">
                      Switch dashboard role
                    </label>
                    <select
                      id="dashboard-role"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={resolvedRole ?? ''}
                      onChange={handleRoleSelect}
                    >
                      {roles.map((roleOption) => (
                        <option key={roleOption.id} value={roleOption.id}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {roles.length > 0 && (
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500 shadow-sm lg:flex">
                    {roles.map((roleOption) => {
                      const target = `/dashboard/${roleOption.id}`;
                      const isActive = resolvedRole === roleOption.id;
                      return (
                        <NavLink
                          key={roleOption.id}
                          to={target}
                          className={`rounded-full px-4 py-1.5 transition ${
                            isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                          }`}
                        >
                          {roleOption.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  <UserMenu session={session} onNavigate={navigate} onLogout={logout} />
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
                    onClick={() => setMobileNavOpen((open) => !open)}
                    aria-expanded={mobileNavOpen}
                    aria-controls="dashboard-mobile-nav"
                  >
                    <Bars3Icon className="h-5 w-5" />
                    Menu
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)] lg:items-start">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search across dashboards"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-primary"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </button>
                )}
                {filteredResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-14 z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search results</p>
                    <ul className="space-y-2">
                      {filteredResults.map((result) => (
                        <li key={result.id}>
                          <NavLink
                            to={result.url}
                            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            onClick={() => setSearchQuery('')}
                          >
                            <span className="font-semibold text-slate-800">{result.title}</span>
                            <span className="text-xs uppercase tracking-wide text-slate-500">{result.type}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <p className={`mt-1 text-sm font-semibold ${healthToneClass}`}>{healthHeadline.label}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {manifest
                      ? 'Monitoring live services and automations for your workspace.'
                      : 'Synchronising your workspace health.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => refresh()}
                >
                  Refresh data
                </button>
              </div>
            </div>
          </div>
        </header>
        <ServiceHealthBanner maxAlerts={4} />
        <main className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">{mainContent}</div>
        </main>
      </div>
      <div
        className={`${mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 lg:hidden`}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />
      <nav
        id="dashboard-mobile-nav"
        className={`${mobileNavOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden`}
        aria-label="Dashboard navigation"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link to="/" className="inline-flex items-center" onClick={() => setMobileNavOpen(false)}>
            <img src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png" alt="Edulure" className="h-8 w-auto" />
          </Link>
          <button
            type="button"
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setMobileNavOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <DashboardNavigation navigation={navigation} onNavigate={() => setMobileNavOpen(false)} />
      </nav>
    </div>
  );
}
