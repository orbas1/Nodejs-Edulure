import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  DocumentTextIcon,
  LinkIcon,
  DocumentDuplicateIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';

const RESOURCE_TYPES = [
  {
    value: 'content_asset',
    label: 'Content asset',
    helper: 'Attach a studio asset already in your catalogue.',
    icon: DocumentDuplicateIcon,
    requiresAssetId: true
  },
  {
    value: 'external_link',
    label: 'External link',
    helper: 'Link to an external doc, guide, or handbook entry.',
    icon: LinkIcon,
    requiresAssetId: false
  },
  {
    value: 'document',
    label: 'Document',
    helper: 'Upload a static PDF or policy document for moderators.',
    icon: DocumentTextIcon,
    requiresAssetId: false
  },
  {
    value: 'classroom_session',
    label: 'Classroom session',
    helper: 'Reference a recorded live session or workshop replay.',
    icon: PlayCircleIcon,
    requiresAssetId: false
  }
];

const RESOURCE_TYPE_MAP = RESOURCE_TYPES.reduce((acc, entry) => {
  acc[entry.value] = entry;
  return acc;
}, {});

const DEFAULT_RESOURCE_ICON = DocumentTextIcon;

function generateResourceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol);
  } catch (_error) {
    return false;
  }
}

function normaliseResource(resource = {}) {
  const type = RESOURCE_TYPE_MAP[resource.resourceType] ?? RESOURCE_TYPE_MAP.content_asset;
  return {
    id: resource.id ?? resource.slug ?? resource.title ?? generateResourceId(),
    title: resource.title ?? 'Untitled resource',
    description: resource.description ?? '',
    resourceType: resource.resourceType ?? 'content_asset',
    tags: parseTags(resource.tags),
    linkUrl: resource.linkUrl ?? resource.url ?? '',
    assetId: resource.assetId ?? resource.asset_id ?? resource.assetID ?? '',
    visibility: resource.visibility ?? 'members',
    createdAt: resource.createdAt ?? resource.publishedAt ?? null,
    updatedAt: resource.updatedAt ?? null,
    icon: type.icon ?? DEFAULT_RESOURCE_ICON
  };
}

function formatDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString();
}

