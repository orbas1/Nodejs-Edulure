import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const RESOURCE_TYPES = [
  { value: 'content_asset', label: 'Uploaded asset' },
  { value: 'external_link', label: 'External link' },
  { value: 'document', label: 'Document link' },
  { value: 'classroom_session', label: 'Classroom session' }
];

const VISIBILITY_OPTIONS = [
  { value: 'members', label: 'Community members' },
  { value: 'admins', label: 'Admins only' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' }
];

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normaliseTags(input) {
  if (!input) return [];
  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .slice(0, 15);
}

function sanitizeUrl(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed, trimmed.startsWith('http') ? undefined : 'https://');
    return url.href;
  } catch (_error) {
    return trimmed;
  }
}

const EMPTY_FORM = {
  title: '',
  description: '',
  resourceType: 'content_asset',
  assetId: '',
  linkUrl: '',
  classroomReference: '',
  visibility: 'members',
  status: 'published',
  publishedAt: '',
  tags: '',
  embedUrl: '',
  clearAsset: false,
  clearLink: false
};

function buildInitialState(initialValue) {
  if (!initialValue) {
    return { ...EMPTY_FORM };
  }

  const metadata = typeof initialValue.metadata === 'object' && initialValue.metadata !== null ? initialValue.metadata : {};

  return {
    title: initialValue.title ?? '',
    description: initialValue.description ?? '',
    resourceType: initialValue.resourceType ?? 'content_asset',
    assetId: initialValue.assetId ? String(initialValue.assetId) : '',
    linkUrl: initialValue.linkUrl ?? '',
    classroomReference: initialValue.classroomReference ?? '',
    visibility: initialValue.visibility ?? 'members',
    status: initialValue.status ?? 'published',
    publishedAt: formatDateTimeLocal(initialValue.publishedAt ?? null),
    tags: Array.isArray(initialValue.tags) ? initialValue.tags.join(', ') : '',
    embedUrl: metadata.embedUrl ?? '',
    clearAsset: false,
    clearLink: false
  };
}

export default function CommunityResourceEditor({
  mode = 'create',
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  title
}) {
  const [form, setForm] = useState(() => buildInitialState(initialValue));
  const [validationError, setValidationError] = useState(null);
  const initialMetadata = useMemo(
    () => (typeof initialValue?.metadata === 'object' && initialValue.metadata !== null ? initialValue.metadata : {}),
    [initialValue]
  );
  const hadInitialMetadata = useMemo(() => Object.keys(initialMetadata).length > 0, [initialMetadata]);

  useEffect(() => {
    setForm(buildInitialState(initialValue));
  }, [initialValue]);

  const isContentAsset = useMemo(() => form.resourceType === 'content_asset', [form.resourceType]);
  const isClassroomSession = useMemo(() => form.resourceType === 'classroom_session', [form.resourceType]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setValidationError('A title is required.');
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: form.description.trim() || null,
      resourceType: form.resourceType,
      visibility: form.visibility,
      status: form.status,
      classroomReference: form.classroomReference.trim() || null,
      tags: normaliseTags(form.tags)
    };

    const publishedAtIso = toIsoString(form.publishedAt);
    if (form.status === 'published' && publishedAtIso) {
      payload.publishedAt = publishedAtIso;
    } else if (form.status !== 'published') {
      payload.publishedAt = null;
    }

    const metadataPayload = { ...initialMetadata };
    const embedUrl = sanitizeUrl(form.embedUrl);
    if (embedUrl) {
      metadataPayload.embedUrl = embedUrl;
    } else if ('embedUrl' in metadataPayload) {
      delete metadataPayload.embedUrl;
    }
    if (Object.keys(metadataPayload).length > 0 || (hadInitialMetadata && Object.keys(metadataPayload).length === 0)) {
      payload.metadata = metadataPayload;
    }

    if (isContentAsset) {
      payload.assetId = form.assetId ? Number(form.assetId) : undefined;
      payload.clearAsset = Boolean(form.clearAsset);
      if (!form.clearAsset && !payload.assetId && mode === 'create') {
        setValidationError('Provide a content asset ID or clear the asset requirement.');
        return;
      }
    } else {
      const normalisedUrl = sanitizeUrl(form.linkUrl);
      payload.linkUrl = form.clearLink ? null : normalisedUrl;
      payload.clearLink = Boolean(form.clearLink);
      if (!payload.linkUrl && !payload.clearLink) {
        setValidationError('Provide a valid resource link or mark the link as cleared.');
        return;
      }
    }

    payload.classroomReference = form.classroomReference.trim() || null;

    if (typeof onSubmit === 'function') {
      onSubmit(payload);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title ?? (mode === 'create' ? 'Add resource' : 'Update resource')}</h2>
        <p className="text-sm text-slate-600">
          Curate assets, live classroom references, or external links for your community library. Published resources
          appear instantly for members.
        </p>
      </div>

      {(error || validationError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
          {validationError ?? error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Resource title
          <input
            type="text"
            value={form.title}
            onChange={handleChange('title')}
            maxLength={200}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Visibility
          <select
            value={form.visibility}
            onChange={handleChange('visibility')}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Description
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Describe the value members will get from this resource."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Resource type
          <select
            value={form.resourceType}
            onChange={handleChange('resourceType')}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Publishing status
          <select
            value={form.status}
            onChange={handleChange('status')}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Publish at (optional)
          <input
            type="datetime-local"
            value={form.publishedAt}
            onChange={handleChange('publishedAt')}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={form.status !== 'published'}
          />
        </label>
      </div>

      {isContentAsset ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Content asset ID
            <input
              type="number"
              value={form.assetId}
              onChange={handleChange('assetId')}
              min={0}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. 482"
            />
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={form.clearAsset} onChange={handleChange('clearAsset')} className="rounded border-slate-300 text-primary focus:ring-primary/30" />
            Clear existing asset link
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resource link
            <input
              type="url"
              value={form.linkUrl}
              onChange={handleChange('linkUrl')}
              placeholder="https://"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={form.clearLink} onChange={handleChange('clearLink')} className="rounded border-slate-300 text-primary focus:ring-primary/30" />
            Clear link reference
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tags (comma separated)
          <input
            type="text"
            value={form.tags}
            onChange={handleChange('tags')}
            placeholder="ops, launch, automation"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Featured embed (optional)
          <input
            type="url"
            value={form.embedUrl}
            onChange={handleChange('embedUrl')}
            placeholder="https://video.example.com/embed"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Classroom reference (optional)
        <input
          type="text"
          value={form.classroomReference}
          onChange={handleChange('classroomReference')}
          placeholder={isClassroomSession ? 'Session code or meeting link reference' : 'Internal reference'}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Publish resource' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

CommunityResourceEditor.propTypes = {
  mode: PropTypes.oneOf(['create', 'edit']),
  initialValue: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    description: PropTypes.string,
    resourceType: PropTypes.string,
    assetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    linkUrl: PropTypes.string,
    classroomReference: PropTypes.string,
    visibility: PropTypes.string,
    status: PropTypes.string,
    publishedAt: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    metadata: PropTypes.object
  }),
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
  title: PropTypes.string
};
