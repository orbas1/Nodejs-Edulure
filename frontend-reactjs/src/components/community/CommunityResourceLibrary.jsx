import { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  PhotoIcon,
  PlayCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const FALLBACK_RESOURCES = [
  {
    id: 'resource-fallback-1',
    title: 'Revenue rituals playbook',
    description: 'Step-by-step rituals that keep pods accountable to revenue KPIs.',
    resourceType: 'Document',
    tags: ['Revenue', 'Playbook'],
    linkUrl: 'https://app.edulure.com/library/revenue-rituals-playbook.pdf',
    metadata: { previewImageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80' }
  },
  {
    id: 'resource-fallback-2',
    title: 'Async onboarding retrospective',
    description: 'Recorded session and checklist for async onboarding within communities.',
    resourceType: 'Classroom',
    tags: ['Onboarding', 'Video'],
    linkUrl: 'https://app.edulure.com/library/async-onboarding',
    metadata: {
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      sponsored: true,
      sponsor:
        'Sponsored by OperateBetter — access advanced facilitation templates with bundled analytics.'
    }
  }
];

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

function getSafeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://app.edulure.com');
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function normaliseResource(resource, index) {
  if (!resource || typeof resource !== 'object') {
    return null;
  }

  const metadata = resource.metadata ?? {};
  const safeTags = Array.isArray(resource.tags)
    ? resource.tags
    : typeof resource.tags === 'string'
      ? resource.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

  const linkUrl = getSafeUrl(resource.linkUrl ?? resource.url ?? '');
  const embedUrl = getSafeUrl(metadata.embedUrl ?? resource.embedUrl);
  const previewImageUrl = getSafeUrl(metadata.previewImageUrl ?? resource.previewImageUrl ?? resource.thumbnailUrl);

  return {
    id: resource.id ?? resource.slug ?? `resource-${index}`,
    title: resource.title ?? 'Untitled resource',
    description: resource.description ?? '',
    resourceType: resource.resourceType ?? resource.type ?? 'Resource',
    tags: safeTags,
    linkUrl,
    embedUrl,
    previewImageUrl,
    createdAt: resource.createdAt ?? resource.publishedAt ?? null,
    updatedAt: resource.updatedAt ?? null,
    sponsored: Boolean(metadata.sponsored ?? resource.sponsored),
    sponsorCopy: metadata.sponsor ?? metadata.sponsorCopy ?? resource.sponsorCopy ?? '',
    metadata
  };
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function ResourcePreview({ embedUrl, previewImageUrl, title }) {
  if (embedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5">
        <iframe
          src={embedUrl}
          title={`${title} preview`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allowFullScreen
        />
      </div>
    );
  }

  if (previewImageUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <img src={previewImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-video flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
      <PhotoIcon className="h-12 w-12" aria-hidden="true" />
    </div>
  );
}

ResourcePreview.propTypes = {
  embedUrl: PropTypes.string,
  previewImageUrl: PropTypes.string,
  title: PropTypes.string.isRequired
};

function ResourceCard({ resource, canManage, onEdit, onDelete, isManaging, actionResourceId }) {
  const hostLabel = useMemo(() => {
    if (!resource.linkUrl) return null;
    try {
      return new URL(resource.linkUrl).hostname.replace(/^www\./, '');
    } catch (_error) {
      return 'resource';
    }
  }, [resource.linkUrl]);

  return (
    <article
      className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        resource.sponsored ? 'border-amber-300 bg-amber-50/80' : 'border-slate-200 bg-white/90'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              <PlayCircleIcon className="h-3.5 w-3.5" /> {resource.resourceType}
            </span>
            {resource.sponsored ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-amber-700">
                <SparklesIcon className="h-3.5 w-3.5" /> Sponsored
              </span>
            ) : null}
            {resource.createdAt ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{formatDate(resource.createdAt)}</span>
            ) : null}
          </div>
          <h3 className="text-base font-semibold text-slate-900">{resource.title}</h3>
          {resource.description ? <p className="text-sm text-slate-600">{resource.description}</p> : null}
          {resource.tags?.length ? (
            <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
              {resource.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {resource.linkUrl ? (
            <a
              href={resource.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Visit {hostLabel}
            </a>
          ) : null}
          {canManage ? (
            <div className="flex gap-2">
              {typeof onEdit === 'function' ? (
                <button
                  type="button"
                  onClick={() => onEdit(resource)}
                  disabled={isManaging}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit
                </button>
              ) : null}
              {typeof onDelete === 'function' ? (
                <button
                  type="button"
                  onClick={() => onDelete(resource)}
                  disabled={isManaging && actionResourceId === resource.id}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isManaging && actionResourceId === resource.id ? 'Removing…' : 'Remove'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <ResourcePreview embedUrl={resource.embedUrl} previewImageUrl={resource.previewImageUrl} title={resource.title} />

      {resource.sponsorCopy ? (
        <p className="rounded-3xl border border-amber-200 bg-white/70 px-4 py-3 text-xs text-amber-700">
          {resource.sponsorCopy}
        </p>
      ) : null}
    </article>
  );
}

ResourceCard.propTypes = {
  resource: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    resourceType: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    linkUrl: PropTypes.string,
    embedUrl: PropTypes.string,
    previewImageUrl: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    sponsored: PropTypes.bool,
    sponsorCopy: PropTypes.string
  }).isRequired,
  canManage: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isManaging: PropTypes.bool,
  actionResourceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default function CommunityResourceLibrary({
  resources,
  total,
  isLoading,
  error,
  notice,
  canManage,
  onAddResource,
  onEditResource,
  onDeleteResource,
  onLoadMore,
  isManaging = false,
  actionResourceId,
  emptyCta
}) {
  const normalisedResources = useMemo(() => {
    if (!Array.isArray(resources) || resources.length === 0) {
      return FALLBACK_RESOURCES.map(normaliseResource).filter(Boolean);
    }
    return resources
      .map((resource, index) => normaliseResource(resource, index))
      .filter((resource) => resource && resource.id && resource.title);
  }, [resources]);

  const totalResources = typeof total === 'number' ? total : normalisedResources.length;
  const hasMore = typeof onLoadMore === 'function' && normalisedResources.length < totalResources;

  const sponsoredCount = useMemo(
    () => normalisedResources.filter((resource) => resource.sponsored).length,
    [normalisedResources]
  );

  return (
    <section className="space-y-5 rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource library</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Curated drops & classroom replays</h2>
          <p className="mt-2 text-sm text-slate-600">
            Files, recordings, and live docs surfaced for members. Sponsored placements highlight partner content without losing
            trust.
          </p>
        </div>
        {canManage && typeof onAddResource === 'function' ? (
          <button
            type="button"
            onClick={onAddResource}
            disabled={isManaging}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isManaging ? 'Opening…' : 'Add resource'}
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700" role="status">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-4">
          {isLoading && resources?.length === 0 ? (
            <p className="text-sm text-slate-500">Loading resource library…</p>
          ) : normalisedResources.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
              No resources published yet. {emptyCta}
            </div>
          ) : (
            <div className="space-y-4">
              {normalisedResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  canManage={canManage}
                  onEdit={onEditResource}
                  onDelete={(candidate) => {
                    if (typeof onDeleteResource !== 'function') return;
                    onDeleteResource(candidate);
                  }}
                  isManaging={isManaging}
                  actionResourceId={actionResourceId}
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading more…' : 'Load more resources'}
            </button>
          ) : null}

          {!hasMore && typeof onLoadMore === 'function' && normalisedResources.length > 0 ? (
            <p className="text-xs text-slate-400">All resources loaded.</p>
          ) : null}

          <p className="text-xs text-slate-400">
            Showing {normalisedResources.length} of {totalResources} resources.
          </p>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Sponsorship status</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">
              {sponsoredCount > 0 ? 'Sponsored placements live' : 'Open slots for partners'}
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              {sponsoredCount > 0
                ? 'Members see partner resources inside the library with clear disclosure and audit logs.'
                : 'Enable paid placements to monetise curated content. Sponsored items get highlighted automatically.'}
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
              <SparklesIcon className="h-4 w-4 text-amber-500" />
              <span>{sponsoredCount} sponsored resources</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
              <LinkIcon className="h-4 w-4 text-primary" />
              <span>{normalisedResources.length - sponsoredCount} organic resources</span>
            </div>
          </div>
          {canManage ? (
            <p className="text-xs text-slate-500">
              Use the monetisation console to flag a resource as sponsored. The badge and disclosure copy render automatically
              across the community and cohort portals.
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

CommunityResourceLibrary.propTypes = {
  resources: PropTypes.arrayOf(PropTypes.object),
  total: PropTypes.number,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  notice: PropTypes.string,
  canManage: PropTypes.bool,
  onAddResource: PropTypes.func,
  onEditResource: PropTypes.func,
  onDeleteResource: PropTypes.func,
  onLoadMore: PropTypes.func,
  isManaging: PropTypes.bool,
  actionResourceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  emptyCta: PropTypes.node
};

