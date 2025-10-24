import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { announcePolite, useFocusTrap } from '../../utils/a11y.js';

const EVENT_TYPES = [
  { value: 'classroom', label: 'Classroom session' },
  { value: 'livestream', label: 'Community live stream' },
  { value: 'podcast', label: 'Community podcast' },
  { value: 'event', label: 'Community event' }
];

const DEFAULT_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch (_error) {
    return 'UTC';
  }
})();

const POPULAR_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney'
];

const TIMEZONE_OPTIONS = (() => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const supported = Intl.supportedValuesOf('timeZone');
      const merged = new Set([...POPULAR_TIMEZONES, ...supported]);
      return Array.from(merged);
    }
  } catch (_error) {
    // ignore and fall through to defaults
  }
  return POPULAR_TIMEZONES;
})();

const STORAGE_KEY = 'edulure.calendar.draft';
const DURATION_PRESETS = [30, 45, 60, 90, 120, 150];

const DEFAULT_FORM = {
  id: undefined,
  title: '',
  description: '',
  type: EVENT_TYPES[0].value,
  startAt: '',
  endAt: '',
  timezone: DEFAULT_TIMEZONE,
  location: '',
  facilitator: '',
  capacity: '',
  resources: '',
  ctaLabel: '',
  ctaUrl: '',
  mediaUrl: '',
  tags: ''
};

const FORM_LABEL_CLASS = 'text-sm font-medium text-slate-700';
const FORM_INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function parseLocalDate(value) {
  if (!value) return null;
  const [datePart, timePart] = String(value).split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0] = timePart.split(':').map(Number);
  if ([year, month, day, hour, minute].some((segment) => Number.isNaN(segment))) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute);
}

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    return '';
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function deriveDurationMinutes(startAt, endAt) {
  const startDate = parseLocalDate(startAt);
  const endDate = parseLocalDate(endAt);
  if (!startDate || !endDate) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

function computeEndValue(startAt, durationMinutes) {
  const startDate = parseLocalDate(startAt);
  if (!startDate || !durationMinutes) {
    return '';
  }
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return formatLocalDate(endDate);
}

function formatDurationLabel(minutes) {
  if (!minutes) return 'Duration not set';
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatTimezoneLabel(zone) {
  if (!zone) return 'Local time';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short'
    }).formatToParts(new Date());
    const namePart = parts.find((part) => part.type === 'timeZoneName');
    return namePart ? `${zone} (${namePart.value})` : zone;
  } catch (_error) {
    return zone;
  }
}

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to load calendar draft', error);
    return null;
  }
}

function persistDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Unable to persist calendar draft', error);
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear calendar draft', error);
  }
}

const TIMEZONE_OPTION_LABELS = TIMEZONE_OPTIONS.map((zone) => ({ value: zone, label: formatTimezoneLabel(zone) }));

