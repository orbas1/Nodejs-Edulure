import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchAggregatedFeed,
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityFeed,
  fetchCommunityResources,
  joinCommunity,
  leaveCommunity,
  moderateCommunityPost,
  removeCommunityPost,
  fetchCommunitySponsorships,
  updateCommunitySponsorships
} from '../api/communityApi.js';
import TopBar from '../components/TopBar.jsx';
import SkewedMenu from '../components/SkewedMenu.jsx';
import FeedComposer from '../components/FeedComposer.jsx';
import FeedCard from '../components/FeedCard.jsx';
import FeedSponsoredCard from '../components/FeedSponsoredCard.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import CommunityHero from '../components/CommunityHero.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAuthorization } from '../hooks/useAuthorization.js';

const ALL_COMMUNITIES_NODE = {
  id: 'all',
  name: 'All Communities',
  description: null,
  stats: null
};

const DEFAULT_RESOURCES_META = { limit: 6, offset: 0, total: 0 };

const CURATED_HIGHLIGHTS = [
  {
    title: 'Trust-building sprint',
    description: 'Daily prompts to strengthen peer accountability in your cohort.',
    stats: ['+312% engagement lift', '14-day guided cadence']
  },
  {
    title: 'Spotlight: Instructor playbooks',
    description: 'See how verified instructors launch revenue pods and advisory retainers.',
    stats: ['6 new playbooks', 'Updated weekly']
  },
  {
    title: 'Investor AMA replay',
    description: 'Questions from last night’s live AMA with operators from Sequoia Arc.',
    stats: ['48-minute replay', 'Key deals annotated']
  }
];

const CURATED_STORIES = [
  {
    badge: 'Editor’s pick',
    time: '3 minutes ago',
    title: 'How to operationalise trust scores across your ecosystem',
    summary: 'Break down the trust framework Alex Morgan uses to keep both learner and instructor reputations high.',
    metrics: ['6 frameworks', 'Downloadable checklist']
  },
  {
    badge: 'Community spotlight',
    time: '20 minutes ago',
    title: 'RevOps Guild hosted its first async hackathon',
    summary: 'Members shipped 12 playbooks and raised $42k in shared revenue within a weekend.',
    metrics: ['328 contributors', '42 shared templates']
  }
];

const TRENDING_TOPICS = [
  { tag: '#RevenueRituals', delta: '+312%', description: 'Teams swapping cadence scripts and retention rituals.' },
  { tag: '#TrustSignals', delta: '+187%', description: 'Instructors publishing transparent trust dashboards.' },
  { tag: '#LearnerOps', delta: '+142%', description: 'Automation recipes for high-touch cohorts.' }
];

const FEATURED_CREATORS = [
  { name: 'Mira Shah', handle: '@mirarevops', highlight: 'Built a 9-week B2B retention lab', trust: 95 },
  { name: 'Leo Okafor', handle: '@buildwithleo', highlight: 'Scaled async micro-courses to $80k ARR', trust: 92 }
];

