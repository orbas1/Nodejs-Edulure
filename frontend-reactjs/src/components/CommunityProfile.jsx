import PropTypes from 'prop-types';

import CommunityResourceLibrary from './community/CommunityResourceLibrary.jsx';

const numberFormatter = new Intl.NumberFormat('en-US');

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
  const canManageResources = Boolean(
    community.permissions?.canManageResources ??
      (community.membership?.role &&
        ['owner', 'admin', 'moderator'].includes(community.membership.role))
  );

  const hubUrl = community.links?.hub ?? `https://app.edulure.com/communities/${community.slug}`;

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
      <CommunityResourceLibrary
        resources={resourceItems}
        total={totalResources}
        isLoading={isLoadingResources}
        error={resourcesError}
        notice={resourceNotice}
        canManage={canManageResources}
        onAddResource={canManageResources ? onAddResource : null}
        onEditResource={canManageResources ? onEditResource : null}
        onDeleteResource={canManageResources ? onDeleteResource : null}
        onLoadMore={showLoadMore ? onLoadMoreResources : null}
        isManaging={isManagingResource}
        actionResourceId={resourceActionId}
        emptyCta={resourceEmptyCta}
      />
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