export default function ResourceLibraryPanel({
  resources,
  loading,
  error,
  onRefresh,
  formValue,
  onFormChange,
  onSubmit,
  interactive
}) {
  const safeResources = Array.isArray(resources)
    ? resources.map((resource) => normaliseResource(resource)).filter((resource) => resource.id)
    : [];
  const safeFormValue = {
    title: formValue.title ?? '',
    description: formValue.description ?? '',
    resourceType: formValue.resourceType ?? 'content_asset',
    linkUrl: formValue.linkUrl ?? '',
    assetId: formValue.assetId ?? '',
    tags: formValue.tags ?? '',
    visibility: formValue.visibility ?? 'members'
  };

  const isLoadingInitial = loading && safeResources.length === 0;
  const selectedType = RESOURCE_TYPE_MAP[safeFormValue.resourceType] ?? RESOURCE_TYPE_MAP.content_asset;

  const normalisedFormPayload = {
    ...safeFormValue,
    title: safeFormValue.title.trim(),
    description: safeFormValue.description.trim(),
    linkUrl: safeFormValue.linkUrl.trim(),
    assetId: selectedType.requiresAssetId ? String(safeFormValue.assetId).trim() : '',
    tags: parseTags(safeFormValue.tags)
  };

  const isFormValid =
    normalisedFormPayload.title.length > 2 &&
    (!selectedType.requiresAssetId || normalisedFormPayload.assetId.length > 0) &&
    (selectedType.requiresAssetId || normalisedFormPayload.linkUrl.length === 0 || isValidHttpUrl(normalisedFormPayload.linkUrl));

  const handleRefresh = () => {
    if (!interactive) return;
    onRefresh();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!interactive) return;
    if (!isFormValid) {
      return;
    }
    onSubmit(normalisedFormPayload);
  };

  const handleResourceTypeChange = (event) => {
    if (!interactive) return;
    const nextType = event.target.value;
    const nextState = {
      ...formValue,
      resourceType: nextType
    };
    if (RESOURCE_TYPE_MAP[nextType]?.requiresAssetId) {
      nextState.linkUrl = '';
    } else {
      nextState.assetId = '';
    }
    onFormChange(nextState);
  };

  const handleFieldChange = (key) => (event) => {
    onFormChange({ ...formValue, [key]: event.target.value });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker text-slate-500">Knowledge base</p>
          <h3 className="text-lg font-semibold text-slate-900">Pinned resources</h3>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!interactive}
          aria-disabled={!interactive}
          aria-busy={loading}
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <p className="mt-2 text-xs text-slate-500">
        Share onboarding playbooks, studio assets, and curated references so moderators can respond fast. Visibility rules
        follow community RBAC so only approved cohorts can access restricted docs.
      </p>

      <div className="mt-2 text-xs" aria-live="polite">
        {error ? (
          <p className="text-rose-600">
            {typeof error === 'string' ? error : error?.message ?? 'Unable to load resources. Refresh to retry.'}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {isLoadingInitial ? (
          <p className="text-xs text-slate-500">Fetching resource library…</p>
        ) : safeResources.length === 0 ? (
          <p className="text-xs text-slate-500">No resources uploaded yet. Add your first knowledge base entry.</p>
        ) : (
          <ul className="space-y-2">
            {safeResources.map((resource) => {
              const publishedAt = formatDate(resource.createdAt ?? resource.updatedAt);
              const ResourceIcon = resource.icon ?? DEFAULT_RESOURCE_ICON;
              return (
                <li
                  key={resource.id ?? resource.title}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      <ResourceIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{resource.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">{resource.resourceType ?? 'external'}</p>
                      {resource.description ? (
                        <p className="mt-1 text-[11px] text-slate-500">{resource.description}</p>
                      ) : null}
                      {resource.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {resource.tags.map((tag) => (
                            <span key={`${resource.id}-${tag}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    {resource.linkUrl ? (
                      <a
                        href={resource.linkUrl}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open
                      </a>
                    ) : null}
                    {publishedAt ? <p className="mt-1">{publishedAt}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publish resource</p>
        <p className="text-[11px] text-slate-500">{selectedType.helper}</p>
        <label className="text-xs font-medium text-slate-500">
          Title
          <input
            type="text"
            required
            value={safeFormValue.title}
            onChange={handleFieldChange('title')}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Description
          <textarea
            rows={3}
            value={safeFormValue.description}
            onChange={handleFieldChange('description')}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-500">
            Resource type
            <select
              value={safeFormValue.resourceType}
              onChange={handleResourceTypeChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            >
              {RESOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Visibility
            <select
              value={safeFormValue.visibility}
              onChange={handleFieldChange('visibility')}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            >
              <option value="members">Members</option>
              <option value="admins">Admins</option>
            </select>
          </label>
        </div>
        {selectedType.requiresAssetId ? (
          <label className="text-xs font-medium text-slate-500">
            Asset ID
            <input
              type="number"
              value={safeFormValue.assetId}
              onChange={handleFieldChange('assetId')}
              placeholder="123"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            />
          </label>
        ) : (
          <label className="text-xs font-medium text-slate-500">
            Link URL
            <input
              type="url"
              value={safeFormValue.linkUrl}
              onChange={handleFieldChange('linkUrl')}
              placeholder="https://guides.edulure.com/community-playbook.pdf"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            />
            {safeFormValue.linkUrl && !isValidHttpUrl(safeFormValue.linkUrl) ? (
              <p className="mt-1 text-[11px] text-rose-600">Provide a valid HTTPS or HTTP link.</p>
            ) : null}
          </label>
        )}
        <label className="text-xs font-medium text-slate-500">
          Tags
          <input
            type="text"
            value={safeFormValue.tags}
            onChange={handleFieldChange('tags')}
            placeholder="operations, onboarding"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!interactive || !isFormValid}
        >
          {isFormValid ? 'Publish resource' : 'Complete required fields'}
        </button>
      </form>
    </section>
  );
}

ResourceLibraryPanel.propTypes = {
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      description: PropTypes.string,
      resourceType: PropTypes.string,
      linkUrl: PropTypes.string,
      assetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      tags: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
      visibility: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
      updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)])
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  onRefresh: PropTypes.func.isRequired,
  formValue: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    resourceType: PropTypes.string,
    linkUrl: PropTypes.string,
    tags: PropTypes.string,
    visibility: PropTypes.string,
    assetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  interactive: PropTypes.bool.isRequired
};

ResourceLibraryPanel.defaultProps = {
  error: null
};
