import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { NOTIFICATION_GROUPS } from '../../navigation/routes.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function AppNotificationPanel({
  open,
  onClose,
  notifications,
  groups,
  preferences,
  onUpdatePreference,
  onNavigate
}) {
  const notificationGroups = groups && groups.length ? groups : NOTIFICATION_GROUPS;
  const notificationsByGroup = useMemo(() => {
    return notificationGroups.map((group) => ({
      group,
      items: notifications.filter((notification) => notification.groupId === group.id)
    }));
  }, [notificationGroups, notifications]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-end p-4 sm:items-start sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">Notifications</Dialog.Title>
                    <p className="mt-1 text-sm text-slate-500">
                      Stay informed across courses, communities, and monetisation workflows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-8 px-6 py-5 sm:grid-cols-2">
                  <section aria-labelledby="notifications-list">
                    <h2 id="notifications-list" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Latest updates
                    </h2>
                    <div className="mt-3 space-y-3">
                      {notifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
                          <CheckCircleIcon className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-3 text-sm font-medium text-slate-600">All caught up</p>
                          <p className="mt-1 text-xs text-slate-500">
                            New notifications will appear here as your cohorts take action.
                          </p>
                        </div>
                      ) : null}
                      {notifications.map((notification) => (
                        <article
                          key={notification.id}
                          className={classNames(
                            'relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md',
                            notification.unread ? 'ring-2 ring-primary/60' : ''
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{notification.summary}</p>
                            </div>
                            {notification.type === 'warning' ? (
                              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                            ) : null}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span>{notification.timestamp}</span>
                            {notification.href ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onNavigate?.(notification.href);
                                  onClose();
                                }}
                                className="font-semibold text-primary transition hover:text-primary/80"
                              >
                                View
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section aria-labelledby="notification-preferences">
                    <h2 id="notification-preferences" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preferences
                    </h2>
                    <div className="mt-3 space-y-3">
                      {notificationsByGroup.map(({ group, items }) => {
                        const enabled = preferences[group.id] ?? true;
                        return (
                          <div
                            key={group.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                                <p className="mt-1 text-xs text-slate-500">{group.description}</p>
                              </div>
                              <Switch
                                checked={enabled}
                                onChange={(value) => onUpdatePreference?.(group.id, value)}
                                className={classNames(
                                  enabled ? 'bg-primary' : 'bg-slate-200',
                                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={classNames(
                                    enabled ? 'translate-x-5' : 'translate-x-1',
                                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition'
                                  )}
                                />
                              </Switch>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {items.length === 0
                                ? 'No unread updates in this group.'
                                : `${items.length} update${items.length === 1 ? '' : 's'} awaiting review.`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

AppNotificationPanel.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      summary: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      groupId: PropTypes.string.isRequired,
      unread: PropTypes.bool,
      type: PropTypes.oneOf(['default', 'warning']),
      href: PropTypes.string
    })
  ),
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ),
  preferences: PropTypes.object,
  onUpdatePreference: PropTypes.func,
  onNavigate: PropTypes.func
};

AppNotificationPanel.defaultProps = {
  notifications: [],
  groups: null,
  preferences: {},
  onUpdatePreference: null,
  onNavigate: null
};

