import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

import { fetchPolicyTimeline, fetchDsrQueue, updateDsrStatus } from '../../api/complianceApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function SummaryCard({ title, value, icon: Icon, tone }) {
  const toneClass = useMemo(() => {
    switch (tone) {
      case 'critical':
        return 'text-rose-600 bg-rose-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'success':
        return 'text-emerald-600 bg-emerald-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  }, [tone]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

SummaryCard.defaultProps = {
  tone: 'neutral'
};

function DsrRequestRow({ request, onStatusChange }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 text-sm font-medium text-slate-700">{request.caseReference}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{request.requestType}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{request.status}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{request.dueAt ? new Date(request.dueAt).toLocaleDateString() : 'N/A'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{request.reporter?.displayName ?? 'Unknown'}</td>
      <td className="px-4 py-3 text-right text-sm">
        <div className="flex items-center justify-end gap-2">
          {['in_review', 'awaiting_user'].includes(request.status) && (
            <button
              type="button"
              onClick={() => onStatusChange(request.id, 'completed')}
              className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
            >
              Mark complete
            </button>
          )}
          {request.status !== 'escalated' && request.status !== 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange(request.id, 'escalated')}
              className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
            >
              Escalate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminGovernance() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const [queue, setQueue] = useState({ data: [], total: 0, overdue: 0 });
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchDsrQueue({ token, signal: controller.signal }),
      fetchPolicyTimeline({ token, signal: controller.signal })
    ])
      .then(([queuePayload, policyPayload]) => {
        if (!isMounted) return;
        setQueue(queuePayload ?? { data: [], total: 0, overdue: 0 });
        setPolicies(policyPayload ?? []);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted && (err?.name === 'AbortError' || err?.message === 'canceled')) {
          return;
        }
        setError(err instanceof Error ? err : new Error('Failed to load governance data'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

  const handleStatusChange = async (requestId, status) => {
    if (!token) return;
    try {
      await updateDsrStatus({ token, requestId, status });
      const updated = await fetchDsrQueue({ token });
      setQueue(updated ?? { data: [], total: 0, overdue: 0 });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update DSR status'));
    }
  };

  const stats = useMemo(
    () => [
      {
        title: 'Requests in queue',
        value: queue.total,
        icon: InboxArrowDownIcon,
        tone: queue.total > 0 ? 'warning' : 'success'
      },
      {
        title: 'Overdue cases',
        value: queue.overdue,
        icon: ExclamationTriangleIcon,
        tone: queue.overdue > 0 ? 'critical' : 'success'
      },
      {
        title: 'Published policies',
        value: policies.length,
        icon: ShieldCheckIcon,
        tone: policies.length ? 'success' : 'neutral'
      }
    ],
    [queue.total, queue.overdue, policies.length]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Governance control centre</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track GDPR data subject requests, consent posture, and policy releases from a single workspace.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <SummaryCard key={stat.title} {...stat} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">DSR queue</h2>
            <p className="text-sm text-slate-600">Monitor active requests and escalate to legal when needed.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <ClockIcon className="h-4 w-4" /> SLA: 30 days
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Reporter</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.data.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    All caught up. No outstanding requests.
                  </td>
                </tr>
              )}
              {queue.data.map((request) => (
                <DsrRequestRow key={request.id} request={request} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Policy timeline</h2>
            <p className="text-sm text-slate-600">
              Validate when the latest privacy notices and consent documents went live.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircleIcon className="h-4 w-4" /> ISO27001 control mapped
          </span>
        </div>
        <ol className="mt-4 space-y-4">
          {policies.map((policy) => (
            <li key={`${policy.key}-${policy.version}`} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {policy.title} · v{policy.version}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {policy.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{policy.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Effective {policy.effectiveAt ? new Date(policy.effectiveAt).toLocaleDateString() : 'TBC'} · Hash {policy.contentHash.slice(0, 12)}…
                </p>
              </div>
            </li>
          ))}
          {policies.length === 0 && !loading && (
            <li className="text-sm text-slate-500">No policies published yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}
