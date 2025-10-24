import { useMemo } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const STATUS_STYLES = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  pending: 'border-primary/30 bg-primary/5 text-primary'
};

export default function SettingsLayout({
  eyebrow,
  title,
  description,
  actions,
  status,
  afterHeader,
  children,
  breadcrumbs,
  lastSavedAt
}) {
  const statusClassName = useMemo(() => {
    if (!status) return null;
    return STATUS_STYLES[status.type] ?? STATUS_STYLES.info;
  }, [status]);

  const formattedLastSaved = useMemo(() => {
    if (!lastSavedAt) return null;
    const date = lastSavedAt instanceof Date ? lastSavedAt : new Date(lastSavedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }, [lastSavedAt]);

  return (
    <div className="flex flex-col gap-6">
      {breadcrumbs?.length ? (
        <nav aria-label="Settings breadcrumbs">
          <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.href ?? crumb.label} className="flex items-center gap-2">
                  {crumb.href && !isLast ? (
                    <a href={crumb.href} className="text-primary hover:underline">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={isLast ? 'text-slate-500' : undefined}>{crumb.label}</span>
                  )}
                  {!isLast ? <span aria-hidden="true">/</span> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-right lg:items-end">
          {formattedLastSaved ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last saved {formattedLastSaved}</p>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>
      </header>

      {status ? (
        <div
          className={clsx('rounded-2xl border p-4 text-sm shadow-sm transition', statusClassName)}
          role={status.role ?? 'status'}
          aria-live={status.liveRegion ?? 'polite'}
        >
          {status.message}
        </div>
      ) : null}

      {afterHeader ?? null}

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

SettingsLayout.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  status: PropTypes.shape({
    type: PropTypes.oneOf(['info', 'success', 'warning', 'error', 'pending']),
    message: PropTypes.node.isRequired,
    role: PropTypes.oneOf(['status', 'alert']),
    liveRegion: PropTypes.oneOf(['polite', 'assertive'])
  }),
  afterHeader: PropTypes.node,
  children: PropTypes.node.isRequired,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string
    })
  ),
  lastSavedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
};

SettingsLayout.defaultProps = {
  eyebrow: undefined,
  description: undefined,
  actions: undefined,
  status: undefined,
  afterHeader: undefined,
  breadcrumbs: undefined,
  lastSavedAt: undefined
};
