import PropTypes from 'prop-types';
import { useMemo } from 'react';
import clsx from 'clsx';

function NavigationGroup({ group }) {
  if (!group || !group.items?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {group.title ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.title}</p> : null}
      <ul className="space-y-1">
        {group.items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex flex-col rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-primary/10 hover:text-primary"
            >
              <span>{item.label}</span>
              {item.helper ? <span className="text-xs font-normal text-slate-400">{item.helper}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

NavigationGroup.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        helper: PropTypes.string
      })
    )
  })
};

NavigationGroup.defaultProps = {
  group: null
};

function TaskList({ tasks }) {
  if (!tasks?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational tasks</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-2">
            <span
              className={clsx(
                'mt-1 inline-flex h-2.5 w-2.5 rounded-full',
                task.tone === 'danger'
                  ? 'bg-rose-500'
                  : task.tone === 'warning'
                    ? 'bg-amber-500'
                    : task.tone === 'success'
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
              )}
              aria-hidden="true"
            />
            <a href={task.href ?? '#'} className="flex-1 leading-tight hover:text-primary">
              {task.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

TaskList.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      tone: PropTypes.oneOf(['neutral', 'warning', 'danger', 'success'])
    })
  )
};

TaskList.defaultProps = {
  tasks: null
};

function HelperLinks({ links }) {
  if (!links?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations handbook</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="font-semibold text-primary transition hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
            {link.description ? <p className="text-xs text-slate-500">{link.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

HelperLinks.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  )
};

HelperLinks.defaultProps = {
  links: null
};

function StatusBadge({ badge }) {
  if (!badge?.label) {
    return null;
  }
  const tone = badge.tone ?? 'info';
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-700'
          : 'bg-sky-100 text-sky-700';

  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', toneClass)}>
      {badge.icon ? <span aria-hidden="true">{badge.icon}</span> : null}
      {badge.label}
    </span>
  );
}

StatusBadge.propTypes = {
  badge: PropTypes.shape({
    label: PropTypes.node,
    tone: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
    icon: PropTypes.node
  })
};

StatusBadge.defaultProps = {
  badge: null
};

export default function AdminShell({
  title,
  subtitle,
  meta,
  navigationGroups,
  actions,
  statusBadge,
  tasks,
  helperLinks,
  children
}) {
  const mobileNavItems = useMemo(
    () =>
      navigationGroups
        ?.flatMap((group) => group.items ?? [])
        .filter((item) => item && item.id && item.label) ?? [],
    [navigationGroups]
  );

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <aside className="hidden w-80 flex-col gap-6 border-r border-slate-200 bg-white/80 px-6 py-8 backdrop-blur lg:flex">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Edulure</p>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {statusBadge ? <StatusBadge badge={statusBadge} /> : null}
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          {meta?.generatedAt ? (
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Refreshed {meta.generatedAt}</p>
          ) : null}
        </div>
        <div className="space-y-6 overflow-y-auto pr-2">
          {navigationGroups?.map((group) => (
            <NavigationGroup key={group.id ?? group.title} group={group} />
          ))}
        </div>
        <TaskList tasks={tasks} />
        <HelperLinks links={helperLinks} />
      </aside>
      <section className="flex-1 py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <nav className="mb-6 flex gap-2 overflow-x-auto rounded-full border border-slate-200 bg-white/90 p-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm lg:hidden">
            {mobileNavItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-primary/10 hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
                {statusBadge ? <StatusBadge badge={statusBadge} /> : null}
              </div>
              {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
              {meta?.note ? <p className="text-xs text-slate-500">{meta.note}</p> : null}
            </div>
            {actions?.length ? (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => {
                  const tone = action.tone ?? 'secondary';
                  const classes =
                    tone === 'primary'
                      ? 'rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark'
                      : 'rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary';

                  if (action.href) {
                    return (
                      <a key={action.label} href={action.href} className={classes} target={action.target ?? '_self'} rel={action.rel ?? undefined}>
                        {action.label}
                      </a>
                    );
                  }

                  return (
                    <button key={action.label} type="button" onClick={action.onClick} className={classes}>
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </header>
          <div className="mt-8 flex flex-col gap-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

AdminShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  meta: PropTypes.shape({
    generatedAt: PropTypes.string,
    note: PropTypes.string
  }),
  navigationGroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          helper: PropTypes.string
        })
      )
    })
  ),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      href: PropTypes.string,
      tone: PropTypes.oneOf(['primary', 'secondary']),
      target: PropTypes.string,
      rel: PropTypes.string
    })
  ),
  statusBadge: PropTypes.shape({
    label: PropTypes.node,
    tone: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
    icon: PropTypes.node
  }),
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      tone: PropTypes.oneOf(['neutral', 'warning', 'danger', 'success'])
    })
  ),
  helperLinks: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ),
  children: PropTypes.node.isRequired
};

AdminShell.defaultProps = {
  subtitle: null,
  meta: null,
  navigationGroups: null,
  actions: null,
  statusBadge: null,
  tasks: null,
  helperLinks: null
};
