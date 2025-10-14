import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowLeftOnRectangleIcon,
  ArrowRightCircleIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const DASHBOARD_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  instructor: '/dashboard/instructor',
  learner: '/dashboard/learner',
  user: '/dashboard/learner',
  moderator: '/dashboard/admin'
};

export default function UserMenu({ session, onNavigate, onLogout }) {
  const user = session?.user ?? null;
  const avatarUrl = user?.avatarUrl;
  const role = (user?.role ?? 'learner').toLowerCase();
  const displayName = useMemo(() => {
    const firstName = user?.firstName?.trim();
    const lastName = user?.lastName?.trim();
    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }
    return user?.email ?? 'Your Learnspace';
  }, [user]);

  const email = user?.email ?? null;

  const initials = useMemo(() => {
    if (displayName) {
      const parts = displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .slice(0, 2)
        .join('');
      if (parts) {
        return parts;
      }
    }
    return 'ED';
  }, [displayName]);

  const dashboardPath = DASHBOARD_PATH_BY_ROLE[role] ?? '/dashboard/learner';
  const settingsPath = `${dashboardPath}/settings`;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </span>
        )}
        <span className="hidden flex-col sm:flex">
          <span className="text-sm font-semibold text-slate-900">{displayName}</span>
          {email ? <span className="text-xs text-slate-500">{email}</span> : null}
        </span>
        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-3xl border border-slate-200 bg-white/95 p-1 text-sm shadow-2xl backdrop-blur">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            {email ? <p className="text-xs text-slate-500">{email}</p> : null}
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Secure session active</p>
          </div>
          <div className="border-t border-slate-100" />
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={classNames(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-slate-700'
                  )}
                  onClick={() => onNavigate(dashboardPath)}
                >
                  <ArrowRightCircleIcon className="h-4 w-4" />
                  Workspace dashboard
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={classNames(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-slate-700'
                  )}
                  onClick={() => onNavigate('/profile')}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  View profile
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={classNames(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-slate-700'
                  )}
                  onClick={() => onNavigate(settingsPath)}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Settings
                </button>
              )}
            </Menu.Item>
          </div>
          <div className="border-t border-slate-100" />
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={classNames(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm font-semibold',
                    active ? 'bg-rose-50 text-rose-600' : 'text-rose-600'
                  )}
                  onClick={onLogout}
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                  Sign out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

UserMenu.propTypes = {
  session: PropTypes.shape({
    user: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      email: PropTypes.string,
      avatarUrl: PropTypes.string,
      role: PropTypes.string
    })
  }),
  onNavigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired
};

UserMenu.defaultProps = {
  session: null
};
