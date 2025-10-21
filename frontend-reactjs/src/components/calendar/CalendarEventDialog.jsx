import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

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
  tags: ''
};

const FORM_LABEL_CLASS = 'text-sm font-medium text-slate-700';
const FORM_INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

export default function CalendarEventDialog({ isOpen, mode, initialData, onSubmit, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, ...initialData }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULT_FORM,
        ...initialData,
        tags: Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : initialData?.tags ?? ''
      });
      setErrors({});
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    }
  }, [initialData, isOpen]);

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

  const dialogTitle = useMemo(
    () => (mode === 'edit' ? 'Update scheduled item' : 'Create new scheduled item'),
    [mode]
  );

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

  return (
    <div
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
            ref={dialogRef}
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
            Your calendar item is auto-saved for this device. Promote it instantly to the community feed once created.
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
