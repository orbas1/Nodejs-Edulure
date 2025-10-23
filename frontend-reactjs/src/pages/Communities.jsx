import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { SparklesIcon, UserGroupIcon, UsersIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon, ChevronRightIcon, MapIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

import {
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityFeed,
  fetchCommunityResources,
  joinCommunity,
  leaveCommunity,
  listCommunityPaywallTiers,
  startCommunitySubscriptionCheckout,
  listMyCommunitySubscriptions,
  cancelMyCommunitySubscription
} from '../api/communityApi.js';
import CommunitySwitcher from '../components/CommunitySwitcher.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import FeedCard from '../components/FeedCard.jsx';
import CommunityInteractiveSuite from '../components/community/CommunityInteractiveSuite.jsx';
import CommunityCrudManager from '../components/community/CommunityCrudManager.jsx';
import CommunityChatModule from '../components/community/CommunityChatModule.jsx';
import CommunityMembersManager from '../components/community/CommunityMembersManager.jsx';
import CommunityMap from '../components/community/CommunityMap.jsx';
import CommunityAboutPanel from '../components/community/CommunityAboutPanel.jsx';
import CommunityMemberDirectory from '../components/community/CommunityMemberDirectory.jsx';
import CommunityEventSchedule from '../components/community/CommunityEventSchedule.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAuthorization } from '../hooks/useAuthorization.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { isAbortError } from '../utils/errors.js';

const ALL_COMMUNITIES_NODE = {
  id: 'all',
  name: 'All communities',
  description: 'Cross-community signal board',
  stats: null
};

const FALLBACK_COMMUNITY_DETAIL = {
  id: 'preview',
  name: 'Edulure Growth Architects',
  slug: 'edulure-growth-architects',
  description:
    'Revenue, learning, and community operators collaborating on multi-modal cohort experiences and high-trust launches.',
  coverImageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80',
  stats: {
    members: 2187,
    posts: 482,
    resources: 126,
    channels: 18,
    lastActivityAt: new Date().toISOString()
  },
  membership: {
    status: 'non-member',
    role: 'non-member'
  },
  metadata: {
    focus: 'Community-led revenue operations',
    ndaRequired: true,
    defaultChannel: '#executive-briefings',
    timezone: 'Global / UTC',
    analyticsKey: 'EDU-REVOPS-01',
    classroomReference: 'Cohort-2024-Q2',
    registrationUrl: 'https://app.edulure.com/register'
  },
  ratings: {
    average: 4.9,
    totalReviews: 428,
    highlight: 'Enterprise-trusted learning network',
    breakdown: {
      5: 0.82,
      4: 0.14,
      3: 0.03,
      2: 0.009,
      1: 0.001
    }
  },
  reviews: [
    {
      id: 'r1',
      reviewer: 'Amina Rowe',
      role: 'Chief Learning Officer, Vanta',
      rating: 5,
      comment:
        'The blended classroom and recorded library let our operators ship a revenue lab in 14 days. Moderation is swift and transparent.',
      publishedAt: '2024-05-11T16:00:00.000Z'
    },
    {
      id: 'r2',
      reviewer: 'Diego Mendès',
      role: 'Head of Revenue Operations, Atlassian',
      rating: 5,
      comment:
        'Playbooks, trust scoring, and subscription add-ons mesh perfectly. The leaderboard keeps the classroom accountable without feeling punitive.',
      publishedAt: '2024-04-20T09:00:00.000Z'
    }
  ],
  membershipMap: {
    totalCountries: 27,
    lastUpdatedAt: new Date().toISOString(),
    clusters: [
      { region: 'North America', percentage: 0.36, change: '+4.2%' },
      { region: 'EMEA', percentage: 0.29, change: '+2.4%' },
      { region: 'APAC', percentage: 0.22, change: '+3.1%' },
      { region: 'LATAM', percentage: 0.13, change: '+1.8%' }
    ],
    avatars: [
      'https://randomuser.me/api/portraits/women/68.jpg',
      'https://randomuser.me/api/portraits/men/29.jpg',
      'https://randomuser.me/api/portraits/women/47.jpg',
      'https://randomuser.me/api/portraits/men/94.jpg',
      'https://randomuser.me/api/portraits/women/75.jpg',
      'https://randomuser.me/api/portraits/men/61.jpg'
    ]
  },
  members: [
    {
      id: 'member-1',
      name: 'Amina Rowe',
      role: 'Owner',
      status: 'Active',
      title: 'Community Architect',
      location: 'San Francisco, USA',
      email: 'amina@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      tags: ['Leadership', 'Stage host', 'Revenue rituals'],
      isOnline: true,
      lastActiveAt: '2024-05-12T17:15:00.000Z'
    },
    {
      id: 'member-2',
      name: 'Leo Okafor',
      role: 'Moderator',
      status: 'Active',
      title: 'Operator Success',
      location: 'London, UK',
      email: 'leo@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/men/29.jpg',
      tags: ['Moderation', 'Classroom host'],
      isOnline: true,
      lastActiveAt: '2024-05-12T16:45:00.000Z',
      recommended: true
    },
    {
      id: 'member-3',
      name: 'Sofia Martínez',
      role: 'Member',
      status: 'Pending',
      title: 'Revenue Strategist',
      location: 'Madrid, ES',
      email: 'sofia@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/women/47.jpg',
      tags: ['Revenue pod', 'Onboarding'],
      isOnline: false,
      lastActiveAt: '2024-05-11T21:00:00.000Z'
    },
    {
      id: 'member-4',
      name: 'Nikhil Rao',
      role: 'Member',
      status: 'Active',
      title: 'Learning Designer',
      location: 'Bengaluru, IN',
      email: 'nikhil@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/men/94.jpg',
      tags: ['Instructional design', 'Async labs'],
      isOnline: true,
      lastActiveAt: '2024-05-12T13:20:00.000Z',
      recommended: true
    },
    {
      id: 'member-5',
      name: 'Linh Nguyen',
      role: 'Member',
      status: 'Active',
      title: 'Growth Operator',
      location: 'Ho Chi Minh City, VN',
      email: 'linh@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/women/75.jpg',
      tags: ['Growth experiments', 'Sponsorships'],
      isOnline: false,
      lastActiveAt: '2024-05-12T10:05:00.000Z'
    },
    {
      id: 'member-6',
      name: 'Maya Patel',
      role: 'Moderator',
      status: 'Active',
      title: 'Community Producer',
      location: 'Toronto, CA',
      email: 'maya@edulure.com',
      avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
      tags: ['Programming', 'Sponsor liaison'],
      isOnline: false,
      lastActiveAt: '2024-05-12T09:30:00.000Z',
      recommended: true
    }
  ],
  classrooms: {
    live: [
      {
        id: 'live-1',
        title: 'Revenue diagnostics lab',
        facilitator: 'Tara Chen',
        startsAt: '2024-05-22T16:00:00.000Z',
        durationMinutes: 75,
        seatsRemaining: 12
      },
      {
        id: 'live-2',
        title: 'Community monetisation deep dive',
        facilitator: 'Gareth Pruitt',
        startsAt: '2024-05-24T15:00:00.000Z',
        durationMinutes: 60,
        seatsRemaining: 7
      }
    ],
    recorded: [
      {
        id: 'rec-1',
        title: 'Operationalising trust dashboards',
        duration: '42m',
        releasedAt: '2024-04-02T10:00:00.000Z',
        linkUrl: 'https://app.edulure.com/library/trust-dashboards'
      },
      {
        id: 'rec-2',
        title: 'Async onboarding rituals',
        duration: '27m',
        releasedAt: '2024-03-16T10:00:00.000Z',
        linkUrl: 'https://app.edulure.com/library/async-onboarding'
      }
    ],
    liveClassroom: {
      host: 'Primary stage',
      status: 'Standby',
      capacity: 500,
      streamUrl: 'https://live.edulure.com/primary-stage'
    },
    chatChannels: [
      { id: 'channel-1', name: '#executive-briefings', members: 847, activity: 'High' },
      { id: 'channel-2', name: '#revenue-labs', members: 623, activity: 'High' },
      { id: 'channel-3', name: '#learning-design', members: 544, activity: 'Medium' }
    ]
  },
  leaderboard: [
    { rank: 1, name: 'Amina Rowe', role: 'Owner', points: 980, grade: 'A+' },
    { rank: 2, name: 'Leo Okafor', role: 'Moderator', points: 945, grade: 'A' },
    { rank: 3, name: 'Sofia Martínez', role: 'Member', points: 901, grade: 'A' },
    { rank: 4, name: 'Nikhil Rao', role: 'Member', points: 884, grade: 'A-' },
    { rank: 5, name: 'Linh Nguyen', role: 'Member', points: 872, grade: 'B+' }
  ],
  subscription: {
    currency: 'USD',
    billingInterval: 'month',
    plans: [
      { id: 'essential', name: 'Essential', price: 89, seats: 25, description: 'Core classroom + feed access' },
      {
        id: 'growth',
        name: 'Growth',
        price: 149,
        seats: 60,
        description: 'Advanced analytics, async labs, and feed automation'
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 329,
        seats: 150,
      description: 'Dedicated success pod, API integrations, and security perimeter controls'
    }
    ],
    addons: [
      { id: 'ads', name: 'Sponsorship placements', price: 120, description: 'Premium placements inside community feed' },
      { id: 'labs', name: 'Innovation sprints', price: 90, description: 'Quarterly facilitated innovation labs' },
      { id: 'talent', name: 'Talent marketplace', price: 70, description: 'Verified talent routing and matching' }
    ]
  },
  events: [
    {
      id: 'event-1',
      title: 'Operator summit',
      type: 'Flagship',
      startsAt: '2024-06-01T17:00:00.000Z',
      endsAt: '2024-06-01T22:00:00.000Z',
      description: 'Hybrid summit with live broadcast, breakout pods, and networking lounges.',
      registrationUrl: 'https://events.edulure.com/operator-summit',
      location: 'Hybrid · Edulure HQ + virtual',
      speakers: ['Amina Rowe', 'Mira Shah'],
      seatLimit: 500
    },
    {
      id: 'event-2',
      title: 'Async build weekend',
      type: 'Sprint',
      startsAt: '2024-05-25T12:00:00.000Z',
      endsAt: '2024-05-26T18:00:00.000Z',
      description: '72-hour async build with moderated voice rooms and funding pool.',
      registrationUrl: 'https://events.edulure.com/async-build-weekend',
      location: 'Virtual',
      speakers: ['Leo Okafor'],
      seatLimit: 300
    },
    {
      id: 'event-3',
      title: 'Sponsor enablement clinic',
      type: 'Partner',
      startsAt: '2024-05-29T15:00:00.000Z',
      endsAt: '2024-05-29T16:30:00.000Z',
      description: 'Partner success team walks through sponsorship placements, compliance, and reporting.',
      registrationUrl: 'https://events.edulure.com/sponsor-clinic',
      location: 'Virtual studio',
      speakers: ['Maya Patel'],
      seatLimit: 200
    }
  ],
  roles: {
    owner: {
      description: 'Full administrative authority, subscription control, moderation override, and data exports.',
      abilities: ['Approve moderators', 'Launch live classrooms', 'Configure billing and add-ons']
    },
    admin: {
      description: 'Operational control with audit logging, analytics oversight, and compliance workflows.',
      abilities: ['Manage monetisation', 'Publish community-wide announcements', 'Review escalations']
    },
    moderator: {
      description: 'Channel-level guardians managing safety, approvals, and classroom flow.',
      abilities: ['Approve posts', 'Host breakout rooms', 'Escalate incidents']
    },
    member: {
      description: 'Active participant with posting privileges, classroom enrolment, and leaderboard eligibility.',
      abilities: ['Post updates', 'Join live sessions', 'Collaborate in chat rooms']
    },
    'non-member': {
      description: 'Prospective participant with read-only visibility and curated previews of community momentum.',
      abilities: ['Review highlights', 'Request membership', 'Preview subscription pathways']
    }
  },
  security: {
    zeroTrust: true,
    singleSignOn: true,
    auditLog: true,
    lastPenTest: '2024-04-19',
    dataResidency: 'SOC2 Type II aligned, US & EU data clusters'
  },
  permissions: {
    canLeave: false
  },
  launchChecklist: {
    overallStatus: 'Ready for launch',
    items: [
      { id: 'brand', name: 'Brand system and banner calibration', status: 'complete' },
      { id: 'classroom', name: 'Live classroom rehearsal', status: 'complete' },
      { id: 'subscriptions', name: 'Subscription and add-on QA', status: 'complete' },
      { id: 'security', name: 'Security posture validation', status: 'complete' },
      { id: 'mobile', name: 'Mobile parity & responsive QA', status: 'complete' }
    ]
  }
};

const DEFAULT_RESOURCES_META = { limit: 6, offset: 0, total: 0 };

const numberFormatter = new Intl.NumberFormat('en-US');

function formatDate(value) {
  if (!value) return 'TBC';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return date.toLocaleString();
}

function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return `${currency} 0.00`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount));
  } catch (_error) {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function normaliseDetail(detail, resources) {
  if (!detail) {
    return { ...FALLBACK_COMMUNITY_DETAIL, classrooms: { ...FALLBACK_COMMUNITY_DETAIL.classrooms, recorded: resources } };
  }

  return {
    ...FALLBACK_COMMUNITY_DETAIL,
    ...detail,
    stats: { ...FALLBACK_COMMUNITY_DETAIL.stats, ...(detail.stats ?? {}) },
    membership: { ...FALLBACK_COMMUNITY_DETAIL.membership, ...(detail.membership ?? {}) },
    members:
      Array.isArray(detail.members) && detail.members.length > 0
        ? detail.members
        : [...FALLBACK_COMMUNITY_DETAIL.members],
    metadata: { ...FALLBACK_COMMUNITY_DETAIL.metadata, ...(detail.metadata ?? {}) },
    ratings: { ...FALLBACK_COMMUNITY_DETAIL.ratings, ...(detail.ratings ?? {}) },
    reviews:
      Array.isArray(detail.reviews) && detail.reviews.length > 0 ? detail.reviews : [...FALLBACK_COMMUNITY_DETAIL.reviews],
    membershipMap: {
      ...FALLBACK_COMMUNITY_DETAIL.membershipMap,
      ...(detail.membershipMap ?? {}),
      avatars:
        Array.isArray(detail.membershipMap?.avatars) && detail.membershipMap.avatars.length > 0
          ? detail.membershipMap.avatars
          : [...FALLBACK_COMMUNITY_DETAIL.membershipMap.avatars]
    },
    classrooms: {
      live: detail.classrooms?.live ?? [...FALLBACK_COMMUNITY_DETAIL.classrooms.live],
      recorded:
        resources && resources.length > 0 ? resources : detail.classrooms?.recorded ?? [...FALLBACK_COMMUNITY_DETAIL.classrooms.recorded],
      liveClassroom: detail.classrooms?.liveClassroom ?? { ...FALLBACK_COMMUNITY_DETAIL.classrooms.liveClassroom },
      chatChannels: detail.classrooms?.chatChannels ?? [...FALLBACK_COMMUNITY_DETAIL.classrooms.chatChannels]
    },
    leaderboard: Array.isArray(detail.leaderboard) && detail.leaderboard.length > 0
      ? detail.leaderboard
      : [...FALLBACK_COMMUNITY_DETAIL.leaderboard],
    subscription: {
      ...FALLBACK_COMMUNITY_DETAIL.subscription,
      ...(detail.subscription ?? {}),
      plans:
        Array.isArray(detail.subscription?.plans) && detail.subscription.plans.length > 0
          ? detail.subscription.plans
          : [...FALLBACK_COMMUNITY_DETAIL.subscription.plans],
      addons:
        Array.isArray(detail.subscription?.addons) && detail.subscription.addons.length > 0
          ? detail.subscription.addons
          : [...FALLBACK_COMMUNITY_DETAIL.subscription.addons]
    },
    events:
      Array.isArray(detail.events) && detail.events.length > 0
        ? detail.events
        : [...FALLBACK_COMMUNITY_DETAIL.events],
    roles: { ...FALLBACK_COMMUNITY_DETAIL.roles, ...(detail.roles ?? {}) },
    security: { ...FALLBACK_COMMUNITY_DETAIL.security, ...(detail.security ?? {}) },
    permissions: { ...FALLBACK_COMMUNITY_DETAIL.permissions, ...(detail.permissions ?? {}) },
    launchChecklist: {
      ...FALLBACK_COMMUNITY_DETAIL.launchChecklist,
      ...(detail.launchChecklist ?? {}),
      items:
        Array.isArray(detail.launchChecklist?.items) && detail.launchChecklist.items.length > 0
          ? detail.launchChecklist.items
          : [...FALLBACK_COMMUNITY_DETAIL.launchChecklist.items]
    }
  };
}

function RatingMeter({ value }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600">{percentage}%</span>
    </div>
  );
}