export default function Feed() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken;
  const { canAccessCommunityFeed, canPostToCommunities, canJoinCommunities } = useAuthorization();

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
  const [isLeavingCommunity, setIsLeavingCommunity] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [postActions, setPostActions] = useState(() => ({}));
  const [sponsorships, setSponsorships] = useState({ blockedPlacementIds: [] });
  const [isLoadingSponsorships, setIsLoadingSponsorships] = useState(false);
  const [sponsorshipError, setSponsorshipError] = useState(null);
  const [isUpdatingSponsorship, setIsUpdatingSponsorship] = useState(false);

  const updatePostActionState = useCallback((postId, updates) => {
    setPostActions((prev) => {
      if (updates === null) {
        const nextState = { ...prev };
        delete nextState[postId];
        return nextState;
      }
      const current = prev[postId] ?? {};
      return {
        ...prev,
        [postId]: { ...current, ...updates }
      };
    });
  }, []);

  const updateFeedPost = useCallback((postId, updater) => {
    setFeedItems((prev) =>
      prev
        .map((entry) => {
          if (entry?.kind === 'post' && entry.post?.id === postId) {
            const nextPost = updater(entry.post);
            if (!nextPost) {
              return null;
            }
            return { ...entry, post: nextPost };
          }
          if (!entry?.kind && entry?.id === postId) {
            const nextPost = updater(entry);
            return nextPost || null;
          }
          return entry;
        })
        .filter(Boolean)
    );
  }, []);

  const resolvePostCommunityId = useCallback(
    (post) => {
      if (selectedCommunity?.id && selectedCommunity.id !== 'all') {
        return communityDetail?.id ?? selectedCommunity.id;
      }
      return post?.community?.id ?? communityDetail?.id ?? null;
    },
    [selectedCommunity?.id, communityDetail?.id]
  );

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
      setIsJoiningCommunity(false);
      setIsLeavingCommunity(false);
      setLeaveError(null);
      setPostActions({});
      setSponsorships({ blockedPlacementIds: [] });
      setIsLoadingSponsorships(false);
      setSponsorshipError(null);
      setIsUpdatingSponsorship(false);
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
      if (!token || !canAccessCommunityFeed) return;
      const isAggregate = selectedCommunity?.id === 'all';
      const setLoading = append ? setIsLoadingMore : setIsLoadingFeed;
      const queryTerm = queryOverride !== undefined ? queryOverride : searchQueryRef.current;

      setLoading(true);
      if (!append) {
        setFeedError(null);
        setPostActions({});
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
    [selectedCommunity, token, canAccessCommunityFeed]
  );

  const loadCommunityDetail = useCallback(
    async (communityId) => {
      if (!token || !communityId || !canAccessCommunityFeed) {
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
          setSponsorships(detailResult.value.data?.sponsorships ?? { blockedPlacementIds: [] });
        } else {
          const detailError = detailResult.reason;
          setCommunityDetail(null);
          setCommunityDetailError(detailError?.message ?? 'Unable to load community details');
          setSponsorships({ blockedPlacementIds: [] });
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
    [token, canAccessCommunityFeed]
  );

  useEffect(() => {
    if (!token || !canAccessCommunityFeed) return;
    loadFeed({ page: 1, append: false });
    loadCommunityDetail(selectedCommunity?.id);
  }, [selectedCommunity, token, loadFeed, loadCommunityDetail, canAccessCommunityFeed]);

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
    setLeaveError(null);
    setIsLeavingCommunity(false);
  }, [selectedCommunity?.id]);

  useEffect(() => {
    if (!token || !communityDetail?.id || !communityDetail?.permissions?.canManageSponsorships) {
      setIsLoadingSponsorships(false);
      setSponsorshipError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingSponsorships(true);
    setSponsorshipError(null);

    fetchCommunitySponsorships({ communityId: communityDetail.id, token })
      .then((response) => {
        if (cancelled) return;
        setSponsorships(response.data ?? { blockedPlacementIds: [] });
        setSponsorshipError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setSponsorshipError(error.message ?? 'Unable to load sponsorship preferences');
        setSponsorships((prev) => prev ?? { blockedPlacementIds: [] });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSponsorships(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, communityDetail?.id, communityDetail?.permissions?.canManageSponsorships]);

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
    if (!canJoinCommunities) {
      setJoinError('Your role does not have permission to join communities directly. Please contact an administrator.');
      return;
    }
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

  const handleLeaveCommunity = async () => {
    if (!token || !communityDetail?.id) return;
    if (!window.confirm('Are you sure you want to leave this community?')) {
      return;
    }
    setLeaveError(null);
    setIsLeavingCommunity(true);

    try {
      await leaveCommunity({ communityId: communityDetail.id, token });

      setCommunityDetail(null);
      setCommunities((prev) =>
        prev.map((community) =>
          String(community.id) === String(communityDetail.id)
            ? { ...community, membership: null, permissions: community.permissions ? { ...community.permissions, canLeave: false } : community.permissions }
            : community
        )
      );
      setSelectedCommunity(ALL_COMMUNITIES_NODE);
      setFeedItems([]);
      setFeedMeta({ page: 1, perPage: 10, total: 0, pageCount: 0 });
      setFeedAdsMeta(null);
      setSponsorships({ blockedPlacementIds: [] });
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setResourcesError(null);
    } catch (error) {
      setLeaveError(error?.message ?? 'Unable to leave this community right now.');
    } finally {
      setIsLeavingCommunity(false);
    }
  };

  const handlePostCreated = async () => {
    if (!canPostToCommunities) {
      return;
    }
    await loadFeed({ page: 1, append: false, queryOverride: searchQuery });
    if (selectedCommunity?.id && selectedCommunity.id !== 'all') {
      await loadCommunityDetail(selectedCommunity.id);
    }
  };

  const handleModeratePost = async (post, action) => {
    if (!token || !post?.id) return;
    const communityId = resolvePostCommunityId(post);
    if (!communityId) return;

    if (action === 'suppress' && !window.confirm('Suppress this post from the feed?')) {
      return;
    }

    updatePostActionState(post.id, { isProcessing: true, error: null });

    try {
      const response = await moderateCommunityPost({
        communityId,
        postId: post.id,
        token,
        action,
        reason: undefined
      });
      const updatedPost = response?.data;
      updateFeedPost(post.id, () => (updatedPost?.status === 'archived' ? null : updatedPost));
      updatePostActionState(post.id, null);
    } catch (error) {
      updatePostActionState(post.id, { isProcessing: false, error: error?.message ?? 'Unable to update moderation state.' });
    }
  };

  const handleRemovePost = async (post) => {
    if (!token || !post?.id) return;
    const communityId = resolvePostCommunityId(post);
    if (!communityId) return;

    if (!window.confirm('Remove this post from the community feed? This cannot be undone.')) {
      return;
    }

    updatePostActionState(post.id, { isProcessing: true, error: null });

    try {
      await removeCommunityPost({ communityId, postId: post.id, token, reason: undefined });
      updateFeedPost(post.id, () => null);
      updatePostActionState(post.id, null);
    } catch (error) {
      updatePostActionState(post.id, { isProcessing: false, error: error?.message ?? 'Unable to remove this post.' });
    }
  };

  const handleDismissPlacement = async (placement) => {
    if (!token || !communityDetail?.id) return;
    const placementId = placement?.placementId ?? placement?.id;
    if (!placementId) return;

    setSponsorshipError(null);
    setIsUpdatingSponsorship(true);

    try {
      const nextBlocked = Array.from(new Set([...(sponsorships?.blockedPlacementIds ?? []), placementId]));
      const response = await updateCommunitySponsorships({
        communityId: communityDetail.id,
        token,
        blockedPlacementIds: nextBlocked
      });
      const saved = response?.data ?? { blockedPlacementIds: nextBlocked };
      setSponsorships(saved);
      setFeedItems((prev) =>
        prev.filter((entry) => !(entry?.kind === 'ad' && entry.ad?.placementId === placementId))
      );
      setFeedAdsMeta((prev) => {
        if (!prev) return prev;
        const remainingPlacements = (prev.placements ?? []).filter((item) => item.placementId !== placementId);
        return {
          ...prev,
          count: remainingPlacements.length,
          placements: remainingPlacements
        };
      });
    } catch (error) {
      setSponsorshipError(error?.message ?? 'Unable to update sponsorship preferences.');
    } finally {
      setIsUpdatingSponsorship(false);
    }
  };

  const loadMoreResources = useCallback(async () => {
    if (!token || !canAccessCommunityFeed) return;
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
  }, [token, selectedCommunity, resources.length, resourcesMeta, canAccessCommunityFeed]);

  const hasMoreResources = resourcesMeta.total > resources.length;

  if (!canAccessCommunityFeed) {
    return (
      <div className="bg-slate-50/80 py-24">
        <div className="mx-auto max-w-2xl rounded-4xl border border-slate-200 bg-white px-8 py-12 text-center shadow-card">
          <h1 className="text-2xl font-semibold text-slate-900">Community feed unavailable</h1>
          <p className="mt-4 text-sm text-slate-600">
            Your current role does not provide access to the enterprise community feed or its related Learnspaces. Reach out to
            your platform administrator to request the appropriate permissions.
          </p>
        </div>
      </div>
    );
  }

  const joinDisabledReason = canJoinCommunities
    ? null
    : 'Your current role is limited to read-only access. Contact an administrator to manage membership changes.';

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
        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-gradient-to-br from-primary/10 via-white to-slate-50 p-8 shadow-card">
          <div className="grid gap-8 md:grid-cols-[minmax(0,_1.3fr)_minmax(0,_1fr)]">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Live operating feed
              </span>
              <h1 className="text-2xl font-semibold text-slate-900">Bring your ecosystem to life with trusted updates, cohort stories, and verified wins.</h1>
              <p className="text-sm text-slate-600">
                Follow top communities, spotlight your wins, and unlock curated playbooks across Edulure. Verified instructors surface here when their learners rave.
              </p>
              {!isAuthenticated && (
                <div className="inline-flex flex-wrap items-center gap-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm">
                  Sign in with SSO or Google Authenticator to personalise this feed.
                </div>
              )}
            </div>
            <div className="grid gap-3">
              {CURATED_HIGHLIGHTS.map((highlight) => (
                <div key={highlight.title} className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{highlight.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{highlight.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-primary">
                    {highlight.stats.map((stat) => (
                      <span key={stat} className="rounded-full bg-primary/10 px-3 py-1">{stat}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
            canJoin={canJoinCommunities}
            joinDisabledReason={joinDisabledReason}
            onLeave={communityDetail?.permissions?.canLeave ? handleLeaveCommunity : null}
            isLeaving={isLeavingCommunity}
            leaveError={leaveError}
            canLeave={communityDetail?.permissions?.canLeave}
          />
        )}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-6">
            {isAuthenticated && canPostToCommunities && (
              <FeedComposer
                communities={composerCommunities}
                defaultCommunityId={composerDefaultCommunityId}
                disabled={isLoadingCommunities || !canPostToCommunities}
                onPostCreated={handlePostCreated}
              />
            )}
            {isAuthenticated && !canPostToCommunities && (
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
                Your Learnspace is configured for read-only visibility. Ask an administrator to enable community posting access.
              </div>
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
                  {sponsorshipError && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600" role="alert">
                      {sponsorshipError}
                    </div>
                  )}
                  {feedItems.map((item) => {
                    if (item?.kind === 'ad' && item.ad) {
                      return (
                        <FeedSponsoredCard
                          key={`ad-${item.ad.placementId}`}
                          ad={item.ad}
                          canManage={Boolean(
                            selectedCommunity?.id !== 'all' && communityDetail?.permissions?.canManageSponsorships
                          )}
                          onDismiss={
                            selectedCommunity?.id !== 'all' && communityDetail?.permissions?.canManageSponsorships
                              ? () => handleDismissPlacement(item.ad)
                              : undefined
                          }
                          isProcessing={isUpdatingSponsorship || isLoadingSponsorships}
                        />
                      );
                    }
                    const post = item?.kind === 'post' ? item.post : item;
                    if (!post) {
                      return null;
                    }
                    return (
                      <FeedCard
                        key={`post-${post.id}`}
                        post={post}
                        onModerate={handleModeratePost}
                        onRemove={handleRemovePost}
                        actionState={postActions[post.id]}
                      />
                    );
                  })}
                  {feedItems.length === 0 && (
                    <div className="space-y-4">
                      {CURATED_STORIES.map((story) => (
                        <div key={story.title} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                              {story.badge}
                            </span>
                            <span>{story.time}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-slate-900">{story.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{story.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            {story.metrics.map((metric) => (
                              <span key={metric} className="rounded-full bg-slate-100 px-3 py-1">{metric}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                        No activity yet. Be the first to share an update.
                      </div>
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
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Trending now</h2>
              <div className="mt-4 space-y-4">
                {TRENDING_TOPICS.map((topic) => (
                  <div key={topic.tag} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{topic.tag}</span>
                      <span className="text-xs font-semibold text-primary">{topic.delta}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{topic.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-primary">
                Verified instructors get featured when their trust scores stay above 90 and they publish weekly updates.
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Featured creators</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {FEATURED_CREATORS.map((creator) => (
                  <div key={creator.handle} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{creator.name}</p>
                        <p className="text-xs text-slate-500">{creator.handle}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Trust {creator.trust}%</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{creator.highlight}</p>
                  </div>
                ))}
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
    </div>
  );
}
