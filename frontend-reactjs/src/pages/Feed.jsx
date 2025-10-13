import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAggregatedFeed,
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityFeed,
  fetchCommunityResources
} from '../api/communityApi.js';
import TopBar from '../components/TopBar.jsx';
import SkewedMenu from '../components/SkewedMenu.jsx';
import FeedComposer from '../components/FeedComposer.jsx';
import FeedCard from '../components/FeedCard.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

  const [communities, setCommunities] = useState([ALL_COMMUNITIES_NODE]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  const [communitiesError, setCommunitiesError] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(ALL_COMMUNITIES_NODE);
  const [activeMenuItem, setActiveMenuItem] = useState('Communities');
  const [feedItems, setFeedItems] = useState([]);
  const [feedMeta, setFeedMeta] = useState({ page: 1, perPage: 10, total: 0, pageCount: 0 });
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

  const menuState = useMemo(() => (selectedCommunity?.id === 'all' ? 'all' : 'community'), [selectedCommunity]);

  useEffect(() => {
    if (!token) {
      setCommunities([ALL_COMMUNITIES_NODE]);
      setSelectedCommunity(ALL_COMMUNITIES_NODE);
      setFeedItems([]);
      setFeedMeta({ page: 1, perPage: 10, total: 0, pageCount: 0 });
      setFeedError(null);
      setCommunityDetail(null);
      setCommunityDetailError(null);
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setResourcesError(null);
      setIsLoadingCommunityDetail(false);
      setIsLoadingResources(false);
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
    async ({ page = 1, append = false } = {}) => {
      if (!token) return;
      const isAggregate = selectedCommunity?.id === 'all';
      const setLoading = append ? setIsLoadingMore : setIsLoadingFeed;

      setLoading(true);
      if (!append) {
        setFeedError(null);
      }

      try {
        const request = isAggregate
          ? fetchAggregatedFeed({ token, page, perPage: 6 })
          : fetchCommunityFeed({ communityId: selectedCommunity.id, token, page, perPage: 6 });

        const response = await request;
        const items = response.data ?? [];
        const pagination = response.meta?.pagination ?? { page, perPage: 6, total: items.length, pageCount: 1 };

        setFeedItems((prev) => (append ? [...prev, ...items] : items));
        setFeedMeta(pagination);
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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-6">
            {isAuthenticated && <FeedComposer />}
            <div className="space-y-4">
              {isLoadingFeed && !isLoadingMore ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Loading community feed...
                </div>
              ) : feedError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{feedError}</div>
              ) : (
                <>
                  {feedItems.map((post) => (
                    <FeedCard key={post.id} post={post} />
                  ))}
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
