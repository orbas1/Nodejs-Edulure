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
  children
}) {
  const statusClassName = useMemo(() => {
    if (!status) return null;
    return STATUS_STYLES[status.type] ?? STATUS_STYLES.info;
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
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
  children: PropTypes.node.isRequired
};

SettingsLayout.defaultProps = {
  eyebrow: undefined,
  description: undefined,
  actions: undefined,
  status: undefined,
  afterHeader: undefined
};
