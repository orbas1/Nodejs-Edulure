import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { ensureArray, ensureString } from '../utils.js';
import useSetupProgress from '../../../hooks/useSetupProgress.js';

function normaliseEntries(entries) {
  return ensureArray(entries).map((entry, index) => ({
    label: ensureString(entry?.label, `Entry ${index + 1}`),
    value: ensureString(entry?.value, '—')
  }));
}

function StatList({ title, emptyLabel, entries }) {
  const resolvedEntries = useMemo(() => normaliseEntries(entries), [entries]);

  return (
    <div className="dashboard-section">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {resolvedEntries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            {emptyLabel}
          </li>
        ) : (
          resolvedEntries.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span>{entry.label}</span>
              <span className="font-semibold text-slate-900">{entry.value}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

StatList.propTypes = {
  title: PropTypes.string.isRequired,
  emptyLabel: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired
};

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

function resolveConnectionBadge(state) {
  switch (state) {
    case 'streaming':
      return { label: 'Live', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    case 'polling':
      return { label: 'Polling', className: 'border-amber-300 bg-amber-50 text-amber-700' };
    case 'error':
      return { label: 'Disconnected', className: 'border-rose-300 bg-rose-50 text-rose-700' };
    default:
      return { label: 'Idle', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  }
}

function SetupStatusCard({ state, connectionState, error, history, onLoadHistory }) {
  const badge = resolveConnectionBadge(connectionState);
  const status = state?.status ?? 'idle';
  const activePreset = state?.activePreset ?? state?.lastPreset ?? '—';
  const lastCompletedRun = useMemo(
    () => (Array.isArray(history) ? history.find((run) => run.status === 'succeeded') : null),
    [history]
  );
  const historyPreview = useMemo(() => (Array.isArray(history) ? history.slice(0, 3) : []), [history]);

  return (
    <div className="dashboard-section">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Installer</h3>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <dt>Status</dt>
          <dd className="capitalize">{status}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Run ID</dt>
          <dd className="font-mono text-xs">{state?.id ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Heartbeat</dt>
          <dd>{formatTimestamp(state?.heartbeatAt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Preset</dt>
          <dd>{activePreset}</dd>
        </div>
      </dl>
      {error ? <p className="mt-3 text-xs text-amber-700">{error}</p> : null}
      {state?.lastError ? (
        <p className="mt-3 text-xs text-rose-600">
          Last error {state.lastError.taskId ?? '—'}: {state.lastError.message ?? '—'}
        </p>
      ) : null}
      {lastCompletedRun ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Last successful run</p>
          <p className="mt-1">Preset: {lastCompletedRun.presetId ?? '—'}</p>
          <p className="mt-1">Completed at: {formatTimestamp(lastCompletedRun.completedAt)}</p>
        </div>
      ) : null}
      {historyPreview.length > 0 ? (
        <div className="mt-4 space-y-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Recent runs</p>
          <ul className="space-y-1">
            {historyPreview.map((run) => (
              <li key={run.id ?? run.startedAt} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="font-medium text-slate-700">{run.presetId ?? 'Preset'}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">{run.status ?? 'pending'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {typeof onLoadHistory === 'function' ? (
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:border-primary/50"
          onClick={() => onLoadHistory()}
        >
          Load full run log
        </button>
      ) : null}
    </div>
  );
}

SetupStatusCard.propTypes = {
  state: PropTypes.object,
  connectionState: PropTypes.string,
  error: PropTypes.string,
  history: PropTypes.arrayOf(PropTypes.object),
  onLoadHistory: PropTypes.func
};

SetupStatusCard.defaultProps = {
  state: null,
  connectionState: 'idle',
  error: null,
  history: undefined,
  onLoadHistory: undefined
};

export default function AdminOperationsSection({ sectionId, supportStats, riskStats, platformStats }) {
  const {
    state: setupState,
    connectionState: setupConnectionState,
    error: setupError,
    history: setupHistory,
    loadHistory
  } = useSetupProgress();

  return (
    <section id={sectionId} className="grid gap-6 lg:grid-cols-3">
      <StatList title="Support load" emptyLabel="No pending support indicators." entries={supportStats} />
      <StatList title="Risk &amp; trust" emptyLabel="No risk signals detected." entries={riskStats} />
      <StatList title="Platform snapshot" emptyLabel="No aggregate platform metrics available." entries={platformStats} />
      <SetupStatusCard
        state={setupState}
        connectionState={setupConnectionState}
        error={setupError}
        history={setupHistory}
        onLoadHistory={loadHistory}
      />
    </section>
  );
}

AdminOperationsSection.propTypes = {
  sectionId: PropTypes.string,
  supportStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  riskStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  platformStats: PropTypes.arrayOf(PropTypes.object).isRequired
};

AdminOperationsSection.defaultProps = {
  sectionId: undefined
};
