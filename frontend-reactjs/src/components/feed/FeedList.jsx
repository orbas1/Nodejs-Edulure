import PropTypes from 'prop-types';

import FeedItemCard from './FeedItemCard.jsx';
import SponsoredCard from './SponsoredCard.jsx';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-1/3 rounded-full bg-slate-200" />
          <div className="h-3 w-full rounded-full bg-slate-100" />
          <div className="h-3 w-5/6 rounded-full bg-slate-100" />
          <div className="h-3 w-4/6 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function NormaliseEntry(entry) {
  if (!entry) return null;
  if (entry.kind === 'post' && entry.post) {
    return { kind: 'post', post: entry.post };
  }
  if (entry.kind === 'ad' && entry.ad) {
    return { kind: 'ad', ad: entry.ad };
  }
  if (entry.post) {
    return { kind: 'post', post: entry.post };
  }
  return { kind: 'post', post: entry };
}

export default function FeedList({
  items,
  loading,
  loadingMore,
  onLoadMore,
  hasMore,
  emptyState,
  actionStates,
  onModerate,
  onRemove,
  onDismissPlacement,
  canManagePlacements,
  isManagingPlacements,
  onReact,
  className
}) {
  const resolvedItems = Array.isArray(items) ? items.map(NormaliseEntry).filter(Boolean) : [];

  if (loading && !loadingMore && resolvedItems.length === 0) {
    return (
      <div className={className}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!loading && resolvedItems.length === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={`${className ?? ''} space-y-4`}>
      {resolvedItems.map((entry) => {
        if (entry.kind === 'ad') {
          return (
            <SponsoredCard
              key={`ad-${entry.ad.placementId ?? entry.ad.position}`}
              ad={entry.ad}
              canManage={canManagePlacements}
              onDismiss={onDismissPlacement ? () => onDismissPlacement(entry.ad) : undefined}
              isProcessing={Boolean(isManagingPlacements)}
            />
          );
        }

        return (
          <FeedItemCard
            key={`post-${entry.post.id}`}
            post={entry.post}
            onModerate={onModerate}
            onRemove={onRemove}
            onReact={onReact}
            actionState={actionStates?.[entry.post.id]}
          />
        );
      })}

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Load more updates'}
        </button>
      ) : null}

      {loadingMore && !hasMore ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          Loading more updates…
        </div>
      ) : null}
    </div>
  );
}

FeedList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])).isRequired,
  loading: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  emptyState: PropTypes.node,
  actionStates: PropTypes.objectOf(
    PropTypes.shape({
      isProcessing: PropTypes.bool,
      error: PropTypes.string
    })
  ),
  onModerate: PropTypes.func,
  onRemove: PropTypes.func,
  onDismissPlacement: PropTypes.func,
  canManagePlacements: PropTypes.bool,
  isManagingPlacements: PropTypes.bool,
  onReact: PropTypes.func,
  className: PropTypes.string
};

FeedList.defaultProps = {
  loading: false,
  loadingMore: false,
  onLoadMore: undefined,
  hasMore: false,
  emptyState: null,
  actionStates: undefined,
  onModerate: undefined,
  onRemove: undefined,
  onDismissPlacement: undefined,
  canManagePlacements: false,
  isManagingPlacements: false,
  onReact: undefined,
  className: ''
};