export default function CalendarEventDialog({ isOpen, mode, initialData, onSubmit, onClose }) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, ...initialData }));
  const [errors, setErrors] = useState({});
  const [durationMinutes, setDurationMinutes] = useState(() =>
    deriveDurationMinutes(initialData?.startAt, initialData?.endAt) ?? 60
  );
  const [autoSyncEnd, setAutoSyncEnd] = useState(() => !initialData?.id);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const dialogTitle = useMemo(
    () => (mode === 'edit' ? 'Update scheduled item' : 'Create new scheduled item'),
    [mode]
  );

  useFocusTrap(containerRef, { enabled: isOpen, initialFocus: closeButtonRef });

  useEffect(() => {
    if (!isOpen) return;
    const baseForm = {
      ...DEFAULT_FORM,
      ...initialData,
      tags: Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : initialData?.tags ?? ''
    };

    if (mode === 'create' && !initialData?.id && !draftLoaded) {
      const stored = loadDraft();
      if (stored?.form) {
        setForm({
          ...baseForm,
          ...stored.form,
          tags: Array.isArray(stored.form.tags)
            ? stored.form.tags.join(', ')
            : stored.form.tags ?? ''
        });
        setDurationMinutes(stored.durationMinutes ?? 60);
        setAutoSyncEnd(stored.autoSyncEnd ?? true);
        setErrors({});
        setDraftLoaded(true);
        return;
      }
      setDraftLoaded(true);
    }

    setForm(baseForm);
    setErrors({});
    setDurationMinutes(deriveDurationMinutes(baseForm.startAt, baseForm.endAt) ?? 60);
    setAutoSyncEnd(!initialData?.id);
  }, [initialData, isOpen, mode, draftLoaded]);

  useEffect(() => {
    if (!isOpen) return;
    announcePolite(`${dialogTitle} dialog opened`);
  }, [dialogTitle, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const updateField = useCallback(
    (name, value) => {
      setForm((prev) => {
        const next = { ...prev, [name]: value };
        if (name === 'startAt') {
          if (autoSyncEnd) {
            next.endAt = computeEndValue(value, durationMinutes) || prev.endAt;
          }
          const nextDuration = deriveDurationMinutes(value, prev.endAt);
          if (nextDuration) {
            setDurationMinutes(nextDuration);
          }
        }
        if (name === 'endAt') {
          const nextDuration = deriveDurationMinutes(prev.startAt, value);
          if (nextDuration) {
            setDurationMinutes(nextDuration);
          }
          setAutoSyncEnd(false);
        }
        if (name === 'timezone' && autoSyncEnd && prev.startAt) {
          next.endAt = computeEndValue(prev.startAt, durationMinutes) || prev.endAt;
        }
        return next;
      });
    },
    [autoSyncEnd, durationMinutes]
  );

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) {
      nextErrors.title = 'Title is required.';
    }
    if (!form.startAt) {
      nextErrors.startAt = 'Start time is required.';
    }
    if (!form.endAt) {
      nextErrors.endAt = 'End time is required.';
    }
    if (!form.timezone) {
      nextErrors.timezone = 'Timezone is required.';
    }
    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt);
      const end = new Date(form.endAt);
      if (start > end) {
        nextErrors.endAt = 'End time must be after the start time.';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    onSubmit?.(form);
    if (mode === 'create') {
      clearDraft();
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    persistDraft({ form, durationMinutes, autoSyncEnd });
  }, [form, durationMinutes, autoSyncEnd, isOpen, mode]);

  const timezoneSummary = useMemo(() => formatTimezoneLabel(form.timezone), [form.timezone]);
  const durationLabel = useMemo(() => formatDurationLabel(durationMinutes), [durationMinutes]);

  const scheduleSummary = useMemo(() => {
    const startDate = parseLocalDate(form.startAt);
    const endDate = parseLocalDate(form.endAt);
    if (!startDate) {
      return 'Awaiting start time to compose schedule summary.';
    }
    try {
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: form.timezone || undefined
      });
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: form.timezone || undefined
      });
      const parts = [dateFormatter.format(startDate)];
      parts.push(`${timeFormatter.format(startDate)}${endDate ? ` – ${timeFormatter.format(endDate)}` : ''}`);
      parts.push(durationLabel);
      return parts.filter(Boolean).join(' • ');
    } catch (_error) {
      return 'Schedule summary unavailable for the selected timezone.';
    }
  }, [form.startAt, form.endAt, form.timezone, durationLabel]);

  const relativeSummary = useMemo(() => {
    const startDate = parseLocalDate(form.startAt);
    if (!startDate) return null;
    const now = new Date();
    const diffMs = startDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Number.isNaN(diffMinutes)) return null;
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        return `Starts in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
      }
      const diffHours = diffMinutes / 60;
      if (diffHours < 24) {
        return `Starts in ${diffHours.toFixed(1)} hours`;
      }
      const diffDays = diffHours / 24;
      return `Starts in ${diffDays.toFixed(1)} days`;
    }
    if (diffMinutes === 0) {
      return 'Starts now';
    }
    if (diffMinutes > -60) {
      return `Started ${Math.abs(diffMinutes)} minute${diffMinutes === -1 ? '' : 's'} ago`;
    }
    const diffHours = Math.abs(diffMinutes) / 60;
    if (diffHours < 24) {
      return `Started ${diffHours.toFixed(1)} hours ago`;
    }
    const diffDays = diffHours / 24;
    return `Started ${diffDays.toFixed(1)} days ago`;
  }, [form.startAt]);

  const timezoneOptions = useMemo(() => TIMEZONE_OPTION_LABELS, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-dialog-title"
      onMouseDown={handleBackdropClick}
    >
      <form
        className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="calendar-dialog-title" className="text-xl font-semibold text-slate-900">
              {dialogTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture every element needed to launch, promote, and measure your community programming.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-pill"
            onClick={onClose}
            ref={closeButtonRef}
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-title">
              Title
            </label>
            <input
              id="calendar-title"
              className={FORM_INPUT_CLASS}
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="e.g. Live revenue architecture workshop"
              required
            />
            {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-type">
              Format
            </label>
            <select
              id="calendar-type"
              className={FORM_INPUT_CLASS}
              value={form.type}
              onChange={(event) => updateField('type', event.target.value)}
            >
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType.value} value={eventType.value}>
                  {eventType.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-facilitator">
              Host or facilitator
            </label>
            <input
              id="calendar-facilitator"
              className={FORM_INPUT_CLASS}
              value={form.facilitator}
              onChange={(event) => updateField('facilitator', event.target.value)}
              placeholder="Assign a host or moderator"
            />
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-start">
              Start time
            </label>
            <input
              id="calendar-start"
              type="datetime-local"
              className={FORM_INPUT_CLASS}
              value={form.startAt}
              onChange={(event) => updateField('startAt', event.target.value)}
              required
            />
            {errors.startAt ? <p className="mt-1 text-xs text-rose-600">{errors.startAt}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-end">
              End time
            </label>
            <input
              id="calendar-end"
              type="datetime-local"
              className={FORM_INPUT_CLASS}
              value={form.endAt}
              onChange={(event) => updateField('endAt', event.target.value)}
              required
            />
            {errors.endAt ? <p className="mt-1 text-xs text-rose-600">{errors.endAt}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-timezone">
              Timezone
            </label>
            <select
              id="calendar-timezone"
              className={FORM_INPUT_CLASS}
              value={form.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.timezone ? <p className="mt-1 text-xs text-rose-600">{errors.timezone}</p> : null}
          </div>

          <div>
            <fieldset>
              <legend className={`${FORM_LABEL_CLASS} flex items-center justify-between`}>
                Duration presets
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={autoSyncEnd}
                    onChange={(event) => setAutoSyncEnd(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Auto-sync end time
                </label>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => {
                  const isActive = durationMinutes === preset;
                  return (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        setDurationMinutes(preset);
                        if (autoSyncEnd && form.startAt) {
                          const nextEnd = computeEndValue(form.startAt, preset);
                          if (nextEnd) {
                            setForm((prev) => ({ ...prev, endAt: nextEnd }));
                          }
                        }
                      }}
                      className={
                        isActive
                          ? 'inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card'
                          : 'inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary'
                      }
                    >
                      {formatDurationLabel(preset)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-location">
              Location or stream link
            </label>
            <input
              id="calendar-location"
              className={FORM_INPUT_CLASS}
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Zoom, auditorium, or clubhouse"
            />
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-capacity">
              Capacity
            </label>
            <input
              id="calendar-capacity"
              className={FORM_INPUT_CLASS}
              value={form.capacity}
              onChange={(event) => updateField('capacity', event.target.value)}
              placeholder="e.g. 250 seats"
            />
          </div>

          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-description">
              Narrative & goals
            </label>
            <textarea
              id="calendar-description"
              className={`${FORM_INPUT_CLASS} min-h-[120px] resize-y`}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Outline the promise, audience, and expected outcomes."
            />
          </div>

          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-resources">
              Supporting resources
            </label>
            <textarea
              id="calendar-resources"
              className={`${FORM_INPUT_CLASS} min-h-[80px] resize-y`}
              value={form.resources}
              onChange={(event) => updateField('resources', event.target.value)}
              placeholder="Drop any prep docs, companion podcasts, or community posts."
            />
          </div>
          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-cta-label">
              Call-to-action label
            </label>
            <input
              id="calendar-cta-label"
              className={FORM_INPUT_CLASS}
              value={form.ctaLabel}
              onChange={(event) => updateField('ctaLabel', event.target.value)}
              placeholder="Join the cohort waitlist"
            />
          </div>
          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-cta-url">
              Call-to-action URL
            </label>
            <input
              id="calendar-cta-url"
              className={FORM_INPUT_CLASS}
              value={form.ctaUrl}
              onChange={(event) => updateField('ctaUrl', event.target.value)}
              placeholder="https://edulure.test/apply"
            />
          </div>
          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-media-url">
              Highlight media URL
            </label>
            <input
              id="calendar-media-url"
              className={FORM_INPUT_CLASS}
              value={form.mediaUrl}
              onChange={(event) => updateField('mediaUrl', event.target.value)}
              placeholder="https://cdn.edulure.test/assets/launch-trailer.mp4"
            />
            <p className="mt-1 text-xs text-slate-500">
              Supports hosted images, mp4 clips, or YouTube/Vimeo links for richer previews.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-tags">
              Tags
            </label>
            <input
              id="calendar-tags"
              className={FORM_INPUT_CLASS}
              value={form.tags}
              onChange={(event) => updateField('tags', event.target.value)}
              placeholder="community, revenue, onboarding"
            />
            <p className="mt-1 text-xs text-slate-500">Comma separate tags to power filters and feed promotion.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-600">{scheduleSummary}</p>
            <p className="mt-1">{timezoneSummary}</p>
            {relativeSummary ? <p className="mt-1 text-primary">{relativeSummary}</p> : null}
            <p className="mt-2 text-slate-400">
              Your calendar item is auto-saved for this device. Promote it instantly to the community feed once created.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="dashboard-pill" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dashboard-primary-pill">
              {mode === 'edit' ? 'Save changes' : 'Create schedule'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

CalendarEventDialog.propTypes = {
  isOpen: PropTypes.bool,
  mode: PropTypes.oneOf(['create', 'edit']),
  initialData: PropTypes.object,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func
};

CalendarEventDialog.defaultProps = {
  isOpen: false,
  mode: 'create',
  initialData: DEFAULT_FORM,
  onSubmit: undefined,
  onClose: undefined
};
