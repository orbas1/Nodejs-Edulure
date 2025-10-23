import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import ModerationChecklist from './ModerationChecklist.jsx';
import SeverityBadge from './SeverityBadge.jsx';

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function isFormElement(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function transformPolicySnippets(snippets = []) {
  return snippets.map((snippet) => ({
    id: snippet.id,
    label: snippet.title ?? 'Policy obligation',
    description: snippet.summary ?? null,
    url: snippet.url ?? null,
    owner: snippet.owner ?? null,
    severity: snippet.riskTier === 'critical' ? 'critical' : snippet.riskTier ?? 'medium'
  }));
}

function transformSuggestions(suggestions = []) {
  return suggestions.map((suggestion) => ({
    id: suggestion.id,
    label: suggestion.message,
    description: suggestion.policyId ? `Policy reference ${suggestion.policyId}` : null,
    severity: suggestion.severity ?? 'medium',
    done: Boolean(suggestion.acknowledgedAt),
    acknowledgedAt: suggestion.acknowledgedAt ?? null
  }));
}

export default function ModerationWorkspace({
  caseData,
  actions,
  onPerformAction,
  onUndo,
  undoDisabled,
  lastAction
}) {
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const metadata = caseData?.metadata ?? {};
  const policyChecklist = useMemo(() => transformPolicySnippets(metadata.policySnippets), [metadata.policySnippets]);
  const suggestionChecklist = useMemo(() => transformSuggestions(metadata.aiSuggestions), [metadata.aiSuggestions]);

  useEffect(() => {
    setNotes('');
    setFollowUpAt('');
    setFollowUpReason('');
  }, [caseData?.publicId]);

  const handleAction = useCallback(
    async (action, extra = {}) => {
      if (!onPerformAction || submitting || !caseData) {
        return;
      }
      setSubmitting(true);
      try {
        await onPerformAction({
          caseId: caseData.publicId,
          action,
          notes: extra.notes ?? notes ?? undefined,
          followUpAt: extra.followUpAt ?? (followUpAt ? new Date(followUpAt).toISOString() : undefined),
          followUpReason: extra.followUpReason ?? (followUpReason || undefined),
          acknowledgeSuggestion: extra.acknowledgeSuggestion
        });
        if (action !== 'comment') {
          setNotes('');
        }
        if (extra.resetFollowUp) {
          setFollowUpAt('');
          setFollowUpReason('');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [caseData, followUpAt, followUpReason, notes, onPerformAction, submitting]
  );

  const handleSuggestionToggle = useCallback(
    async (item) => {
      if (!item || item.done) {
        return;
      }
      await handleAction('comment', { acknowledgeSuggestion: item.id, notes: `Acknowledged suggestion ${item.id}` });
    },
    [handleAction]
  );

  useEffect(() => {
    function handleKey(event) {
      if (!caseData || submitting) {
        return;
      }
      if (isFormElement(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault();
          onUndo?.();
        }
        return;
      }
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          handleAction('approve', { resetFollowUp: true });
          break;
        case 'r':
          event.preventDefault();
          handleAction('reject');
          break;
        case 's':
          event.preventDefault();
          handleAction('suppress');
          break;
        case 'f':
          event.preventDefault();
          document.getElementById('moderation-follow-up-input')?.focus();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [caseData, handleAction, onUndo, submitting]);

  if (!caseData) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Select a case from the queue to review details.
      </div>
    );
  }

  const followUps = Array.isArray(metadata.reminders) ? metadata.reminders : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{caseData.post?.title ?? 'Content under review'}</h2>
            <p className="text-xs text-slate-500">Case {caseData.publicId}</p>
          </div>
          <SeverityBadge severity={caseData.severity}>{caseData.severity?.toUpperCase()}</SeverityBadge>
        </header>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">Flagged reason</p>
          <p className="mt-1">{caseData.reason ?? 'No reason provided.'}</p>
          <p className="mt-3 text-xs text-slate-500">Risk score: {caseData.riskScore}</p>
          <p className="text-xs text-slate-500">Flagged by: {caseData.reporter?.name ?? 'Automated signal'}</p>
          <p className="text-xs text-slate-500">Last updated: {formatDate(caseData.updatedAt)}</p>
        </article>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="moderation-notes-input">
            Moderator notes
          </label>
          <textarea
            id="moderation-notes-input"
            className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Capture findings, outreach details, or escalation context."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="moderation-follow-up-input">
            Schedule follow-up
            <input
              id="moderation-follow-up-input"
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              value={followUpAt}
              onChange={(event) => setFollowUpAt(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Follow-up context
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Remind to request evidence, contact reporter…"
              value={followUpReason}
              onChange={(event) => setFollowUpReason(event.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleAction('approve', { resetFollowUp: true })}
            disabled={submitting}
          >
            Approve & publish
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleAction('reject')}
            disabled={submitting}
          >
            Reject content
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleAction('suppress')}
            disabled={submitting}
          >
            Suppress temporarily
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onUndo}
            disabled={undoDisabled || submitting}
          >
            Undo last decision
          </button>
        </div>
        {lastAction ? (
          <p className="text-xs text-slate-500">Last undoable action restores post status to {lastAction.previousPostStatus}</p>
        ) : null}
      </section>

      <section className="space-y-6">
        <ModerationChecklist title="Policy references" items={policyChecklist} />
        <ModerationChecklist title="AI suggestions" items={suggestionChecklist} onToggle={handleSuggestionToggle} />
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Action log</h3>
          {Array.isArray(actions) && actions.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-600">
              {actions.map((action) => (
                <li key={action.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{action.action}</span>
                    <span>{formatDate(action.createdAt)}</span>
                  </div>
                  {action.notes ? <p className="mt-1 text-slate-600">{action.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No actions recorded yet.</p>
          )}
        </div>
        {followUps.length ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Scheduled reminders</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {followUps.map((reminder) => (
                <li key={reminder.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-800">{reminder.reason ?? 'Follow-up scheduled'}</p>
                    <p className="text-slate-500">Status: {reminder.status ?? 'pending'}</p>
                  </div>
                  <span>{formatDate(reminder.remindAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

ModerationWorkspace.propTypes = {
  caseData: PropTypes.shape({
    publicId: PropTypes.string,
    post: PropTypes.shape({
      title: PropTypes.string
    }),
    severity: PropTypes.string,
    reason: PropTypes.string,
    riskScore: PropTypes.number,
    reporter: PropTypes.shape({
      name: PropTypes.string
    }),
    updatedAt: PropTypes.string,
    metadata: PropTypes.object
  }),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      action: PropTypes.string.isRequired,
      notes: PropTypes.string,
      createdAt: PropTypes.string
    })
  ),
  onPerformAction: PropTypes.func,
  onUndo: PropTypes.func,
  undoDisabled: PropTypes.bool,
  lastAction: PropTypes.shape({
    previousPostStatus: PropTypes.string
  })
};

ModerationWorkspace.defaultProps = {
  caseData: null,
  actions: [],
  onPerformAction: undefined,
  onUndo: undefined,
  undoDisabled: false,
  lastAction: null
};
