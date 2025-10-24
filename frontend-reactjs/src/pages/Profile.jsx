import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

import {
  attachVerificationDocument,
  fetchVerificationSummary,
  requestVerificationUpload,
  submitVerificationPackage
} from '../api/verificationApi.js';
import { fetchCurrentUser, updateCurrentUser } from '../api/userApi.js';
import {
  approveFollowRequest,
  declineFollowRequest,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRecommendations,
  followUser,
  unfollowUser
} from '../api/socialGraphApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import useConsentRecords from '../hooks/useConsentRecords.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import BillingInvoiceTable from '../components/billing/BillingInvoiceTable.jsx';
import BillingPaymentMethods from '../components/billing/BillingPaymentMethods.jsx';
import BillingSummaryCard from '../components/billing/BillingSummaryCard.jsx';
import ProfileIdentityEditor from '../components/profile/ProfileIdentityEditor.jsx';
import SettingsLayout from '../components/settings/SettingsLayout.jsx';
import SystemPreferencesPanel from '../components/settings/SystemPreferencesPanel.jsx';
import useSystemPreferencesForm from '../hooks/useSystemPreferencesForm.js';
import useBillingPortal from '../hooks/useBillingPortal.js';
import {
  mapFollowerItem,
  mapRecommendationItem,
  formatPersonDisplayName
} from '../utils/socialGraph.js';

const defaultProfile = {
  name: 'Alex Morgan',
  handle: '@alexmorgan',
  avatar: 'https://i.pravatar.cc/160?img=28',
  banner:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
  tagline: 'Revenue architect, data-backed instructor, and community operator.',
  bio:
    'I help B2B education companies design revenue engines powered by community, data, and trust. Previously led global revenue ops at RevStars and built three 7-figure advisory programmes.',
  location: 'London, United Kingdom',
  expertise: ['Revenue operations', 'Community-led growth', 'GT-M strategy', 'Leadership enablement'],
  qualifications: [
    'MBA, London Business School',
    'HubSpot Revenue Operations Certified',
    'ICF Accredited Coach',
    'Author of the Revenue Operator Playbook'
  ],
  followers: 18420,
  following: 312,
  trustScores: {
    learner: 96,
    instructor: 98,
    reviewGrade: 4.9
  },
  trustBadges: ['KYC verified', 'Top Mentor 2023', 'Community Builder of the Year'],
  affiliate: {
    status: 'Elite partner · Active',
    referralCode: 'GROW-ALEX-24',
    shareUrl: 'https://edulure.com/r/GROW-ALEX-24',
    summary: {
      lifetime: '$182,400.00',
      trailing30: '$18,240.00',
      pending: '$4,320.00',
      conversion: '4.8% conversion',
      avgOrder: '$760 avg. order',
      activeProgrammes: 5
    },
    tiers: [
      { label: 'Base tier', threshold: '$0 – $999', rate: '10% commission' },
      { label: 'Growth tier', threshold: '$1,000 – $4,999', rate: '12.5% commission' },
      { label: 'Scale tier', threshold: '$5,000+', rate: '15% commission' }
    ],
    payouts: [
      {
        id: 'pay-001',
        amount: '$2,160.00',
        status: 'Scheduled',
        scheduled: 'June 30, 2024',
        programme: 'Growth Operator Studio'
      },
      {
        id: 'pay-000',
        amount: '$1,480.00',
        status: 'Completed',
        scheduled: 'April 30, 2024',
        processed: 'April 30, 2024',
        programme: 'Community Monetisation Sprint'
      }
    ],
    actions: [
      'Approve 2 pending partner applications',
      'Send Q3 enablement pack to top performers',
      'Sync payout ledger with finance Learnspace'
    ],
    highlights: [
      'Top 2% click-to-enrol conversion',
      'Average referral CAC recovered in 2.4 days'
    ],
    compliance: {
      requireTwoFactor: true,
      taxComplete: true,
      selfReferralBlocked: true,
      payoutSchedule: 'Net 30 cadence'
    },
    recentReferrals: [
      { organisation: 'LoopOps Collective', amount: '$820.00', date: 'May 12, 2024' },
      { organisation: 'Northbeam RevOps', amount: '$1,040.00', date: 'May 8, 2024' },
      { organisation: 'Everpath Academy', amount: '$640.00', date: 'May 4, 2024' }
    ]
  },
  social: [
    { label: 'Website', url: 'https://growthoperator.co', handle: 'growthoperator.co' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/alexmorgan', handle: 'linkedin.com/in/alexmorgan' },
    { label: 'YouTube', url: 'https://youtube.com/@growthoperator', handle: '@growthoperator' },
    { label: 'Twitter', url: 'https://twitter.com/alexgrowthops', handle: '@alexgrowthops' }
  ],
  communities: {
    member: ['RevOps Guild', 'Customer Education Collective', 'CMO Alliance', 'Community-Led Leaders'],
    owner: ['Growth Operator Studio'],
    moderator: ['Modern GTM Architects'],
    admin: ['RevOps Guild']
  },
  courses: [
    {
      title: 'Revenue Operations Intensive',
      learners: 328,
      satisfaction: '4.9/5 satisfaction',
      status: 'Live cohort',
      nextCohort: 'June 2024'
    },
    {
      title: 'Community Monetisation Sprint',
      learners: 187,
      satisfaction: '4.8/5 satisfaction',
      status: 'Applications open',
      nextCohort: 'July 2024'
    },
    {
      title: 'Leadership Systems Lab',
      learners: 96,
      satisfaction: '4.95/5 satisfaction',
      status: 'Beta cohort',
      nextCohort: 'September 2024'
    }
  ],
  reviews: [
    {
      learner: 'Priya Patel',
      rating: 5,
      highlight: 'Transformed how we run forecasting and empowered our CS team. Alex brought frameworks and accountability.',
      context: 'Enterprise RevOps cohort',
      date: 'March 2024'
    },
    {
      learner: 'Diego Martínez',
      rating: 5,
      highlight: 'The community labs created so many high-signal connections. The playbooks shipped every week were gold.',
      context: 'Community Monetisation Sprint',
      date: 'February 2024'
    }
  ],
  liveFeed: [
    {
      title: 'Hosted “Designing Revenue Rituals” session',
      timestamp: '2 hours ago',
      summary: '124 founders joined the live teardown of their revenue cadences. 97% stayed for the full workshop.',
      metrics: ['124 live attendees', '97% retention', '4.9/5 real-time score']
    },
    {
      title: 'Published a trust score dashboard template',
      timestamp: 'Yesterday',
      summary: 'Shared a Notion + Looker Studio template to help instructors operationalise feedback loops.',
      metrics: ['3.2k views', '860 saves', '32 remix requests']
    }
  ],
  followersList: [
    { name: 'Priya Patel', role: 'Head of Growth @ Maven', tagline: 'Scaling community-led revenue programmes', trust: 94 },
    { name: 'Kwame Mensah', role: 'CEO @ FutureSkill', tagline: 'Credentialing emerging talent in Africa', trust: 91 },
    { name: 'Sofia Gruber', role: 'Founder @ FlowOps', tagline: 'Workflow automation for hybrid teams', trust: 89 },
    { name: 'Yu Chen', role: 'VP Product @ LearnLoop', tagline: 'Building adaptive learning experiences', trust: 92 }
  ],
  verification: {
    status: 'Action needed',
    lastReviewed: 'March 12, 2024',
    nextStep: 'Submit a fresh selfie holding your passport.',
    supported: ['passport', 'drivers-licence', 'national-id', 'residence-permit'],
    note: 'We approve new documents within 24 business hours once all three images are uploaded.'
  }
};

const idTypeCopy = {
  passport: 'International passports must be valid for at least 6 months.',
  'drivers-licence': 'Provide both sides if your licence is two-sided.',
  'national-id': 'National identity cards must show your full legal name.',
  'residence-permit': 'Residence permits must display the country seal and validity.'
};

const fallbackVerificationRequirements = [
  {
    type: 'government_id_front',
    label: 'Front of ID',
    helper: 'Upload a clear colour photo'
  },
  {
    type: 'government_id_back',
    label: 'Back of ID',
    helper: 'Ensure holograms or security features are visible'
  },
  {
    type: 'identity_selfie',
    label: 'Selfie with ID',
    helper: 'Hold the ID next to your face in good lighting'
  }
];

const FOLLOW_PAGE_SIZE = 6;

function buildLocationFromAddress(address, fallback = 'Not specified') {
  if (!address || typeof address !== 'object') {
    return fallback;
  }

  const { city, town, country, state, region } = address;
  const locality = city || town || region || state;
  if (locality && country) {
    return `${locality}, ${country}`;
  }
  if (locality) {
    return locality;
  }
  if (country) {
    return country;
  }
  return fallback;
}

function deriveSocialHandle(url) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
    return path ? `${host}/${path}` : host;
  } catch (_error) {
    return url;
  }
}

