import { Children, cloneElement, isValidElement, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const STATUS_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800'
};

export default function SettingsLayout({
  title,
  description,
  actions,
  status,
  onDismissStatus,
  preview,
  children
}) {
  const sectionChildren = useMemo(
    () =>
      Children.toArray(children).filter(
        (child) => isValidElement(child) && child.type?.displayName === 'SettingsLayoutSection'
      ),
    [children]
  );

  const navItems = useMemo(
    () =>
      sectionChildren
        .map((child) => child.props)
        .filter((props) => props.id && props.title)
        .map((props) => ({ id: props.id, title: props.title })),
    [sectionChildren]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Personalise Edulure</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </header>

      {status ? (
        <div
          className={clsx(
            'flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm',
            STATUS_STYLES[status.type] ?? STATUS_STYLES.info
          )}
        >
          <div className="flex-1">
            <p className="font-semibold">{status.message}</p>
            {status.detail ? <p className="text-xs opacity-90">{status.detail}</p> : null}
          </div>
          {onDismissStatus ? (
            <button
              type="button"
              onClick={onDismissStatus}
              className="inline-flex items-center justify-center rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-wide text-current transition hover:bg-white/20"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[15rem,1fr]">
        {navItems.length > 0 || preview ? (
          <aside className="space-y-6">
            {preview ? (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                {preview}
              </div>
            ) : null}
            {navItems.length > 0 ? (
              <nav aria-label="Settings sections" className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick jump</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="inline-flex w-full items-center justify-between rounded-2xl px-3 py-2 text-slate-600 transition hover:bg-primary/10 hover:text-primary"
                      >
                        <span>{item.title}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </aside>
        ) : null}
        <div className="space-y-6">
          {Children.map(children, (child) => {
            if (!isValidElement(child)) {
              return child;
            }
            if (child.type?.displayName === 'SettingsLayoutSection') {
              return child;
            }
            return cloneElement(child);
          })}
        </div>
      </div>
    </div>
  );
}

SettingsLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  status: PropTypes.shape({
    type: PropTypes.oneOf(['success', 'error', 'pending', 'info']),
    message: PropTypes.string.isRequired,
    detail: PropTypes.string
  }),
  onDismissStatus: PropTypes.func,
  preview: PropTypes.node,
  children: PropTypes.node.isRequired
};

SettingsLayout.defaultProps = {
  description: null,
  actions: null,
  status: null,
  onDismissStatus: null,
  preview: null
};

function Section({ id, title, description, icon: Icon, actions, badge, children, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {badge ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {badge}
            </span>
          ) : null}
          {actions}
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-primary hover:text-primary"
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {open ? <div className="mt-6 space-y-6">{children}</div> : null}
    </section>
  );
}

Section.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  actions: PropTypes.node,
  badge: PropTypes.node,
  children: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool
};

Section.defaultProps = {
  id: undefined,
  description: null,
  icon: null,
  actions: null,
  badge: null,
  defaultOpen: true
};

Section.displayName = 'SettingsLayoutSection';

SettingsLayout.Section = Section;
