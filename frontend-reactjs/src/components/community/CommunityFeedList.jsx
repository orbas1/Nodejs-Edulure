import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import FeedCard from '../FeedCard.jsx';
import FeedSponsoredCard from '../FeedSponsoredCard.jsx';
import CommunityMonetizationBanner from './CommunityMonetizationBanner.jsx';

const DEFAULT_BATCH_SIZE = 6;

function normaliseItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item) return null;
      if (item.kind === 'ad' && item.ad) {
        return { type: 'ad', payload: item.ad, key: `ad-${item.ad.placementId ?? item.ad.id}` };
      }
      if (item.kind === 'post' && item.post) {
        return { type: 'post', payload: item.post, key: `post-${item.post.id}` };
      }
      if (item.id || item.postId) {
        return { type: 'post', payload: item, key: `post-${item.id ?? item.postId}` };
      }
      return null;
    })
    .filter(Boolean);
}

export default function CommunityFeedList({
  items,
  isLoading,
  error,
  onRetry,
  composerSlot,
  monetization,
  onModerate,
  onRemove,
  actionStates,
  emptyLabel,
  sponsorshipMeta,
  sponsorshipError
}) {
  const normalisedItems = useMemo(() => normaliseItems(items), [items]);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_BATCH_SIZE);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(DEFAULT_BATCH_SIZE);
  }, [normalisedItems.length]);

  const hasMore = visibleCount < normalisedItems.length;
  const visibleItems = normalisedItems.slice(0, visibleCount);

  useEffect(() => {
    if (!hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setVisibleCount((previous) => Math.min(previous + DEFAULT_BATCH_SIZE, normalisedItems.length));
        }
      },
      { rootMargin: '120px' }
    );

    const node = sentinelRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
      observer.disconnect();
    };
  }, [hasMore, normalisedItems.length]);

  const monetisationProps = monetization ?? {};
  const showMonetisation =
    monetisationProps &&
    (monetisationProps.isLoading ||
      (Array.isArray(monetisationProps.plans) && monetisationProps.plans.length > 0) ||
      (Array.isArray(monetisationProps.addons) && monetisationProps.addons.length > 0) ||
      monetisationProps.error);

  return (
    <div className="space-y-4">
      {composerSlot}
      {showMonetisation ? <CommunityMonetizationBanner {...monetisationProps} /> : null}
      {sponsorshipMeta?.count > 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Sponsored placements active · {sponsorshipMeta.count}{' '}
          {sponsorshipMeta.count === 1 ? 'campaign' : 'campaigns'} configured for this feed.
        </div>
      ) : null}
      {sponsorshipError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600" role="alert">
          {sponsorshipError}
        </div>
      ) : null}
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          Loading community feed…
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
            {error}
          </div>
          {typeof onRetry === 'function' ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Retry loading updates
            </button>
          ) : null}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          {emptyLabel ?? 'No updates yet. Share the first insight with your peers.'}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            if (item.type === 'ad') {
              return <FeedSponsoredCard key={item.key} ad={item.payload} />;
            }
            return (
              <FeedCard
                key={item.key}
                post={item.payload}
                onModerate={onModerate}
                onRemove={onRemove}
                actionState={actionStates?.[item.payload.id]}
              />
            );
          })}
          <div ref={sentinelRef} aria-hidden="true" />
        </div>
      )}
      {hasMore && !isLoading ? (
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          Loading more posts…
        </p>
      ) : null}
    </div>
  );
}

CommunityFeedList.propTypes = {
  items: PropTypes.array,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  composerSlot: PropTypes.node,
  monetization: PropTypes.shape({
    plans: PropTypes.array,
    addons: PropTypes.array,
    isLoading: PropTypes.bool,
    error: PropTypes.string,
    totalDisplay: PropTypes.string,
    canManage: PropTypes.bool,
    onManageClick: PropTypes.func
  }),
  onModerate: PropTypes.func,
  onRemove: PropTypes.func,
  actionStates: PropTypes.object,
  emptyLabel: PropTypes.string,
  sponsorshipMeta: PropTypes.shape({
    count: PropTypes.number
  }),
  sponsorshipError: PropTypes.string
};

CommunityFeedList.defaultProps = {
  items: undefined,
  isLoading: false,
  error: null,
  onRetry: undefined,
  composerSlot: null,
  monetization: undefined,
  onModerate: undefined,
  onRemove: undefined,
  actionStates: undefined,
  emptyLabel: null,
  sponsorshipMeta: undefined,
  sponsorshipError: null
};
