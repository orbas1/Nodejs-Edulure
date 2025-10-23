import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

import clsx from 'clsx';

function normaliseChecklist(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id ?? item.value ?? item.label,
        label: item.label ?? String(item.id ?? item.value ?? 'Checklist item'),
        description: item.description ?? '',
        value: item.value ?? item.id ?? item.label,
        defaultChecked: Boolean(item.defaultChecked)
      }))
    : [];
}

export default function ModerationChecklistForm({
  title,
  checklist,
  defaultNotes,
  onSubmit,
  submitLabel,
  disabled,
  followUpDefaults
}) {
  const items = useMemo(() => normaliseChecklist(checklist), [checklist]);
  const [notes, setNotes] = useState(defaultNotes ?? '');
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(items.map((item) => [item.id, Boolean(item.defaultChecked)]))
  );
  const [followUpMinutes, setFollowUpMinutes] = useState(
    followUpDefaults?.minutes ?? ''
  );
  const [followUpReason, setFollowUpReason] = useState(followUpDefaults?.reason ?? '');
  const [followUpAssignee, setFollowUpAssignee] = useState(followUpDefaults?.assignee ?? '');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (disabled) {
      return;
    }

    const completedItems = items
      .filter((item) => checked[item.id])
      .map((item) => ({ id: item.id, value: item.value, label: item.label }));

    const payload = {
      notes: notes.trim() || null,
      completedItems,
      followUp: null
    };

    const minutes = Number(followUpMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      payload.followUp = {
        followUpInMinutes: minutes,
        followUpReason: followUpReason.trim() || undefined,
        followUpAssignee:
          followUpAssignee === '' ? undefined : Number.parseInt(followUpAssignee, 10)
      };
    }

    onSubmit?.(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">
          Confirm the checks you have completed before applying the moderation action.
        </p>
      </div>

      <fieldset className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={clsx(
              'flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 transition',
              checked[item.id] ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/40'
            )}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/50"
              checked={Boolean(checked[item.id])}
              onChange={(event) =>
                setChecked((prev) => ({ ...prev, [item.id]: event.target.checked }))
              }
              disabled={disabled}
            />
            <span>
              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
              {item.description ? (
                <p className="text-xs text-slate-500">{item.description}</p>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      <label className="block space-y-1 text-sm font-medium text-slate-900">
        Moderator notes
        <textarea
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
          placeholder="Add context for the audit trail"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={disabled}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm font-medium text-slate-900">
          Follow-up in minutes
          <input
            type="number"
            min="0"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={followUpMinutes}
            onChange={(event) => setFollowUpMinutes(event.target.value)}
            placeholder="e.g. 120"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-900">
          Follow-up reason
          <input
            type="text"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={followUpReason}
            onChange={(event) => setFollowUpReason(event.target.value)}
            placeholder="Escalation summary"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-900">
          Assign follow-up to user ID
          <input
            type="number"
            min="1"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={followUpAssignee}
            onChange={(event) => setFollowUpAssignee(event.target.value)}
            placeholder="Optional"
            disabled={disabled}
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled}
      >
        {submitLabel}
      </button>
    </form>
  );
}

ModerationChecklistForm.propTypes = {
  title: PropTypes.string.isRequired,
  checklist: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      description: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      defaultChecked: PropTypes.bool
    })
  ),
  defaultNotes: PropTypes.string,
  onSubmit: PropTypes.func,
  submitLabel: PropTypes.string,
  disabled: PropTypes.bool,
  followUpDefaults: PropTypes.shape({
    minutes: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    reason: PropTypes.string,
    assignee: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  })
};

ModerationChecklistForm.defaultProps = {
  checklist: [],
  defaultNotes: '',
  onSubmit: null,
  submitLabel: 'Apply action',
  disabled: false,
  followUpDefaults: null
};
