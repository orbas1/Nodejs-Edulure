import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoltIcon, RocketLaunchIcon, MegaphoneIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

import {
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityResources,
  createCommunityResource,
  joinCommunity,
  leaveCommunity,
  moderateCommunityPost,
  removeCommunityPost,
  fetchCommunitySponsorships,
  updateCommunitySponsorships,
  updateCommunityResource,
  deleteCommunityResource
} from '../api/communityApi.js';
import { fetchLiveFeed } from '../api/feedApi.js';
import TopBar from '../components/TopBar.jsx';
import SkewedMenu from '../components/SkewedMenu.jsx';
import FeedComposer from '../components/feed/Composer.jsx';
import FeedList from '../components/feed/FeedList.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import CommunityHero from '../components/CommunityHero.jsx';
import CommunityResourceEditor from '../components/community/CommunityResourceEditor.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAuthorization } from '../hooks/useAuthorization.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

const ALL_COMMUNITIES_NODE = {
  id: 'all',
  name: 'All Communities',
  description: null,
  stats: null
};

const DEFAULT_RESOURCES_META = { limit: 6, offset: 0, total: 0 };
const FEED_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
  { value: '365d', label: 'Last 12 months' }
];

const QUICK_ACTIONS = [
  {
    title: 'Share a win',
    description: 'Publish a milestone update to your community timeline.',
    action: 'Open composer',
    href: '#compose',
    icon: RocketLaunchIcon
  },
  {
    title: 'Schedule a live session',
    description: 'Plan your next cohort touchpoint or advisory AMA.',
    action: 'Plan session',
    href: '/dashboard/learner/live-classes',
    icon: BoltIcon
  },
  {
    title: 'Promote a resource',
    description: 'Boost a course, ebook, or template to the Explorer.',
    action: 'Launch Explorer',
    href: '/explorer',
    icon: MegaphoneIcon
  }
];

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

const COUNT_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatCount(value) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) {
    return '0';
  }
  if (numeric >= 1000000) {
    return `${DECIMAL_FORMATTER.format(numeric / 1000000)}M`;
  }
  if (numeric >= 1000) {
    return `${DECIMAL_FORMATTER.format(numeric / 1000)}K`;
  }
  return COUNT_FORMATTER.format(Math.round(numeric));
}

function formatCurrencyFromCents(value) {
  const numeric = Number(value ?? 0) / 100;
  return CURRENCY_FORMATTER.format(Number.isNaN(numeric) ? 0 : numeric);
}

