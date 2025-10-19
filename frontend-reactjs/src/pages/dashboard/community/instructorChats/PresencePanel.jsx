import PropTypes from 'prop-types';
import { ArrowPathIcon, SignalIcon } from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' }
];

export default function PresencePanel({
  presence,
  loading,
  error,
  onRefresh,
  formValue,
  onFormChange,
  onSubmit,
  interactive
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker text-slate-500">Presence</p>
          <h3 className="text-lg font-semibold text-slate-900">Roster health</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <p className="mt-2 text-xs text-slate-500">
        Track live facilitators and support staff. Update your status to broadcast availability to moderators and learners.
      </p>

      <div className="mt-4 space-y-3">
        {loading && presence.length === 0 ? (
          <p className="text-xs text-slate-500">Syncing live roster…</p>
        ) : error ? (
          <p className="text-xs text-rose-600">Unable to load presence. Refresh to retry.</p>
        ) : presence.length === 0 ? (
          <p className="text-xs text-slate-500">No live presence detected. Invite moderators or toggle availability.</p>
        ) : (
          <ul className="space-y-2">
            {presence.map((record) => (
              <li
                key={record.userId ?? record.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {(record.userId ?? 'Member').toString().slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">User {record.userId ?? 'unknown'}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Client: {record.client ?? 'web'}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[2px] text-emerald-600">
                    <SignalIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {record.status ?? 'online'}
                  </p>
                  {record.expiresAt ? <p className="mt-1">Expires {new Date(record.expiresAt).toLocaleTimeString()}</p> : null}
                  {record.metadata?.note ? <p className="mt-1 text-slate-500">{record.metadata.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Update your status</p>
        <label className="text-xs font-medium text-slate-500">
          Status
          <select
            value={formValue.status}
            onChange={(event) => onFormChange({ ...formValue, status: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Client
          <input
            type="text"
            value={formValue.client}
            onChange={(event) => onFormChange({ ...formValue, client: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          TTL minutes
          <input
            type="number"
            min={1}
            value={formValue.ttlMinutes}
            onChange={(event) => onFormChange({ ...formValue, ttlMinutes: Number(event.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Metadata (JSON)
          <input
            type="text"
            value={formValue.metadata}
            onChange={(event) => onFormChange({ ...formValue, metadata: event.target.value })}
            placeholder='{"note": "Office hours"}'
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          disabled={!interactive}
        >
          Update presence
        </button>
        {!interactive ? (
          <p className="text-[11px] text-slate-400">Connect your instructor session to publish status updates.</p>
        ) : null}
      </form>
    </section>
  );
}

PresencePanel.propTypes = {
  presence: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  onRefresh: PropTypes.func.isRequired,
  formValue: PropTypes.shape({
    status: PropTypes.string,
    client: PropTypes.string,
    ttlMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    metadata: PropTypes.string
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  interactive: PropTypes.bool.isRequired
};

PresencePanel.defaultProps = {
  error: null
};
