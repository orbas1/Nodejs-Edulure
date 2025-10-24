import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { announcePolite, useFocusTrap } from '../../utils/a11y.js';
import { buildIcsCalendar, describeEventDuration, listSupportedTimezones } from '../../utils/calendar.js';
import { downloadTextFile } from '../../utils/download.js';

const EVENT_TYPES = [
  { value: 'classroom', label: 'Classroom session' },
  { value: 'livestream', label: 'Community live stream' },
  { value: 'podcast', label: 'Community podcast' },
  { value: 'event', label: 'Community event' }
];

const DEFAULT_TIMEZONE = (() => {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions()?.timeZone;
    return typeof detected === 'string' && detected ? detected : 'Etc/UTC';
  } catch (_error) {
    return 'Etc/UTC';
  }
})();

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
  timezone: DEFAULT_TIMEZONE,
  joinUrl: '',
  organizerEmail: ''
};

const FORM_LABEL_CLASS = 'text-sm font-medium text-slate-700';
const FORM_INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function parseTagList(input) {
  if (Array.isArray(input)) {
    return input.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (!input) return [];
  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseResourceList(input) {
  if (Array.isArray(input)) {
    return input.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (!input) return [];
  return String(input)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hydrateInitialForm(data = {}) {
  const tags = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags ?? '';
  const resources = Array.isArray(data.resources) ? data.resources.join('\n') : data.resources ?? '';
  const timezone = data.timezone ?? data.timeZone ?? DEFAULT_TIMEZONE;
  return {
    ...DEFAULT_FORM,
    ...data,
    tags,
    resources,
    timezone,
    joinUrl: data.joinUrl ?? data.ctaUrl ?? DEFAULT_FORM.joinUrl,
    organizerEmail: data.organizerEmail ?? data.facilitatorEmail ?? DEFAULT_FORM.organizerEmail
  };
}

export default function CalendarEventDialog({ isOpen, mode, initialData, onSubmit, onClose }) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState(() => hydrateInitialForm(initialData));
  const [errors, setErrors] = useState({});
  const dialogTitle = useMemo(
    () => (mode === 'edit' ? 'Update scheduled item' : 'Create new scheduled item'),
    [mode]
  );

  const supportedTimezones = useMemo(() => listSupportedTimezones(), []);
  const viewerTimezone = useMemo(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions()?.timeZone;
      return typeof detected === 'string' && detected ? detected : DEFAULT_TIMEZONE;
    } catch (_error) {
      return DEFAULT_TIMEZONE;
    }
  }, []);
  const eventTimezone = form.timezone || viewerTimezone;
  const timezoneOptions = useMemo(() => {
    if (!eventTimezone) {
      return supportedTimezones;
    }
    if (supportedTimezones.includes(eventTimezone)) {
      return supportedTimezones;
    }
    return [eventTimezone, ...supportedTimezones];
  }, [eventTimezone, supportedTimezones]);
  const startDate = useMemo(() => toDate(form.startAt), [form.startAt]);
  const endDate = useMemo(() => toDate(form.endAt), [form.endAt]);
  const durationLabel = useMemo(() => describeEventDuration(form.startAt, form.endAt), [form.startAt, form.endAt]);
  const tagsList = useMemo(() => parseTagList(form.tags), [form.tags]);
  const resourcesList = useMemo(() => parseResourceList(form.resources), [form.resources]);
  const joinLink = form.joinUrl?.trim() || form.ctaUrl?.trim() || '';
  const startInEventTimezone = useMemo(() => {
    if (!startDate) return 'Schedule to be confirmed';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: eventTimezone
      }).format(startDate);
    } catch (_error) {
      return startDate.toLocaleString();
    }
  }, [eventTimezone, startDate]);
  const startInViewerTimezone = useMemo(() => {
    if (!startDate) return 'Schedule to be confirmed';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: viewerTimezone
      }).format(startDate);
    } catch (_error) {
      return startDate.toLocaleString();
    }
  }, [startDate, viewerTimezone]);

  useFocusTrap(containerRef, { enabled: isOpen, initialFocus: closeButtonRef });

  useEffect(() => {
    if (isOpen) {
      setForm(hydrateInitialForm(initialData));
      setErrors({});
    }
  }, [initialData, isOpen]);

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
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() ?? '',
      location: form.location?.trim() ?? '',
      facilitator: form.facilitator?.trim() ?? '',
      timezone: eventTimezone,
      tags: tagsList,
      resources: resourcesList,
      joinUrl: form.joinUrl?.trim() || null,
      organizerEmail: form.organizerEmail?.trim() || null,
      ctaLabel: form.ctaLabel?.trim() || '',
      ctaUrl: form.ctaUrl?.trim() || '',
      mediaUrl: form.mediaUrl?.trim() || ''
    };
    onSubmit?.(payload);
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleDownloadEvent = () => {
    const trimmedTitle = form.title.trim();
    const hasStart = Boolean(form.startAt);
    const hasEnd = Boolean(form.endAt);
    const nextErrors = { ...errors };
    let hasError = false;
    if (!trimmedTitle) {
      nextErrors.title = nextErrors.title ?? 'Title is required.';
      hasError = true;
    }
    if (!hasStart) {
      nextErrors.startAt = nextErrors.startAt ?? 'Start time is required for calendar downloads.';
      hasError = true;
    }
    if (!hasEnd) {
      nextErrors.endAt = nextErrors.endAt ?? 'End time is required for calendar downloads.';
      hasError = true;
    }
    if (hasError) {
      setErrors(nextErrors);
      announcePolite('Complete the required fields before downloading the calendar file.');
      return;
    }

    const descriptionParts = [
      form.description?.trim() || null,
      resourcesList.length ? `Resources: ${resourcesList.join(', ')}` : null,
      joinLink ? `Join: ${joinLink}` : null,
      form.ctaLabel && form.ctaUrl ? `${form.ctaLabel}: ${form.ctaUrl}` : null
    ].filter(Boolean);

    const calendarEvent = {
      uid: `${form.id ?? `draft-${Date.now()}`}@edulure`,
      startAt: form.startAt,
      endAt: form.endAt,
      timezone: eventTimezone,
      summary: trimmedTitle,
      description: descriptionParts.join('\n'),
      location: form.location?.trim() || undefined,
      url: joinLink || undefined,
      categories: tagsList,
      organizer: form.facilitator
        ? { name: form.facilitator, email: form.organizerEmail?.trim() || undefined }
        : null,
      reminders: [
        { minutesBefore: 60, description: 'Session starting soon' },
        { minutesBefore: 10, description: 'Final reminder before go-live' }
      ]
    };

    const ics = buildIcsCalendar([calendarEvent], {
      prodId: '-//Edulure//CalendarEventDialog//EN',
      name: 'Edulure Programming'
    });
    const titleSlug = trimmedTitle
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'edulure-session';
    const fileDate = startDate ? startDate.toISOString().slice(0, 10) : 'draft';
    const safeFileName = `${titleSlug}-${fileDate}.ics`;
    const saved = downloadTextFile({
      content: ics,
      fileName: safeFileName,
      mimeType: 'text/calendar;charset=utf-8'
    });
    announcePolite(saved ? 'Calendar event downloaded.' : 'Unable to download the calendar event in this browser.');
  };

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
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-organizer-email">
              Organizer email
            </label>
            <input
              id="calendar-organizer-email"
              className={FORM_INPUT_CLASS}
              value={form.organizerEmail}
              onChange={(event) => updateField('organizerEmail', event.target.value)}
              placeholder="host@edulure.com"
            />
            <p className="mt-1 text-xs text-slate-500">Appears on downloaded calendar invites.</p>
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
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
            {errors.timezone ? (
              <p className="mt-1 text-xs text-rose-600">{errors.timezone}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                {eventTimezone === viewerTimezone
                  ? 'Matches your local timezone.'
                  : `Viewers will see this as ${startInViewerTimezone}.`}
              </p>
            )}
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
            <label className={FORM_LABEL_CLASS} htmlFor="calendar-join-url">
              Join URL
            </label>
            <input
              id="calendar-join-url"
              className={FORM_INPUT_CLASS}
              value={form.joinUrl}
              onChange={(event) => updateField('joinUrl', event.target.value)}
              placeholder="https://meet.edulure.com/session"
            />
            <p className="mt-1 text-xs text-slate-500">Used for calendar exports and learner reminders.</p>
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

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Session readiness snapshot</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled timezone ({eventTimezone})</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{startInEventTimezone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your timezone ({viewerTimezone})</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{startInViewerTimezone}</dd>
            </div>
            {durationLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated duration</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{durationLabel}</dd>
              </div>
            ) : null}
            {resourcesList.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prep materials</dt>
                <dd className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  {resourcesList.map((resource) => (
                    <span key={resource} className="rounded-full bg-slate-200 px-3 py-1">
                      {resource}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {tagsList.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tagged focus areas</dt>
                <dd className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  {tagsList.map((tag) => (
                    <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Your calendar item is auto-saved for this device. Promote it instantly to the community feed once created.
          </div>
          <div className="flex gap-3">
            <button type="button" className="dashboard-pill" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="dashboard-pill" onClick={handleDownloadEvent}>
              Download .ics
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
