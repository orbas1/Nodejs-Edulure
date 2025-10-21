import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('en-US');
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);

const METADATA_LABELS = {
  focus: 'Strategic Focus',
  ndaRequired: 'NDA Required',
  defaultChannel: 'Default Channel',
  timezone: 'Primary Timezone',
  analyticsKey: 'Analytics Key',
  classroomReference: 'Classroom Reference',
  registrationUrl: 'Registration URL'
};

function formatDate(timestamp) {
  if (!timestamp) return 'Not available';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

function formatMetadataKey(key) {
  if (!key) return '';
  if (METADATA_LABELS[key]) return METADATA_LABELS[key];
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatMetadataValue(value) {
  if (value === null || value === undefined) return 'Not available';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Not available';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === 'object') {
    return Object.keys(value).length ? JSON.stringify(value) : 'Not available';
  }
  return String(value);
}

function getSafeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://app.edulure.com');
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

export default function CommunityProfile({
  community,
  isAggregate,
  resources,
  resourcesMeta,
  isLoadingDetail,
  isLoadingResources,
  error,
  resourcesError,
  onLoadMoreResources,
  onLeave,
  isLeaving = false,
  canLeave = false,
  onAddResource,
  onEditResource,
  onDeleteResource,
  isManagingResource = false,
  resourceNotice,
  resourceActionId,
  resourceEmptyCta
}) {
  if (isAggregate) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-slate-600">
        <h3 className="text-base font-semibold text-slate-900">Stay close to what matters</h3>
        <p className="mt-2 leading-6">
          Follow a community to unlock private updates, resource drops, and launch retrospectives. Pick a hub from the switcher
          to inspect metrics and shared assets.
        </p>
      </div>
    );
  }

  if (isLoadingDetail) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading community insight…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
        {error}
      </div>
    );
  }

  if (!community) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Select a community to review membership health and the curated resource library.
      </div>
    );
  }

  const stats = community.stats ?? {};
  const metadataEntries = Object.entries(community.metadata ?? {}).sort(([a], [b]) =>
    String(a).localeCompare(String(b))
  );
  const resourceItems = resources ?? [];
  const totalResources = resourcesMeta?.total ?? resourceItems.length;
  const showLoadMore = typeof onLoadMoreResources === 'function';
  const showingCount = resourceItems.length;
  const canManageResources = Boolean(
    community.permissions?.canManageResources ??
      (community.membership?.role &&
        ['owner', 'admin', 'moderator'].includes(community.membership.role))
  );

  const hubUrl = community.links?.hub ?? `https://app.edulure.com/communities/${community.slug}`;

  const hasLoadedAll = totalResources !== undefined && showingCount >= totalResources;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{community.name}</h3>
            {community.description && <p className="text-sm text-slate-600">{community.description}</p>}
            {community.membership?.role && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Your role: {community.membership.role}
              </span>
            )}
            {canLeave && typeof onLeave === 'function' && (
              <button
                type="button"
                onClick={onLeave}
                disabled={isLeaving}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                {isLeaving ? 'Leaving…' : 'Leave community'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Members</span>
              <span className="text-base font-semibold text-slate-900">{numberFormatter.format(stats.members ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Posts</span>
              <span className="text-base font-semibold text-slate-900">{numberFormatter.format(stats.posts ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Resources</span>
              <span className="text-base font-semibold text-slate-900">{numberFormatter.format(stats.resources ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Channels</span>
              <span className="text-base font-semibold text-slate-900">{numberFormatter.format(stats.channels ?? 0)}</span>
            </div>
          </div>
          <a
            href={hubUrl}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            Visit Community Hub
          </a>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Latest resources</h4>
            <p className="mt-1 text-xs text-slate-500">
              Share playbooks, external articles, or classroom replays curated for this community.
            </p>
          </div>
          {canManageResources && typeof onAddResource === 'function' && (
            <button
              type="button"
              onClick={onAddResource}
              disabled={isManagingResource}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isManagingResource ? 'Opening…' : 'Add resource'}
            </button>
          )}
        </div>
        {resourcesError && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600" role="alert">
            {resourcesError}
          </div>
        )}
        {resourceNotice && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700" role="status">
            {resourceNotice}
          </div>
        )}
        {isLoadingResources && resourceItems.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Loading resource library…</p>
        ) : resourceItems.length === 0 ? (
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p>No resources published yet. Share your first playbook from the composer.</p>
            {resourceEmptyCta}
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {resourceItems.map((resource) => (
                <li key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">{resource.title}</div>
                      <p className="text-xs text-slate-500">{resource.description ?? 'No description provided.'}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-slate-600">{resource.resourceType}</span>
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-slate-600">{formatDate(resource.publishedAt)}</span>
                        {Array.isArray(resource.tags) &&
                          resource.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-200/50 px-2 py-0.5 text-slate-500">
                              #{tag}
                            </span>
                          ))}
                      </div>
                      {(() => {
                        const embedUrl = getSafeUrl(resource.metadata?.embedUrl);
                        if (!embedUrl) return null;
                        return (
                          <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5">
                            <iframe
                              title={`${resource.title} preview`}
                              src={embedUrl}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              loading="lazy"
                              referrerPolicy="strict-origin-when-cross-origin"
                              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                              allowFullScreen
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {(() => {
                        const safeLink = getSafeUrl(resource.linkUrl);
                        if (!safeLink) return null;
                        const hostLabel = (() => {
                          try {
                            return new URL(safeLink).hostname.replace(/^www\./, '');
                          } catch (error) {
                            return 'resource';
                          }
                        })();
                        return (
                          <a
                            href={safeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
                          >
                            Visit {hostLabel}
                          </a>
                        );
                      })()}
                      {canManageResources && (
                        <div className="flex gap-2">
                          {typeof onEditResource === 'function' && (
                            <button
                              type="button"
                              onClick={() => onEditResource(resource)}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isManagingResource}
                            >
                              Edit
                            </button>
                          )}
                          {typeof onDeleteResource === 'function' && (
                            <button
                              type="button"
                              onClick={() => onDeleteResource(resource)}
                              className="inline-flex items-center justify-center rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isManagingResource}
                            >
                              {resourceActionId === resource.id && isManagingResource ? 'Removing…' : 'Remove'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3 text-xs text-slate-400">
              <p>
                Showing {numberFormatter.format(showingCount)} of {numberFormatter.format(totalResources)} items.
              </p>
              {showLoadMore && !hasLoadedAll && (
                <button
                  type="button"
                  onClick={onLoadMoreResources}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoadingResources}
                >
                  {isLoadingResources ? 'Loading more resources…' : 'Load more resources'}
                </button>
              )}
              {showLoadMore && hasLoadedAll && (
                <p>All resources loaded.</p>
              )}
            </div>
          </>
        )}
      </div>
      {metadataEntries.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operational context</h4>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt>Last activity</dt>
              <dd className="font-medium text-slate-900">{formatDate(stats.lastActivityAt)}</dd>
            </div>
            {metadataEntries.slice(0, 6).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <dt>{formatMetadataKey(key)}</dt>
                <dd className="font-medium text-slate-900">{formatMetadataValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

CommunityProfile.propTypes = {
  community: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    slug: PropTypes.string,
    description: PropTypes.string,
    stats: PropTypes.shape({
      members: PropTypes.number,
      posts: PropTypes.number,
      resources: PropTypes.number,
      channels: PropTypes.number,
      lastActivityAt: PropTypes.string
    }),
    membership: PropTypes.shape({
      role: PropTypes.string,
      status: PropTypes.string
    }),
    metadata: PropTypes.object,
    links: PropTypes.shape({
      hub: PropTypes.string
    })
  }),
  isAggregate: PropTypes.bool,
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      resourceType: PropTypes.string,
      linkUrl: PropTypes.string,
      publishedAt: PropTypes.string
    })
  ),
  resourcesMeta: PropTypes.shape({
    limit: PropTypes.number,
    offset: PropTypes.number,
    total: PropTypes.number
  }),
  isLoadingDetail: PropTypes.bool,
  isLoadingResources: PropTypes.bool,
  error: PropTypes.string,
  resourcesError: PropTypes.string,
  onLoadMoreResources: PropTypes.func,
  onLeave: PropTypes.func,
  isLeaving: PropTypes.bool,
  canLeave: PropTypes.bool,
  onAddResource: PropTypes.func,
  onEditResource: PropTypes.func,
  onDeleteResource: PropTypes.func,
  isManagingResource: PropTypes.bool,
  resourceNotice: PropTypes.string,
  resourceActionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  resourceEmptyCta: PropTypes.node
};

CommunityProfile.defaultProps = {
  community: undefined,
  isAggregate: false,
  resources: undefined,
  resourcesMeta: undefined,
  isLoadingDetail: false,
  isLoadingResources: false,
  error: undefined,
  resourcesError: undefined,
  onLoadMoreResources: undefined,
  onLeave: undefined,
  isLeaving: false,
  canLeave: false,
  onAddResource: undefined,
  onEditResource: undefined,
  onDeleteResource: undefined,
  isManagingResource: false,
  resourceNotice: undefined,
  resourceActionId: undefined,
  resourceEmptyCta: null
};
