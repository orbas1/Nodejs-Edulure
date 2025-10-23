import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';

import clsx from 'clsx';
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

import ModerationChecklistForm from './ModerationChecklistForm.jsx';
import ModerationMediaPreview from './ModerationMediaPreview.jsx';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In review' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'suppressed', label: 'Suppressed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' }
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const ACTION_CONFIGS = {
  approve: {
    label: 'Approve and publish',
    checklist: [
      { id: 'guidelines', label: 'Guidelines satisfied', defaultChecked: true },
      { id: 'contacted', label: 'Reporter notified of outcome' }
    ],
    followUp: { minutes: 1440, reason: 'Post-approval quality review' }
  },
  reject: {
    label: 'Reject and archive',
    checklist: [
      { id: 'policy', label: 'Policy violation documented', defaultChecked: true },
      { id: 'communication', label: 'Member communication drafted' }
    ],
    followUp: { minutes: 720, reason: 'Confirm remediation steps with member' }
  },
  suppress: {
    label: 'Suppress visibility',
    checklist: [
      { id: 'evidence', label: 'Evidence exported for audit trail', defaultChecked: true },
      { id: 'notify', label: 'Support notified of suppression window' }
    ],
    followUp: { minutes: 240, reason: 'Review suppression outcome' }
  },
  escalate: {
    label: 'Escalate to trust & safety',
    checklist: [
      { id: 'owner', label: 'Owner assigned to case', defaultChecked: true },
      { id: 'playbook', label: 'Escalation playbook referenced' }
    ],
    followUp: { minutes: 180, reason: 'Escalation follow-up' }
  },
  comment: {
    label: 'Add moderator comment',
    checklist: [],
    followUp: { minutes: '', reason: '' }
  }
};

function severityStyles(severity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'high':
      return 'bg-amber-100 text-amber-700';
    case 'medium':
      return 'bg-indigo-100 text-indigo-700';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
}