function normaliseAddressRecord(address) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  return {
    line1: address.line1 ?? address.addressLine1 ?? null,
    line2: address.line2 ?? address.addressLine2 ?? null,
    city: address.city ?? address.town ?? null,
    region: address.region ?? address.state ?? null,
    postalCode: address.postalCode ?? address.postcode ?? address.zip ?? null,
    country: address.country ?? null,
    formatted: address.formatted ?? address.formattedAddress ?? null
  };
}

function normaliseSocialLinksForProfile(links, fallbackLinks = []) {
  const safeLinks = Array.isArray(links) ? links : [];
  const normalised = safeLinks
    .filter((link) => link && link.url)
    .map((link) => {
      const handle = link.handle ?? deriveSocialHandle(link.url);
      return {
        id: link.id ?? link.url ?? handle,
        label: link.label ?? handle,
        url: link.url,
        handle
      };
    });

  if (normalised.length > 0) {
    return normalised;
  }

  return (fallbackLinks ?? []).map((link) => ({
    id: link.id ?? link.url ?? link.label,
    label: link.label ?? deriveSocialHandle(link.url),
    url: link.url,
    handle: link.handle ?? deriveSocialHandle(link.url)
  }));
}

function buildProfileStateFromUser(user) {
  if (!user) {
    return { ...defaultProfile };
  }

  const profileRecord = typeof user.profile === 'object' && user.profile !== null ? user.profile : {};
  const addressRecord = normaliseAddressRecord(user.address);
  const location = profileRecord.location ?? buildLocationFromAddress(addressRecord ?? user.address, defaultProfile.location);
  const socialLinks = normaliseSocialLinksForProfile(profileRecord.socialLinks, defaultProfile.social);

  return {
    ...defaultProfile,
    id: user.id ?? defaultProfile.id,
    email: user.email ?? defaultProfile.email,
    role: user.role ?? defaultProfile.role,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    name:
      profileRecord.displayName && profileRecord.displayName.trim().length > 0
        ? profileRecord.displayName.trim()
        : formatPersonDisplayName(user) || defaultProfile.name,
    handle: user.email ? `@${user.email.split('@')[0]}` : defaultProfile.handle,
    tagline: profileRecord.tagline ?? defaultProfile.tagline,
    bio: profileRecord.bio ?? defaultProfile.bio,
    avatar: profileRecord.avatarUrl ?? defaultProfile.avatar,
    banner: profileRecord.bannerUrl ?? defaultProfile.banner,
    location,
    social: socialLinks,
    address: addressRecord,
    followers: user.followers ?? defaultProfile.followers,
    following: user.following ?? defaultProfile.following,
    profileRecord
  };
}

function createProfileFormState(profileState) {
  const address = profileState.address ?? {};
  return {
    firstName: profileState.firstName ?? '',
    lastName: profileState.lastName ?? '',
    displayName: profileState.name ?? '',
    tagline: profileState.tagline ?? '',
    location: profileState.location ?? '',
    bio: profileState.bio ?? '',
    avatarUrl: profileState.avatar ?? '',
    bannerUrl: profileState.banner ?? '',
    socialLinks: (profileState.social ?? []).map((link) => ({
      label: link.label ?? '',
      url: link.url ?? '',
      handle: link.handle ?? ''
    })),
    address: {
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      region: address.region ?? '',
      country: address.country ?? '',
      postalCode: address.postalCode ?? '',
      formatted: address.formatted ?? ''
    }
  };
}

function cleanAddressForPayload(address) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  const cleaned = {};
  const fields = ['line1', 'line2', 'city', 'region', 'postalCode', 'country', 'formatted'];
  fields.forEach((field) => {
    if (address[field] !== undefined && address[field] !== null) {
      const value = typeof address[field] === 'string' ? address[field].trim() : address[field];
      if (value) {
        cleaned[field] = value;
      }
    }
  });

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function emptyToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return value;
}

function resolveStatusColour(status) {
  switch (status) {
    case 'approved':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'pending_review':
      return 'text-sky-600 bg-sky-50 border-sky-200';
    case 'resubmission_required':
    case 'rejected':
      return 'text-rose-600 bg-rose-50 border-rose-200';
    default:
      return 'text-amber-600 bg-amber-50 border-amber-200';
  }
}

