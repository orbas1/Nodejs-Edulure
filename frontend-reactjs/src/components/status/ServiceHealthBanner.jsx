import PropTypes from 'prop-types';
import { InformationCircleIcon, SignalIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

import { useServiceHealth } from '../../context/ServiceHealthContext.jsx';
import SkeletonPanel from '../loaders/SkeletonPanel.jsx';

const LEVEL_CONFIG = {
  critical: {
    container: 'bg-rose-50 border-rose-200 text-rose-900',
    badge: 'bg-rose-100 text-rose-700',
    icon: ExclamationTriangleIcon
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
    icon: SignalIcon
  },
  info: {
    container: 'bg-sky-50 border-sky-200 text-sky-900',
    badge: 'bg-sky-100 text-sky-700',
    icon: InformationCircleIcon
  }
};

function formatRelativeTime(value) {
  if (!value) {
    return 'just now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60000) {
    return 'just now';
  }
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function ServiceHealthBanner({ maxAlerts = 3 }) {
  const { alerts, lastUpdated, loading, refresh, error } = useServiceHealth();

  if (loading && !alerts.length) {
    return (
      <section className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <SkeletonPanel lines={3} streaming ariaLabel="Loading service health updates" />
        </div>
      </section>
    );
  }

  if (!alerts.length) {
    if (error) {
      return (
        <section className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-slate-600">
            <span>Unable to load runtime health at the moment.</span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon className={clsx('h-4 w-4', loading ? 'animate-spin' : '')} aria-hidden="true" />
              Retry
            </button>
          </div>
        </section>
      );
    }
    return null;
  }

  const displayedAlerts = alerts.slice(0, maxAlerts);

  return (
    <section className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4">
        {displayedAlerts.map((alert) => {
          const config = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.info;
          const Icon = config.icon;
          return (
            <div
              key={alert.id}
              className={clsx(
                'rounded-2xl border px-4 py-3 shadow-sm transition-shadow',
                config.container,
                'focus-within:ring-2 focus-within:ring-primary/40'
              )}
              role={alert.level === 'critical' ? 'alert' : 'status'}
              aria-live={alert.level === 'critical' ? 'assertive' : 'polite'}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', config.badge)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{alert.type === 'service' ? 'Service' : 'Capability'}</span>
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold tracking-tight">{alert.title}</p>
                  <p className="text-sm leading-relaxed">{alert.message}</p>
                  {alert.affectedCapabilities?.length ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      Impacted:{' '}
                      <span className="font-semibold text-slate-800">
                        {alert.affectedCapabilities.join(', ')}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Last checked {formatRelativeTime(lastUpdated)}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            <ArrowPathIcon className={clsx('h-4 w-4', loading ? 'animate-spin' : '')} aria-hidden="true" />
            {loading ? 'Refreshing…' : 'Refresh status'}
          </button>
        </div>
      </div>
    </section>
  );
}

ServiceHealthBanner.propTypes = {
  maxAlerts: PropTypes.number
};
