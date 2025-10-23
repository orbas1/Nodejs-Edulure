import clsx from 'clsx';

const severityTone = {
  critical: 'border-rose-300 bg-rose-50 text-rose-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  notice: 'border-sky-200 bg-sky-50 text-sky-700',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return timeFormatter.format(date);
}

function SeverityPill({ severity }) {
  const tone = severityTone[severity] ?? severityTone.info;
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize', tone)}>
      {severity}
    </span>
  );
}

export default function AdminAuditLogPanel({
  events = [],
  loading = false,
  onRefresh,
  analytics,
  featureFlags
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Unified audit trail</h2>
          <p className="mt-1 text-xs text-slate-500">
            Compliance, operations, and identity events in a single, high-contrast view.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {analytics?.totals ? (
            <p className="text-xs font-semibold text-slate-500">
              {analytics.totals.events ?? 0} events · {analytics.countsBySeverity?.warning ?? 0} warnings ·{' '}
              {analytics.countsBySeverity?.error ?? 0} errors
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh insights'}
          </button>
        </div>
      </header>

      {featureFlags?.summary ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">
            Feature flags · {featureFlags.summary.enabled} enabled / {featureFlags.summary.overridden} overridden
          </p>
          <p className="mt-1">Snapshot generated {formatTimestamp(featureFlags.generatedAt)}.</p>
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          No recent audit events. When new activities occur they will appear here automatically.
        </p>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTimestamp(event.occurredAt)} · {event.source}
                    {event.actor?.name ? ` · ${event.actor.name}` : event.actor?.email ? ` · ${event.actor.email}` : ''}
                  </p>
                </div>
                <SeverityPill severity={event.severity} />
              </div>
              {event.summary ? <p className="mt-3 text-sm text-slate-600">{event.summary}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