function formatStatusLabel(status) {
  if (!status) {
    return defaultProfile.verification.status;
  }
  return status
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function computeChecksum(file) {
  if (!('crypto' in window) || !window.crypto?.subtle) {
    throw new Error('Secure hashing is not available in this browser');
  }
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const PROFILE_VALIDATION_FIELDS = new Set(['displayName', 'tagline', 'location', 'firstName', 'lastName', 'bio']);

function validateProfileFieldValue(field, value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  switch (field) {
    case 'displayName':
      if (!trimmed) {
        return 'Add a display name that learners will recognise.';
      }
      if (trimmed.length < 3) {
        return 'Display name must be at least 3 characters long.';
      }
      if (trimmed.length > 80) {
        return 'Display name must be under 80 characters.';
      }
      return null;
    case 'tagline':
      if (!trimmed) {
        return 'Share a short tagline describing your focus area.';
      }
      if (trimmed.length < 10) {
        return 'Tagline should include at least 10 characters of context.';
      }
      if (trimmed.length > 160) {
        return 'Keep your tagline under 160 characters for consistency.';
      }
      return null;
    case 'location':
      if (!trimmed) {
        return 'Provide a location so learners know your operating region.';
      }
      if (trimmed.length > 120) {
        return 'Location must be under 120 characters.';
      }
      return null;
    case 'firstName':
    case 'lastName':
      if (!trimmed) {
        return `Enter your ${field === 'firstName' ? 'first' : 'last'} name.`;
      }
      if (trimmed.length > 60) {
        return 'Names must be 60 characters or fewer.';
      }
      return null;
    case 'bio':
      if (!trimmed) {
        return 'Add a short bio to help learners understand your expertise.';
      }
      if (trimmed.length < 40) {
        return 'Bio should include at least 40 characters of detail.';
      }
      if (trimmed.length > 800) {
        return 'Keep your bio under 800 characters for readability.';
      }
      return null;
    default:
      return null;
  }
}

function validateProfileFormState(formState) {
  const errors = {};
  PROFILE_VALIDATION_FIELDS.forEach((field) => {
    const message = validateProfileFieldValue(field, formState?.[field]);
    if (message) {
      errors[field] = message;
    }
  });
  return errors;
}

function formatTimelineTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return typeof timestamp === 'string' ? timestamp : null;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normaliseVerificationTimeline({
  summary,
  profileVerification,
  documentRequirements,
  documentStates
}) {
  const events = [];
  const sourceTimeline = Array.isArray(summary?.timeline)
    ? summary.timeline
    : Array.isArray(summary?.history)
      ? summary.history
      : [];

  sourceTimeline.forEach((event, index) => {
    if (!event) {
      return;
    }
    const id = event.id ?? `timeline-event-${index}`;
    const status = event.status ?? event.stage ?? null;
    events.push({
      id,
      title: event.title ?? formatStatusLabel(status ?? event.type ?? 'update'),
      description: event.description ?? event.note ?? '',
      timestamp: formatTimelineTimestamp(event.timestamp ?? event.occurredAt ?? event.createdAt),
      status,
      statusLabel: status ? formatStatusLabel(status) : null
    });
  });

  const documents = Array.isArray(summary?.documents) ? summary.documents : [];
  documents.forEach((document, index) => {
    const status = document.status ?? null;
    const timestamp = document.updatedAt ?? document.reviewedAt ?? document.submittedAt ?? document.uploadedAt;
    events.push({
      id: document.id ?? `document-${document.type ?? index}`,
      title: `${document.label ?? document.type ?? 'Document'} ${status ? formatStatusLabel(status) : ''}`.trim(),
      description: document.reviewerComment ?? document.note ?? '',
      timestamp: formatTimelineTimestamp(timestamp),
      status,
      statusLabel: status ? formatStatusLabel(status) : null
    });
  });

  Object.entries(documentStates ?? {}).forEach(([type, state]) => {
    if (!state || (state.status !== 'attached' && state.status !== 'uploaded')) {
      return;
    }
    const requirement = (documentRequirements ?? []).find((item) => item.type === type);
    const title = requirement?.label ?? type;
    events.push({
      id: `local-${type}`,
      title: `${title} ready for submission`,
      description: 'Document cached locally. Submit to trigger review.',
      timestamp: state.completedAt ? formatTimelineTimestamp(state.completedAt) : null,
      status: 'pending_review',
      statusLabel: 'Pending review'
    });
  });

  if (summary?.status) {
    events.push({
      id: 'verification-status',
      title: `Status: ${formatStatusLabel(summary.status)}`,
      description: summary.reason ?? summary.nextStep ?? profileVerification?.nextStep ?? '',
      timestamp: formatTimelineTimestamp(summary.lastReviewedAt ?? profileVerification?.lastReviewed ?? null),
      status: summary.status,
      statusLabel: formatStatusLabel(summary.status)
    });
  } else if (profileVerification?.nextStep) {
    events.push({
      id: 'verification-next-step',
      title: 'Next step required',
      description: profileVerification.nextStep,
      timestamp: profileVerification.lastReviewed ?? null,
      status: 'pending_review',
      statusLabel: 'Pending review'
    });
  }

  if (!events.length) {
    events.push({
      id: 'verification-start',
      title: 'Verification ready',
      description: 'Upload your documents to begin the verification review.',
      timestamp: profileVerification?.lastReviewed ?? null,
      status: 'pending_review',
      statusLabel: 'Pending review'
    });
  }

  const deduped = [];
  const seen = new Set();
  events.forEach((event) => {
    if (seen.has(event.id)) {
      return;
    }
    seen.add(event.id);
    deduped.push(event);
  });

  return deduped;
}

export default function Profile() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const token = session?.tokens?.accessToken ?? null;

  const [profile, setProfile] = useState(defaultProfile);
  const [profileForm, setProfileForm] = useState(() => createProfileFormState(defaultProfile));
  const [profileFormErrors, setProfileFormErrors] = useState(() =>
    validateProfileFormState(createProfileFormState(defaultProfile))
  );
  const [profileFormDirty, setProfileFormDirty] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [selectedIdType, setSelectedIdType] = useState(defaultProfile.verification.supported[0]);
  const [verificationSummary, setVerificationSummary] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationSuccess, setVerificationSuccess] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [documentStates, setDocumentStates] = useState({});
  const [followers, setFollowers] = useState(() =>
    (defaultProfile.followersList ?? []).map((follower) => ({
      id: follower.name,
      name: follower.name,
      role: follower.role,
      tagline: follower.tagline,
      trust: follower.trust,
      relationship: null
    }))
  );
  const [followersMeta, setFollowersMeta] = useState({
    total: defaultProfile.followers ?? (defaultProfile.followersList ?? []).length,
    limit: FOLLOW_PAGE_SIZE,
    offset: 0
  });
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [followersError, setFollowersError] = useState(null);
  const [pendingFollowers, setPendingFollowers] = useState([]);
  const [, setIsLoadingPendingFollowers] = useState(false);
  const [pendingFollowersError, setPendingFollowersError] = useState(null);
  const [following, setFollowing] = useState([]);
  const [followingMeta, setFollowingMeta] = useState({
    total: defaultProfile.following ?? 0,
    limit: FOLLOW_PAGE_SIZE,
    offset: 0
  });
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [followingError, setFollowingError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [followActions, setFollowActions] = useState({});
  const { consents, loading: consentLoading, error: consentError, revokeConsent: revokeConsentRecord } =
    useConsentRecords(userId);
  const [revokingConsentId, setRevokingConsentId] = useState(null);
  const affiliate = profile.affiliate;
  const affiliateSummary = affiliate.summary;
  const affiliatePayouts = affiliate.payouts;
  const affiliateActions = affiliate.actions;
  const affiliateHighlights = affiliate.highlights;
  const affiliateComplianceSettings = affiliate.compliance;
  const affiliateRecentReferrals = affiliate.recentReferrals;
  const [affiliateLinkCopied, setAffiliateLinkCopied] = useState(false);
  const billingOverviewWithSync = useMemo(
    () => (billingOverview ? { ...billingOverview, lastSyncedAt: billingOverview.lastSyncedAt ?? billingLastLoadedAt } : null),
    [billingOverview, billingLastLoadedAt]
  );
  const activeConsents = useMemo(
    () => consents.filter((consent) => consent.status === 'granted' && consent.active),
    [consents]
  );
  const [systemStatusMessage, setSystemStatusMessage] = useState(null);
  const [systemPendingAction, setSystemPendingAction] = useState(false);

  const {
    form: systemPreferencesForm,
    saving: systemSaving,
    refresh: refreshSystemPreferences,
    persist: persistSystemPreferences,
    handleInputChange: handleSystemPreferencesInputChange,
    updateSystemToggle: updateSystemPreferencesToggle,
    updatePreferenceToggle: updateSystemPreferenceToggle,
    handleAdPersonalisationChange: handleSystemAdPersonalisationChange,
    recommendationPreview: systemRecommendationPreview,
    recommendedTopicsInputValue: systemRecommendedTopicsInputValue,
    adPersonalisationEnabled: systemAdPersonalisationEnabled
  } = useSystemPreferencesForm({
    token,
    onStatus: setSystemStatusMessage
  });
  const {
    overview: billingOverview,
    paymentMethods: billingPaymentMethods,
    invoices: billingInvoices,
    loading: billingLoading,
    error: billingError,
    portalStatus: billingPortalStatus,
    portalError: billingPortalError,
    lastLoadedAt: billingLastLoadedAt,
    refresh: refreshBilling,
    launchPortal,
    resetPortalStatus
  } = useBillingPortal({ autoLoad: false });

  const systemStatusBanner = useMemo(() => {
    if (!systemStatusMessage) return undefined;
    const mappedType =
      systemStatusMessage.type === 'error'
        ? 'error'
        : systemStatusMessage.type === 'success'
          ? 'success'
          : systemStatusMessage.type === 'pending'
            ? 'pending'
            : 'info';
    return {
      type: mappedType,
      message: systemStatusMessage.message,
      role: systemStatusMessage.type === 'error' ? 'alert' : 'status',
      liveRegion: systemStatusMessage.type === 'error' ? 'assertive' : 'polite'
    };
  }, [systemStatusMessage]);

  const disableSystemPreferences = useMemo(
    () => systemPendingAction || systemSaving,
    [systemPendingAction, systemSaving]
  );

  const persistSystemPreferencesAction = async () => {
    try {
      setSystemPendingAction(true);
      await persistSystemPreferences();
    } catch (_error) {
      // Status messaging handled by useSystemPreferencesForm.
    } finally {
      setSystemPendingAction(false);
    }
  };

  const handleSystemPreferencesSubmit = async (event) => {
    event.preventDefault();
    await persistSystemPreferencesAction();
  };

  const profileDisplayName = profile?.name ?? defaultProfile.name;
  const profileKeywords = useMemo(() => {
    const keywords = new Set();
    (profile?.expertise ?? []).forEach((item) => {
      if (typeof item === 'string') {
        keywords.add(item);
      }
    });
    (profile?.trustBadges ?? []).forEach((badge) => {
      if (typeof badge === 'string') {
        keywords.add(badge);
      }
    });
    return Array.from(keywords);
  }, [profile?.expertise, profile?.trustBadges]);

  const profileMetaDescription = useMemo(() => {
    if (profile?.tagline) {
      return profile.tagline;
    }
    if (profile?.bio) {
      const condensed = profile.bio.replace(/\s+/g, ' ').trim();
      return condensed.length > 200 ? `${condensed.slice(0, 197)}…` : condensed;
    }
    return 'Explore an Edulure operator profile including expertise, trust scores, community roles, and monetisation highlights.';
  }, [profile?.tagline, profile?.bio]);

  const canonicalProfilePath = useMemo(() => {
    if (profile?.handle) {
      return `/profiles/${profile.handle.replace(/^@/, '')}`;
    }
    return '/profile';
  }, [profile?.handle]);

  const structuredProfileData = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profileDisplayName,
      description: profileMetaDescription,
      jobTitle: profile?.tagline ?? undefined,
      image: profile?.avatar ?? undefined,
      address: profile?.location
        ? {
            '@type': 'PostalAddress',
            addressLocality: profile.location
          }
        : undefined,
      sameAs: Array.isArray(profile?.social)
        ? profile.social
            .map((link) => link?.url)
            .filter((url) => typeof url === 'string' && url.startsWith('http'))
        : undefined
    };
  }, [profileDisplayName, profileMetaDescription, profile?.avatar, profile?.location, profile?.social]);

  usePageMetadata({
    title: `${profileDisplayName} · Edulure profile`,
    description: profileMetaDescription,
    canonicalPath: canonicalProfilePath,
    image: profile?.avatar ?? undefined,
    keywords: profileKeywords,
    structuredData: structuredProfileData,
    analytics: {
      page_type: 'profile',
      user_id: userId ?? null,
      follower_total: followersMeta.total ?? null
    }
  });

  const resetProfileMessages = useCallback(() => {
    setProfileSaveError(null);
    setProfileSaveSuccess(null);
  }, []);

  const handleProfileFieldChange = useCallback((field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (PROFILE_VALIDATION_FIELDS.has(field)) {
      const message = validateProfileFieldValue(field, value);
      setProfileFormErrors((prev) => {
        const next = { ...prev };
        if (message) {
          next[field] = message;
        } else {
          delete next[field];
        }
        return next;
      });
    }
    setProfileFormDirty(true);
    resetProfileMessages();
  }, [resetProfileMessages]);

  const handleProfileAddressChange = useCallback((field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      address: { ...(prev.address ?? {}), [field]: value }
    }));
    setProfileFormDirty(true);
    resetProfileMessages();
  }, [resetProfileMessages]);

  const handleSocialLinkChange = useCallback(
    (index, nextLink) => {
      setProfileForm((prev) => {
        const currentLinks = Array.isArray(prev.socialLinks) ? prev.socialLinks : [];
        const updated = currentLinks.map((link, idx) => (idx === index ? { ...link, ...nextLink } : link));
        return { ...prev, socialLinks: updated };
      });
      setProfileFormDirty(true);
      resetProfileMessages();
    },
    [resetProfileMessages]
  );

  const handleAddSocialLink = useCallback(() => {
    setProfileForm((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks ?? []), { label: '', url: '', handle: '' }]
    }));
    setProfileFormDirty(true);
    resetProfileMessages();
  }, [resetProfileMessages]);

  const handleRemoveSocialLink = useCallback(
    (index) => {
      setProfileForm((prev) => {
        const currentLinks = Array.isArray(prev.socialLinks) ? prev.socialLinks : [];
        if (currentLinks.length <= 1) {
          return { ...prev, socialLinks: [{ label: '', url: '', handle: '' }] };
        }
        return { ...prev, socialLinks: currentLinks.filter((_, idx) => idx !== index) };
      });
      setProfileFormDirty(true);
      resetProfileMessages();
    },
    [resetProfileMessages]
  );

  useEffect(() => {
    if (!profile.verification?.supported?.length) {
      return;
    }
    setSelectedIdType((prev) => {
      if (profile.verification.supported.includes(prev)) {
        return prev;
      }
      return profile.verification.supported[0];
    });
  }, [profile.verification?.supported]);

  const handleRevokeConsent = async (consentId) => {
    try {
      setRevokingConsentId(consentId);
      await revokeConsentRecord({ consentId, reason: 'Revoked from profile dashboard' });
    } catch (err) {
      console.error('Failed to revoke consent', err);
    } finally {
      setRevokingConsentId(null);
    }
  };
  const profileOwnerId = profile?.id ?? userId ?? null;

  const handleProfileSubmit = useCallback(async () => {
    const validationResult = validateProfileFormState(profileForm);
    setProfileFormErrors(validationResult);
    if (Object.keys(validationResult).length) {
      setProfileSaveError('Fix the highlighted fields before saving.');
      setProfileSaveSuccess(null);
      return;
    }
    if (!token) {
      setProfileSaveError('You need to be signed in to update your profile.');
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(null);

    try {
      const socialLinksPayload = (profileForm.socialLinks ?? [])
        .filter((link) => typeof link?.url === 'string' && link.url.trim().length > 0)
        .map((link) => ({
          label: emptyToNull(link.label),
          url: link.url.trim(),
          handle: emptyToNull(link.handle)
        }));

      const payload = {
        firstName: emptyToNull(profileForm.firstName),
        lastName: emptyToNull(profileForm.lastName),
        profile: {
          displayName: emptyToNull(profileForm.displayName),
          tagline: emptyToNull(profileForm.tagline),
          location: emptyToNull(profileForm.location),
          bio: emptyToNull(profileForm.bio),
          avatarUrl: emptyToNull(profileForm.avatarUrl),
          bannerUrl: emptyToNull(profileForm.bannerUrl),
          socialLinks: socialLinksPayload
        },
        address: cleanAddressForPayload(profileForm.address)
      };

      const response = await updateCurrentUser({ token, payload });
      const updated = response?.data ?? null;
      if (updated) {
        const nextProfile = buildProfileStateFromUser(updated);
        setProfile(nextProfile);
        setProfileForm(createProfileFormState(nextProfile));
        setProfileFormErrors(validateProfileFormState(createProfileFormState(nextProfile)));
        setProfileFormDirty(false);
        setProfileSaveSuccess('Profile updated successfully.');
      }
    } catch (error) {
      setProfileSaveError(error?.message ?? 'Unable to update profile at this time.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileForm, token]);
  const handleManageBilling = useCallback(async () => {
    const portalUrl = await launchPortal({});
    if (portalUrl && typeof window !== 'undefined') {
      window.open(portalUrl, '_blank', 'noopener,noreferrer');
    }
  }, [launchPortal]);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setProfile(defaultProfile);
      setProfileForm(createProfileFormState(defaultProfile));
      setProfileFormErrors(validateProfileFormState(createProfileFormState(defaultProfile)));
      setProfileFormDirty(false);
      resetProfileMessages();
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetchCurrentUser({ token });
      const user = response?.data ?? null;
      if (user) {
        const nextProfile = buildProfileStateFromUser(user);
        setProfile(nextProfile);
        setProfileForm(createProfileFormState(nextProfile));
        setProfileFormErrors(validateProfileFormState(createProfileFormState(nextProfile)));
        setProfileFormDirty(false);
        resetProfileMessages();
      }
    } catch (error) {
      setProfileError(error?.message ?? 'Unable to load profile details.');
    } finally {
      setProfileLoading(false);
    }
  }, [token, resetProfileMessages]);

  const loadFollowers = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (!token || !profileOwnerId) {
        return;
      }
      if (!append) {
        setFollowersError(null);
      }
      setIsLoadingFollowers(true);
      try {
        const response = await fetchFollowers({
          token,
          userId: profileOwnerId,
          limit: FOLLOW_PAGE_SIZE,
          offset,
          status: 'accepted'
        });
        const items = response?.data ?? [];
        const mapped = items.map(mapFollowerItem);
        const pagination = response?.meta?.pagination ?? {};
        setFollowers((prev) => (append ? [...prev, ...mapped] : mapped));
        const total = pagination.total ?? (append ? offset + mapped.length : mapped.length);
        setFollowersMeta({
          total,
          limit: pagination.limit ?? FOLLOW_PAGE_SIZE,
          offset: pagination.offset ?? offset
        });
        setProfile((prev) => ({ ...prev, followers: total }));
      } catch (error) {
        if (!append) {
          setFollowers([]);
        }
        setFollowersError(error?.message ?? 'Unable to load followers.');
      } finally {
        setIsLoadingFollowers(false);
      }
    },
    [token, profileOwnerId]
  );

  const loadPendingFollowers = useCallback(async () => {
    if (!token || !profileOwnerId) {
      return;
    }
    setIsLoadingPendingFollowers(true);
    setPendingFollowersError(null);
    try {
      const response = await fetchFollowers({
        token,
        userId: profileOwnerId,
        limit: FOLLOW_PAGE_SIZE,
        offset: 0,
        status: 'pending'
      });
      const items = response?.data ?? [];
      setPendingFollowers(items.map(mapFollowerItem));
    } catch (error) {
      setPendingFollowersError(error?.message ?? 'Unable to load pending follow requests.');
    } finally {
      setIsLoadingPendingFollowers(false);
    }
  }, [token, profileOwnerId]);

  const loadFollowing = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (!token || !profileOwnerId) {
        return;
      }
      if (!append) {
        setFollowingError(null);
      }
      setIsLoadingFollowing(true);
      try {
        const response = await fetchFollowing({
          token,
          userId: profileOwnerId,
          limit: FOLLOW_PAGE_SIZE,
          offset,
          status: 'accepted'
        });
        const items = response?.data ?? [];
        const mapped = items.map(mapFollowerItem);
        const pagination = response?.meta?.pagination ?? {};
        setFollowing((prev) => (append ? [...prev, ...mapped] : mapped));
        const total = pagination.total ?? (append ? offset + mapped.length : mapped.length);
        setFollowingMeta({
          total,
          limit: pagination.limit ?? FOLLOW_PAGE_SIZE,
          offset: pagination.offset ?? offset
        });
        setProfile((prev) => ({ ...prev, following: total }));
      } catch (error) {
        if (!append) {
          setFollowing([]);
        }
        setFollowingError(error?.message ?? 'Unable to load following list.');
      } finally {
        setIsLoadingFollowing(false);
      }
    },
    [token, profileOwnerId]
  );

  const loadRecommendations = useCallback(async () => {
    if (!token || !profileOwnerId) {
      return;
    }
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);
    try {
      const response = await fetchFollowRecommendations({ token, limit: 6 });
      const items = response?.data ?? [];
      setRecommendations(items.map(mapRecommendationItem));
    } catch (error) {
      setRecommendationsError(error?.message ?? 'Unable to load follow recommendations.');
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [token, profileOwnerId]);

  const refreshSocialGraph = useCallback(async () => {
    if (!token || !profileOwnerId) {
      return;
    }
    await Promise.allSettled([
      loadFollowers({ append: false, offset: 0 }),
      loadPendingFollowers(),
      loadFollowing({ append: false, offset: 0 }),
      loadRecommendations()
    ]);
  }, [token, profileOwnerId, loadFollowers, loadPendingFollowers, loadFollowing, loadRecommendations]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!token) {
      setFollowers(
        (defaultProfile.followersList ?? []).map((follower) => ({
          id: follower.name,
          name: follower.name,
          role: follower.role,
          tagline: follower.tagline,
          trust: follower.trust,
          relationship: null
        }))
      );
      setFollowersMeta({
        total: defaultProfile.followers ?? (defaultProfile.followersList ?? []).length,
        limit: FOLLOW_PAGE_SIZE,
        offset: 0
      });
      setPendingFollowers([]);
      setFollowing([]);
      setFollowingMeta({ total: defaultProfile.following ?? 0, limit: FOLLOW_PAGE_SIZE, offset: 0 });
      setRecommendations([]);
      setFollowActions({});
      return;
    }
    refreshSocialGraph();
  }, [refreshSocialGraph, token]);

  const followerCount = useMemo(
    () => profile.followers ?? followersMeta.total ?? followers.length,
    [profile.followers, followersMeta.total, followers.length]
  );

  const followingCount = useMemo(
    () => profile.following ?? followingMeta.total ?? following.length,
    [profile.following, followingMeta.total, following.length]
  );

  const hasMoreFollowers = followers.length < (followersMeta.total ?? followers.length);
  const hasMoreFollowing = following.length < (followingMeta.total ?? following.length);
  const hasPendingApprovals = pendingFollowers.length > 0;
  const isOwnProfile = useMemo(
    () => Boolean(token && profileOwnerId && userId && Number(profileOwnerId) === Number(userId)),
    [token, profileOwnerId, userId]
  );
  useEffect(() => {
    if (isOwnProfile) {
      refreshBilling({ force: true });
    }
  }, [isOwnProfile, refreshBilling]);
  useEffect(() => {
    if (billingPortalStatus === 'success' || billingPortalStatus === 'error') {
      const timeout = setTimeout(() => resetPortalStatus(), 6_000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [billingPortalStatus, resetPortalStatus]);
  const profileSettingsHref = session?.user?.role
    ? `/dashboard/${session.user.role}/settings`
    : '/dashboard/user/settings';
  const hasProfileErrors = useMemo(
    () => Object.values(profileFormErrors).some((message) => Boolean(message)),
    [profileFormErrors]
  );
  const canSubmitProfile = profileFormDirty && !isSavingProfile && !hasProfileErrors;

  const updateFollowActionState = useCallback((targetId, updates) => {
    if (!targetId) {
      return;
    }
    setFollowActions((prev) => {
      if (updates === null) {
        if (!prev[targetId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[targetId];
        return next;
      }
      const existing = prev[targetId] ?? {};
      return { ...prev, [targetId]: { ...existing, ...updates } };
    });
  }, []);

  const handleFollowUser = useCallback(
    async (targetId, { source = 'profile.recommendation', reason = null } = {}) => {
      if (!token || !targetId) {
        return;
      }
      updateFollowActionState(targetId, { loading: true, error: null });
      try {
        const response = await followUser({
          token,
          userId: targetId,
          payload: {
            source,
            reason,
            metadata: { initiatedFrom: 'profile', originProfileId: profileOwnerId }
          }
        });
        updateFollowActionState(targetId, { loading: false, status: response?.data?.status ?? 'accepted' });
        await Promise.allSettled([
          loadFollowers({ append: false, offset: 0 }),
          loadFollowing({ append: false, offset: 0 }),
          loadRecommendations()
        ]);
      } catch (error) {
        updateFollowActionState(targetId, {
          loading: false,
          error: error?.message ?? 'Unable to follow this member right now.'
        });
      }
    },
    [token, profileOwnerId, updateFollowActionState, loadFollowers, loadFollowing, loadRecommendations]
  );

  const handleUnfollowUser = useCallback(
    async (targetId) => {
      if (!token || !targetId) {
        return;
      }
      updateFollowActionState(targetId, { loading: true, error: null });
      try {
        await unfollowUser({ token, userId: targetId });
        updateFollowActionState(targetId, { loading: false, status: 'unfollowed' });
        await Promise.allSettled([
          loadFollowers({ append: false, offset: 0 }),
          loadFollowing({ append: false, offset: 0 }),
          loadRecommendations()
        ]);
      } catch (error) {
        updateFollowActionState(targetId, {
          loading: false,
          error: error?.message ?? 'Unable to update follow status.'
        });
      }
    },
    [token, updateFollowActionState, loadFollowers, loadFollowing, loadRecommendations]
  );

  const handleApproveFollow = useCallback(
    async (followerId) => {
      if (!token || !profileOwnerId || !followerId) {
        return;
      }
      const stateKey = `pending:${followerId}`;
      updateFollowActionState(stateKey, { loading: true, error: null });
      try {
        await approveFollowRequest({ token, userId: profileOwnerId, followerId });
        updateFollowActionState(stateKey, { loading: false, status: 'accepted' });
        await Promise.allSettled([
          loadFollowers({ append: false, offset: 0 }),
          loadPendingFollowers()
        ]);
      } catch (error) {
        updateFollowActionState(stateKey, {
          loading: false,
          error: error?.message ?? 'Unable to approve follow request.'
        });
      }
    },
    [token, profileOwnerId, updateFollowActionState, loadFollowers, loadPendingFollowers]
  );

  const handleDeclineFollow = useCallback(
    async (followerId) => {
      if (!token || !profileOwnerId || !followerId) {
        return;
      }
      const stateKey = `pending:${followerId}`;
      updateFollowActionState(stateKey, { loading: true, error: null });
      try {
        await declineFollowRequest({ token, userId: profileOwnerId, followerId });
        updateFollowActionState(stateKey, { loading: false, status: 'declined' });
        await loadPendingFollowers();
      } catch (error) {
        updateFollowActionState(stateKey, {
          loading: false,
          error: error?.message ?? 'Unable to decline follow request.'
        });
      }
    },
    [token, profileOwnerId, updateFollowActionState, loadPendingFollowers]
  );

  const handleLoadMoreFollowers = useCallback(() => {
    loadFollowers({ append: true, offset: followers.length });
  }, [loadFollowers, followers.length]);

  const handleLoadMoreFollowing = useCallback(() => {
    loadFollowing({ append: true, offset: following.length });
  }, [loadFollowing, following.length]);
  const documentRequirements = useMemo(() => {
    if (verificationSummary?.requiredDocuments?.length) {
      return verificationSummary.requiredDocuments.map((doc) => ({
        type: doc.type,
        label: doc.label ?? doc.type.replace(/_/g, ' '),
        helper: doc.description ?? ''
      }));
    }
    return fallbackVerificationRequirements;
  }, [verificationSummary]);

  useEffect(() => {
    setDocumentStates((prev) => {
      const requirementTypes = documentRequirements.map((doc) => doc.type);
      let changed = false;
      const next = { ...prev };
      requirementTypes.forEach((type) => {
        if (!next[type]) {
          next[type] = { status: 'idle', error: null, fileName: null, completedAt: null };
          changed = true;
        }
      });
      Object.keys(next).forEach((type) => {
        if (!requirementTypes.includes(type)) {
          delete next[type];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [documentRequirements]);

  const refreshVerificationSummary = useCallback(async () => {
    if (!token) {
      setVerificationSummary(null);
      return;
    }
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      const summary = await fetchVerificationSummary({ token });
      setVerificationSummary(summary);
    } catch (error) {
      setVerificationError(error?.message ?? 'Unable to load verification status.');
    } finally {
      setVerificationLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshVerificationSummary();
  }, [refreshVerificationSummary]);

  const summaryDocumentsByType = useMemo(() => {
    const documents = verificationSummary?.documents ?? [];
    return documents.reduce((accumulator, document) => {
      if (document.type) {
        accumulator[document.type] = document;
      }
      return accumulator;
    }, {});
  }, [verificationSummary]);

  const localCompleted = useMemo(
    () =>
      Object.values(documentStates).filter((state) => state?.status === 'attached' || state?.status === 'uploaded').length,
    [documentStates]
  );

  const documentsRequired = verificationSummary?.documentsRequired ?? documentRequirements.length;
  const documentsSubmitted = verificationSummary?.documentsSubmitted ?? localCompleted;
  const outstandingDocuments = verificationSummary?.outstandingDocuments ?? [];
  const outstandingDocumentLabels = useMemo(() => {
    if (!outstandingDocuments.length) {
      return [];
    }
    return outstandingDocuments
      .map((document) => {
        if (typeof document === 'string') {
          const requirement = documentRequirements.find((item) => item.type === document);
          return requirement?.label ?? document;
        }
        if (document?.label) {
          return document.label;
        }
        if (document?.type) {
          const requirement = documentRequirements.find((item) => item.type === document.type);
          return requirement?.label ?? document.type;
        }
        return null;
      })
      .filter(Boolean);
  }, [documentRequirements, outstandingDocuments]);

  const verificationProgress = useMemo(() => {
    if (!documentsRequired) {
      return 0;
    }
    return Math.min(100, Math.round((documentsSubmitted / documentsRequired) * 100));
  }, [documentsRequired, documentsSubmitted]);

  const verificationTimeline = useMemo(
    () =>
      normaliseVerificationTimeline({
        summary: verificationSummary,
        profileVerification: profile.verification,
        documentRequirements,
        documentStates
      }),
    [documentRequirements, documentStates, profile.verification, verificationSummary]
  );

  const canSubmitVerification = useMemo(() => {
    if (!documentsRequired) {
      return false;
    }
    if (verificationSummary?.status) {
      const allowed = ['collecting', 'resubmission_required'];
      return (
        allowed.includes(verificationSummary.status) &&
        documentsSubmitted >= documentsRequired &&
        outstandingDocuments.length === 0
      );
    }
    return documentsSubmitted >= documentsRequired;
  }, [documentsRequired, documentsSubmitted, outstandingDocuments, verificationSummary]);
  const affiliateMetrics = useMemo(
    () => [
      {
        id: 'lifetime',
        label: 'Lifetime earnings',
        value: affiliateSummary.lifetime,
        helper: `Pending ${affiliateSummary.pending}`
      },
      {
        id: 'trailing30',
        label: 'Trailing 30 days',
        value: affiliateSummary.trailing30,
        helper: affiliateSummary.conversion
      },
      {
        id: 'avg-order',
        label: 'Average order value',
        value: affiliateSummary.avgOrder,
        helper: `${affiliateSummary.activeProgrammes} active programmes`
      },
      {
        id: 'referral-code',
        label: 'Referral code',
        value: affiliate.referralCode,
        helper: 'Share with trusted operators'
      }
    ],
    [
      affiliate.referralCode,
      affiliateSummary.activeProgrammes,
      affiliateSummary.avgOrder,
      affiliateSummary.conversion,
      affiliateSummary.lifetime,
      affiliateSummary.pending,
      affiliateSummary.trailing30
    ]
  );
  const affiliateCompliance = useMemo(
    () => [
      {
        id: 'two-factor',
        label: 'Two-factor required for payouts',
        enabled: Boolean(affiliateComplianceSettings.requireTwoFactor)
      },
      {
        id: 'tax',
        label: 'Tax profile verified',
        enabled: Boolean(affiliateComplianceSettings.taxComplete)
      },
      {
        id: 'self-referral',
        label: 'Self-referrals blocked',
        enabled: Boolean(affiliateComplianceSettings.selfReferralBlocked)
      },
      {
        id: 'schedule',
        label: affiliateComplianceSettings.payoutSchedule,
        enabled: true
      }
    ],
    [
      affiliateComplianceSettings.payoutSchedule,
      affiliateComplianceSettings.requireTwoFactor,
      affiliateComplianceSettings.selfReferralBlocked,
      affiliateComplianceSettings.taxComplete
    ]
  );
  const upcomingAffiliatePayout = useMemo(
    () => affiliatePayouts.find((payout) => payout.status === 'Scheduled') ?? null,
    [affiliatePayouts]
  );
  const lastAffiliatePayout = useMemo(
    () => affiliatePayouts.find((payout) => payout.status === 'Completed') ?? null,
    [affiliatePayouts]
  );

  const handleVerificationUpload = (documentType) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setVerificationSuccess(null);
    setVerificationError(null);
    event.target.value = '';

    if (!token) {
      setDocumentStates((prev) => ({
        ...prev,
        [documentType]: {
          status: 'error',
          error: 'You need to be signed in to upload verification documents.',
          fileName: file.name,
          completedAt: null
        }
      }));
      return;
    }

    setDocumentStates((prev) => ({
      ...prev,
      [documentType]: { status: 'uploading', error: null, fileName: file.name, completedAt: null }
    }));

    try {
      const checksum = await computeChecksum(file);
      const uploadInstruction = await requestVerificationUpload({
        token,
        payload: {
          documentType,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size
        }
      });

      await fetch(uploadInstruction.upload.url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      await attachVerificationDocument({
        token,
        payload: {
          documentType,
          storageBucket: uploadInstruction.upload.bucket,
          storageKey: uploadInstruction.upload.key,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          checksumSha256: checksum
        }
      });

      setDocumentStates((prev) => ({
        ...prev,
        [documentType]: {
          status: 'attached',
          error: null,
          fileName: file.name,
          completedAt: new Date().toISOString()
        }
      }));
      setVerificationSuccess('Document uploaded successfully.');
      await refreshVerificationSummary();
    } catch (error) {
      const message = error?.message ?? 'Failed to upload verification document.';
      setDocumentStates((prev) => ({
        ...prev,
        [documentType]: { status: 'error', error: message, fileName: file.name, completedAt: null }
      }));
      setVerificationError(message);
    }
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmitVerification || !token) {
      if (!token) {
        setVerificationError('You need to be signed in to submit verification.');
      }
      return;
    }
    setVerificationSuccess(null);
    setVerificationError(null);
    setSubmittingVerification(true);
    try {
      await submitVerificationPackage({ token });
      setVerificationSuccess('Verification submitted for review.');
      await refreshVerificationSummary();
    } catch (error) {
      setVerificationError(error?.message ?? 'Unable to submit verification for review.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleAffiliateLinkCopy = async () => {
    if (!affiliate.shareUrl) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(affiliate.shareUrl);
        setAffiliateLinkCopied(true);
        setTimeout(() => setAffiliateLinkCopied(false), 2000);
      }
    } catch (error) {
      console.warn('Failed to copy affiliate link', error);
    }
  };

  const fallbackStatusColour =
    profile.verification.status === 'Submitted for review'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : 'text-amber-600 bg-amber-50 border-amber-200';

  const statusColour = verificationSummary?.status ? resolveStatusColour(verificationSummary.status) : fallbackStatusColour;
  const verificationStatusLabel = verificationSummary?.status
    ? formatStatusLabel(verificationSummary.status)
    : profile.verification.status;
  const lastReviewed = useMemo(() => {
    if (!verificationSummary?.lastReviewedAt) {
      return profile.verification.lastReviewed;
    }
    const parsed = new Date(verificationSummary.lastReviewedAt);
    if (Number.isNaN(parsed.getTime())) {
      return verificationSummary.lastReviewedAt;
    }
    return parsed.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }, [verificationSummary]);
  const progressCaption = verificationLoading
    ? 'Refreshing verification status…'
    : `${verificationProgress}% complete • Last reviewed ${lastReviewed}`;
  const isSubmitDisabled = !canSubmitVerification || submittingVerification || verificationLoading;
  const submitButtonLabel = submittingVerification ? 'Submitting…' : 'Submit for review';

  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-card">
          <div
            className="h-48 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.banner})` }}
            aria-hidden="true"
          />
          <div className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto]">
            <div className="-mt-20 flex flex-col items-center gap-4 md:items-start">
              <img
                src={profile.avatar}
                alt="Profile avatar"
                className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl"
              />
              {isOwnProfile ? (
                <a
                  href={profileSettingsHref}
                  className="w-full rounded-full border border-primary/40 bg-white px-4 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary/10"
                >
                  Manage profile
                </a>
              ) : null}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-900">{profile.name}</h1>
                {profileLoading && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Refreshing…
                  </span>
                )}
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Trust score {profile.trustScores.instructor}%</span>
              </div>
              <p className="text-sm text-slate-500">{profile.handle} • {profile.location}</p>
              <p className="text-base text-slate-600">{profile.tagline}</p>
              <p className="text-sm text-slate-600">{profile.bio}</p>
              {profileError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                  {profileError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {profile.trustBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="m10 1.5 6.5 3v5.31c0 4.03-2.5 7.73-6.24 9.12a.75.75 0 0 1-.52 0C5.5 17.54 3 13.84 3 9.81V4.5L10 1.5Zm1.72 6.53-2.47 2.47-1.0-1.0a.75.75 0 0 0-1.06 1.06l1.53 1.53a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06Z" />
                    </svg>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 text-right text-sm text-slate-600">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Followers</p>
                <p className="text-2xl font-semibold text-slate-900">{formatCompactNumber(followerCount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Following</p>
                <p className="text-2xl font-semibold text-slate-900">{formatCompactNumber(followingCount)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trust metrics</p>
                <p className="mt-2 text-sm text-slate-600">Learner trust {profile.trustScores.learner}%</p>
                <p className="text-sm text-slate-600">Instructor trust {profile.trustScores.instructor}%</p>
                <p className="text-sm text-slate-600">Review grade {profile.trustScores.reviewGrade}/5</p>
              </div>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <ProfileIdentityEditor
            form={profileForm}
            onFieldChange={handleProfileFieldChange}
            onAddressChange={handleProfileAddressChange}
            onSocialLinkChange={handleSocialLinkChange}
            onAddSocialLink={handleAddSocialLink}
            onRemoveSocialLink={handleRemoveSocialLink}
            onSubmit={handleProfileSubmit}
            isSaving={isSavingProfile}
            canSubmit={canSubmitProfile}
            error={profileSaveError}
            success={profileSaveSuccess}
          />
        )}

        {isOwnProfile ? (
          <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-card">
            <div className="p-6 sm:p-8">
              <SettingsLayout
                eyebrow="Personalisation"
                title="System & personalisation preferences"
                description="Adjust notification cadence, accessibility options, and sponsor visibility without leaving your profile."
                actions={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                    onClick={() => refreshSystemPreferences()}
                    disabled={disableSystemPreferences}
                  >
                    Sync preferences
                  </button>
                }
                status={systemStatusBanner}
              >
                <SystemPreferencesPanel
                  form={systemPreferencesForm}
                  recommendationPreview={systemRecommendationPreview}
                  recommendedTopicsInputValue={systemRecommendedTopicsInputValue}
                  adPersonalisationEnabled={systemAdPersonalisationEnabled}
                  onSubmit={handleSystemPreferencesSubmit}
                  onSavePersonalisation={persistSystemPreferencesAction}
                  onInputChange={handleSystemPreferencesInputChange}
                  onSystemToggle={updateSystemPreferencesToggle}
                  onPreferenceToggle={updateSystemPreferenceToggle}
                  onAdPersonalisationChange={handleSystemAdPersonalisationChange}
                  disableActions={disableSystemPreferences}
                  isSaving={systemPendingAction || systemSaving}
                />
              </SettingsLayout>
            </div>
          </section>
        ) : null}

        {isOwnProfile ? (
          <div className="space-y-6">
            <BillingSummaryCard
              overview={billingOverviewWithSync}
              loading={billingLoading}
              error={billingError}
              onRefresh={() => refreshBilling({ force: true })}
              onManageBilling={handleManageBilling}
              manageStatus={billingPortalStatus}
              manageError={billingPortalError}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <BillingPaymentMethods
                paymentMethods={billingPaymentMethods}
                loading={billingLoading}
                onManageBilling={handleManageBilling}
              />
              <BillingInvoiceTable invoices={billingInvoices} loading={billingLoading} />
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-emerald-50" aria-hidden="true" />
              <div className="relative space-y-6 p-6 lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Affiliate revenue hub</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Real-time visibility into partner earnings, payout cadence, and referral performance.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                        <CheckCircleIcon className="h-4 w-4" />
                        {affiliate.status}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                        <BanknotesIcon className="h-4 w-4" />
                        {affiliateSummary.pending} pending
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 text-sm lg:items-end">
                    <button
                      type="button"
                      onClick={handleAffiliateLinkCopy}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      {affiliateLinkCopied ? 'Copied share link' : 'Copy share link'}
                    </button>
                    <span className="sr-only" aria-live="polite">
                      {affiliateLinkCopied ? 'Affiliate share link copied to clipboard' : 'Copy affiliate share link'}
                    </span>
                    <a
                      href="/dashboard/learner/affiliate"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary-dark"
                    >
                      Launch affiliate control center
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {affiliateMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</p>
                      <p className="text-xs text-slate-500">{metric.helper}</p>
                    </div>
                  ))}
                </div>
                {affiliateHighlights.length ? (
                  <div className="flex flex-wrap gap-2">
                    {affiliateHighlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Payout timeline</p>
                        <p className="text-xs text-slate-500">{affiliateComplianceSettings.payoutSchedule}</p>
                      </div>
                      {upcomingAffiliatePayout ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Next {upcomingAffiliatePayout.status.toLowerCase()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-3">
                      {affiliatePayouts.map((payout) => {
                        const tone =
                          payout.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : payout.status === 'Scheduled'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-slate-100 text-slate-600';
                        return (
                          <div
                            key={payout.id}
                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{payout.programme}</span>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
                                {payout.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{payout.amount}</p>
                            <p className="text-xs text-slate-500">
                              Scheduled {payout.scheduled}
                              {payout.processed ? ` • Processed ${payout.processed}` : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {lastAffiliatePayout ? (
                      <p className="mt-4 text-xs text-slate-500">
                        Last release {lastAffiliatePayout.processed ?? lastAffiliatePayout.scheduled} for {lastAffiliatePayout.amount}.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Commission tiers</p>
                    <p className="text-xs text-slate-500">Aligned with admin defaults for transparent earning thresholds.</p>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-2 text-left">Tier</th>
                            <th className="px-4 py-2 text-left">Threshold</th>
                            <th className="px-4 py-2 text-left">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {affiliate.tiers.map((tier) => (
                            <tr key={tier.label} className="bg-white">
                              <td className="px-4 py-2 font-semibold text-slate-900">{tier.label}</td>
                              <td className="px-4 py-2 text-slate-600">{tier.threshold}</td>
                              <td className="px-4 py-2 text-slate-600">{tier.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Tier multipliers update automatically when admin settings evolve, ensuring parity with payout policies.
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Action queue</p>
                    <p className="text-xs text-slate-500">Prioritised workflows to keep partners supported and compliant.</p>
                    <ul className="mt-4 space-y-3 text-sm text-slate-700">
                      {affiliateActions.map((action) => (
                        <li
                          key={action}
                          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <CheckCircleIcon className="mt-0.5 h-5 w-5 text-primary" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Recent referrals</p>
                    <p className="text-xs text-slate-500">High-signal partner wins over the last sprint.</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      {affiliateRecentReferrals.map((referral) => (
                        <div
                          key={referral.organisation}
                          className="flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <span className="font-semibold text-slate-900">{referral.organisation}</span>
                          <span className="text-slate-600">{referral.amount}</span>
                          <span className="text-xs text-slate-500">{referral.date}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Compliance guardrails</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {affiliateCompliance.map((item) => (
                          <li key={item.id} className="flex items-center gap-3">
                            <CheckCircleIcon
                              className={`h-5 w-5 ${item.enabled ? 'text-emerald-500' : 'text-slate-400'}`}
                            />
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Qualifications & expertise</h2>
              <p className="mt-2 text-sm text-slate-600">{profile.expertise.join(' • ')}</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {profile.qualifications.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">✔</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Featured courses</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {profile.courses.map((course) => (
                  <div key={course.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.status} • Next cohort {course.nextCohort}</p>
                    <p className="mt-2 text-sm text-slate-600">{course.learners} learners enrolled</p>
                    <p className="text-sm text-primary">{course.satisfaction}</p>
                    <button className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5">
                      View curriculum
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Tutor session reviews</h2>
              <div className="mt-4 space-y-5">
                {profile.reviews.map((review) => (
                  <div key={review.learner} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">{review.learner}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{review.rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">{review.context}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{review.highlight}</p>
                    <p className="mt-3 text-xs text-slate-500">Reviewed {review.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Live feed</h2>
              <div className="mt-4 space-y-4">
                {profile.liveFeed.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="text-xs text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.metrics.map((metric) => (
                        <span key={metric} className="rounded-full bg-slate-100 px-3 py-1">{metric}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Identity verification</h2>
                  <p className="mt-1 text-sm text-slate-500">Complete KYC to unlock payouts, live tutoring, and marketplace visibility.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColour}`}>{verificationStatusLabel}</span>
              </div>
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${verificationProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{progressCaption}</p>
              </div>
              {outstandingDocumentLabels.length ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-700">
                  <p className="font-semibold">Documents pending</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {outstandingDocumentLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700">Verification timeline</h3>
                <ol className="mt-3 space-y-4">
                  {verificationTimeline.map((event, index) => (
                    <li key={event.id} className="flex items-start gap-3">
                      <span
                        className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          index === verificationTimeline.length - 1
                            ? 'bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.15)]'
                            : 'bg-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          {event.timestamp ? <span className="text-xs text-slate-500">{event.timestamp}</span> : null}
                        </div>
                        {event.description ? <p className="text-xs text-slate-600">{event.description}</p> : null}
                        {event.statusLabel ? (
                          <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${resolveStatusColour(event.status)}`}>
                            {event.statusLabel}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleVerificationSubmit}>
                <label className="block text-sm font-semibold text-slate-600">
                  ID type
                  <select
                    value={selectedIdType}
                    onChange={(event) => setSelectedIdType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {profile.verification.supported.map((type) => (
                      <option key={type} value={type}>
                        {type.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500">{idTypeCopy[selectedIdType]}</p>
                <div className="space-y-3 text-xs text-slate-600">
                  {documentRequirements.map((requirement) => {
                    const state = documentStates[requirement.type] ?? {};
                    const attached = summaryDocumentsByType[requirement.type] ?? null;
                    const isUploading = state.status === 'uploading';
                    const hasError = state.status === 'error';
                    const isAttached = Boolean(attached) || state.status === 'attached';
                    const displayName = attached?.fileName ?? state.fileName ?? requirement.label;
                    const statusLabel = attached?.status ? attached.status.replace(/_/g, ' ') : null;

                    let helperContent = <span>{requirement.helper || 'Upload document'}</span>;

                    if (isUploading) {
                      helperContent = (
                        <span className="text-primary">
                          Uploading {state.fileName ?? requirement.label}…
                        </span>
                      );
                    } else if (hasError) {
                      helperContent = <span className="text-rose-600">{state.error ?? 'Upload failed. Try again.'}</span>;
                    } else if (isAttached) {
                      helperContent = (
                        <span className="text-emerald-600">
                          Uploaded {displayName}
                          {statusLabel ? ` • ${statusLabel}` : ''}
                        </span>
                      );
                    }

                    return (
                      <label
                        key={requirement.type}
                        className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4"
                      >
                        <span className="font-semibold text-slate-700">{requirement.label}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleVerificationUpload(requirement.type)}
                          disabled={isUploading}
                          className="text-xs disabled:cursor-wait"
                        />
                        {helperContent}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">{profile.verification.note}</p>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition disabled:cursor-not-allowed disabled:bg-primary/40"
                >
                  {submitButtonLabel}
                </button>
                {verificationError ? <p className="text-sm text-rose-600">{verificationError}</p> : null}
                {verificationSuccess ? <p className="text-sm text-emerald-600">{verificationSuccess}</p> : null}
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Communities</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Member of</p>
                  <ul className="mt-2 space-y-1">
                    {profile.communities.member.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">View</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Communities owned</p>
                  <ul className="mt-2 space-y-1">
                    {profile.communities.owner.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities/manage" className="text-xs font-semibold text-primary">Manage</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Moderator in</p>
                  <ul className="mt-2 space-y-1">
                    {profile.communities.moderator.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">Toolkit</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin roles</p>
                  <ul className="mt-2 space-y-1">
                    {profile.communities.admin.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">Insights</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Community connections</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage your followers, approvals, and discovery feed.</p>
                </div>
                <button
                  type="button"
                  onClick={refreshSocialGraph}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                >
                  Sync
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Followers <span className="ml-1 text-xs font-medium text-slate-400">{followersMeta.total ?? followers.length}</span>
                    </h3>
                    {isLoadingFollowers && <span className="text-xs text-slate-400">Refreshing…</span>}
                  </div>
                  {followersError && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                      {followersError}
                    </div>
                  )}
                  {followers.length === 0 && !isLoadingFollowers ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      No followers yet. Share your classroom wins to grow trusted relationships.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {followers.map((follower) => {
                        const action = followActions[follower.id] ?? {};
                        return (
                          <li key={follower.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{follower.name}</p>
                                <p className="text-xs text-slate-500">{follower.role}</p>
                              </div>
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Trust {follower.trust}%</span>
                            </div>
                            <p className="mt-2 text-sm">{follower.tagline}</p>
                            {action.error && <p className="mt-2 text-xs text-rose-600">{action.error}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {hasMoreFollowers && (
                    <button
                      type="button"
                      onClick={handleLoadMoreFollowers}
                      disabled={isLoadingFollowers}
                      className="mt-4 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingFollowers ? 'Loading followers…' : 'Load more followers'}
                    </button>
                  )}
                </section>

                {hasPendingApprovals && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-700">Pending approvals</h3>
                    {pendingFollowersError && (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                        {pendingFollowersError}
                      </div>
                    )}
                    <ul className="mt-4 space-y-3">
                      {pendingFollowers.map((pending) => {
                        const action = followActions[`pending:${pending.id}`] ?? {};
                        return (
                          <li key={pending.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{pending.name}</p>
                                <p className="text-xs text-slate-500">{pending.tagline}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleApproveFollow(pending.id)}
                                  disabled={action.loading}
                                  className="rounded-full border border-emerald-400 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeclineFollow(pending.id)}
                                  disabled={action.loading}
                                  className="rounded-full border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                            {action.error && <p className="mt-2 text-xs text-rose-600">{action.error}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Following <span className="ml-1 text-xs font-medium text-slate-400">{followingMeta.total ?? following.length}</span>
                    </h3>
                    {isLoadingFollowing && <span className="text-xs text-slate-400">Refreshing…</span>}
                  </div>
                  {followingError && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                      {followingError}
                    </div>
                  )}
                  {following.length === 0 && !isLoadingFollowing ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      You are not following anyone yet. Start with a recommendation below.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {following.map((entry) => {
                        const action = followActions[entry.id] ?? {};
                        return (
                          <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{entry.name}</p>
                                <p className="text-xs text-slate-500">{entry.tagline}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnfollowUser(entry.id)}
                                disabled={action.loading}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {action.loading ? 'Updating…' : 'Unfollow'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {hasMoreFollowing && (
                    <button
                      type="button"
                      onClick={handleLoadMoreFollowing}
                      disabled={isLoadingFollowing}
                      className="mt-4 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingFollowing ? 'Loading accounts…' : 'Load more accounts'}
                    </button>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Suggested operators</h3>
                    {isLoadingRecommendations && <span className="text-xs text-slate-400">Refreshing…</span>}
                  </div>
                  {recommendationsError && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                      {recommendationsError}
                    </div>
                  )}
                  {recommendations.length === 0 && !isLoadingRecommendations ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Discovery feed is quiet right now. Check back after sharing new classroom updates.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {recommendations.map((recommendation) => {
                        const action = followActions[recommendation.id] ?? {};
                        return (
                          <li key={recommendation.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{recommendation.name}</p>
                                <p className="text-xs text-slate-500">{recommendation.tagline}</p>
                                {recommendation.mutualFollowers ? (
                                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                                    {recommendation.mutualFollowers} mutual followers
                                  </p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFollowUser(recommendation.id)}
                                disabled={action.loading}
                                className="rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {action.loading ? 'Following…' : 'Follow'}
                              </button>
                            </div>
                            {action.error && <p className="mt-2 text-xs text-rose-600">{action.error}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Social presence</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {profile.social
                  .filter((socialLink) => socialLink?.url)
                  .map((socialLink) => {
                    const handle = socialLink.handle ?? deriveSocialHandle(socialLink.url);
                    const key = socialLink.id ?? socialLink.url ?? socialLink.label;
                    return (
                      <li key={key} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{socialLink.label ?? handle}</p>
                          <p className="text-xs text-slate-500">{handle}</p>
                        </div>
                        <a
                          href={socialLink.url}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M5.75 4a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0V6.56l-9.22 9.22a.75.75 0 1 1-1.06-1.06l9.22-9.22H5.75A.75.75 0 0 1 5 4.75.75.75 0 0 1 5.75 4Z" />
                          </svg>
                        </a>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Privacy & consent ledger</h2>
              <p className="mt-1 text-sm text-slate-600">
                {userId ? 'Live consent records fetched from the compliance API.' : 'Sign in to view consent records.'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <ShieldCheckIcon className="h-4 w-4" /> {activeConsents.length} active grants
            </span>
          </div>
          {consentError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {consentError.message}
            </div>
          )}
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {consentLoading && <li className="text-slate-500">Loading consent history…</li>}
            {!consentLoading && consents.length === 0 && (
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                No consent activity captured yet.
              </li>
            )}
            {consents.map((consent) => (
              <li key={consent.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{consent.consentType}</p>
                    <p className="text-xs text-slate-500">
                      Version {consent.policyVersion} · Granted {consent.grantedAt ? new Date(consent.grantedAt).toLocaleDateString() : 'N/A'} via {consent.channel}
                    </p>
                  </div>
                  {consent.status === 'granted' ? (
                    <button
                      type="button"
                      disabled={revokingConsentId === consent.id}
                      onClick={() => handleRevokeConsent(consent.id)}
                      className="rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-300 disabled:text-rose-300"
                    >
                      {revokingConsentId === consent.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{consent.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </section>
  );
}