function formatRelativeTimestamp(isoDate) {
  if (!isoDate) {
    return null;
  }
  const timestamp = new Date(isoDate);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }
  const diffMs = Date.now() - timestamp.getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
}

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
  const [feedRange, setFeedRange] = useState('30d');
  const [feedInsights, setFeedInsights] = useState({
    analytics: null,
    highlights: [],
    generatedAt: null,
    context: 'global'
  });
  const [feedInsightsError, setFeedInsightsError] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
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
  const [isResourceEditorOpen, setIsResourceEditorOpen] = useState(false);
  const [resourceEditorMode, setResourceEditorMode] = useState('create');
  const [resourceEditorInitial, setResourceEditorInitial] = useState(null);
  const [resourceEditorError, setResourceEditorError] = useState(null);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState(null);
  const [resourceNotice, setResourceNotice] = useState(null);

  const activeCommunity = useMemo(() => {
    if (communityDetail) {
      return communityDetail;
    }
    if (selectedCommunity?.id && selectedCommunity.id !== ALL_COMMUNITIES_NODE.id) {
      return selectedCommunity;
    }
    return null;
  }, [communityDetail, selectedCommunity]);

  const feedMetaDescription = useMemo(() => {
    if (activeCommunity?.description) {
      return activeCommunity.description;
    }
    if (activeCommunity?.name) {
      return `Monitor the ${activeCommunity.name} activity feed, resources, and sponsorships with live moderation controls and analytics.`;
    }
    return 'Stay ahead of community activity with the Edulure feed. Moderate posts, launch campaigns, and surface resources with role-aware controls.';
  }, [activeCommunity]);

  usePageMetadata({
    title: activeCommunity?.name ? `${activeCommunity.name} feed` : 'Edulure community feed',
    description: feedMetaDescription,
    canonicalPath: activeCommunity?.slug ? `/feed/${activeCommunity.slug}` : '/feed',
    image: activeCommunity?.coverImageUrl ?? undefined,
    keywords: activeCommunity?.metadata?.focus ? [activeCommunity.metadata.focus] : undefined,
    analytics: {
      page_type: 'feed',
      community_id: activeCommunity?.id ?? 'all',
      feed_range: feedRange,
      can_post: canPostToCommunities,
      can_join: canJoinCommunities
    }
  });

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
      setFeedRange('30d');
      setFeedInsights({ analytics: null, highlights: [], generatedAt: null, context: 'global' });
      setFeedInsightsError(null);
      setIsLoadingInsights(false);
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
      const context = isAggregate ? 'global' : 'community';
      const communityId = !isAggregate ? selectedCommunity?.id : undefined;
      const setLoading = append ? setIsLoadingMore : setIsLoadingFeed;
      const queryTerm = queryOverride !== undefined ? queryOverride : searchQueryRef.current;

      setLoading(true);
      if (!append) {
        setFeedError(null);
        setPostActions({});
        setIsLoadingInsights(true);
        setFeedInsightsError(null);
      }

      try {
        const response = await fetchLiveFeed({
          token,
          context,
          community: communityId,
          page,
          perPage: 6,
          range: feedRange,
          search: queryTerm || undefined,
          includeAnalytics: true,
          includeHighlights: true
        });

        const payload = response.data ?? {};
        const items = payload.items ?? [];
        const pagination = payload.pagination ?? {};
        const adsMeta = payload.ads ?? null;

        setFeedItems((prev) => (append ? [...prev, ...items] : items));
        setFeedMeta((prev) => {
          const prevTotal = append ? prev.total ?? 0 : 0;
          const perPage = pagination.perPage ?? prev.perPage ?? 6;
          const total = pagination.total ?? (append ? prevTotal + items.length : items.length);
          const pageValue = pagination.page ?? page;
          const pageCount = pagination.pageCount ?? (total ? Math.ceil(total / perPage) : 0);
          return {
            page: pageValue,
            perPage,
            total,
            pageCount
          };
        });
        setFeedAdsMeta(adsMeta);

        if (!append) {
          const nextRange = payload.range?.key ?? feedRange;
          setFeedRange(nextRange);
          setFeedInsights({
            analytics: payload.analytics ?? null,
            highlights: payload.highlights ?? [],
            generatedAt: payload.generatedAt ?? null,
            context: payload.context ?? context,
            range: nextRange
          });
          setFeedInsightsError(null);
        }
      } catch (error) {
        if (!append) {
          setFeedItems([]);
          setFeedInsights((prev) => ({ ...prev, analytics: null, highlights: [], generatedAt: null }));
          setFeedInsightsError(error.message ?? 'Unable to load feed insights');
        }
        setFeedError(error.message ?? 'Unable to load community feed');
      } finally {
        if (!append) {
          setIsLoadingInsights(false);
        }
        setLoading(false);
      }
    },
    [token, canAccessCommunityFeed, selectedCommunity, feedRange]
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

  const handleReactToPost = useCallback(
    (targetPost) => {
      if (!targetPost?.id) return;
      updateFeedPost(targetPost.id, (existing) => {
        if (!existing) return existing;
        const currentReactions = Number(existing.stats?.reactions ?? 0);
        return {
          ...existing,
          stats: {
            ...existing.stats,
            reactions: currentReactions + 1
          }
        };
      });
    },
    [updateFeedPost]
  );

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
    setResourceNotice(null);
    setResourceEditorError(null);
    setResourceEditorInitial(null);
    setIsResourceEditorOpen(false);
    setDeletingResourceId(null);
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
      setResourceNotice(null);
      setResourceEditorError(null);
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

  const openCreateResourceEditor = useCallback(() => {
    if (!communityDetail?.id) return;
    setResourceEditorMode('create');
    setResourceEditorInitial(null);
    setResourceEditorError(null);
    setIsResourceEditorOpen(true);
  }, [communityDetail?.id]);

  const openEditResourceEditor = useCallback(
    (resource) => {
      if (!communityDetail?.id || !resource) return;
      setResourceEditorMode('edit');
      setResourceEditorInitial(resource);
      setResourceEditorError(null);
      setIsResourceEditorOpen(true);
    },
    [communityDetail?.id]
  );

  const closeResourceEditor = useCallback(() => {
    setIsResourceEditorOpen(false);
    setResourceEditorInitial(null);
    setResourceEditorError(null);
  }, []);

  const handleResourceSubmit = async (payload) => {
    if (!token || !communityDetail?.id) return;
    setResourceEditorError(null);
    setResourceNotice(null);
    setIsSavingResource(true);

    try {
      if (resourceEditorMode === 'edit' && resourceEditorInitial?.id) {
        await updateCommunityResource({
          communityId: communityDetail.id,
          resourceId: resourceEditorInitial.id,
          token,
          payload
        });
        setResourceNotice('Resource updated successfully.');
      } else {
        await createCommunityResource({ communityId: communityDetail.id, token, payload });
        setResourceNotice(
          payload.status === 'published'
            ? 'Resource published to the community library.'
            : 'Resource draft saved for your community.'
        );
      }
      closeResourceEditor();
      await loadCommunityDetail(communityDetail.id);
    } catch (error) {
      setResourceEditorError(error?.message ?? 'Unable to save this resource right now.');
    } finally {
      setIsSavingResource(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!token || !communityDetail?.id || !resource?.id) return;
    if (!window.confirm('Remove this resource from the community library? This action cannot be undone.')) {
      return;
    }

    setResourcesError(null);
    setResourceEditorError(null);
    setResourceNotice(null);
    setDeletingResourceId(resource.id);

    try {
      await deleteCommunityResource({ communityId: communityDetail.id, resourceId: resource.id, token });
      setResourceNotice('Resource removed from the library.');
      await loadCommunityDetail(communityDetail.id);
    } catch (error) {
      setResourcesError(error?.message ?? 'Unable to remove this resource right now.');
    } finally {
      setDeletingResourceId(null);
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
  const highlightCards = useMemo(() => {
    const highlights = Array.isArray(feedInsights.highlights) ? feedInsights.highlights : [];
    if (highlights.length === 0) {
      return CURATED_HIGHLIGHTS.map((highlight) => ({
        key: highlight.title,
        title: highlight.title,
        description: highlight.description,
        stats: highlight.stats,
        timestamp: null,
        variant: 'curated'
      }));
    }

    return highlights.slice(0, 3).map((highlight) => {
      if (highlight.type === 'campaign') {
        const stats = [];
        const performanceScore = Number(highlight.metrics?.performanceScore ?? 0);
        if (performanceScore > 0) {
          stats.push(`Score ${Math.round(performanceScore)}`);
        }
        const ctr = Number(highlight.metrics?.ctr ?? 0);
        if (ctr > 0) {
          stats.push(`${DECIMAL_FORMATTER.format(ctr * 100)}% CTR`);
        }
        const spend = Number(highlight.metrics?.spendCents ?? 0);
        if (spend > 0) {
          stats.push(`${formatCurrencyFromCents(spend)} spent`);
        }
        return {
          key: `${highlight.type}-${highlight.id}`,
          title: highlight.name ?? highlight.title ?? 'Campaign spotlight',
          description: highlight.objective ?? highlight.summary ?? 'Campaign performance update.',
          stats: stats.length ? stats : ['Active campaign'],
          timestamp: highlight.timestamp ?? null,
          variant: 'campaign'
        };
      }

      const stats = [];
      if (highlight.projectType) {
        stats.push(highlight.projectType.replace(/[_-]+/g, ' '));
      }
      if (highlight.status) {
        stats.push(highlight.status.replace(/[_-]+/g, ' '));
      }
      if (Array.isArray(highlight.analyticsTargets) && highlight.analyticsTargets.length) {
        stats.push(`${highlight.analyticsTargets.length} KPIs`);
      }

      return {
        key: `${highlight.type}-${highlight.id}`,
        title: highlight.title ?? 'Creation highlight',
        description: highlight.summary ?? 'Creation studio project update.',
        stats: stats.length ? stats : ['Creation project'],
        timestamp: highlight.timestamp ?? null,
        variant: 'project'
      };
    });
  }, [feedInsights.highlights]);

  const resolvedTrendingTopics = useMemo(() => {
    const tags = feedInsights.analytics?.engagement?.trendingTags;
    if (Array.isArray(tags) && tags.length > 0) {
      return tags.map((entry) => ({
        tag: entry.tag?.startsWith('#') ? entry.tag : `#${entry.tag ?? ''}`,
        delta: `${formatCount(entry.count)} posts`,
        description: 'Trending across your active communities.'
      }));
    }
    return TRENDING_TOPICS;
  }, [feedInsights.analytics]);

  const engagementSummary = feedInsights.analytics?.engagement ?? null;
  const adsSummary = feedInsights.analytics?.ads ?? null;
  const feedGeneratedAtLabel = useMemo(
    () => (feedInsights.generatedAt ? formatRelativeTimestamp(feedInsights.generatedAt) : null),
    [feedInsights.generatedAt]
  );
  const isRangeControlDisabled = isLoadingFeed || isLoadingInsights;

  const canManageCommunityResources = useMemo(() => {
    if (!communityDetail) return false;
    if (communityDetail.permissions?.canManageResources) return true;
    const role = communityDetail.membership?.role;
    return role ? ['owner', 'admin', 'moderator'].includes(role) : false;
  }, [communityDetail]);

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

  const isManagingResources = isResourceEditorOpen || isSavingResource || Boolean(deletingResourceId);

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
              <h1 className="text-2xl font-semibold text-slate-900">Focus your community energy for today.</h1>
              <p className="text-sm text-slate-600">
                Publish a win, schedule a live moment, or boost a resource—then get back to supporting your operators.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <label className="flex items-center gap-2">
                  <span>Time range</span>
                  <select
                    value={feedRange}
                    onChange={(event) => setFeedRange(event.target.value)}
                    disabled={isRangeControlDisabled}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    {FEED_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {feedGeneratedAtLabel && (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    Updated {feedGeneratedAtLabel}
                  </span>
                )}
              </div>
              {!isAuthenticated && (
                <div className="inline-flex flex-wrap items-center gap-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm">
                  Sign in with SSO or email one-time codes to personalise this feed.
                </div>
              )}
            </div>
            <div className="grid gap-3">
              {highlightCards.map((highlight) => (
                <div key={highlight.key} className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
                    <span className="uppercase tracking-wide text-primary">
                      {highlight.variant === 'campaign'
                        ? 'Campaign spotlight'
                        : highlight.variant === 'project'
                          ? 'Creation highlight'
                          : 'Platform highlight'}
                    </span>
                    {highlight.timestamp && (
                      <span>Updated {formatRelativeTimestamp(highlight.timestamp)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{highlight.title}</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((item) => {
            const ActionIcon = item.icon;
            return (
              <a
                key={item.title}
                href={item.href}
                className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
              >
                <div className="flex items-center gap-3 text-primary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <ActionIcon className="h-5 w-5" />
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                </div>
                <p className="mt-3 flex-1 text-sm text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {item.action}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </span>
              </a>
            );
          })}
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
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live analytics</p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedCommunity?.id === 'all'
                      ? 'Global community activity'
                      : `${selectedCommunity?.name ?? 'Community'} activity`}
                  </h2>
                </div>
                {isLoadingInsights ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">Refreshing…</span>
                ) : feedGeneratedAtLabel ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    Synced {feedGeneratedAtLabel}
                  </span>
                ) : null}
              </div>

              {feedInsightsError && !isLoadingInsights ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600" role="alert">
                  {feedInsightsError}
                </div>
              ) : engagementSummary ? (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Posts analysed</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {formatCount(engagementSummary.postsSampled)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        of {formatCount(engagementSummary.postsTotal ?? engagementSummary.postsSampled)} posts this period
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatCount(engagementSummary.comments)}</p>
                      <p className="mt-1 text-xs text-slate-500">Total replies and discussion threads logged</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reactions</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatCount(engagementSummary.reactions)}</p>
                      <p className="mt-1 text-xs text-slate-500">Pulse of lightweight engagement over the range</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Communities active</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatCount(engagementSummary.uniqueCommunities)}</p>
                      <p className="mt-1 text-xs text-slate-500">Distinct communities with published updates</p>
                    </div>
                  </div>
                  {engagementSummary.latestActivityAt && (
                    <p className="mt-4 text-xs text-slate-500">
                      Latest activity {formatRelativeTimestamp(engagementSummary.latestActivityAt)}
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Insights will populate automatically as fresh activity flows into this feed.
                </div>
              )}

              {adsSummary && (
                <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-amber-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                    <span>Sponsored performance</span>
                    <span>
                      {adsSummary.activeCampaigns} active · {adsSummary.scheduledCampaigns} scheduled
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px] font-semibold">
                    <div>
                      <p className="text-amber-700">Impressions</p>
                      <p>{formatCount(adsSummary.totals?.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-amber-700">Clicks</p>
                      <p>{formatCount(adsSummary.totals?.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-amber-700">Conversions</p>
                      <p>{formatCount(adsSummary.totals?.conversions)}</p>
                    </div>
                    <div>
                      <p className="text-amber-700">Spend</p>
                      <p>{formatCurrencyFromCents(adsSummary.totals?.spendCents)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {isAuthenticated && canPostToCommunities && (
              <div id="compose">
                <FeedComposer
                  communities={composerCommunities}
                  defaultCommunityId={composerDefaultCommunityId}
                  disabled={isLoadingCommunities || !canPostToCommunities}
                  onPostCreated={handlePostCreated}
                />
              </div>
            )}
            {isAuthenticated && !canPostToCommunities && (
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
                Your Learnspace is configured for read-only visibility. Ask an administrator to enable community posting access.
              </div>
            )}
            <div className="space-y-4">
              {feedAdsMeta?.count > 0 && !feedError && (
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
              {feedError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{feedError}</div>
              ) : (
                <FeedList
                  items={feedItems}
                  loading={isLoadingFeed}
                  loadingMore={isLoadingMore}
                  hasMore={canLoadMore}
                  onLoadMore={handleLoadMore}
                  emptyState={
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
                  }
                  actionStates={postActions}
                  onModerate={handleModeratePost}
                  onRemove={handleRemovePost}
                  onDismissPlacement={handleDismissPlacement}
                  canManagePlacements={Boolean(
                    selectedCommunity?.id !== 'all' && communityDetail?.permissions?.canManageSponsorships
                  )}
                  isManagingPlacements={isUpdatingSponsorship || isLoadingSponsorships}
                  onReact={handleReactToPost}
                />
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Trending now</h2>
              {isLoadingInsights ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Analysing tags from the latest community updates…
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {resolvedTrendingTopics.map((topic) => (
                    <div key={topic.tag} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{topic.tag}</span>
                        <span className="text-xs font-semibold text-primary">{topic.delta}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{topic.description}</p>
                    </div>
                  ))}
                </div>
              )}
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
              onLeave={communityDetail?.permissions?.canLeave ? handleLeaveCommunity : null}
              isLeaving={isLeavingCommunity}
              canLeave={Boolean(communityDetail?.permissions?.canLeave)}
              onAddResource={canManageCommunityResources ? openCreateResourceEditor : null}
              onEditResource={canManageCommunityResources ? openEditResourceEditor : null}
              onDeleteResource={canManageCommunityResources ? handleDeleteResource : null}
              isManagingResource={isManagingResources}
              resourceNotice={resourceNotice}
              resourceActionId={deletingResourceId}
            />
          </div>
        </div>
      </div>
      {isResourceEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!isSavingResource) {
                closeResourceEditor();
              }
            }}
          />
          <div
            className="relative w-full max-w-3xl rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (!isSavingResource) {
                  closeResourceEditor();
                }
              }}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close resource editor"
              disabled={isSavingResource}
            >
              ×
            </button>
            <CommunityResourceEditor
              mode={resourceEditorMode === 'edit' ? 'edit' : 'create'}
              initialValue={resourceEditorMode === 'edit' ? resourceEditorInitial : null}
              onSubmit={handleResourceSubmit}
              onCancel={closeResourceEditor}
              isSubmitting={isSavingResource}
              error={resourceEditorError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
