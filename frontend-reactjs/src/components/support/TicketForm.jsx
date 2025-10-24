import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpTrayIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { searchSupportKnowledgeBase } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function createAttachmentMeta(file, index) {
  const id =
    file?.id ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `upload-${Date.now()}-${index}`);
  return {
    id,
    name: file?.name ?? 'Attachment',
    size: Number.isFinite(file?.size) ? file.size : null,
    type: file?.type ?? null,
    file
  };
}

function normalisePriorityOptions(priorityOptions) {
  if (!Array.isArray(priorityOptions) || !priorityOptions.length) {
    return [
      { value: 'urgent', label: 'Urgent — service outage' },
      { value: 'high', label: 'High — blocking work' },
      { value: 'normal', label: 'Normal — needs response soon' },
      { value: 'low', label: 'Low — feedback or request' }
    ];
  }
  return priorityOptions.map((option) =>
    typeof option === 'string'
      ? { value: option, label: option }
      : { value: option.value, label: option.label ?? option.value }
  );
}

function normaliseCategoryOptions(categoryOptions) {
  if (!Array.isArray(categoryOptions) || !categoryOptions.length) {
    return ['General'];
  }
  return categoryOptions;
}

function mapKnowledgeSuggestions(articles = []) {
  if (!Array.isArray(articles)) {
    return [];
  }
  return articles
    .map((article, index) => {
      if (!article) {
        return null;
      }
      const id = article.id ?? article.slug ?? `kb-${index}`;
      return {
        id,
        title: article.title ?? 'Support guide',
        excerpt: article.excerpt ?? article.summary ?? article.description ?? '',
        url: article.url ?? '#',
        category: article.category ?? 'General',
        minutes: Number.isFinite(Number(article.minutes)) ? Number(article.minutes) : 3
      };
    })
    .filter(Boolean);
}

const SUPPORT_PREFERENCE_STORAGE_PREFIX = 'edulure:support-preferences:';
const VALIDATION_ERROR_MESSAGE = 'Add a subject and description to submit your request.';
const baseNotificationPreferences = Object.freeze({
  digest: 'daily',
  channels: {
    email: true,
    sms: false,
    inApp: true
  },
  categories: {
    incidents: true,
    productUpdates: true,
    billing: true
  }
});

const DIGEST_OPTIONS = [
  { value: 'immediate', label: 'Real-time alerts' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly summary' }
];

const CHANNEL_PREFERENCE_OPTIONS = [
  { id: 'email', label: 'Email updates' },
  { id: 'sms', label: 'SMS alerts' },
  { id: 'inApp', label: 'In-product banner' }
];

const CATEGORY_PREFERENCE_OPTIONS = [
  { id: 'incidents', label: 'Platform incidents' },
  { id: 'productUpdates', label: 'Product updates' },
  { id: 'billing', label: 'Billing & account' }
];

function createDefaultNotificationPreferences() {
  return {
    digest: baseNotificationPreferences.digest,
    channels: { ...baseNotificationPreferences.channels },
    categories: { ...baseNotificationPreferences.categories }
  };
}

function mergeNotificationPreferences(stored) {
  if (!stored || typeof stored !== 'object') {
    return createDefaultNotificationPreferences();
  }
  return {
    digest: typeof stored.digest === 'string' ? stored.digest : baseNotificationPreferences.digest,
    channels: { ...baseNotificationPreferences.channels, ...(stored.channels ?? {}) },
    categories: { ...baseNotificationPreferences.categories, ...(stored.categories ?? {}) }
  };
}

function getPreferenceStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function loadNotificationPreferences(storageKey) {
  const storage = getPreferenceStorage();
  if (!storage || !storageKey) {
    return null;
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to read support notification preferences', error);
    return null;
  }
}

function saveNotificationPreferences(storageKey, preferences) {
  const storage = getPreferenceStorage();
  if (!storage || !storageKey) {
    return false;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(preferences));
    return true;
  } catch (error) {
    console.warn('Failed to persist support notification preferences', error);
    return false;
  }
}