function RatingMeterRow({ rating, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-5 text-xs font-semibold text-slate-500">{rating}</span>
      <RatingMeter value={value} />
    </div>
  );
}

export default function Communities() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const {
    role,
    baseRole,
    canAccessCommunityFeed,
    canJoinCommunities,
    canModerateCommunities,
    canManageCommunitySubscriptions,
    canViewCommunityLocations
  } = useAuthorization();

  const [communities, setCommunities] = useState([ALL_COMMUNITIES_NODE]);
  const [selectedCommunity, setSelectedCommunity] = useState(ALL_COMMUNITIES_NODE);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  const [communitiesError, setCommunitiesError] = useState(null);

  const [communityDetail, setCommunityDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [resources, setResources] = useState([]);
  const [resourcesMeta, setResourcesMeta] = useState({ ...DEFAULT_RESOURCES_META });
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState(null);

  const [feedItems, setFeedItems] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState(null);

  const [activeExperience, setActiveExperience] = useState('live');

  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [paywallTiers, setPaywallTiers] = useState([]);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    provider: 'stripe',
    couponCode: '',
    receiptEmail: session?.user?.email ?? '',
    taxCountry: 'US',
    taxRegion: '',
    taxPostalCode: '',
    affiliateCode: ''
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [subscriptionCheckouts, setSubscriptionCheckouts] = useState([]);

  const selectedCommunityId = selectedCommunity?.id ?? null;

  const activeCommunity = useMemo(() => {
    if (communityDetail) {
      return communityDetail;
    }
    if (selectedCommunity?.id && selectedCommunity.id !== ALL_COMMUNITIES_NODE.id) {
      return selectedCommunity;
    }
    return null;
  }, [communityDetail, selectedCommunity]);

  const communityKeywords = useMemo(() => {
    const keywords = new Set();
    const tags = Array.isArray(activeCommunity?.tags) ? activeCommunity.tags : [];
    tags.forEach((tag) => {
      if (typeof tag?.name === 'string') {
        keywords.add(tag.name);
      } else if (typeof tag === 'string') {
        keywords.add(tag);
      }
    });
    if (typeof activeCommunity?.metadata?.focus === 'string') {
      keywords.add(activeCommunity.metadata.focus);
    }
    if (typeof activeCommunity?.metadata?.defaultChannel === 'string') {
      keywords.add(activeCommunity.metadata.defaultChannel.replace(/^#/, ''));
    }
    return Array.from(keywords);
  }, [activeCommunity]);

  const communityMetaDescription = useMemo(() => {
    if (activeCommunity?.description) {
      return activeCommunity.description;
    }
    if (activeCommunity?.stats?.members) {
      return `Join ${activeCommunity.name} on Edulure to collaborate with ${activeCommunity.stats.members.toLocaleString()} operators across live classrooms, async labs, and curated resources.`;
    }
    return 'Discover and operate thriving Edulure communities with live classrooms, async resources, monetisation tools, and secure collaboration features.';
  }, [activeCommunity]);

  const communityCanonicalPath = activeCommunity?.slug ? `/communities/${activeCommunity.slug}` : '/communities';

  const communityStructuredData = useMemo(() => {
    if (!activeCommunity) {
      return null;
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: activeCommunity.name,
      description: communityMetaDescription,
      url: activeCommunity.metadata?.registrationUrl ?? undefined,
      image: activeCommunity.coverImageUrl ?? undefined,
      memberCount: activeCommunity.stats?.members ?? undefined,
      areaServed: activeCommunity.membershipMap?.totalCountries
        ? `${activeCommunity.membershipMap.totalCountries} global regions`
        : undefined
    };
  }, [activeCommunity, communityMetaDescription]);

  usePageMetadata({
    title: activeCommunity?.name ? `${activeCommunity.name} community hub` : 'Edulure communities directory',
    description: communityMetaDescription,
    canonicalPath: communityCanonicalPath,
    image: activeCommunity?.coverImageUrl ?? undefined,
    keywords: communityKeywords,
    structuredData: communityStructuredData,
    analytics: {
      page_type: 'community_hub',
      community_id: activeCommunity?.id ?? 'all',
      community_role: role,
      base_role: baseRole,
      feed_access: canAccessCommunityFeed,
      moderation_access: canModerateCommunities
    }
  });

  useEffect(() => {
    setSubscriptionForm((current) => ({
      ...current,
      receiptEmail: session?.user?.email ?? current.receiptEmail ?? ''
    }));
  }, [session?.user?.email]);

  useEffect(() => {
    if (!token || !canAccessCommunityFeed) {
      setCommunities([ALL_COMMUNITIES_NODE]);
      setSelectedCommunity(ALL_COMMUNITIES_NODE);
      setCommunityDetail(null);
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setResourcesError(null);
      setFeedItems([]);
      setFeedError(null);
      setJoinError(null);
      setLeaveError(null);
      setIsJoining(false);
      setIsLeaving(false);
      return;
    }

    let isMounted = true;
    setIsLoadingCommunities(true);
    setCommunitiesError(null);

    fetchCommunities(token)
      .then((response) => {
        if (!isMounted) return;
        const nodes = Array.isArray(response.data) && response.data.length > 0 ? response.data : [];
        const nextCommunities = [ALL_COMMUNITIES_NODE, ...nodes];
        setCommunities(nextCommunities);
        setSelectedCommunity((prev) => {
          if (!prev) return nextCommunities[0] ?? ALL_COMMUNITIES_NODE;
          const stillExists = nextCommunities.find((item) => String(item.id) === String(prev.id));
          return stillExists ?? nextCommunities[0] ?? ALL_COMMUNITIES_NODE;
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
  }, [token, canAccessCommunityFeed]);

  const loadCommunityDetail = useCallback(
    async (communityId) => {
      if (!token || !communityId || communityId === 'all') {
        setCommunityDetail(null);
        setResources([]);
        setResourcesMeta({ ...DEFAULT_RESOURCES_META });
        setResourcesError(null);
        return;
      }

      setIsLoadingDetail(true);
      setDetailError(null);
      setIsLoadingResources(true);
      setResourcesError(null);

      try {
        const [detailResult, resourcesResult] = await Promise.allSettled([
          fetchCommunityDetail(communityId, token),
          fetchCommunityResources({ communityId, token, limit: DEFAULT_RESOURCES_META.limit, offset: 0 })
        ]);

        if (detailResult.status === 'fulfilled') {
          setCommunityDetail(detailResult.value?.data ?? null);
        } else {
          setCommunityDetail(null);
          setDetailError(detailResult.reason?.message ?? 'Unable to load community detail');
        }

        if (resourcesResult.status === 'fulfilled') {
          const resourceItems = resourcesResult.value?.data ?? [];
          setResources(resourceItems);
          const pagination = resourcesResult.value?.meta?.pagination ?? {};
          setResourcesMeta({
            limit: pagination.limit ?? DEFAULT_RESOURCES_META.limit,
            offset: pagination.offset ?? DEFAULT_RESOURCES_META.offset,
            total: pagination.total ?? resourceItems.length
          });
        } else {
          setResources([]);
          setResourcesMeta({ ...DEFAULT_RESOURCES_META });
          setResourcesError(resourcesResult.reason?.message ?? 'Unable to load resources');
        }
      } catch (error) {
        setDetailError(error.message ?? 'Unable to load community detail');
      } finally {
        setIsLoadingDetail(false);
        setIsLoadingResources(false);
      }
    },
    [token]
  );

  const loadFeed = useCallback(
    async (communityId) => {
      if (!token || !canAccessCommunityFeed) {
        setFeedItems([]);
        return;
      }

      setIsLoadingFeed(true);
      setFeedError(null);
      try {
        const response = await fetchCommunityFeed({ communityId, token, page: 1, perPage: 5 });
        setFeedItems(response.data ?? []);
      } catch (error) {
        setFeedItems([]);
        setFeedError(error.message ?? 'Unable to load community feed');
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [token, canAccessCommunityFeed]
  );

  useEffect(() => {
    if (!selectedCommunityId) return;
    if (selectedCommunityId === 'all') {
      setCommunityDetail(null);
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setResourcesError(null);
      setFeedItems([]);
      setIsLoadingFeed(false);
      setFeedError(null);
      return;
    }

    loadCommunityDetail(selectedCommunityId);
    loadFeed(selectedCommunityId);
  }, [selectedCommunityId, loadCommunityDetail, loadFeed]);

  const resolvedDetail = useMemo(
    () => normaliseDetail(selectedCommunityId === 'all' ? null : communityDetail, resources),
    [selectedCommunityId, communityDetail, resources]
  );

  const hasMoreResources = useMemo(() => {
    const total = resourcesMeta.total ?? resources.length;
    return total > resources.length;
  }, [resourcesMeta.total, resources.length]);

  const liveSessions = resolvedDetail.classrooms.live ?? [];
  const recordedSessions = resolvedDetail.classrooms.recorded ?? [];
  const liveStage = resolvedDetail.classrooms.liveClassroom ?? null;
  const leaderboardEntries = resolvedDetail.leaderboard ?? [];
  const communityEvents = resolvedDetail.events ?? [];
  const communityMembers = resolvedDetail.members ?? [];
  const communityPodcasts = communityDetail?.podcasts ?? [];

  const interactiveSeeds = useMemo(() => {
    const safeFeed = Array.isArray(feedItems) ? feedItems : [];
    const safeLive = Array.isArray(liveSessions) ? liveSessions : [];
    const safeRecorded = Array.isArray(recordedSessions) ? recordedSessions : [];
    const stageHost = liveStage?.host ?? 'Community stage';

    const calendarSeed = safeLive.map((session) => {
      const start = session.startsAt ?? '';
      let end = '';
      if (start && Number.isFinite(session.durationMinutes)) {
        const startDate = new Date(start);
        if (!Number.isNaN(startDate.getTime())) {
          end = new Date(startDate.getTime() + session.durationMinutes * 60000).toISOString();
        }
      }

      return {
        id: `calendar-${session.id}`,
        title: session.title,
        category: 'Classroom',
        startsAt: start,
        endsAt: end,
        location: stageHost,
        owner: session.facilitator,
        description: `Live classroom facilitated by ${session.facilitator}`
      };
    });

    const livestreamSeed = [];
    if (liveStage?.streamUrl) {
      livestreamSeed.push({
        id: `stage-${liveStage.streamUrl}`,
        title: stageHost,
        host: stageHost,
        startsAt: safeLive[0]?.startsAt ?? '',
        streamUrl: liveStage.streamUrl,
        status: liveStage.status ?? 'Standby'
      });
    }

    safeLive.forEach((session) => {
      livestreamSeed.push({
        id: `stream-${session.id}`,
        title: `${session.title} broadcast`,
        host: session.facilitator,
        startsAt: session.startsAt ?? '',
        streamUrl: liveStage?.streamUrl ?? '#',
        status: session.status ?? 'Scheduled'
      });
    });

    const eventsSeed = Array.isArray(communityEvents)
      ? communityEvents.map((event, index) => ({
          id: event.id ?? `event-${index}`,
          title: event.title ?? 'Community event',
          type: event.type ?? 'Campaign',
          startsAt: event.startsAt ?? event.startDate ?? '',
          endsAt: event.endsAt ?? event.endDate ?? '',
          location: event.location ?? '',
          registrationUrl: event.registrationUrl ?? event.url ?? '',
          description: event.description ?? ''
        }))
      : [];

    return {
      feed: safeFeed,
      liveSessions: safeLive,
      recordedSessions: safeRecorded,
      calendar: calendarSeed,
      livestreams: livestreamSeed,
      podcasts: Array.isArray(communityPodcasts) ? communityPodcasts : [],
      leaderboard: Array.isArray(leaderboardEntries) ? leaderboardEntries : [],
      events: eventsSeed
    };
  }, [
    feedItems,
    liveSessions,
    recordedSessions,
    liveStage,
    communityEvents,
    communityPodcasts,
    leaderboardEntries
  ]);

  const subscriptionPlans = useMemo(() => {
    if (paywallTiers.length > 0) {
      return paywallTiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description ?? '',
        priceCents: Number.isFinite(Number(tier.priceCents)) ? Number(tier.priceCents) : 0,
        currency: tier.currency ?? resolvedDetail.subscription.currency ?? 'USD',
        interval: tier.billingInterval ?? resolvedDetail.subscription.billingInterval ?? 'monthly',
        seats: tier.metadata?.seats ?? null,
        trialPeriodDays: Number.isFinite(Number(tier.trialPeriodDays)) ? Number(tier.trialPeriodDays) : null,
        benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
        metadata: tier.metadata ?? {}
      }));
    }

    return (resolvedDetail.subscription.plans ?? []).map((plan) => ({
      ...plan,
      priceCents: Number.isFinite(Number(plan.priceCents))
        ? Number(plan.priceCents)
        : Number.isFinite(Number(plan.price))
          ? Math.round(Number(plan.price) * 100)
          : 0,
      currency: plan.currency ?? resolvedDetail.subscription.currency ?? 'USD',
      interval: plan.interval ?? resolvedDetail.subscription.billingInterval ?? 'monthly',
      seats: plan.seats ?? null,
      trialPeriodDays: plan.trialPeriodDays ?? null,
      benefits: Array.isArray(plan.benefits) ? plan.benefits : []
    }));
  }, [paywallTiers, resolvedDetail.subscription]);

  const subscriptionAddons = useMemo(() => {
    return (resolvedDetail.subscription.addons ?? []).map((addon) => ({
      ...addon,
      priceCents: Number.isFinite(Number(addon.priceCents))
        ? Number(addon.priceCents)
        : Number.isFinite(Number(addon.price))
          ? Math.round(Number(addon.price) * 100)
          : 0
    }));
  }, [resolvedDetail.subscription.addons]);

  useEffect(() => {
    if (!subscriptionPlans.length) return;
    if (!selectedPlanId || !subscriptionPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(subscriptionPlans[0]?.id ?? null);
    }
  }, [subscriptionPlans, selectedPlanId]);

  useEffect(() => {
    setSelectedAddons([]);
    setSubscriptionStatus(null);
    setSubscriptionError(null);
    setSubscriptionCheckouts([]);
  }, [selectedCommunityId]);

  const selectedPlan = useMemo(() => {
    if (!subscriptionPlans.length) return null;
    return subscriptionPlans.find((plan) => plan.id === selectedPlanId) ?? subscriptionPlans[0] ?? null;
  }, [subscriptionPlans, selectedPlanId]);

  const subscriptionCurrency = selectedPlan?.currency ?? subscriptionPlans[0]?.currency ?? 'USD';

  const totalSubscriptionCostCents = useMemo(() => {
    if (!selectedPlan) return 0;
    const addonTotal = selectedAddons.reduce((total, addonId) => {
      const addon = subscriptionAddons.find((item) => item.id === addonId);
      return addon ? total + Number(addon.priceCents ?? 0) : total;
    }, 0);
    return Number(selectedPlan.priceCents ?? 0) + addonTotal;
  }, [selectedPlan, selectedAddons, subscriptionAddons]);

  const totalSubscriptionCostDisplay = formatCurrency(totalSubscriptionCostCents / 100, subscriptionCurrency);

  const handleAddOnToggle = (addonId) => {
    setSelectedAddons((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
  };

  const loadPaywallTiers = useCallback(
    async ({ signal } = {}) => {
      if (!token || !selectedCommunityId || selectedCommunityId === 'all') {
        setPaywallTiers([]);
        return;
      }
      setPaywallLoading(true);
      try {
        const response = await listCommunityPaywallTiers({
          communityId: selectedCommunityId,
          token,
          includeInactive: false,
          signal
        });
        if (!signal?.aborted) {
          setPaywallTiers(response?.data ?? []);
        }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          return;
        }
        setPaywallTiers([]);
        setSubscriptionError(error.message ?? 'Unable to load paywall tiers');
      } finally {
        if (!signal?.aborted) {
          setPaywallLoading(false);
        }
      }
    },
    [selectedCommunityId, token]
  );

  const loadMySubscriptions = useCallback(
    async ({ signal } = {}) => {
      if (!token || !selectedCommunityId || selectedCommunityId === 'all') {
        setMySubscriptions([]);
        return;
      }
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      try {
        const response = await listMyCommunitySubscriptions({
          communityId: selectedCommunityId,
          token,
          signal
        });
        if (!signal?.aborted) {
          setMySubscriptions(response?.data ?? response ?? []);
        }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          return;
        }
        setSubscriptionError(error.message ?? 'Unable to load subscriptions');
        setMySubscriptions([]);
      } finally {
        if (!signal?.aborted) {
          setSubscriptionLoading(false);
        }
      }
    },
    [selectedCommunityId, token]
  );

  useEffect(() => {
    if (!token || !selectedCommunityId || selectedCommunityId === 'all') {
      setPaywallTiers([]);
      setMySubscriptions([]);
      return undefined;
    }
    const controller = new AbortController();
    loadPaywallTiers({ signal: controller.signal });
    loadMySubscriptions({ signal: controller.signal });
    return () => controller.abort();
  }, [token, selectedCommunityId, loadPaywallTiers, loadMySubscriptions]);

  const handleSubscriptionFormChange = (event) => {
    const { name, value } = event.target;
    setSubscriptionForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubscriptionCheckout = async (event) => {
    event.preventDefault();
    if (!token) {
      setSubscriptionStatus({ type: 'error', message: 'Sign in to start a subscription checkout.' });
      return;
    }
    if (!selectedCommunityId || selectedCommunityId === 'all') {
      setSubscriptionStatus({ type: 'error', message: 'Select a community to continue.' });
      return;
    }
    if (!selectedPlan) {
      setSubscriptionStatus({ type: 'error', message: 'Select a subscription tier to continue.' });
      return;
    }

    const tierId = selectedPlan?.id;
    if (!Number.isInteger(Number(tierId))) {
      setSubscriptionStatus({
        type: 'error',
        message: 'This community does not have live paywall tiers yet. Contact an administrator.'
      });
      return;
    }

    setSubscriptionStatus({ type: 'pending', message: 'Preparing subscription checkout…' });
    setSubscriptionError(null);
    try {
      const payload = {
        tierId: Number(tierId),
        provider: subscriptionForm.provider,
        couponCode: subscriptionForm.couponCode?.trim() || undefined,
        receiptEmail: subscriptionForm.receiptEmail?.trim() || undefined,
        affiliateCode: subscriptionForm.affiliateCode?.trim() || undefined
      };
      if (subscriptionForm.taxCountry) {
        payload.tax = {
          country: subscriptionForm.taxCountry,
          region: subscriptionForm.taxRegion?.trim() || undefined,
          postalCode: subscriptionForm.taxPostalCode?.trim() || undefined
        };
      }
      const response = await startCommunitySubscriptionCheckout({
        communityId: selectedCommunityId,
        token,
        payload
      });
      const payment = response?.data?.payment ?? response?.payment ?? {};
      const subscription = response?.data?.subscription ?? response?.subscription ?? {};
      const approvalHint = payment.approvalUrl
        ? `Approval URL ready: ${payment.approvalUrl}`
        : payment.clientSecret
          ? `Stripe client secret issued: ${payment.clientSecret}`
          : 'Payment reference generated. Continue in your billing provider to confirm.';
      setSubscriptionStatus({
        type: 'success',
        message: `Checkout created. Payment ${payment.paymentId ?? 'pending'} · ${approvalHint}`
      });
      setSubscriptionCheckouts((current) => [
        {
          id: payment.paymentId ?? `${subscription.publicId ?? tierId}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          paymentId: payment.paymentId ?? null,
          approvalUrl: payment.approvalUrl ?? null,
          clientSecret: payment.clientSecret ?? null,
          provider: subscriptionForm.provider,
          tierName: selectedPlan.name,
          amountCents: totalSubscriptionCostCents,
          currency: subscriptionCurrency
        },
        ...current.slice(0, 7)
      ]);
      await loadMySubscriptions();
    } catch (error) {
      setSubscriptionStatus({
        type: 'error',
        message: error.message ?? 'Unable to start subscription checkout.'
      });
    }
  };

  const handleRefreshSubscriptions = () => {
    setSubscriptionStatus(null);
    setSubscriptionError(null);
    loadMySubscriptions();
  };

  const handleRefreshPaywall = () => {
    setSubscriptionError(null);
    loadPaywallTiers();
  };

  const handleCancelSubscription = async (subscriptionId, cancelAtPeriodEnd = false) => {
    if (!token || !selectedCommunityId || !subscriptionId) {
      return;
    }
    setSubscriptionStatus({ type: 'pending', message: 'Processing cancellation…' });
    try {
      await cancelMyCommunitySubscription({
        communityId: selectedCommunityId,
        subscriptionId,
        token,
        payload: { cancelAtPeriodEnd }
      });
      setSubscriptionStatus({
        type: 'success',
        message: cancelAtPeriodEnd
          ? 'Cancellation scheduled for the end of the billing cycle.'
          : 'Subscription cancelled.'
      });
      await loadMySubscriptions();
    } catch (error) {
      setSubscriptionStatus({
        type: 'error',
        message: error.message ?? 'Unable to cancel subscription.'
      });
    }
  };

  const handleLoadMoreResources = useCallback(async () => {
    if (!token || !canAccessCommunityFeed) return;
    if (!selectedCommunityId || selectedCommunityId === 'all') return;
    if (!hasMoreResources) return;

    const limit = resourcesMeta.limit || DEFAULT_RESOURCES_META.limit;
    const offset = resources.length;

    setIsLoadingResources(true);
    setResourcesError(null);

    try {
      const response = await fetchCommunityResources({ communityId: selectedCommunityId, token, limit, offset });
      const items = response.data ?? [];
      const pagination = response.meta?.pagination ?? {};
      setResources((prev) => [...prev, ...items]);
      setResourcesMeta({
        limit: pagination.limit ?? limit,
        offset: pagination.offset ?? offset,
        total: pagination.total ?? (resourcesMeta.total ?? offset + items.length)
      });
    } catch (error) {
      setResourcesError(error.message ?? 'Unable to load community resources');
    } finally {
      setIsLoadingResources(false);
    }
  }, [
    token,
    canAccessCommunityFeed,
    selectedCommunityId,
    hasMoreResources,
    resourcesMeta.limit,
    resourcesMeta.total,
    resources.length
  ]);

  const handleJoin = async () => {
    if (!selectedCommunityId || selectedCommunityId === 'all' || !canJoinCommunities || !token) return;
    setIsJoining(true);
    setJoinError(null);
    setLeaveError(null);
    try {
      const response = await joinCommunity({ communityId: selectedCommunityId, token });
      const nextDetail = response.data ?? null;
      if (nextDetail) {
        setCommunityDetail(nextDetail);
        setCommunities((prev) =>
          prev.map((community) =>
            String(community.id) === String(selectedCommunityId)
              ? { ...community, ...nextDetail }
              : community
          )
        );
      }
      await loadCommunityDetail(selectedCommunityId);
      await loadFeed(selectedCommunityId);
    } catch (error) {
      setJoinError(error.message ?? 'Unable to update membership');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!selectedCommunityId || selectedCommunityId === 'all' || !token) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      const response = await leaveCommunity({ communityId: selectedCommunityId, token });
      const summary = response.data ?? null;
      if (summary) {
        setCommunityDetail(summary);
        setCommunities((prev) =>
          prev.map((community) =>
            String(community.id) === String(selectedCommunityId)
              ? { ...community, ...summary }
              : community
          )
        );
      } else {
        setCommunityDetail((prev) =>
          prev
            ? {
                ...prev,
                membership: { status: 'non-member', role: 'non-member' },
                permissions: { ...(prev.permissions ?? {}), canLeave: false }
              }
            : prev
        );
      }
      setResources([]);
      setResourcesMeta({ ...DEFAULT_RESOURCES_META });
      setFeedItems([]);
      setFeedError(null);
    } catch (error) {
      setLeaveError(error.message ?? 'Unable to leave this community right now.');
    } finally {
      setIsLeaving(false);
    }
  };

  const experienceModules = useMemo(
    () => [
      {
        id: 'live',
        name: 'Live classroom',
        description: 'High fidelity broadcast with breakout orchestration and attendance tracking.',
        disabled: !canAccessCommunityFeed,
        render: () => (
          <div className="space-y-4">
            {resolvedDetail.classrooms.live.map((session) => (
              <div key={session.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{session.title}</p>
                  <p className="text-xs text-slate-500">Facilitator: {session.facilitator}</p>
                </div>
                <div className="flex flex-col items-start gap-2 text-xs font-medium text-slate-500 sm:flex-row sm:items-center">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{formatDate(session.startsAt)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{session.durationMinutes} min</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                    {session.seatsRemaining} seats open
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      },
      {
        id: 'recorded',
        name: 'Recorded content',
        description: 'Enterprise-grade recordings, annotated transcripts, and evergreen labs.',
        disabled: resolvedDetail.classrooms.recorded.length === 0,
        render: () => (
          <div className="grid gap-3 sm:grid-cols-2">
            {resolvedDetail.classrooms.recorded.map((item) => (
              <a
                key={item.id}
                href={item.linkUrl ?? '#'}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 via-white to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center gap-3 text-primary">
                  <PlayCircleIcon className="h-6 w-6" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Recorded session</span>
                </div>
                <h4 className="mt-4 text-sm font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-xs text-slate-500">Released {formatDate(item.releasedAt)}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                  Watch now <ChevronRightIcon className="h-4 w-4" />
                </span>
                <span className="absolute -right-6 -top-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">{item.duration}</span>
              </a>
            ))}
          </div>
        )
      },
      {
        id: 'feed',
        name: 'Live feed',
        description: 'Real-time operator updates and collaborative intelligence drops.',
        disabled: !canAccessCommunityFeed,
        render: () => (
          <div className="space-y-4">
            {isLoadingFeed ? (
              <p className="text-sm text-slate-500">Loading live updates…</p>
            ) : feedError ? (
              <p className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{feedError}</p>
            ) : feedItems.length === 0 ? (
              <p className="text-sm text-slate-500">No live updates published yet.</p>
            ) : (
              feedItems.map((post) => <FeedCard key={post.id} post={post} />)
            )}
          </div>
        )
      },
      {
        id: 'chat',
        name: 'Chat room',
        description: 'Moderated channels mapped to business outcomes and peer pods.',
        disabled: !canAccessCommunityFeed,
        render: () => (
          <div className="space-y-3">
            {resolvedDetail.classrooms.chatChannels.map((channel) => (
              <div
                key={channel.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{channel.name}</p>
                  <p className="text-xs text-slate-500">{channel.activity} activity</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <UsersIcon className="h-4 w-4" /> {numberFormatter.format(channel.members)} members
                </span>
              </div>
            ))}
          </div>
        )
      }
    ],
    [resolvedDetail.classrooms, canAccessCommunityFeed, feedItems, feedError, isLoadingFeed]
  );

  const ratingsBreakdown = useMemo(() => Object.entries(resolvedDetail.ratings.breakdown), [resolvedDetail.ratings.breakdown]);

  const communityPermissions = communityDetail?.permissions ?? {};
  const canLeaveCommunity = Boolean(communityPermissions.canLeave);

  const liveClassroomSummary = resolvedDetail.classrooms.liveClassroom;

  if (!canAccessCommunityFeed) {
    return (
      <div className="bg-gradient-to-b from-primary/5 via-white to-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-4xl border border-rose-200 bg-rose-50/80 p-8 text-center shadow-xl">
            <h1 className="text-2xl font-semibold text-rose-700">Community access restricted</h1>
            <p className="mt-4 text-sm leading-6 text-rose-600">
              Your current role does not provide access to the enterprise community Learnspace. Contact an administrator to
              upgrade your permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/5 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <section className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <SparklesIcon className="h-4 w-4" /> Community intelligence hub
                </span>
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{resolvedDetail.name}</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">{resolvedDetail.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <UserGroupIcon className="h-4 w-4" /> {numberFormatter.format(resolvedDetail.stats.members)} members
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <ArrowPathIcon className="h-4 w-4" /> {resolvedDetail.stats.posts} posts
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <MapIcon className="h-4 w-4" /> {resolvedDetail.membershipMap.totalCountries} countries
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-start gap-4">
                <CommunitySwitcher
                  communities={communities}
                  selected={selectedCommunity}
                  onSelect={setSelectedCommunity}
                  disabled={isLoadingCommunities}
                />
                <p className="text-xs text-slate-500">
                  Manage membership, joining, and community insights from the right-hand control panel.
                </p>
              </div>
            </div>
            {communitiesError && (
              <p className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{communitiesError}</p>
            )}
            {detailError && (
              <p className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{detailError}</p>
            )}
            {resourcesError && (
              <p className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{resourcesError}</p>
            )}
          </section>

          <CommunityCrudManager />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),380px]">
            <div className="space-y-6">
              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="lg:w-1/2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ratings & reviews</p>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="text-4xl font-semibold text-slate-900">{resolvedDetail.ratings.average.toFixed(1)}</span>
                      <span className="text-sm text-slate-500">({numberFormatter.format(resolvedDetail.ratings.totalReviews)} verified)</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{resolvedDetail.ratings.highlight}</p>
                    <div className="mt-6 space-y-3">
                      {ratingsBreakdown.map(([rating, value]) => (
                        <RatingMeterRow key={rating} rating={rating} value={value} />
                      ))}
                    </div>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="space-y-4">
                      {resolvedDetail.reviews.map((review) => (
                        <figure key={review.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-primary/5 to-white p-5 shadow-sm">
                          <blockquote className="text-sm leading-6 text-slate-700">“{review.comment}”</blockquote>
                          <figcaption className="mt-4 text-xs text-slate-500">
                            <span className="font-semibold text-slate-900">{review.reviewer}</span> · {review.role}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-gradient-to-br from-primary/20 via-white to-white p-6 shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Member map</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Global participation</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Enterprise pods operate across {resolvedDetail.membershipMap.totalCountries} countries with responsive timezone balancing.
                      Location data is surfaced securely for authorised roles only.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {resolvedDetail.membershipMap.clusters.map((cluster) => (
                        <div key={cluster.region} className="rounded-3xl border border-white/60 bg-white/70 p-4 text-sm shadow-sm">
                          <p className="font-semibold text-slate-900">{cluster.region}</p>
                          <p className="mt-1 text-xs text-slate-500">{Math.round(cluster.percentage * 100)}% of members</p>
                          <p className="mt-1 text-xs font-semibold text-emerald-600">{cluster.change} MoM</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    {canViewCommunityLocations ? (
                      <div className="relative mx-auto mt-6 max-w-sm rounded-4xl border border-white/70 bg-white/70 p-6 shadow-lg">
                        <div className="flex -space-x-3">
                          {resolvedDetail.membershipMap.avatars.map((avatarUrl, index) => (
                            <img
                              key={`${avatarUrl}-${index}`}
                              src={avatarUrl}
                              alt="Community member"
                              className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                            />
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500">
                          Data refreshed {formatDate(resolvedDetail.membershipMap.lastUpdatedAt)}
                        </p>
                      </div>
                    ) : (
                      <div className="mx-auto mt-6 max-w-sm rounded-4xl border border-white/70 bg-white/70 p-6 text-center text-sm text-slate-500">
                        Location insights are restricted for your role.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <div className="flex flex-wrap items-center gap-4">
                  {experienceModules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveExperience(module.id)}
                      disabled={module.disabled}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                        activeExperience === module.id
                          ? 'bg-primary text-white shadow-card'
                          : module.disabled
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {module.name}
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-inner">
                  {experienceModules.find((module) => module.id === activeExperience)?.render() ?? null}
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Leaderboard</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Performance + grading</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Accountability dashboard aligning contribution, classroom participation, and moderation signals.
                    </p>
                  </div>
                  {canModerateCommunities && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
                      Moderation controls active
                    </span>
                  )}
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Rank</th>
                        <th className="px-5 py-3 font-semibold">Name</th>
                        <th className="px-5 py-3 font-semibold">Role</th>
                        <th className="px-5 py-3 font-semibold">Points</th>
                        <th className="px-5 py-3 font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {resolvedDetail.leaderboard.map((entry) => (
                        <tr key={entry.rank} className="transition hover:bg-primary/5">
                          <td className="px-5 py-3 text-sm font-semibold text-primary">#{entry.rank}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900">{entry.name}</td>
                          <td className="px-5 py-3 text-xs uppercase tracking-wide text-slate-500">{entry.role}</td>
                          <td className="px-5 py-3 text-sm font-semibold">{numberFormatter.format(entry.points)}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-emerald-600">{entry.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <CommunityInteractiveSuite
                communityId={selectedCommunityId}
                communityName={resolvedDetail.name}
                initialFeed={interactiveSeeds.feed}
                initialLiveClassrooms={interactiveSeeds.liveSessions}
                initialRecordedClassrooms={interactiveSeeds.recordedSessions}
                initialCalendar={interactiveSeeds.calendar}
                initialLivestreams={interactiveSeeds.livestreams}
                initialPodcasts={interactiveSeeds.podcasts}
                initialLeaderboard={interactiveSeeds.leaderboard}
                initialEvents={interactiveSeeds.events}
              />

              <CommunityMemberDirectory
                members={communityMembers}
                isLoading={isLoadingDetail && selectedCommunityId !== 'all'}
              />

              <CommunityChatModule
                communityId={selectedCommunityId}
                communityName={resolvedDetail.name}
                viewerRole={resolvedDetail.membership?.role ?? role}
                initialChannels={resolvedDetail.classrooms?.chatChannels}
              />

              <CommunityEventSchedule
                events={communityEvents}
                isLoading={isLoadingDetail && selectedCommunityId !== 'all'}
              />

              <CommunityMembersManager
                communityId={selectedCommunityId}
                communityName={resolvedDetail.name}
                initialMembers={communityDetail?.members}
              />

              <CommunityMap
                communityId={selectedCommunityId}
                communityName={resolvedDetail.name}
                initialLocations={communityDetail?.locations}
              />
            </div>

            <aside className="space-y-6 xl:w-[360px] xl:justify-self-end">
              <CommunityAboutPanel
                communityId={selectedCommunityId}
                community={resolvedDetail}
                leaderboard={resolvedDetail.leaderboard}
                onJoin={handleJoin}
                onLeave={canLeaveCommunity ? handleLeave : null}
                isJoining={isJoining}
                isLeaving={isLeaving}
                joinError={joinError}
                leaveError={leaveError}
                canJoin={canJoinCommunities}
                canLeave={canLeaveCommunity}
              />

              <div
                className="overflow-hidden rounded-4xl border border-slate-200 bg-cover bg-center shadow-xl"
                style={{ backgroundImage: `url(${resolvedDetail.coverImageUrl})` }}
              >
                <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-primary/40 p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Classroom stage</p>
                  <h2 className="mt-2 text-xl font-semibold">{liveClassroomSummary.host}</h2>
                  <p className="mt-2 text-sm text-slate-100">Status: {liveClassroomSummary.status}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-100">
                    <span className="rounded-full bg-white/20 px-3 py-1">Capacity {numberFormatter.format(liveClassroomSummary.capacity)}</span>
                    <a
                      href={liveClassroomSummary.streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary-dark"
                    >
                      Enter stage <ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Operational profile</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Enterprise snapshot blending membership health, curated resources, and operational metadata.
                </p>
                <div className="mt-6">
                  <CommunityProfile
                    community={selectedCommunityId === 'all' ? null : communityDetail}
                    isAggregate={selectedCommunityId === 'all'}
                    resources={resources}
                    resourcesMeta={resourcesMeta}
                    isLoadingDetail={selectedCommunityId !== 'all' && (isLoadingDetail || isLoadingCommunities)}
                    isLoadingResources={isLoadingResources}
                    error={detailError}
                    resourcesError={resourcesError}
                    onLoadMoreResources={hasMoreResources ? handleLoadMoreResources : null}
                    onLeave={canLeaveCommunity ? handleLeave : null}
                    isLeaving={isLeaving}
                    canLeave={canLeaveCommunity}
                  />
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Subscription architecture</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Plan & add-ons</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Configure modular pricing aligned with classroom seats and experience upgrades.
                    </p>
                  </div>
                  {canManageCommunitySubscriptions ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">Manager</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Read only</span>
                  )}
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <span>Available tiers</span>
                    <button
                      type="button"
                      onClick={handleRefreshPaywall}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 transition hover:border-primary hover:text-primary"
                    >
                      Refresh
                    </button>
                  </div>
                  {paywallLoading ? <p className="text-xs text-slate-500">Loading live pricing…</p> : null}
                  {subscriptionPlans.length === 0 && !paywallLoading ? (
                    <p className="text-sm text-slate-500">No billing tiers published yet. Use the operations console to launch monetisation.</p>
                  ) : null}
                  {subscriptionPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                        selectedPlanId === plan.id
                          ? 'border-primary bg-primary/5 text-slate-900 shadow-card'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-slate-900'
                      }`}
                      disabled={!canManageCommunitySubscriptions}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">{plan.name}</p>
                          <p className="text-xs text-slate-500">{plan.description || 'Modular cohort access with governed collaboration.'}</p>
                          {plan.benefits?.length ? (
                            <ul className="space-y-1 text-xs text-slate-500">
                              {plan.benefits.map((benefit) => (
                                <li key={benefit} className="flex items-center gap-2">
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">✓</span>
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency((plan.priceCents ?? 0) / 100, plan.currency)} / {plan.interval}
                          </p>
                          {plan.trialPeriodDays ? (
                            <p className="text-xs text-emerald-600">{plan.trialPeriodDays}-day trial</p>
                          ) : null}
                          {plan.seats ? <p className="text-xs text-slate-500">{plan.seats} seats</p> : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Add-ons</p>
                  {subscriptionAddons.map((addon) => {
                    const selected = selectedAddons.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition ${
                          selected ? 'border-primary bg-primary/5 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-slate-900'
                        } ${canManageCommunitySubscriptions ? '' : 'cursor-not-allowed opacity-60'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={selected}
                          onChange={() => handleAddOnToggle(addon.id)}
                          disabled={!canManageCommunitySubscriptions}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{addon.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{addon.description}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          +{formatCurrency((addon.priceCents ?? 0) / 100, subscriptionCurrency)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    Total investment: {totalSubscriptionCostDisplay}
                  </div>
                  <form className="space-y-4" onSubmit={handleSubscriptionCheckout}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Billing provider
                        <select
                          name="provider"
                          value={subscriptionForm.provider}
                          onChange={handleSubscriptionFormChange}
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="stripe">Stripe</option>
                          <option value="paypal">PayPal</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Receipt email
                        <input
                          type="email"
                          name="receiptEmail"
                          value={subscriptionForm.receiptEmail}
                          onChange={handleSubscriptionFormChange}
                          placeholder="finance@example.com"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Coupon code
                        <input
                          type="text"
                          name="couponCode"
                          value={subscriptionForm.couponCode}
                          onChange={handleSubscriptionFormChange}
                          placeholder="GROWTH2024"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Affiliate code
                        <input
                          type="text"
                          name="affiliateCode"
                          value={subscriptionForm.affiliateCode}
                          onChange={handleSubscriptionFormChange}
                          placeholder="PARTNER-OPS"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tax country
                        <input
                          type="text"
                          name="taxCountry"
                          maxLength={2}
                          value={subscriptionForm.taxCountry}
                          onChange={handleSubscriptionFormChange}
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold uppercase text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tax region
                        <input
                          type="text"
                          name="taxRegion"
                          value={subscriptionForm.taxRegion}
                          onChange={handleSubscriptionFormChange}
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold uppercase text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tax postal code
                        <input
                          type="text"
                          name="taxPostalCode"
                          value={subscriptionForm.taxPostalCode}
                          onChange={handleSubscriptionFormChange}
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
                    >
                      Start checkout
                    </button>
                  </form>
                  {subscriptionStatus ? (
                    <p
                      className={`rounded-3xl px-4 py-3 text-sm font-semibold ${
                        subscriptionStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : subscriptionStatus.type === 'error'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {subscriptionStatus.message}
                    </p>
                  ) : null}
                  {subscriptionError ? (
                    <p className="rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{subscriptionError}</p>
                  ) : null}
                  {subscriptionCheckouts.length > 0 ? (
                    <div className="space-y-2 text-xs text-slate-500">
                      <p className="font-semibold uppercase tracking-[0.3em] text-slate-400">Recent checkouts</p>
                      <ul className="space-y-2">
                        {subscriptionCheckouts.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{entry.tierName}</span>
                              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-xs">
                              {formatCurrency((entry.amountCents ?? 0) / 100, entry.currency)} · {entry.provider}
                            </p>
                            {entry.approvalUrl ? (
                              <p className="mt-1">
                                <a
                                  href={entry.approvalUrl}
                                  className="text-primary underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View approval link
                                </a>
                              </p>
                            ) : null}
                            {entry.clientSecret ? (
                              <p className="mt-1 break-all text-[10px] text-slate-400">Client secret: {entry.clientSecret}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Role governance</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Transparent role matrix aligning authority, moderation, and experience privileges.
                </p>
                <div className="mt-4 space-y-4">
                  {Object.entries(resolvedDetail.roles).map(([roleKey, descriptor]) => (
                    <div key={roleKey} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{roleKey.replace(/-/g, ' ')}</p>
                        {role === roleKey && (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                            Your role
                          </span>
                        )}
                        {baseRole === roleKey && role !== roleKey && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Platform role
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{descriptor.description}</p>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
                        {descriptor.abilities.map((ability) => (
                          <li key={ability}>{ability}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Security & readiness</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Hardened perimeter with zero trust guardrails, mirrored across web and mobile surfaces.
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      ✓
                    </span>
                    <span>Zero trust enforcement: {resolvedDetail.security.zeroTrust ? 'Enabled' : 'Pending activation'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      ✓
                    </span>
                    <span>SSO + MFA: {resolvedDetail.security.singleSignOn ? 'Ready' : 'In progress'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      ✓
                    </span>
                    <span>Audit log coverage: {resolvedDetail.security.auditLog ? 'Active' : 'Pending'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      ✓
                    </span>
                    <span>Pen test completed {resolvedDetail.security.lastPenTest}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      ✓
                    </span>
                    <span>{resolvedDetail.security.dataResidency}</span>
                  </li>
                </ul>
                <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <p className="font-semibold">Launch readiness: {resolvedDetail.launchChecklist.overallStatus}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {resolvedDetail.launchChecklist.items.map((item) => (
                      <li key={item.id}>{item.name} — {item.status}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">My subscriptions</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Billing lifecycle</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Track active tiers, renewal windows, and cancellation status. Actions sync with the billing service instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshSubscriptions}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition hover:border-primary hover:text-primary"
              >
                Refresh
              </button>
            </div>
            {subscriptionLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading subscription records…</p>
            ) : null}
            {!subscriptionLoading && mySubscriptions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No subscription records yet. Launch a checkout above to activate your membership.
              </p>
            ) : null}
            <div className="mt-6 grid gap-4">
              {mySubscriptions.map((subscription) => {
                const tierName = subscription.tier?.name ?? selectedPlan?.name ?? 'Community subscription';
                const status = subscription.status ?? 'pending';
                const started = subscription.startedAt ? new Date(subscription.startedAt).toLocaleDateString() : 'Pending';
                const renews = subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : 'TBC';
                const cancelScheduled = subscription.cancelAtPeriodEnd;
                return (
                  <div
                    key={subscription.publicId ?? subscription.id}
                    className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-primary/5 to-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">{tierName}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${
                              status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'canceled' || status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {status}
                          </span>
                          {cancelScheduled ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
                              Cancel at period end
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">Started {started} · Renews {renews}</p>
                        {subscription.latestPaymentIntentId ? (
                          <p className="text-xs text-slate-500">Latest payment intent: {subscription.latestPaymentIntentId}</p>
                        ) : null}
                        {subscription.metadata?.couponCode ? (
                          <p className="text-xs text-slate-500">Coupon: {subscription.metadata.couponCode}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCancelSubscription(subscription.publicId, true)}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-600 transition hover:border-amber-300 hover:bg-amber-50"
                          disabled={status === 'canceled' || status === 'cancelled'}
                        >
                          Cancel at renewal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSubscription(subscription.publicId, false)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                          disabled={status === 'canceled' || status === 'cancelled'}
                        >
                          Cancel now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

RatingMeter.propTypes = {
  value: PropTypes.number.isRequired
};

RatingMeterRow.propTypes = {
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value: PropTypes.number.isRequired
};
