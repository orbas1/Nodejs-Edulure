import PropTypes from 'prop-types';
import { ArrowPathIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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
  const safeResources = Array.isArray(resources) ? resources : [];
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

  const handleRefresh = () => {
    if (!interactive) return;
    onRefresh();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!interactive) return;
    onSubmit();
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
        Share onboarding playbooks, studio assets, and curated references so moderators can respond fast.
      </p>

      <div className="mt-4 space-y-3">
        {isLoadingInitial ? (
          <p className="text-xs text-slate-500">Fetching resource library…</p>
        ) : error ? (
          <p className="text-xs text-rose-600">Unable to load resources. Refresh to retry.</p>
        ) : safeResources.length === 0 ? (
          <p className="text-xs text-slate-500">No resources uploaded yet. Add your first knowledge base entry.</p>
        ) : (
          <ul className="space-y-2">
            {safeResources.map((resource) => {
              const publishedAt = formatDate(resource.createdAt ?? resource.updatedAt);
              return (
                <li
                  key={resource.id ?? resource.title}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{resource.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">{resource.resourceType ?? 'external'}</p>
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
        <label className="text-xs font-medium text-slate-500">
          Title
          <input
            type="text"
            required
            value={safeFormValue.title}
            onChange={(event) => onFormChange({ ...formValue, title: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Description
          <textarea
            rows={3}
            value={safeFormValue.description}
            onChange={(event) => onFormChange({ ...formValue, description: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-500">
            Resource type
            <select
              value={safeFormValue.resourceType}
              onChange={(event) => onFormChange({ ...formValue, resourceType: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            >
              <option value="content_asset">Content asset</option>
              <option value="external_link">External link</option>
              <option value="document">Document</option>
              <option value="classroom_session">Classroom session</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Visibility
            <select
              value={safeFormValue.visibility}
              onChange={(event) => onFormChange({ ...formValue, visibility: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            >
              <option value="members">Members</option>
              <option value="admins">Admins</option>
            </select>
          </label>
        </div>
        {formValue.resourceType === 'content_asset' ? (
          <label className="text-xs font-medium text-slate-500">
            Asset ID
            <input
              type="number"
              value={safeFormValue.assetId}
              onChange={(event) => onFormChange({ ...formValue, assetId: event.target.value })}
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
              onChange={(event) => onFormChange({ ...formValue, linkUrl: event.target.value })}
              placeholder="https://guides.edulure.com/community-playbook.pdf"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!interactive}
            />
          </label>
        )}
        <label className="text-xs font-medium text-slate-500">
          Tags
          <input
            type="text"
            value={safeFormValue.tags}
            onChange={(event) => onFormChange({ ...formValue, tags: event.target.value })}
            placeholder="operations, onboarding"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!interactive}
        >
          Publish resource
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
