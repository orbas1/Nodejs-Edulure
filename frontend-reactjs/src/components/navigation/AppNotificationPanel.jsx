import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { NOTIFICATION_GROUPS } from '../../navigation/routes.js';
import { useNavigationMetadata } from '../../context/NavigationMetadataContext.jsx';

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
  const { operationsChecklist, designDependencies, strategyNarratives, productBacklog } = useNavigationMetadata();

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
                <div className="space-y-8 border-t border-slate-100 px-6 py-6">
                  <section aria-labelledby="operational-readiness">
                    <div className="flex items-center justify-between">
                      <h2
                        id="operational-readiness"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Operational readiness
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Annex A54
                      </span>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {operationsChecklist.length === 0 ? (
                        <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
                          No outstanding operational tasks for this role.
                        </li>
                      ) : null}
                      {operationsChecklist.map((task) => (
                        <li
                          key={task.id}
                          className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              Cadence: {task.cadence}
                            </p>
                          </div>
                          {task.href ? (
                            <a
                              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
                              href={task.href}
                              onClick={(event) => {
                                if (onNavigate) {
                                  event.preventDefault();
                                  onNavigate(task.href);
                                }
                              }}
                            >
                              View runbook
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section aria-labelledby="design-dependencies">
                    <div className="flex items-center justify-between">
                      <h2
                        id="design-dependencies"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Design system dependencies
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Annex A55
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {designDependencies.tokens.map((token) => (
                          <code
                            key={token}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
                          >
                            {token}
                          </code>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          QA steps
                        </h3>
                        <ul className="mt-2 space-y-2 text-xs text-slate-500">
                          {designDependencies.qa.map((item) => (
                            <li key={item.id} className="leading-snug">
                              {item.label}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400">
                          References: {designDependencies.references.join(', ')}
                        </p>
                      </div>
                    </div>
                  </section>
                  <section aria-labelledby="strategy-briefing">
                    <div className="flex items-center justify-between">
                      <h2 id="strategy-briefing" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stakeholder briefing
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Annex A56
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {strategyNarratives.map((pillar) => (
                        <article key={pillar.pillar} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                          <header className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{pillar.pillar}</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                                {pillar.narratives.map((narrative, index) => (
                                  <li key={`${pillar.pillar}-${index}`} className="leading-snug">
                                    {narrative}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                              Strategy
                            </span>
                          </header>
                          <ul className="mt-3 space-y-1 text-[11px] uppercase tracking-wide text-slate-400">
                            {pillar.metrics.map((metric) => (
                              <li key={metric.id} className="flex items-center justify-between gap-3 text-slate-500">
                                <span className="font-semibold text-slate-600">{metric.label}</span>
                                <span>
                                  {metric.baseline} → {metric.target} {metric.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section aria-labelledby="product-backlog">
                    <div className="flex items-center justify-between">
                      <h2 id="product-backlog" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Product backlog alignment
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Annex A53
                      </span>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {productBacklog.map((epic) => (
                        <li key={epic.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-900">{epic.id}</p>
                          <p className="mt-1 text-xs text-slate-500">{epic.summary}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {epic.impactedFiles.map((file) => (
                              <span key={file} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                {file}
                              </span>
                            ))}
                          </div>
                          {epic.backlogRef ? (
                            <div className="mt-3">
                              <a
                                href={epic.backlogRef}
                                onClick={(event) => {
                                  if (onNavigate) {
                                    event.preventDefault();
                                    onNavigate(epic.backlogRef);
                                  }
                                }}
                                className="text-xs font-semibold text-primary transition hover:text-primary/80"
                              >
                                View execution plan
                              </a>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
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

