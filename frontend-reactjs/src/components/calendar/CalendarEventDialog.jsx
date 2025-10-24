import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { announcePolite, useFocusTrap } from '../../utils/a11y.js';

const EVENT_TYPES = [
  { value: 'classroom', label: 'Classroom session' },
  { value: 'livestream', label: 'Community live stream' },
  { value: 'podcast', label: 'Community podcast' },
  { value: 'event', label: 'Community event' }
];

const DEFAULT_FORM = {
  id: undefined,
  title: '',
  description: '',
  type: EVENT_TYPES[0].value,
  startAt: '',
  endAt: '',
  location: '',
  facilitator: '',
  capacity: '',
  resources: '',
  ctaLabel: '',
  ctaUrl: '',
  mediaUrl: '',
  tags: '',
  timezone: '',
  joinUrl: '',
  reminderMinutes: 15
};

const FORM_LABEL_CLASS = 'text-sm font-medium text-slate-700';
const FORM_INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

function formatIcsDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (num) => String(num).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function buildIcsContent(form) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Edulure//Schedule Utility//EN'];
  const uid = form.id ?? `${Date.now()}@edulure`;
  const dtStamp = formatIcsDate(new Date().toISOString());
  const dtStart = formatIcsDate(form.startAt);
  const dtEnd = formatIcsDate(form.endAt);
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${uid}`);
  if (dtStamp) {
    lines.push(`DTSTAMP:${dtStamp}`);
  }
  if (dtStart) {
    lines.push(`DTSTART:${dtStart}`);
  }
  if (dtEnd) {
    lines.push(`DTEND:${dtEnd}`);
  }
  lines.push(`SUMMARY:${form.title}`);
  if (form.description) {
    lines.push(`DESCRIPTION:${form.description.replace(/\n/g, '\\n')}`);
  }
  if (form.location) {
    lines.push(`LOCATION:${form.location}`);
  }
  if (form.joinUrl || form.ctaUrl) {
    lines.push(`URL:${form.joinUrl || form.ctaUrl}`);
  }
  if (form.timezone) {
    lines.push(`X-EDULURE-TIMEZONE:${form.timezone}`);
  }
  if (form.tags) {
    lines.push(`CATEGORIES:${form.tags}`);
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatDuration(startAt, endAt) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const minutes = Math.round(diffMs / 60000);
  if (!minutes) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) {
    return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
  }
  if (!remainingMinutes) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export default function CalendarEventDialog({ isOpen, mode, initialData, onSubmit, onClose }) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, ...initialData }));
  const [errors, setErrors] = useState({});
  const [copyStatus, setCopyStatus] = useState('idle');
  const dialogTitle = useMemo(
    () => (mode === 'edit' ? 'Update scheduled item' : 'Create new scheduled item'),
    [mode]
  );
  const deviceTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Unable to resolve device timezone', error);
      return 'UTC';
    }
  }, []);

  const timezoneOptions = useMemo(() => {
    const merged = new Set(COMMON_TIMEZONES);
    if (initialData?.timezone) {
      merged.add(initialData.timezone);
    }
    if (deviceTimezone) {
      merged.add(deviceTimezone);
    }
    return Array.from(merged);
  }, [deviceTimezone, initialData?.timezone]);

  useFocusTrap(containerRef, { enabled: isOpen, initialFocus: closeButtonRef });

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULT_FORM,
        ...initialData,
        tags: Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : initialData?.tags ?? ''
      });
      setErrors({});
      setCopyStatus('idle');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setForm((prev) => ({
      ...prev,
      timezone: prev.timezone || deviceTimezone,
      reminderMinutes: Number.isFinite(Number(prev.reminderMinutes)) ? Number(prev.reminderMinutes) : 15
    }));
  }, [deviceTimezone, isOpen]);

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

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleDownloadIcs = () => {
    const ics = buildIcsContent(form);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = form.title ? form.title.replace(/[^a-z0-9-_]+/gi, '-') : 'scheduled-event';
    link.href = url;
    link.download = `${safeTitle || 'scheduled-event'}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleCopyJoinLink = async () => {
    const target = form.joinUrl || form.ctaUrl || form.location;
    if (!target) {
      setCopyStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(target);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch (error) {
      console.warn('Unable to copy join link', error);
      setCopyStatus('error');
    }
  };

  const eventDuration = useMemo(() => formatDuration(form.startAt, form.endAt), [form.endAt, form.startAt]);

  const reminderLabel = useMemo(() => {
    if (!Number.isFinite(Number(form.reminderMinutes))) {
      return 'Reminder disabled';
    }
    const minutes = Number(form.reminderMinutes);
    if (minutes <= 0) {
      return 'Reminder disabled';
    }
    if (minutes < 60) {
      return `${minutes} minute reminder`;
    }
    const hours = Math.round(minutes / 60);
    return `${hours} hour reminder`;
  }, [form.reminderMinutes]);

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
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Scheduled in {form.timezone || deviceTimezone} · {reminderLabel}
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

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-timezone">
              Timezone
            </label>
            <select
              id="calendar-timezone"
              className={FORM_INPUT_CLASS}
              value={form.timezone || ''}
              onChange={(event) => updateField('timezone', event.target.value)}
            >
              <option value="">Follow device ({deviceTimezone})</option>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-reminder">
              Reminder
            </label>
            <select
              id="calendar-reminder"
              className={FORM_INPUT_CLASS}
              value={form.reminderMinutes}
              onChange={(event) => updateField('reminderMinutes', Number(event.target.value))}
            >
              {[0, 5, 10, 15, 30, 60, 120, 1440].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes === 0
                    ? 'No reminder'
                    : minutes < 60
                      ? `${minutes} minute${minutes === 1 ? '' : 's'}`
                      : `${Math.round(minutes / 60)} hour${minutes / 60 === 1 ? '' : 's'}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-join-url">
              Join or classroom URL
            </label>
            <input
              id="calendar-join-url"
              className={FORM_INPUT_CLASS}
              value={form.joinUrl}
              onChange={(event) => updateField('joinUrl', event.target.value)}
              placeholder="https://meet.edulure.test/session"
            />
            <p className="mt-1 text-xs text-slate-500">Add the live classroom link for attendees.</p>
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

        <div className="mt-8 space-y-5 border-t border-slate-200 pt-6">
          <div className="grid gap-4 rounded-3xl bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick summary</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {form.startAt
                  ? new Date(form.startAt).toLocaleString(undefined, { timeZone: form.timezone || deviceTimezone })
                  : 'Start time TBC'}
              </p>
              {eventDuration ? <p className="text-xs text-slate-500">Duration · {eventDuration}</p> : null}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Attendee access</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {form.joinUrl || form.ctaUrl || form.location || 'Add a classroom link to keep learners informed.'}
              </p>
              <p className="text-xs text-slate-500">Reminder · {reminderLabel}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Your calendar item is auto-saved for this device. Promote it instantly to the community feed once created.
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="dashboard-pill" onClick={handleCopyJoinLink}>
                {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Link unavailable' : 'Copy join link'}
              </button>
              <button type="button" className="dashboard-pill" onClick={handleDownloadIcs}>
                Download calendar invite
              </button>
              <button type="button" className="dashboard-pill" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="dashboard-primary-pill">
                {mode === 'edit' ? 'Save changes' : 'Create schedule'}
              </button>
            </div>
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
