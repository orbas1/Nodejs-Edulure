import { useMemo } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import AdminSummaryCard from '../../../components/admin/AdminSummaryCard.jsx';
import { formatDateTime, formatNumber, formatRelativeTime } from '../utils.js';

const STATUS_LABELS = {
  pass: 'Passing',
  in_progress: 'In progress',
  pending: 'Pending',
  fail: 'Failing'
};

const STATUS_TONES = {
  pass: 'positive',
  in_progress: 'warning',
  pending: 'info',
  fail: 'danger'
};

const STATUS_BADGE_CLASSES = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-sky-50 text-sky-700 ring-sky-200',
  fail: 'bg-rose-50 text-rose-700 ring-rose-200'
};

function StatusBadge({ status }) {
  const key = status?.toLowerCase?.() ?? 'pending';
  const classes = STATUS_BADGE_CLASSES[key] ?? STATUS_BADGE_CLASSES.pending;
  const label = STATUS_LABELS[key] ?? 'Pending';
  return (
    <span
      className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', classes)}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string
};

StatusBadge.defaultProps = {
  status: 'pending'
};

function ReleaseTaskList({ tasks }) {
  if (!tasks?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
        No release gates require attention right now. Monitor the saved run for updates.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => {
        const key = task.status?.toLowerCase?.() ?? 'pending';
        const tone =
          key === 'fail'
            ? 'text-rose-600'
            : key === 'in_progress'
              ? 'text-amber-600'
              : 'text-slate-600';
        const label = task.label ?? 'Release gate';
        const statusLabel = STATUS_LABELS[key] ?? 'Pending';
        return (
          <li key={task.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <a href={task.href ?? '#release'} className="font-semibold text-slate-900 hover:text-primary">
                {label}
              </a>
              <StatusBadge status={task.status} />
            </div>
            <p className={clsx('mt-2 text-xs', tone)}>
              {statusLabel}
              {task.ownerEmail ? ` · Owner ${task.ownerEmail}` : ''}
            </p>
            {task.lastEvaluatedAt ? (
              <p className="mt-1 text-xs text-slate-400">
                Updated {formatRelativeTime(task.lastEvaluatedAt)} ({formatDateTime(task.lastEvaluatedAt)})
              </p>
            ) : null}
            {task.notes ? <p className="mt-2 text-xs text-slate-500">{task.notes}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

ReleaseTaskList.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string,
      status: PropTypes.string,
      ownerEmail: PropTypes.string,
      href: PropTypes.string,
      notes: PropTypes.string,
      lastEvaluatedAt: PropTypes.string
    })
  )
};

ReleaseTaskList.defaultProps = {
  tasks: null
};

function ReleaseGateTable({ gates }) {
  const items = Array.isArray(gates) ? gates.slice(0, 6) : [];

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
        No gates recorded yet. Schedule a readiness run to begin tracking approvals.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/70">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Gate</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Last evaluated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-600">
          {items.map((gate) => (
            <tr key={gate.gateKey ?? gate.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{gate.snapshot?.title ?? gate.gateKey}</p>
                {gate.snapshot?.description ? (
                  <p className="mt-1 text-xs text-slate-500">{gate.snapshot.description}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={gate.status} />
              </td>
              <td className="px-4 py-3 text-xs">
                <p className="font-semibold text-slate-700">{gate.ownerEmail ?? 'Unassigned'}</p>
                {gate.snapshot?.category ? (
                  <p className="text-slate-400">{gate.snapshot.category}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {gate.lastEvaluatedAt
                  ? `${formatRelativeTime(gate.lastEvaluatedAt)} · ${formatDateTime(gate.lastEvaluatedAt)}`
                  : 'Not yet evaluated'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

ReleaseGateTable.propTypes = {
  gates: PropTypes.arrayOf(PropTypes.object)
};

ReleaseGateTable.defaultProps = {
  gates: null
};

export default function AdminReleaseSection({
  sectionId,
  summary,
  gates,
  tasks,
  latestRun,
  thresholds,
  requiredGates
}) {
  const summaryCards = useMemo(() => {
    const entries = ['pass', 'in_progress', 'pending', 'fail'];
    return entries
      .map((key) => {
        const value = Number(summary?.[key] ?? 0);
        return {
          key,
          value,
          label: STATUS_LABELS[key] ?? key,
          tone: STATUS_TONES[key] ?? 'neutral'
        };
      })
      .filter((entry) => entry.value >= 0);
  }, [summary]);

  const readinessDetails = useMemo(() => {
    if (!latestRun) {
      return null;
    }
    const changeWindowStart = latestRun.changeWindowStart ? formatDateTime(latestRun.changeWindowStart) : '—';
    const changeWindowEnd = latestRun.changeWindowEnd ? formatDateTime(latestRun.changeWindowEnd) : '—';
    const started = latestRun.startedAt ? formatDateTime(latestRun.startedAt) : '—';
    const readinessScore = latestRun.metadata?.readinessScore ?? null;
    return {
      versionTag: latestRun.versionTag ?? '—',
      environment: latestRun.environment ?? '—',
      changeWindowStart,
      changeWindowEnd,
      started,
      readinessScore
    };
  }, [latestRun]);

  const thresholdEntries = useMemo(() => {
    if (!thresholds || typeof thresholds !== 'object') {
      return [];
    }
    return Object.entries(thresholds)
      .map(([key, value]) => ({
        key,
        value
      }))
      .slice(0, 6);
  }, [thresholds]);

  const requiredGateChips = useMemo(() => {
    if (!Array.isArray(requiredGates)) {
      return [];
    }
    return requiredGates.slice(0, 8);
  }, [requiredGates]);

  return (
    <section id={sectionId} className="space-y-6 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Release readiness</h2>
        <p className="text-sm text-slate-600">
          Track gating progress across quality, security, observability, and compliance before promoting changes.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <AdminSummaryCard
            key={card.key}
            label={card.label}
            value={formatNumber(card.value)}
            tone={card.tone}
            helper={card.key === 'fail' ? 'Requires remediation before deployment.' : null}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Outstanding gates</h3>
          <ReleaseTaskList tasks={tasks} />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Run context</h3>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-600">
            {readinessDetails ? (
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-semibold text-slate-900">{readinessDetails.versionTag}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Environment</dt>
                  <dd className="font-semibold text-slate-900">{readinessDetails.environment}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Change window</dt>
                  <dd className="text-right">
                    <p>{readinessDetails.changeWindowStart}</p>
                    <p>{readinessDetails.changeWindowEnd}</p>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Started</dt>
                  <dd className="font-semibold text-slate-900">{readinessDetails.started}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Readiness score</dt>
                  <dd className="font-semibold text-slate-900">
                    {readinessDetails.readinessScore !== null
                      ? `${Math.round(readinessDetails.readinessScore)} / 100`
                      : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>No active runs tracked. Schedule a release rehearsal to populate readiness data.</p>
            )}
          </div>

          {thresholdEntries.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thresholds</h4>
              <ul className="mt-3 space-y-2">
                {thresholdEntries.map((entry) => (
                  <li key={entry.key} className="flex items-center justify-between">
                    <span className="capitalize text-slate-500">
                      {String(entry.key)
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/[_-]+/g, ' ')
                        .trim()}
                    </span>
                    <span className="font-semibold text-slate-900">{String(entry.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {requiredGateChips.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required gates</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {requiredGateChips.map((gate) => (
                  <span
                    key={gate}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {gate}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gate status</h3>
        <ReleaseGateTable gates={gates} />
      </div>
    </section>
  );
}

AdminReleaseSection.propTypes = {
  sectionId: PropTypes.string,
  summary: PropTypes.object,
  gates: PropTypes.arrayOf(PropTypes.object),
  tasks: PropTypes.arrayOf(PropTypes.object),
  latestRun: PropTypes.object,
  thresholds: PropTypes.object,
  requiredGates: PropTypes.arrayOf(PropTypes.string)
};

AdminReleaseSection.defaultProps = {
  sectionId: 'release',
  summary: null,
  gates: null,
  tasks: null,
  latestRun: null,
  thresholds: null,
  requiredGates: null
};
