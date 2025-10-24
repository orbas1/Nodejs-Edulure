import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';

import useDashboardSurface from '../../hooks/useDashboardSurface.js';

function formatTimestamp(value) {
  if (!value) return '—';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  } catch (_error) {
    return String(value);
  }
}

function normaliseValueForCompare(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(
      value
        .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
        .filter((item) => item.length > 0)
        .sort()
    );
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }
  return String(value).trim();
}

function formatDiffValue(value, type = 'text') {
  if (value === null || value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
      .filter((item) => item.length > 0);
    return cleaned.length ? cleaned.join(', ') : '—';
  }
  if (type === 'datetime') {
    return formatTimestamp(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function isFieldRelevant(fieldKey, conflictSet) {
  if (!conflictSet || conflictSet.size === 0) {
    return true;
  }
  if (conflictSet.has(fieldKey)) {
    return true;
  }
  const metadataKey = `metadata.${fieldKey}`;
  if (conflictSet.has(metadataKey)) {
    return true;
  }
  if (fieldKey === 'attachments' && conflictSet.has('metadata.attachments')) {
    return true;
  }
  if (fieldKey === 'owner' && conflictSet.has('metadata.owner')) {
    return true;
  }
  if (fieldKey === 'fieldNotes' && conflictSet.has('metadata.fieldNotes')) {
    return true;
  }
  if (fieldKey === 'supportChannel' && conflictSet.has('metadata.supportChannel')) {
    return true;
  }
  if (fieldKey === 'briefUrl' && conflictSet.has('metadata.briefUrl')) {
    return true;
  }
  if (fieldKey === 'equipment' && conflictSet.has('metadata.equipment')) {
    return true;
  }
  if (fieldKey === 'debriefHost' && conflictSet.has('metadata.debriefHost')) {
    return true;
  }
  if (fieldKey === 'debriefAt' && conflictSet.has('metadata.debriefAt')) {
    return true;
  }
  return false;
}

const FIELD_DEFINITIONS = [
  {
    key: 'status',
    label: 'Status',
    getServer: (assignment) => assignment?.statusLabel ?? assignment?.status ?? null,
    getLocal: (snapshot) => snapshot?.statusLabel ?? snapshot?.status ?? null,
    getAttempted: (attempted, snapshot) => attempted?.status ?? snapshot?.status ?? null
  },
  {
    key: 'priority',
    label: 'Priority',
    getServer: (assignment) => assignment?.priority ?? null,
    getLocal: (snapshot) => snapshot?.priority ?? null,
    getAttempted: (attempted, snapshot) => attempted?.priority ?? snapshot?.priority ?? null
  },
  {
    key: 'serviceType',
    label: 'Service type',
    getServer: (assignment) => assignment?.serviceType ?? null,
    getLocal: (snapshot) => snapshot?.serviceType ?? null,
    getAttempted: (attempted, snapshot) => attempted?.serviceType ?? snapshot?.serviceType ?? null
  },
  {
    key: 'owner',
    label: 'Dispatch owner',
    getServer: (assignment) => assignment?.owner ?? assignment?.metadata?.owner ?? null,
    getLocal: (snapshot) => snapshot?.owner ?? null,
    getAttempted: (attempted, snapshot) => attempted?.owner ?? snapshot?.owner ?? null
  },
  {
    key: 'supportChannel',
    label: 'Support channel',
    getServer: (assignment) => assignment?.supportChannel ?? assignment?.metadata?.supportChannel ?? null,
    getLocal: (snapshot) => snapshot?.supportChannel ?? null,
    getAttempted: (attempted, snapshot) => attempted?.supportChannel ?? snapshot?.supportChannel ?? null
  },
  {
    key: 'briefUrl',
    label: 'Briefing link',
    getServer: (assignment) => assignment?.briefUrl ?? assignment?.metadata?.briefUrl ?? null,
    getLocal: (snapshot) => snapshot?.briefUrl ?? null,
    getAttempted: (attempted, snapshot) => attempted?.briefUrl ?? snapshot?.briefUrl ?? null
  },
  {
    key: 'fieldNotes',
    label: 'Field notes',
    getServer: (assignment) => assignment?.fieldNotes ?? assignment?.metadata?.fieldNotes ?? null,
    getLocal: (snapshot) => snapshot?.fieldNotes ?? null,
    getAttempted: (attempted, snapshot) => attempted?.fieldNotes ?? snapshot?.fieldNotes ?? null
  },
  {
    key: 'attachments',
    label: 'Attachments',
    type: 'list',
    getServer: (assignment) => assignment?.attachments ?? assignment?.metadata?.attachments ?? [],
    getLocal: (snapshot) => snapshot?.attachments ?? [],
    getAttempted: (attempted, snapshot) => attempted?.attachments ?? snapshot?.attachments ?? []
  },
  {
    key: 'scheduledFor',
    label: 'Scheduled for',
    type: 'datetime',
    getServer: (assignment) => assignment?.scheduledFor ?? assignment?.scheduledAtRaw ?? null,
    getLocal: (snapshot) => snapshot?.scheduledFor ?? snapshot?.scheduledAtRaw ?? null,
    getAttempted: (attempted, snapshot) => attempted?.scheduledFor ?? snapshot?.scheduledFor ?? null
  },
  {
    key: 'debriefAt',
    label: 'Debrief time',
    type: 'datetime',
    getServer: (assignment) => assignment?.debriefAt ?? assignment?.metadata?.debriefAt ?? null,
    getLocal: (snapshot) => snapshot?.debriefAt ?? null,
    getAttempted: (attempted, snapshot) => attempted?.debriefAt ?? snapshot?.debriefAt ?? null
  },
  {
    key: 'debriefHost',
    label: 'Debrief host',
    getServer: (assignment) => assignment?.debriefHost ?? assignment?.metadata?.debriefHost ?? assignment?.owner ?? null,
    getLocal: (snapshot) => snapshot?.debriefHost ?? snapshot?.owner ?? null,
    getAttempted: (attempted, snapshot) => attempted?.debriefHost ?? snapshot?.debriefHost ?? null
  }
];

export default function FieldServiceConflictModal({ conflict, onClose, onReloadServer, onApplySuggestion }) {
  const { surface, trackAction, refresh } = useDashboardSurface('bookings', {
    origin: 'field-service-conflict-modal'
  });

  if (!conflict) {
    return null;
  }

  const serviceTone = surface?.serviceHealth === 'outage'
    ? 'bg-rose-100 text-rose-700'
    : surface?.serviceHealth === 'degraded'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700';

  const lastSyncedLabel = surface?.lastSyncedAt ? formatTimestamp(surface.lastSyncedAt) : 'Unknown';

  const {
    serverAssignment,
    localSnapshot,
    attemptedPayload,
    suggestedAssignment,
    serverUpdatedAt,
    clientUpdatedAt,
    conflictingFields = []
  } = conflict;

  const conflictSet = new Set(conflictingFields);

  const diffItems = FIELD_DEFINITIONS.map((field) => {
    if (!isFieldRelevant(field.key, conflictSet)) {
      return null;
    }
    const serverValue = field.getServer ? field.getServer(serverAssignment) : serverAssignment?.[field.key];
    const localValue = field.getLocal ? field.getLocal(localSnapshot) : localSnapshot?.[field.key];
    const attemptedValue = field.getAttempted
      ? field.getAttempted(attemptedPayload, localSnapshot)
      : attemptedPayload?.[field.key];

    const attemptedComparable = normaliseValueForCompare(attemptedValue);
    const serverComparable = normaliseValueForCompare(serverValue);

    if (conflictSet.size > 0 && attemptedComparable === serverComparable) {
      return null;
    }

    return {
      key: field.key,
      label: field.label,
      serverValue,
      attemptedValue,
      previousValue: localValue,
      type: field.type ?? 'text'
    };
  }).filter(Boolean);

  const canApplySuggestion = Boolean(onApplySuggestion) && Boolean(conflict?.suggestedPayload);

  const handleReload = () => {
    trackAction('conflict_reload_assignment', { assignmentId: conflict.assignmentId });
    if (onReloadServer) {
      onReloadServer();
    }
  };

  const handleContinueEditing = () => {
    trackAction('conflict_continue_editing', { assignmentId: conflict.assignmentId });
    if (onClose) {
      onClose();
    }
  };

  const handleApplySuggestion = () => {
    trackAction('conflict_apply_suggestion', { assignmentId: conflict.assignmentId, hasSuggestion: canApplySuggestion });
    if (canApplySuggestion && onApplySuggestion) {
      onApplySuggestion();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Sync conflict detected</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Review field service assignment changes</h2>
            <p className="mt-2 text-sm text-slate-600">
              This assignment was updated on another device at {formatTimestamp(serverUpdatedAt)}. Your offline edit was based on
              {clientUpdatedAt ? ` a sync from ${formatTimestamp(clientUpdatedAt)}` : ' an unsynced version'}.
            </p>
            {suggestedAssignment ? (
              <p className="mt-2 text-xs text-slate-500">
                Suggested merge outcome: {suggestedAssignment.statusLabel ?? suggestedAssignment.status ?? 'Updated status'} ·{' '}
                {suggestedAssignment.priority ?? 'standard'} priority.
              </p>
            ) : null}
            {surface ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${serviceTone}`}>
                  <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  {surface.serviceHealth ? surface.serviceHealth.replace(/_/g, ' ') : 'Operational'}
                </span>
                <span>Last synced {lastSyncedLabel}</span>
                <span>{surface.pendingCount ? `${surface.pendingCount} pending dispatches` : 'No pending dispatches'}</span>
                {surface.stale ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => {
                      trackAction('conflict_refresh_surface', { assignmentId: conflict.assignmentId });
                      refresh?.();
                    }}
                  >
                    Refresh dashboard data
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss conflict alert"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {diffItems.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Field</th>
                    <th scope="col" className="px-4 py-3">Latest on server</th>
                    <th scope="col" className="px-4 py-3">Your edit</th>
                    <th scope="col" className="px-4 py-3">Last synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {diffItems.map((item) => (
                    <tr key={item.key}>
                      <th scope="row" className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                        {item.label}
                      </th>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDiffValue(item.serverValue, item.type)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDiffValue(item.attemptedValue, item.type)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDiffValue(item.previousValue, item.type)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
              No field-level differences were detected for this update. You can reload the latest assignment or keep your local copy.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-500">
            <p>Assignment ID: {conflict.assignmentId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="dashboard-pill"
              onClick={handleReload}
            >
              Reload latest assignment
            </button>
            <button
              type="button"
              className="dashboard-pill"
              onClick={handleContinueEditing}
            >
              Continue editing
            </button>
            <button
              type="button"
              className="dashboard-primary-pill"
              disabled={!canApplySuggestion}
              onClick={handleApplySuggestion}
            >
              Apply merged update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

FieldServiceConflictModal.propTypes = {
  conflict: PropTypes.shape({
    assignmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    serverUpdatedAt: PropTypes.string,
    clientUpdatedAt: PropTypes.string,
    serverAssignment: PropTypes.object,
    suggestedAssignment: PropTypes.object,
    suggestedPayload: PropTypes.object,
    attemptedPayload: PropTypes.object,
    localSnapshot: PropTypes.object,
    conflictingFields: PropTypes.arrayOf(PropTypes.string)
  }),
  onClose: PropTypes.func,
  onReloadServer: PropTypes.func,
  onApplySuggestion: PropTypes.func
};

FieldServiceConflictModal.defaultProps = {
  conflict: null,
  onClose: undefined,
  onReloadServer: undefined,
  onApplySuggestion: undefined
};