function AttachmentBadge({ attachment, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
      {attachment.name}
      <button
        type="button"
        className="text-slate-400 transition hover:text-slate-600"
        onClick={() => onRemove?.(attachment.id)}
        aria-label={`Remove ${attachment.name}`}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function TicketForm({
  open,
  onClose,
  onSubmit,
  serviceWindow = 'Weekdays 8am–8pm',
  firstResponseMinutes = 60,
  categoryOptions,
  priorityOptions,
  defaultCategory,
  defaultPriority
}) {
  const auth = useAuth();
  const token = auth?.session?.tokens?.accessToken ?? null;
  const userId = auth?.session?.user?.id ?? 'anonymous';
  const categories = useMemo(() => normaliseCategoryOptions(categoryOptions), [categoryOptions]);
  const priorities = useMemo(() => normalisePriorityOptions(priorityOptions), [priorityOptions]);
  const defaultCategoryValue = defaultCategory ?? categories[0] ?? 'General';
  const defaultPriorityValue = defaultPriority ?? priorities[0]?.value ?? 'normal';
  const preferenceStorageKey = useMemo(
    () => `${SUPPORT_PREFERENCE_STORAGE_PREFIX}${userId}`,
    [userId]
  );
  const dialogRef = useRef(null);
  const subjectInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(() =>
    createDefaultNotificationPreferences()
  );
  const [preferencesDirty, setPreferencesDirty] = useState(false);
  const [preferenceBanner, setPreferenceBanner] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    category: defaultCategoryValue,
    priority: defaultPriorityValue,
    description: '',
    attachments: []
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(0);
    setError(null);
    setSuggestions([]);
    setForm({
      subject: '',
      category: defaultCategoryValue,
      priority: defaultPriorityValue,
      description: '',
      attachments: []
    });
    const storedPreferences = loadNotificationPreferences(preferenceStorageKey);
    setNotificationPreferences(mergeNotificationPreferences(storedPreferences));
    setPreferencesDirty(false);
    setPreferenceBanner(null);
  }, [open, defaultCategoryValue, defaultPriorityValue, preferenceStorageKey]);

  useEffect(() => {
    if (!open || !token) {
      return undefined;
    }
    const query = `${form.subject} ${form.description}`.trim();
    if (!query) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    setLoadingSuggestions(true);
    searchSupportKnowledgeBase({
      token,
      query,
      category: form.category,
      limit: 5,
      signal: controller.signal
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        const articles = response?.data?.articles ?? response?.articles ?? [];
        setSuggestions(mapKnowledgeSuggestions(articles));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      });
    return () => controller.abort();
  }, [open, token, form.subject, form.description, form.category]);

  useEffect(() => {
    if (open && subjectInputRef.current) {
      subjectInputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }
      const node = dialogRef.current;
      if (!node) {
        return;
      }
      const focusable = node.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        return;
      }
      const focusableElements = Array.from(focusable);
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!submitting) {
          onClose?.();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, submitting, onClose]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, ...files.map((file, index) => createAttachmentMeta(file, index))]
    }));
    event.target.value = '';
  };

  const handleAttachmentRemove = (id) => {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  };

  const handleChannelToggle = (channel) => {
    setNotificationPreferences((current) => ({
      ...current,
      channels: { ...current.channels, [channel]: !current.channels?.[channel] }
    }));
    setPreferencesDirty(true);
    setPreferenceBanner(null);
  };

  const handleCategoryToggle = (category) => {
    setNotificationPreferences((current) => ({
      ...current,
      categories: { ...current.categories, [category]: !current.categories?.[category] }
    }));
    setPreferencesDirty(true);
    setPreferenceBanner(null);
  };

  const handleDigestChange = (event) => {
    const value = event.target.value;
    setNotificationPreferences((current) => ({ ...current, digest: value }));
    setPreferencesDirty(true);
    setPreferenceBanner(null);
  };

  const handleSavePreferences = () => {
    if (!notificationPreferences) {
      return;
    }
    const hasChannel = Object.values(notificationPreferences.channels ?? {}).some(Boolean);
    if (!hasChannel) {
      setPreferenceBanner({ status: 'error', message: 'Select at least one notification channel.' });
      return;
    }
    const hasCategory = Object.values(notificationPreferences.categories ?? {}).some(Boolean);
    if (!hasCategory) {
      setPreferenceBanner({ status: 'error', message: 'Choose at least one alert type.' });
      return;
    }
    const saved = saveNotificationPreferences(preferenceStorageKey, notificationPreferences);
    if (saved) {
      setPreferenceBanner({ status: 'success', message: 'Notification preferences saved.' });
      setPreferencesDirty(false);
    } else {
      setPreferenceBanner({ status: 'error', message: 'We could not save your preferences. Try again.' });
    }
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    onClose?.();
  };

  const handleContinue = () => {
    if (!form.subject.trim()) {
      setError(VALIDATION_ERROR_MESSAGE);
      return;
    }
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!form.subject.trim() || !form.description.trim()) {
      setError(VALIDATION_ERROR_MESSAGE);
      return;
    }
    setError(null);
    setSubmitting(true);
    const attachmentsPayload = form.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type
    }));
    try {
      await onSubmit?.({
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        attachments: attachmentsPayload,
        knowledgeSuggestions: suggestions,
        notificationPreferences
      });
      onClose?.();
    } catch (submitError) {
      setError(submitError?.message ?? 'We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isValidationError = error === VALIDATION_ERROR_MESSAGE;
  const subjectHasError = isValidationError && !form.subject.trim();
  const descriptionHasError = isValidationError && step === 1 && !form.description.trim();
  const subjectInputClasses = `mt-2 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
    subjectHasError
      ? 'border-rose-300 text-slate-900 shadow-sm focus:border-rose-400 focus:ring-rose-200/70'
      : 'border-slate-200 text-slate-900 shadow-sm focus:border-primary focus:ring-primary/30'
  }`;
  const descriptionTextareaClasses = `mt-2 rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
    descriptionHasError
      ? 'border-rose-300 text-slate-900 shadow-sm focus:border-rose-400 focus:ring-rose-200/70'
      : 'border-slate-200 text-slate-900 shadow-sm focus:border-primary focus:ring-primary/30'
  }`;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-10">
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-ticket-heading"
        aria-describedby="support-ticket-description"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New request</p>
            <h2 id="support-ticket-heading" className="mt-1 text-2xl font-semibold text-slate-900">
              Tell us what you need
            </h2>
            <p id="support-ticket-description" className="mt-2 text-sm text-slate-600">
              Capture the context for your learner success request. Attach logs, screenshots, or module IDs to accelerate
              triage.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className={`h-2 w-2 rounded-full ${step === 0 ? 'bg-primary' : 'bg-slate-300'}`} />
          Step {step + 1} of 2
        </div>

        {step === 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Subject
              <input
                name="subject"
                value={form.subject}
                onChange={handleFieldChange}
                placeholder="Summarise your request"
                ref={subjectInputRef}
                className={subjectInputClasses}
                aria-invalid={subjectHasError}
                aria-describedby={subjectHasError ? 'ticket-subject-error' : undefined}
              />
              {subjectHasError ? (
                <p id="ticket-subject-error" className="mt-1 text-xs text-rose-600">
                  Add a subject so we can route your request.
                </p>
              ) : null}
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Category
              <select
                name="category"
                value={form.category}
                onChange={handleFieldChange}
                className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Priority
              <select
                name="priority"
                value={form.priority}
                onChange={handleFieldChange}
                className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {priorities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Response commitments</p>
              <p className="mt-2">
                {serviceWindow}. First response under {firstResponseMinutes} minutes on average.
              </p>
            </div>
            <div className="md:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Notification preferences</p>
                  <p className="mt-1 text-xs text-slate-500">Choose how we keep you updated while the ticket moves through triage.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={!preferencesDirty}
                  className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Save preferences
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                  {CHANNEL_PREFERENCE_OPTIONS.map((option) => {
                    const enabled = Boolean(notificationPreferences.channels?.[option.id]);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          enabled
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <span>{option.label}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleChannelToggle(option.id)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alert types</p>
                  {CATEGORY_PREFERENCE_OPTIONS.map((option) => {
                    const enabled = Boolean(notificationPreferences.categories?.[option.id]);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          enabled
                            ? 'border-sky-300 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <span>{option.label}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleCategoryToggle(option.id)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    );
                  })}
                </div>
                <fieldset className="md:col-span-2 space-y-2 text-xs text-slate-600">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Digest cadence</legend>
                  <div className="flex flex-wrap gap-3">
                    {DIGEST_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          notificationPreferences.digest === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="support-digest"
                          value={option.value}
                          checked={notificationPreferences.digest === option.value}
                          onChange={handleDigestChange}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              {preferenceBanner ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    preferenceBanner.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {preferenceBanner.message}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Describe the issue
              <textarea
                name="description"
                rows={6}
                value={form.description}
                onChange={handleFieldChange}
                className={descriptionTextareaClasses}
                placeholder="Share context, learners impacted, timelines, and any troubleshooting so far."
                aria-invalid={descriptionHasError}
                aria-describedby={descriptionHasError ? 'ticket-description-error' : undefined}
              />
              {descriptionHasError ? (
                <p id="ticket-description-error" className="mt-1 text-xs text-rose-600">
                  Describe what happened so we can assist quickly.
                </p>
              ) : null}
            </label>

            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-primary">
                <SparklesIcon className="h-5 w-5" />
                Suggested fixes
              </div>
              <p className="mt-2 text-xs text-primary/80">
                We surface knowledge base guidance while you draft so you and the support desk share the same playbooks.
              </p>
              <div className="mt-4 space-y-3">
                {loadingSuggestions ? (
                  <p className="text-xs text-slate-500">Searching the knowledge base…</p>
                ) : suggestions.length ? (
                  suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{suggestion.title}</p>
                        <span className="text-xs font-medium text-slate-400">{suggestion.minutes} min</span>
                      </div>
                      {suggestion.excerpt ? (
                        <p className="mt-1 text-xs text-slate-500">{suggestion.excerpt}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">
                    No instant matches yet. Add more detail and we will fetch tailored runbooks.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10">
                  <ArrowUpTrayIcon className="h-4 w-4" /> Upload files
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>
                <span className="text-xs text-slate-400">Screenshots, CSVs, up to 10 MB each.</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.attachments.map((attachment) => (
                  <AttachmentBadge key={attachment.id} attachment={attachment} onRemove={handleAttachmentRemove} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p
            className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => (step === 0 ? handleClose() : setStep(0))}
          >
            {step === 0 ? 'Close' : 'Back'}
          </button>
          {step === 0 ? (
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