function formatRelative(value) {
  if (!value) return 'N/A';
  const target = new Date(value);
  const now = new Date();
  if (Number.isNaN(target.getTime())) {
    return 'N/A';
  }
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / (60 * 1000));
  if (diffMinutes === 0) return 'now';
  if (diffMinutes > 0) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} from now`;
  }
  const abs = Math.abs(diffMinutes);
  return `${abs} min${abs === 1 ? '' : 's'} ago`;
}

function getMediaFromCase(moderationCase) {
  const metadata = moderationCase?.metadata ?? {};
  if (Array.isArray(metadata.media)) {
    return metadata.media;
  }
  if (Array.isArray(metadata.attachments)) {
    return metadata.attachments;
  }
  if (moderationCase?.post?.metadata?.media) {
    return moderationCase.post.metadata.media;
  }
  return [];
}

function latestActionId(caseDetail) {
  const actions = Array.isArray(caseDetail?.actions) ? caseDetail.actions : [];
  if (!actions.length) {
    return null;
  }
  return actions[actions.length - 1].id ?? null;
}

export default function ModerationQueue({
  cases,
  loading,
  error,
  filters,
  onFiltersChange,
  onRefresh,
  onSelectCase,
  selectedCaseId,
  selectedCase,
  onApplyAction,
  onUndoAction,
  lastUpdated
}) {
  const [statusFilter, setStatusFilter] = useState(filters?.status ?? 'pending');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
  const [activeAction, setActiveAction] = useState('approve');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!selectedCaseId && cases.length) {
      onSelectCase?.(cases[0].id);
    }
  }, [cases, onSelectCase, selectedCaseId]);

  useEffect(() => {
    setActiveAction('approve');
  }, [selectedCaseId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!cases.length) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const currentIndex = cases.findIndex((item) => item.id === selectedCaseId);
        const nextIndex = currentIndex < cases.length - 1 ? currentIndex + 1 : 0;
        onSelectCase?.(cases[nextIndex].id);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const currentIndex = cases.findIndex((item) => item.id === selectedCaseId);
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : cases.length - 1;
        onSelectCase?.(cases[nextIndex].id);
      }

      if (event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        const actionId = latestActionId(selectedCase);
        if (actionId) {
          setUndoing(true);
          onUndoAction?.({ caseId: selectedCaseId, actionId }).finally(() => setUndoing(false));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cases, onSelectCase, selectedCase, selectedCaseId, onUndoAction]);

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setStatusFilter(value);
    onFiltersChange?.({ ...filters, status: value, page: 1 });
    onRefresh?.({ status: value, page: 1 });
  };

  const handleSeverityChange = (event) => {
    const value = event.target.value;
    setSeverityFilter(value);
    const severityParam = value === 'all' ? undefined : value;
    onFiltersChange?.({ ...filters, severity: severityParam, page: 1 });
    onRefresh?.({ severity: severityParam, page: 1 });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    onFiltersChange?.({ ...filters, search: searchTerm || undefined, page: 1 });
    onRefresh?.({ search: searchTerm || undefined, page: 1 });
  };

  const handleActionSubmit = async (action) => {
    if (!selectedCaseId || !onApplyAction) {
      return;
    }
    setSubmittingAction(true);
    try {
      await onApplyAction(action);
    } finally {
      setSubmittingAction(false);
    }
  };

  const selectedMedia = useMemo(() => getMediaFromCase(selectedCase), [selectedCase]);
  const latestFollowUpDue = useMemo(() => {
    const followUps = Array.isArray(selectedCase?.followUps) ? selectedCase.followUps : [];
    if (!followUps.length) {
      return null;
    }
    return followUps.find((followUp) => followUp.status === 'pending') ?? followUps[0];
  }, [selectedCase]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              className="ml-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severity
            <select
              className="ml-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={severityFilter}
              onChange={handleSeverityChange}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              className="w-full rounded-full border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Search reason or post title"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </form>
          <button
            type="button"
            onClick={() => onRefresh?.(filters)}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          {lastUpdated ? (
            <span className="text-xs text-slate-500">Last synced {formatRelative(lastUpdated)}</span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-200 bg-white/60 text-sm text-slate-500">
            Loading moderation queue…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
              <span>{error.message ?? 'Unable to load moderation queue.'}</span>
            </div>
            <button
              type="button"
              onClick={() => onRefresh?.(filters)}
              className="mt-3 rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cases.map((item) => (
                  <tr
                    key={item.id}
                    className={clsx(
                      'cursor-pointer align-top transition hover:bg-primary/5',
                      selectedCaseId === item.id && 'bg-primary/5'
                    )}
                    onClick={() => onSelectCase?.(item.id)}
                  >
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{item.reason ?? 'Reported content'}</p>
                      <p className="text-xs text-slate-500">Case #{item.publicId ?? item.id}</p>
                      {item.metadata?.flags?.length ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.metadata.flags.length} flag{item.metadata.flags.length === 1 ? '' : 's'} recorded
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize',
                          severityStyles(item.severity)
                        )}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.riskScore ?? 0}</td>
                    <td className="px-4 py-4 text-sm capitalize text-slate-700">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {selectedCase ? (
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/80 p-6">
            <header className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Case details</h2>
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize',
                    severityStyles(selectedCase.severity)
                  )}
                >
                  {selectedCase.severity}
                </span>
              </div>
              <p className="text-sm text-slate-600">{selectedCase.reason ?? 'No reason supplied.'}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">Status: {selectedCase.status}</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">Risk: {selectedCase.riskScore ?? 0}</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Flagged via {selectedCase.flaggedSource ?? 'report'}
                </span>
              </div>
            </header>

            <div className="grid gap-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Reported at</span>
                <span className="font-medium text-slate-900">{formatDate(selectedCase.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Resolved at</span>
                <span className="font-medium text-slate-900">{formatDate(selectedCase.resolvedAt)}</span>
              </div>
              {latestFollowUpDue ? (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Next follow-up</span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">
                    {formatRelative(latestFollowUpDue.dueAt)}
                  </span>
                </div>
              ) : null}
            </div>

            <ModerationMediaPreview media={selectedMedia} />

            {Array.isArray(selectedCase.aiSuggestions) && selectedCase.aiSuggestions.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">AI suggestions</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {selectedCase.aiSuggestions.map((suggestion, index) => (
                    <li key={`${suggestion.type ?? index}`} className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{suggestion.message ?? suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(selectedCase.policySnippets) && selectedCase.policySnippets.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Relevant policies</h3>
                <ul className="space-y-2 text-sm text-primary">
                  {selectedCase.policySnippets.map((snippet) => (
                    <li key={snippet.id}>
                      <a
                        href={snippet.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                      >
                        {snippet.title}
                      </a>
                      {snippet.summary ? (
                        <p className="text-xs text-slate-500">{snippet.summary}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(selectedCase.followUps) && selectedCase.followUps.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Follow-ups</h3>
                <ul className="space-y-1 text-xs text-slate-600">
                  {selectedCase.followUps.map((followUp) => (
                    <li
                      key={followUp.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2"
                    >
                      <span className="font-medium text-slate-700">{followUp.metadata?.reason ?? 'Follow-up'}</span>
                      <span className="text-slate-500">{formatRelative(followUp.dueAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Moderation actions</h3>
                <div className="flex gap-2">
                  {Object.entries(ACTION_CONFIGS).map(([actionKey, config]) => (
                    <button
                      key={actionKey}
                      type="button"
                      onClick={() => setActiveAction(actionKey)}
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-semibold transition',
                        activeAction === actionKey
                          ? 'bg-primary text-white shadow'
                          : 'border border-slate-200 text-slate-600 hover:border-primary/40'
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <ModerationChecklistForm
                title={ACTION_CONFIGS[activeAction].label}
                checklist={ACTION_CONFIGS[activeAction].checklist}
                followUpDefaults={ACTION_CONFIGS[activeAction].followUp}
                disabled={submittingAction}
                onSubmit={(payload) =>
                  handleActionSubmit({
                    caseId: selectedCaseId,
                    action: activeAction,
                    notes: payload.notes,
                    followUpInMinutes: payload.followUp?.followUpInMinutes,
                    followUpReason: payload.followUp?.followUpReason,
                    followUpAssignee: payload.followUp?.followUpAssignee,
                    checklist: payload.completedItems
                  })
                }
                submitLabel={submittingAction ? 'Submitting…' : 'Submit action'}
              />
              <button
                type="button"
                disabled={undoing || !latestActionId(selectedCase)}
                onClick={() => {
                  const actionId = latestActionId(selectedCase);
                  if (!actionId) return;
                  setUndoing(true);
                  onUndoAction?.({ caseId: selectedCaseId, actionId }).finally(() => setUndoing(false));
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                {undoing ? 'Reverting…' : 'Undo last action (Shift+Z)'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500">
            Select a case to review details.
          </div>
        )}
      </div>
    </div>
  );
}

ModerationQueue.propTypes = {
  cases: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      publicId: PropTypes.string,
      reason: PropTypes.string,
      severity: PropTypes.string,
      status: PropTypes.string,
      riskScore: PropTypes.number,
      metadata: PropTypes.object
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.instanceOf(Error),
  filters: PropTypes.object,
  onFiltersChange: PropTypes.func,
  onRefresh: PropTypes.func,
  onSelectCase: PropTypes.func,
  selectedCaseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedCase: PropTypes.object,
  onApplyAction: PropTypes.func,
  onUndoAction: PropTypes.func,
  lastUpdated: PropTypes.string
};

ModerationQueue.defaultProps = {
  cases: [],
  loading: false,
  error: null,
  filters: {},
  onFiltersChange: null,
  onRefresh: null,
  onSelectCase: null,
  selectedCaseId: null,
  selectedCase: null,
  onApplyAction: null,
  onUndoAction: null,
  lastUpdated: null
};
