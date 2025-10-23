import clsx from 'clsx';

import AdminAuditLogPanel from '../components/dashboard/admin/AdminAuditLogPanel.jsx';
import AdminQuickLinks from '../components/dashboard/admin/AdminQuickLinks.jsx';

function StatusSummaryCard({ title, value, helper, tone = 'neutral' }) {
  const toneClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700'
  }[tone] ?? 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <article className={clsx('flex flex-col gap-2 rounded-2xl border p-4 shadow-sm', toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-current/80">{title}</p>
      <p className="text-2xl font-semibold text-current">{value}</p>
      {helper ? <p className="text-xs text-current/70">{helper}</p> : null}
    </article>
  );
}

function NavigationPills({ items = [], active, onNavigate }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate?.(item.id)}
          className={clsx(
            'rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            active === item.id
              ? 'border-primary bg-primary text-white shadow'
              : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
          )}
          aria-current={active === item.id ? 'page' : undefined}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default function AdminShell({
  title,
  description,
  navigation = [],
  activeNavigation,
  onNavigate,
  actions = [],
  statusBlocks = [],
  alerts = [],
  quickLinks = [],
  auditTrail = [],
  auditLoading = false,
  onRefreshInsights,
  analytics,
  featureFlags,
  children
}) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
            {alerts.length ? (
              <ul className="mt-2 space-y-2">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className={clsx(
                      'rounded-2xl border px-4 py-3 text-sm',
                      alert.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : alert.tone === 'danger'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-sky-200 bg-sky-50 text-sky-800'
                    )}
                  >
                    <p className="font-semibold">{alert.title}</p>
                    {alert.description ? <p className="text-xs text-current/80">{alert.description}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  action.variant === 'primary'
                    ? 'border-primary bg-primary text-white shadow hover:bg-primary/90'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                )}
              >
                {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <NavigationPills items={navigation} active={activeNavigation} onNavigate={onNavigate} />
      </header>

      {statusBlocks.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statusBlocks.map((block) => (
            <StatusSummaryCard
              key={block.id ?? block.title}
              title={block.title}
              value={block.value}
              helper={block.helper}
              tone={block.tone}
            />
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <main className="space-y-6">{children}</main>
        <aside className="space-y-6">
          <AdminQuickLinks items={quickLinks} />
          <AdminAuditLogPanel
            events={auditTrail}
            loading={auditLoading}
            onRefresh={onRefreshInsights}
            analytics={analytics}
            featureFlags={featureFlags}
          />
        </aside>
      </div>
    </div>
  );
}

