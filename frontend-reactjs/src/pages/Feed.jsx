import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchAggregatedFeed,
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityFeed,
  fetchCommunityResources,
  joinCommunity
} from '../api/communityApi.js';
import TopBar from '../components/TopBar.jsx';
import SkewedMenu from '../components/SkewedMenu.jsx';
import FeedComposer from '../components/FeedComposer.jsx';
import FeedCard from '../components/FeedCard.jsx';
import FeedSponsoredCard from '../components/FeedSponsoredCard.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import CommunityHero from '../components/CommunityHero.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ALL_COMMUNITIES_NODE = {
  id: 'all',
  name: 'All Communities',
  description: null,
  stats: null
};

const DEFAULT_RESOURCES_META = { limit: 6, offset: 0, total: 0 };

export default function Feed() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken;

  const [communities, setCommunities] = useState([ALL_COMMUNITIES_NODE]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  const [communitiesError, setCommunitiesError] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(ALL_COMMUNITIES_NODE);
  const [activeMenuItem, setActiveMenuItem] = useState('Communities');
  const [feedItems, setFeedItems] = useState([]);
  const [feedMeta, setFeedMeta] = useState({ page: 1, perPage: 10, total: 0, pageCount: 0 });
  const [feedAdsMeta, setFeedAdsMeta] = useState(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [communityDetail, setCommunityDetail] = useState(null);
  const [communityDetailError, setCommunityDetailError] = useState(null);
  const [resources, setResources] = useState([]);
  const [resourcesMeta, setResourcesMeta] = useState(() => ({ ...DEFAULT_RESOURCES_META }));
  const [isLoadingCommunityDetail, setIsLoadingCommunityDetail] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const [isJoiningCommunity, setIsJoiningCommunity] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const menuState = useMemo(() => (selectedCommunity?.id === 'all' ? 'all' : 'community'), [selectedCommunity]);

  useEffect(() => {
    if (!token) {
      setCommunities([ALL_COMMUNITIES_NODE]);
      setSelectedCommunity(ALL_COMMUNITIES_NODE);
      setFeedItems([]);
      setFeedMeta({ page: 1, perPage: 10, total: 0, pageCount: 0 });
      setFeedAdsMeta(null);
      setFeedError(null);
      setCommunityDetail(null);
      setCommunityDetailError(null);
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setResourcesError(null);
      setIsLoadingCommunityDetail(false);
      setIsLoadingResources(false);
      setSearchValue('');
      setSearchQuery('');
      setJoinError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingCommunities(true);
    setCommunitiesError(null);

    fetchCommunities(token)
      .then((response) => {
        if (!isMounted) return;
        const items = response.data ?? [];
        const nextCommunities = [ALL_COMMUNITIES_NODE, ...items];
        setCommunities(nextCommunities);
        setCommunitiesError(null);
        setSelectedCommunity((prev) => {
          if (!prev || prev.id === 'all') {
            return nextCommunities[0] ?? ALL_COMMUNITIES_NODE;
          }
          const stillExists = nextCommunities.find((community) => String(community.id) === String(prev.id));
          return stillExists ?? ALL_COMMUNITIES_NODE;
        });
      })
      .catch((error) => {
        if (!isMounted) return;
        setCommunitiesError(error.message ?? 'Unable to load communities');
        setCommunities([ALL_COMMUNITIES_NODE]);
        setSelectedCommunity(ALL_COMMUNITIES_NODE);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCommunities(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const loadFeed = useCallback(
    async ({ page = 1, append = false, queryOverride } = {}) => {
      if (!token) return;
      const isAggregate = selectedCommunity?.id === 'all';
      const setLoading = append ? setIsLoadingMore : setIsLoadingFeed;
      const queryTerm = queryOverride !== undefined ? queryOverride : searchQueryRef.current;

      setLoading(true);
      if (!append) {
        setFeedError(null);
      }

      try {
        const request = isAggregate
          ? fetchAggregatedFeed({ token, page, perPage: 6, query: queryTerm || undefined })
          : fetchCommunityFeed({
              communityId: selectedCommunity.id,
              token,
              page,
              perPage: 6,
              query: queryTerm || undefined
            });

        const response = await request;
        const items = response.data ?? [];
        const pagination = response.meta?.pagination ?? { page, perPage: 6, total: items.length, pageCount: 1 };

        setFeedItems((prev) => (append ? [...prev, ...items] : items));
        setFeedMeta(pagination);
        setFeedAdsMeta(response.meta?.ads ?? null);
      } catch (error) {
        if (!append) {
          setFeedItems([]);
        }
        setFeedError(error.message ?? 'Unable to load community feed');
      } finally {
        setLoading(false);
      }
    },
    [selectedCommunity, token]
  );

  const loadCommunityDetail = useCallback(
    async (communityId) => {
      if (!token || !communityId) {
        setCommunityDetail(null);
        setCommunityDetailError(null);
        setResources([]);
        setResourcesMeta({ ...DEFAULT_RESOURCES_META });
        setResourcesError(null);
        setIsLoadingCommunityDetail(false);
        setIsLoadingResources(false);
        return;
      }

      if (communityId === 'all') {
        setCommunityDetail(null);
        setCommunityDetailError(null);
        setResources([]);
        setResourcesMeta({ ...DEFAULT_RESOURCES_META });
        setResourcesError(null);
        setIsLoadingCommunityDetail(false);
        setIsLoadingResources(false);
        return;
      }

      setIsLoadingCommunityDetail(true);
      setIsLoadingResources(true);
      setCommunityDetailError(null);
      setResourcesError(null);

      try {
        const [detailResult, resourcesResult] = await Promise.allSettled([
          fetchCommunityDetail(communityId, token),
          fetchCommunityResources({ communityId, token, limit: DEFAULT_RESOURCES_META.limit, offset: 0 })
        ]);

        if (detailResult.status === 'fulfilled') {
          setCommunityDetail(detailResult.value.data);
          setCommunityDetailError(null);
        } else {
          const detailError = detailResult.reason;
          setCommunityDetail(null);
          setCommunityDetailError(detailError?.message ?? 'Unable to load community details');
        }

        if (resourcesResult.status === 'fulfilled') {
          const resourcesResponse = resourcesResult.value;
          const items = resourcesResponse.data ?? [];
          const pagination = resourcesResponse.meta?.pagination ?? {};
          setResources(items);
          setResourcesMeta({
            limit: pagination.limit ?? DEFAULT_RESOURCES_META.limit,
            offset: pagination.offset ?? 0,
            total: pagination.total ?? items.length
          });
          setResourcesError(null);
        } else {
          const resourceError = resourcesResult.reason;
          setResources([]);
          setResourcesMeta({ ...DEFAULT_RESOURCES_META });
          setResourcesError(resourceError?.message ?? 'Unable to load community resources');
        }
      } finally {
        setIsLoadingCommunityDetail(false);
        setIsLoadingResources(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    loadFeed({ page: 1, append: false });
    loadCommunityDetail(selectedCommunity?.id);
  }, [selectedCommunity, token, loadFeed, loadCommunityDetail]);

  const canLoadMore = feedMeta.page < feedMeta.pageCount;
  const handleLoadMore = () => {
    if (canLoadMore) {
      loadFeed({ page: feedMeta.page + 1, append: true });
    }
  };

  const hasCommunitiesLoaded = communities.length > 0 && !isLoadingCommunities;
  const composerCommunities = useMemo(
    () => communities.filter((community) => community.id !== 'all'),
    [communities]
  );
  const composerDefaultCommunityId = useMemo(() => {
    if (selectedCommunity?.id === 'all') {
      return composerCommunities[0]?.id;
    }
    return selectedCommunity?.id;
  }, [selectedCommunity, composerCommunities]);

  useEffect(() => {
    setJoinError(null);
    setIsJoiningCommunity(false);
  }, [selectedCommunity?.id]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
    setSearchValue(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (value) => {
    const trimmed = value.trim();
    setSearchValue(value);
    setSearchQuery(trimmed);
    loadFeed({ page: 1, append: false, queryOverride: trimmed });
  };

  const handleJoinCommunity = async () => {
    if (!token || !communityDetail?.id) return;
    setJoinError(null);
    setIsJoiningCommunity(true);

    try {
      const response = await joinCommunity({ communityId: communityDetail.id, token });
      const updatedCommunity = response?.data;
      if (updatedCommunity) {
        setCommunityDetail(updatedCommunity);
        setCommunities((prev) =>
          prev.map((community) =>
            String(community.id) === String(updatedCommunity.id)
              ? {
                  ...community,
                  name: updatedCommunity.name,
                  description: updatedCommunity.description,
                  coverImageUrl: updatedCommunity.coverImageUrl,
                  stats: updatedCommunity.stats,
                  membership: updatedCommunity.membership
                }
              : community
          )
        );
      } else {
        await loadCommunityDetail(communityDetail.id);
      }
    } catch (error) {
      setJoinError(error?.message ?? 'Unable to join this community right now.');
    } finally {
      setIsJoiningCommunity(false);
    }
  };

  const handlePostCreated = async () => {
    await loadFeed({ page: 1, append: false, queryOverride: searchQuery });
    if (selectedCommunity?.id && selectedCommunity.id !== 'all') {
      await loadCommunityDetail(selectedCommunity.id);
    }
  };

  const loadMoreResources = useCallback(async () => {
    if (!token) return;
    const communityId = selectedCommunity?.id;
    if (!communityId || communityId === 'all') return;
    if (resources.length >= resourcesMeta.total) return;

    const limit = resourcesMeta.limit || DEFAULT_RESOURCES_META.limit;
    const offset = resources.length;

    setIsLoadingResources(true);
    setResourcesError(null);

    try {
      const response = await fetchCommunityResources({ communityId, token, limit, offset });
      const items = response.data ?? [];
      const pagination = response.meta?.pagination ?? {};
      setResources((prev) => [...prev, ...items]);
      setResourcesMeta({
        limit: pagination.limit ?? limit,
        offset: pagination.offset ?? offset,
        total: pagination.total ?? resourcesMeta.total
      });
    } catch (error) {
      setResourcesError(error.message ?? 'Unable to load community resources');
    } finally {
      setIsLoadingResources(false);
    }
  }, [token, selectedCommunity, resources.length, resourcesMeta]);

  const hasMoreResources = resourcesMeta.total > resources.length;

  return (
    <div className="bg-slate-50/70 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <TopBar
          communities={communities}
          selectedCommunity={selectedCommunity}
          onCommunityChange={(community) => setSelectedCommunity(community)}
          isLoading={!hasCommunitiesLoaded}
          error={communitiesError}
          searchValue={searchValue}
          onSearchChange={(value) => setSearchValue(value)}
          onSearchSubmit={handleSearchSubmit}
          isSearching={isLoadingFeed && !isLoadingMore}
        />
        <SkewedMenu activeState={menuState} activeItem={activeMenuItem} onSelect={setActiveMenuItem} />
        {!isAuthenticated && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
            Sign in to follow your communities, share updates, and access the resource library.
          </div>
        )}
        {selectedCommunity?.id !== 'all' && (
          <CommunityHero
            community={communityDetail}
            isLoading={isLoadingCommunityDetail || isLoadingCommunities}
            error={communityDetailError}
            onJoin={communityDetail?.membership?.status === 'active' ? null : handleJoinCommunity}
            isJoining={isJoiningCommunity}
            joinError={joinError}
          />
        )}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-6">
            {isAuthenticated && (
              <FeedComposer
                communities={composerCommunities}
                defaultCommunityId={composerDefaultCommunityId}
                disabled={isLoadingCommunities}
                onPostCreated={handlePostCreated}
              />
            )}
            <div className="space-y-4">
              {isLoadingFeed && !isLoadingMore ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Loading community feed...
                </div>
              ) : feedError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{feedError}</div>
              ) : (
                <>
                  {feedAdsMeta?.count > 0 && (
                    <div className="rounded-3xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                      Sponsored placements active · {feedAdsMeta.count}{' '}
                      {feedAdsMeta.count === 1 ? 'campaign' : 'campaigns'} matched for your feed.
                    </div>
                  )}
                  {feedItems.map((item) => {
                    if (item?.kind === 'ad' && item.ad) {
                      return <FeedSponsoredCard key={`ad-${item.ad.placementId}`} ad={item.ad} />;
                    }
                    const post = item?.kind === 'post' ? item.post : item;
                    if (!post) {
                      return null;
                    }
                    return <FeedCard key={`post-${post.id}`} post={post} />;
                  })}
                  {feedItems.length === 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                      No activity yet. Be the first to share an update.
                    </div>
                  )}
                  {canLoadMore && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? 'Loading…' : 'Load more updates'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <CommunityProfile
            community={selectedCommunity?.id === 'all' ? null : communityDetail}
            isAggregate={selectedCommunity?.id === 'all'}
            resources={resources}
            resourcesMeta={resourcesMeta}
            isLoadingDetail={selectedCommunity?.id !== 'all' && (isLoadingCommunityDetail || isLoadingCommunities)}
            isLoadingResources={isLoadingResources}
            error={communityDetailError}
            resourcesError={resourcesError}
            onLoadMoreResources={hasMoreResources ? loadMoreResources : null}
          />
        </div>
      </div>
    </div>
  );
}
