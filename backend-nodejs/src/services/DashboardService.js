import crypto from 'crypto';

import logger from '../config/logger.js';
import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';
import LearnerPaymentMethodModel from '../models/LearnerPaymentMethodModel.js';
import LearnerBillingContactModel from '../models/LearnerBillingContactModel.js';
import LearnerFinancialProfileModel from '../models/LearnerFinancialProfileModel.js';
import LearnerSystemPreferenceModel from '../models/LearnerSystemPreferenceModel.js';
import LearnerFinancePurchaseModel from '../models/LearnerFinancePurchaseModel.js';
import CommunityModel from '../models/CommunityModel.js';
import LearnerGrowthInitiativeModel from '../models/LearnerGrowthInitiativeModel.js';
import LearnerGrowthExperimentModel from '../models/LearnerGrowthExperimentModel.js';
import LearnerAffiliateChannelModel from '../models/LearnerAffiliateChannelModel.js';
import LearnerAffiliatePayoutModel from '../models/LearnerAffiliatePayoutModel.js';
import LearnerAdCampaignModel from '../models/LearnerAdCampaignModel.js';
import InstructorApplicationModel from '../models/InstructorApplicationModel.js';
import LearnerLibraryEntryModel from '../models/LearnerLibraryEntryModel.js';
import LearnerCourseGoalModel from '../models/LearnerCourseGoalModel.js';
import FieldServiceOrderModel from '../models/FieldServiceOrderModel.js';
import FieldServiceEventModel from '../models/FieldServiceEventModel.js';
import FieldServiceProviderModel from '../models/FieldServiceProviderModel.js';
import buildFieldServiceWorkspace from './FieldServiceWorkspace.js';
import OperatorDashboardService from './OperatorDashboardService.js';
import { summariseReactions as aggregateReactionSummary } from '../services/ReactionAggregationService.js';
import SupportKnowledgeBaseService from './SupportKnowledgeBaseService.js';

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
let operatorDashboardService;
const log = logger.child({ service: 'DashboardService' });

const DEFAULT_SUPPORT_KB = [
  {
    id: 'kb-billing',
    title: 'Resolve billing discrepancies fast',
    excerpt: 'Step-by-step workflow to reconcile invoices, credits, and refunds without disrupting learner access.',
    url: 'https://support.edulure.test/articles/billing-reconciliation',
    category: 'Billing',
    minutes: 4
  },
  {
    id: 'kb-classroom',
    title: 'Stabilise live classroom sessions',
    excerpt: 'Mitigate live classroom drops by refreshing keys, re-inviting facilitators, and notifying impacted cohorts.',
    url: 'https://support.edulure.test/articles/live-classroom',
    category: 'Live learning',
    minutes: 5
  },
  {
    id: 'kb-community',
    title: 'Moderate community escalations with confidence',
    excerpt: 'Use templated macros and audit trails to resolve moderation flags in under ten minutes.',
    url: 'https://support.edulure.test/articles/community-escalations',
    category: 'Community',
    minutes: 6
  }
];

const DEFAULT_SUPPORT_CONTACTS = [
  {
    id: 'email',
    label: 'Email learner success',
    description: 'Raise a ticket for complex issues. Average first response under two hours.',
    action: 'Send email',
    href: 'mailto:support@edulure.test'
  },
  {
    id: 'live-chat',
    label: 'Live concierge chat',
    description: 'Weekday concierge with escalation to instructors and operations in real time.',
    action: 'Start chat',
    href: 'https://support.edulure.test/chat'
  },
  {
    id: 'call',
    label: 'Book a callback',
    description: 'Schedule a 20 minute call for billing or classroom incident review.',
    action: 'Schedule call',
    href: 'https://support.edulure.test/call'
  }
];

const DEFAULT_SUPPORT_METRICS = Object.freeze({
  open: 0,
  waiting: 0,
  resolved: 0,
  closed: 0,
  awaitingLearner: 0,
  averageResponseMinutes: 0,
  latestUpdatedAt: null
});

const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  language: 'en',
  region: 'US',
  timezone: 'UTC',
  notificationsEnabled: true,
  digestEnabled: true,
  autoPlayMedia: false,
  highContrast: false,
  reducedMotion: false,
  preferences: {
    interfaceDensity: 'comfortable',
    analyticsOptIn: true,
    subtitleLanguage: 'en',
    audioDescription: false
  }
});

const DEFAULT_FINANCE_ALERTS = Object.freeze({
  sendEmail: true,
  sendSms: false,
  escalationEmail: null,
  notifyThresholdPercent: 80
});

const MESSAGE_PERMISSION_CANONICAL = new Map([
  ['everyone', 'everyone'],
  ['public', 'everyone'],
  ['all', 'everyone'],
  ['followers', 'followers'],
  ['followers_only', 'followers'],
  ['friends', 'followers'],
  ['connections', 'followers'],
  ['no-one', 'none'],
  ['no_one', 'none'],
  ['none', 'none'],
  ['private', 'none']
]);

const MESSAGE_PERMISSION_DEFAULT = 'followers';

function getOperatorDashboardService() {
  if (!operatorDashboardService) {
    operatorDashboardService = new OperatorDashboardService();
  }
  return operatorDashboardService;
}

function toPositiveInteger(value, { round = true } = {}) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return round ? Math.round(numeric) : numeric;
}

function _normaliseSupportMetrics(input) {
  const source = input && typeof input === 'object' ? input : {};
  const latestUpdatedAtDate = normaliseDate(source.latestUpdatedAt);
  const averageResponseMinutes = toPositiveInteger(source.averageResponseMinutes);
  const firstResponseMinutes = toPositiveInteger(
    source.firstResponseMinutes ?? source.firstResponse ?? averageResponseMinutes
  );

  return {
    open: toPositiveInteger(source.open),
    waiting: toPositiveInteger(source.waiting),
    resolved: toPositiveInteger(source.resolved),
    closed: toPositiveInteger(source.closed),
    awaitingLearner: toPositiveInteger(source.awaitingLearner),
    averageResponseMinutes,
    firstResponseMinutes,
    latestUpdatedAt: latestUpdatedAtDate ? latestUpdatedAtDate.toISOString() : null
  };
}

function normaliseSystemPreferences(preferences) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  const nestedPrefs = source.preferences && typeof source.preferences === 'object' ? source.preferences : {};
  const updatedAt = normaliseDate(source.updatedAt);

  return {
    language: typeof source.language === 'string' && source.language ? source.language : DEFAULT_SYSTEM_SETTINGS.language,
    region: typeof source.region === 'string' && source.region ? source.region : DEFAULT_SYSTEM_SETTINGS.region,
    timezone:
      typeof source.timezone === 'string' && source.timezone ? source.timezone : DEFAULT_SYSTEM_SETTINGS.timezone,
    notificationsEnabled:
      typeof source.notificationsEnabled === 'boolean'
        ? source.notificationsEnabled
        : DEFAULT_SYSTEM_SETTINGS.notificationsEnabled,
    digestEnabled:
      typeof source.digestEnabled === 'boolean' ? source.digestEnabled : DEFAULT_SYSTEM_SETTINGS.digestEnabled,
    autoPlayMedia:
      typeof source.autoPlayMedia === 'boolean' ? source.autoPlayMedia : DEFAULT_SYSTEM_SETTINGS.autoPlayMedia,
    highContrast:
      typeof source.highContrast === 'boolean' ? source.highContrast : DEFAULT_SYSTEM_SETTINGS.highContrast,
    reducedMotion:
      typeof source.reducedMotion === 'boolean' ? source.reducedMotion : DEFAULT_SYSTEM_SETTINGS.reducedMotion,
    preferences: {
      interfaceDensity:
        typeof nestedPrefs.interfaceDensity === 'string' && nestedPrefs.interfaceDensity
          ? nestedPrefs.interfaceDensity
          : DEFAULT_SYSTEM_SETTINGS.preferences.interfaceDensity,
      analyticsOptIn:
        typeof nestedPrefs.analyticsOptIn === 'boolean'
          ? nestedPrefs.analyticsOptIn
          : DEFAULT_SYSTEM_SETTINGS.preferences.analyticsOptIn,
      subtitleLanguage:
        typeof nestedPrefs.subtitleLanguage === 'string' && nestedPrefs.subtitleLanguage
          ? nestedPrefs.subtitleLanguage
          : typeof source.language === 'string' && source.language
            ? source.language
            : DEFAULT_SYSTEM_SETTINGS.preferences.subtitleLanguage,
      audioDescription:
        typeof nestedPrefs.audioDescription === 'boolean'
          ? nestedPrefs.audioDescription
          : DEFAULT_SYSTEM_SETTINGS.preferences.audioDescription
    },
    updatedAt: updatedAt ? updatedAt.toISOString() : null
  };
}

function normalisePrivacySettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const visibilityRaw = typeof source.profileVisibility === 'string' ? source.profileVisibility.toLowerCase() : '';
  const visibility = ['public', 'private', 'connections'].includes(visibilityRaw) ? visibilityRaw : 'public';

  const messagePermissionRaw =
    typeof source.messagePermission === 'string' ? source.messagePermission.toLowerCase() : '';
  const messagePermission =
    MESSAGE_PERMISSION_CANONICAL.get(messagePermissionRaw) ?? MESSAGE_PERMISSION_DEFAULT;

  return {
    visibility,
    followApprovalRequired: Boolean(source.followApprovalRequired),
    shareActivity: source.shareActivity !== false,
    messagePermission
  };
}

function _normaliseNotifications(notifications) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications
    .filter((item) => item && (item.id || item.title))
    .map((item) => ({
      id: item.id ?? `notification-${crypto.randomUUID()}`,
      title: item.title ?? 'Notification',
      type: item.type ?? 'system',
      timestamp: (() => {
        const parsed = normaliseDate(item.timestamp);
        if (parsed) {
          return parsed.toISOString();
        }
        return item.timestamp ?? null;
      })(),
      read: item.read ?? false,
      cta: item.cta ?? null
    }));
}

export function formatCurrency(amountCents, currency = 'USD') {
  const amount = Number(amountCents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function resolveName(firstName, lastName, fallback) {
  const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return combined || fallback;
}

export function buildAvatarUrl(email) {
  const hash = crypto
    .createHash('md5')
    .update(String(email ?? '').trim().toLowerCase())
    .digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=256&d=identicon`;
}

export function formatReleaseOffsetLabel(offsetDays) {
  if (offsetDays === 0) return 'Release day';
  if (offsetDays > 0) return `Day +${offsetDays}`;
  return `Day ${offsetDays}`;
}

export function humanizeRelativeTime(dateLike, referenceDate = new Date()) {
  if (!dateLike) return 'Just now';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const diffMs = referenceDate.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears}y ago`;
}

function clampUtcDay(dateLike) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function resolveCompletionEntry(entry) {
  if (!entry) return null;
  const dateValue = entry.completedAt ?? entry.date ?? entry.timestamp ?? entry;
  const durationValue =
    entry.durationMinutes ?? entry.duration ?? entry.minutes ?? entry.studyMinutes ?? entry.totalMinutes ?? 0;

  const date = clampUtcDay(dateValue);
  if (!date) return null;

  const minutes = Number(durationValue ?? 0);
  return {
    date,
    isoDay: date.toISOString().slice(0, 10),
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0
  };
}

export function calculateLearningStreak(completionDates = [], referenceDate = new Date()) {
  const entries = completionDates.map(resolveCompletionEntry).filter(Boolean);
  if (entries.length === 0) {
    return {
      current: 0,
      longest: 0,
      totalDays: 0,
      currentRange: null,
      longestRange: null,
      lastCompletedAt: null
    };
  }

  const uniqueDays = new Map();
  for (const entry of entries) {
    if (!uniqueDays.has(entry.isoDay) || uniqueDays.get(entry.isoDay).date < entry.date) {
      uniqueDays.set(entry.isoDay, entry);
    }
  }

  const reference = clampUtcDay(referenceDate) ?? new Date();
  let current = 0;
  let cursor = new Date(reference);
  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_IN_MS);
  }
  const currentRange =
    current > 0
      ? {
          start: new Date(cursor.getTime() + DAY_IN_MS).toISOString(),
          end: new Date(reference).toISOString()
        }
      : null;

  const sortedDays = Array.from(uniqueDays.keys()).sort();
  let longest = 0;
  let longestRange = null;
  let streak = 0;
  let streakStart = null;
  let previous = null;
  for (const isoDay of sortedDays) {
    if (previous) {
      const diff = Math.round((new Date(`${isoDay}T00:00:00Z`) - new Date(`${previous}T00:00:00Z`)) / DAY_IN_MS);
      if (diff === 1) {
        streak += 1;
      } else {
        streak = 1;
        streakStart = isoDay;
      }
    } else {
      streak = 1;
      streakStart = isoDay;
    }

    if (streak > longest) {
      longest = streak;
      longestRange = {
        start: new Date(`${streakStart}T00:00:00Z`).toISOString(),
        end: new Date(`${isoDay}T00:00:00Z`).toISOString()
      };
    }

    previous = isoDay;
  }

  const lastCompletedIso = sortedDays[sortedDays.length - 1];

  return {
    current,
    longest,
    totalDays: uniqueDays.size,
    currentRange,
    longestRange,
    lastCompletedAt: lastCompletedIso ? new Date(`${lastCompletedIso}T00:00:00Z`).toISOString() : null
  };
}

export function buildLearningPace(completions = [], referenceDate = new Date()) {
  const reference = clampUtcDay(referenceDate) ?? new Date();
  const start = new Date(reference.getTime() - 6 * DAY_IN_MS);
  const buckets = new Map();

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start.getTime() + i * DAY_IN_MS);
    const isoDay = day.toISOString().slice(0, 10);
    buckets.set(isoDay, { isoDay, minutes: 0 });
  }

  for (const entry of completions.map(resolveCompletionEntry).filter(Boolean)) {
    if (!buckets.has(entry.isoDay)) continue;
    const bucket = buckets.get(entry.isoDay);
    bucket.minutes += entry.minutes;
  }

  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  return Array.from(buckets.values()).map(({ isoDay, minutes }) => ({
    day: dayFormatter.format(new Date(`${isoDay}T00:00:00Z`)),
    minutes,
    isoDate: isoDay,
    effortLevel: minutes >= 90 ? 'intense' : minutes >= 45 ? 'steady' : minutes > 0 ? 'light' : 'idle'
  }));
}

function formatTimeSpent(seconds) {
  const totalSeconds = Number(seconds ?? 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatRelativeDay(target, now = new Date()) {
  const date = normaliseDate(target);
  if (!date) return null;
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_IN_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

function sanitiseDashboardHref(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, 'https://app.edulure.com');
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function normaliseResourceEntry(entry, fallbackLabel, index = 0) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    const url = sanitiseDashboardHref(entry);
    if (!url) {
      return null;
    }
    return {
      label: fallbackLabel ?? `Resource ${index + 1}`,
      url
    };
  }

  if (typeof entry === 'object') {
    if (Array.isArray(entry)) {
      return entry
        .map((item, nestedIndex) => normaliseResourceEntry(item, fallbackLabel, nestedIndex))
        .filter(Boolean);
    }

    if (entry.items && Array.isArray(entry.items)) {
      return entry.items
        .map((item, nestedIndex) => normaliseResourceEntry(item, fallbackLabel, nestedIndex))
        .filter(Boolean);
    }

    const urlCandidate = entry.url ?? entry.href ?? entry.link ?? entry.path ?? entry.to ?? null;
    const url = sanitiseDashboardHref(urlCandidate);
    if (!url) {
      return null;
    }

    return {
      label: entry.label ?? entry.title ?? entry.name ?? fallbackLabel ?? `Resource ${index + 1}`,
      url
    };
  }

  return null;
}

function normaliseResourceCollection(value, fallbackLabel) {
  if (!value) {
    return [];
  }

  const source = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Array.isArray(value.items)
        ? value.items
        : Object.values(value)
      : [];

  const result = [];
  source.forEach((item, index) => {
    const entry = normaliseResourceEntry(item, fallbackLabel, index);
    if (Array.isArray(entry)) {
      entry.forEach((nested) => {
        if (nested && nested.url) {
          result.push(nested);
        }
      });
    } else if (entry && entry.url) {
      result.push(entry);
    }
  });
  return result;
}

function resolveSessionResources(metadata, joinHref, lobbyHref) {
  const resourcesMeta = typeof metadata.resources === 'object' ? metadata.resources : {};
  const prepSources = resourcesMeta.prep ?? metadata.prep ?? metadata.prepLinks ?? null;
  const materialSources =
    resourcesMeta.materials ??
    resourcesMeta.library ??
    metadata.materials ??
    (Array.isArray(metadata.resources) ? metadata.resources : null);
  const recordingSources = resourcesMeta.recordings ?? metadata.recordings ?? null;

  return {
    joinUrl: joinHref ?? sanitiseDashboardHref(resourcesMeta.joinUrl ?? metadata.joinUrl ?? null),
    hostUrl: sanitiseDashboardHref(
      resourcesMeta.hostUrl ?? metadata.hostUrl ?? metadata.facilitatorUrl ?? metadata.moderatorUrl ?? null
    ),
    prep: normaliseResourceCollection(prepSources, 'Prep resource'),
    materials: normaliseResourceCollection(materialSources, 'Class material'),
    recordings: normaliseResourceCollection(recordingSources, 'Recording replay')
  };
}

function resolveSessionSupport(metadata, facilitators) {
  const supportMeta = typeof metadata.support === 'object' ? metadata.support : {};
  return {
    moderator: supportMeta.moderator ?? metadata.moderator ?? facilitators[0] ?? null,
    helpDesk: supportMeta.helpDesk ?? metadata.helpDesk ?? null,
    escalation: supportMeta.escalation ?? metadata.escalation ?? null
  };
}

function resolveSessionAlerts({ occupancyRate, metadata, security, now }) {
  const alerts = [];
  const metaAlerts = Array.isArray(metadata.alerts)
    ? metadata.alerts
    : metadata.alerts && typeof metadata.alerts === 'object'
      ? Object.values(metadata.alerts)
      : [];
  metaAlerts.forEach((alert, index) => {
    if (!alert) return;
    if (typeof alert === 'string') {
      alerts.push({ id: `session-alert-meta-${index}`, label: alert });
      return;
    }
    alerts.push({
      id: alert.id ?? `session-alert-meta-${index}`,
      label: alert.label ?? alert.message ?? alert.text ?? null
    });
  });

  if (occupancyRate !== null && occupancyRate >= 85) {
    alerts.push({
      id: 'session-alert-occupancy',
      label: `High occupancy (${occupancyRate}% filled) — review waitlist readiness.`
    });
  }

  if (!security.waitingRoom || !security.passcodeRequired) {
    alerts.push({
      id: 'session-alert-security',
      label: 'Enable waiting room and passcode to meet security guardrails.'
    });
  }

  const deadlineCandidate = metadata.goLiveBy ?? metadata.deadline ?? metadata.slaDeadline ?? null;
  const deadlineLabel = deadlineCandidate ? formatRelativeDay(deadlineCandidate, now) : null;
  if (deadlineLabel) {
    alerts.push({ id: 'session-alert-sla', label: `SLA deadline ${deadlineLabel}` });
  }

  const seen = new Set();
  return alerts
    .filter((alert) => alert && alert.label)
    .filter((alert) => {
      const key = alert.id ?? alert.label;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function resolveSessionPricing(session, metadata) {
  const currency = session.priceCurrency ?? metadata.currency ?? 'USD';
  const amount = Number.isFinite(Number(session.priceAmount))
    ? Number(session.priceAmount)
    : Number(metadata.priceAmount ?? 0);
  const priceLabel =
    metadata.pricing?.price ??
    metadata.priceLabel ??
    (amount > 0 ? formatCurrency(amount, currency) : 'Free session');

  return {
    price: priceLabel,
    currency,
    collectedLabel: metadata.pricing?.collectedLabel ?? metadata.collectedLabel ?? null,
    payoutStatus: metadata.pricing?.payoutStatus ?? metadata.revenue?.payoutStatus ?? metadata.payoutStatus ?? null
  };
}

function resolvePreferredSlot(metadata, now = new Date()) {
  if (!metadata) {
    return null;
  }

  const preferred = metadata.preferredSlot ?? metadata.preferred ?? metadata.preferredAt ?? null;
  if (!preferred) {
    return null;
  }

  if (typeof preferred === 'string') {
    const date = normaliseDate(preferred);
    if (date) {
      return formatDateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return preferred;
  }

  if (typeof preferred === 'object') {
    if (preferred.label) {
      return preferred.label;
    }
    const start = normaliseDate(preferred.startAt ?? preferred.start ?? preferred.at ?? null);
    if (start) {
      const timeZone = preferred.timezone ?? preferred.timeZone ?? metadata.timezone ?? 'UTC';
      return formatDateTime(start, { dateStyle: 'medium', timeStyle: 'short', timeZone });
    }
  }

  return null;
}

function resolveBookingSegment(metadata) {
  if (!metadata) {
    return 'General';
  }
  return metadata.segment ?? metadata.cohort ?? metadata.track ?? metadata.program ?? 'General';
}

function parseTagsList(tags) {
  const parsed = safeJsonParse(tags, []);
  if (Array.isArray(parsed)) {
    return parsed.map((tag) => String(tag));
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function summariseReactions(summary) {
  return aggregateReactionSummary(summary).total;
}

function coercePositiveInteger(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function formatGoalStatus(status) {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'On track';
    case 'at-risk':
      return 'Needs attention';
    case 'on-hold':
      return 'On hold';
    case 'planned':
    default:
      return 'Planned';
  }
}

export function buildLearnerDashboard({
  user: _user,
  now = new Date(),
  enrollments = [],
  courses = [],
  courseProgress = [],
  courseGoals = [],
  assignments = [],
  tutorBookings = [],
  tutorAvailability: _tutorAvailability = [],
  liveClassrooms = [],
  instructorDirectory = new Map(),
  ebookProgress = [],
  ebooks = new Map(),
  invoices = [],
  paymentIntents = [],
  paymentMethodsRaw: _paymentMethodsRaw = [],
  billingContactsRaw: _billingContactsRaw = [],
  ebookRecommendations = [],
  communityMemberships = [],
  communityEvents = [],
  communityPipelines = [],
  communitySubscriptions = [],
  followerSummary = {},
  privacySettings = null,
  messagingSummary = null,
  notifications = [],
  libraryEntries = [],
  fieldServiceWorkspace = null,
  financialProfile = null,
  paymentMethods = [],
  billingContacts = [],
  financePurchases = [],
  financeSubscriptions = [],
  systemPreferences = null,
  growthInitiatives = [],
  growthExperimentsByInitiative = new Map(),
  affiliateChannels = [],
  affiliatePayouts = [],
  adCampaigns = [],
  instructorApplication = null,
  supportCases = [],
  supportMetrics = DEFAULT_SUPPORT_METRICS,
  supportKnowledgeBase = DEFAULT_SUPPORT_KB
} = {}) {
  const resolvedCommunityEvents = Array.isArray(communityEvents) ? communityEvents : [];
  const hasSignals =
    enrollments.length ||
    tutorBookings.length ||
    ebookProgress.length ||
    invoices.length ||
    liveClassrooms.length ||
    communityMemberships.length ||
    resolvedCommunityEvents.length ||
    (Array.isArray(notifications) ? notifications.length : 0) ||
    (Array.isArray(supportCases) ? supportCases.length : 0) ||
    (Array.isArray(financePurchases) ? financePurchases.length : 0) ||
    (Array.isArray(financeSubscriptions) ? financeSubscriptions.length : 0) ||
    (Array.isArray(growthInitiatives) ? growthInitiatives.length : 0) ||
    (Array.isArray(affiliateChannels) ? affiliateChannels.length : 0) ||
    (Array.isArray(adCampaigns) ? adCampaigns.length : 0) ||
    (Array.isArray(paymentMethods) ? paymentMethods.length : 0) ||
    (Array.isArray(billingContacts) ? billingContacts.length : 0);

  if (!hasSignals) {
    return null;
  }

  const resolvedPaymentMethods = Array.isArray(paymentMethods)
    ? paymentMethods
    : Array.isArray(financialProfile?.paymentMethods)
      ? financialProfile.paymentMethods
      : [];

  const resolvedBillingContacts = Array.isArray(billingContacts)
    ? billingContacts
    : Array.isArray(financialProfile?.billingContacts)
      ? financialProfile.billingContacts
      : [];

  const growthInitiativesList = Array.isArray(growthInitiatives) ? growthInitiatives : [];
  const growthExperimentsMap =
    growthExperimentsByInitiative instanceof Map
      ? growthExperimentsByInitiative
      : new Map(
          Object.entries(growthExperimentsByInitiative ?? {}).map(([key, value]) => [
            key,
            Array.isArray(value) ? value : []
          ])
        );
  const affiliateChannelsList = Array.isArray(affiliateChannels) ? affiliateChannels : [];
  const affiliatePayoutsList = Array.isArray(affiliatePayouts) ? affiliatePayouts : [];
  const adCampaignsList = Array.isArray(adCampaigns) ? adCampaigns : [];
  const instructorApplicationData = instructorApplication ?? null;
  const supportCasesList = Array.isArray(supportCases) ? supportCases : [];
  const supportMetricsSummary = {
    ...DEFAULT_SUPPORT_METRICS,
    ...(supportMetrics && typeof supportMetrics === 'object' ? supportMetrics : {})
  };
  const knowledgeBaseArticles =
    Array.isArray(supportKnowledgeBase) && supportKnowledgeBase.length
      ? supportKnowledgeBase
      : DEFAULT_SUPPORT_KB;

  const courseMap = new Map();
  const instructorDirectoryMap = ensureMap(instructorDirectory);
  courses.forEach((course) => {
    if (!course || !course.id) return;
    const metadata = safeJsonParse(course.metadata, {});
    courseMap.set(course.id, { ...course, metadata });
  });

  const progressByEnrollment = new Map();
  const completionEntries = [];
  courseProgress.forEach((entry) => {
    if (!entry || !entry.enrollmentId) return;
    const record = progressByEnrollment.get(entry.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null
    };
    record.totalLessons += 1;
    if (entry.completed) {
      record.completedLessons += 1;
      const completedAt = normaliseDate(entry.completedAt);
      if (completedAt && (!record.lastCompletedAt || completedAt > record.lastCompletedAt)) {
        record.lastCompletedAt = completedAt;
      }
      completionEntries.push({
        completedAt,
        durationMinutes: Number(entry.metadata?.studyMinutes ?? entry.metadata?.durationMinutes ?? 30)
      });
    }
    progressByEnrollment.set(entry.enrollmentId, record);
  });

  const storedGoalMap = new Map();
  const storedGoalsNormalised = [];
  const rawCourseGoals = Array.isArray(courseGoals) ? courseGoals : [];
  rawCourseGoals
    .filter((goal) => goal && goal.courseId)
    .forEach((goal) => {
      if (goal.isActive === false) {
        return;
      }

      const courseId = goal.courseId;
      const course = courseMap.get(courseId) ?? null;
      const dueDate = normaliseDate(goal.dueDate ?? goal.metadata?.dueDate);
      const progressPercent = Number.isFinite(Number(goal.progressPercent))
        ? Math.max(0, Math.min(100, Math.round(Number(goal.progressPercent))))
        : null;
      const remainingLessons = Number.isFinite(Number(goal.remainingLessons))
        ? Math.max(0, Math.round(Number(goal.remainingLessons)))
        : null;
      const focusMinutesPerWeek = Number.isFinite(Number(goal.focusMinutesPerWeek))
        ? Math.max(0, Math.round(Number(goal.focusMinutesPerWeek)))
        : null;
      const priority = Number.isFinite(Number(goal.priority))
        ? Math.max(0, Math.round(Number(goal.priority)))
        : 0;

      const statusKey = typeof goal.status === 'string' ? goal.status.toLowerCase() : null;
      const statusLabel = statusKey ? formatGoalStatus(statusKey) : null;

      const normalisedGoal = {
        id: goal.goalUuid ?? goal.id ?? `goal-${courseId}`,
        courseId,
        title: goal.title ?? (course?.title ? `Complete ${course.title}` : 'Learning goal'),
        subtitle:
          goal.subtitle ??
          goal.metadata?.subtitle ??
          (remainingLessons != null
            ? `${remainingLessons} lesson${remainingLessons === 1 ? '' : 's'} remaining`
            : null),
        statusKey,
        status: statusLabel,
        statusLabel,
        remainingLessons,
        focusMinutesPerWeek,
        dueDate: dueDate ? dueDate.toISOString() : null,
        dueLabel: dueDate ? formatRelativeDay(dueDate, now) : goal.metadata?.dueLabel ?? null,
        progressPercent,
        nextStep: goal.metadata?.nextStep ?? goal.metadata?.suggestedAction ?? null,
        priority,
        metadata: goal.metadata ?? {}
      };

      storedGoalMap.set(courseId, normalisedGoal);
      storedGoalsNormalised.push(normalisedGoal);
    });

  const mergeGoals = (baseGoal, storedGoal) => {
    if (!storedGoal) {
      return baseGoal;
    }

    const progressPercent = Number.isFinite(Number(storedGoal.progressPercent))
      ? Math.max(0, Math.min(100, Math.round(Number(storedGoal.progressPercent))))
      : baseGoal.progressPercent;

    const statusKey = storedGoal.statusKey ?? storedGoal.status ?? baseGoal.statusKey ?? null;
    const statusLabel = statusKey ? formatGoalStatus(statusKey) : baseGoal.statusLabel ?? baseGoal.status;

    return {
      ...baseGoal,
      ...storedGoal,
      statusKey,
      status: statusLabel,
      statusLabel,
      dueDate: storedGoal.dueDate ?? baseGoal.dueDate,
      dueLabel: storedGoal.dueLabel ?? baseGoal.dueLabel,
      progressPercent,
      focusMinutesPerWeek: storedGoal.focusMinutesPerWeek ?? baseGoal.focusMinutesPerWeek,
      remainingLessons: storedGoal.remainingLessons ?? baseGoal.remainingLessons,
      nextStep: storedGoal.nextStep ?? baseGoal.nextStep,
      priority: storedGoal.priority ?? baseGoal.priority,
      metadata: { ...(baseGoal.metadata ?? {}), ...(storedGoal.metadata ?? {}) }
    };
  };

  const usedStoredGoalCourseIds = new Set();

  const learningPace = buildLearningPace(completionEntries, now);
  const streak = calculateLearningStreak(completionEntries, now);

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'active');
  const recentEnrollments = activeEnrollments.filter((enrollment) => {
    const startedAt = normaliseDate(enrollment.startedAt);
    if (!startedAt) return false;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    return startedAt >= thirtyDaysAgo;
  });

  const upcomingTutorBookings = tutorBookings
    .map((booking) => ({
      ...booking,
      scheduledStart: normaliseDate(booking.scheduledStart),
      scheduledEnd: normaliseDate(booking.scheduledEnd),
      metadata: safeJsonParse(booking.metadata, {})
    }))
    .filter((booking) =>
      booking.scheduledStart &&
      (booking.status === 'confirmed' || booking.status === 'requested') &&
      booking.scheduledStart >= now
    )
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

  const historicalTutorBookings = tutorBookings
    .map((booking) => ({
      ...booking,
      scheduledStart: normaliseDate(booking.scheduledStart),
      scheduledEnd: normaliseDate(booking.scheduledEnd),
      metadata: safeJsonParse(booking.metadata, {})
    }))
    .filter((booking) => !upcomingTutorBookings.includes(booking));

  const upcomingLiveSessions = liveClassrooms
    .map((session) => ({
      ...session,
      startAt: normaliseDate(session.startAt),
      endAt: normaliseDate(session.endAt)
    }))
    .filter((session) => session.startAt && session.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const tutorAvailability = Array.isArray(_tutorAvailability)
    ? _tutorAvailability
        .map((slot) => ({
          ...slot,
          startAt: normaliseDate(slot.startAt ?? slot.start ?? slot.start_time ?? slot.startsAt),
          endAt: normaliseDate(slot.endAt ?? slot.end ?? slot.end_time ?? slot.endsAt),
          metadata: safeJsonParse(slot.metadata, {})
        }))
        .filter((slot) => slot.startAt && slot.startAt >= now)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    : [];

  const metrics = [
    {
      label: 'Active courses',
      value: `${activeEnrollments.length}`,
      change: recentEnrollments.length ? `+${recentEnrollments.length} started last 30d` : 'Stable'
    },
    {
      label: 'Learning streak',
      value: `${streak.current} day${streak.current === 1 ? '' : 's'}`,
      change: streak.longest ? `Best ${streak.longest} day${streak.longest === 1 ? '' : 's'}` : 'Getting started'
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingTutorBookings.length + upcomingLiveSessions.length}`,
      change: `${historicalTutorBookings.filter((booking) => booking.status === 'completed').length} completed`
    }
  ];

  const computedGoalsByCourse = new Map();

  const activeCourses = activeEnrollments.map((enrollment) => {
    const course = courseMap.get(enrollment.courseId);
    const progress = progressByEnrollment.get(enrollment.id) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null
    };
    const totalLessons = progress.totalLessons || course?.metadata?.totalLessons || 0;
    const completedLessons = progress.completedLessons || 0;
    const progressPercent = Number.isFinite(Number(enrollment.progressPercent))
      ? Number(enrollment.progressPercent)
      : totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
    const nextLesson = totalLessons && completedLessons < totalLessons ? `Lesson ${completedLessons + 1}` : null;
    const lastCompletedAt = progress.lastCompletedAt instanceof Date ? progress.lastCompletedAt : null;
    const lastTouchedLabel = lastCompletedAt ? formatRelativeDay(lastCompletedAt, now) : null;
    const instructorRecord = course?.instructorId ? instructorDirectoryMap.get(course.instructorId) : null;
    const instructorName = instructorRecord
      ? resolveName(instructorRecord.firstName, instructorRecord.lastName, instructorRecord.email)
      : course?.metadata?.instructorName ?? (course?.instructorId ? `Instructor #${course.instructorId}` : 'Instructor');

    const remainingLessons = Math.max(totalLessons - completedLessons, 0);
    const focusMinutesPerWeek = remainingLessons
      ? Math.max(45, Math.min(240, remainingLessons * 45))
      : 45;
    const targetDays = remainingLessons ? Math.max(remainingLessons * 3, 7) : 7;
    const dueDate = new Date(now.getTime() + targetDays * DAY_IN_MS);
    const baseStatusKey =
      progressPercent >= 100
        ? 'completed'
        : remainingLessons <= 2 || progressPercent >= 60
          ? 'in-progress'
          : 'at-risk';

    const baseStatusLabel = formatGoalStatus(baseStatusKey);

    const baseGoal = {
      id: `goal-${enrollment.publicId ?? enrollment.id}`,
      courseId: enrollment.courseId,
      title: course?.title ? `Complete ${course.title}` : 'Course completion goal',
      subtitle:
        remainingLessons
          ? `${remainingLessons} lesson${remainingLessons === 1 ? '' : 's'} remaining`
          : 'Maintain your streak this week',
      statusKey: baseStatusKey,
      status: baseStatusLabel,
      statusLabel: baseStatusLabel,
      remainingLessons,
      focusMinutesPerWeek,
      dueDate: dueDate.toISOString(),
      dueLabel: formatRelativeDay(dueDate, now),
      progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
      nextStep:
        remainingLessons > 0
          ? `Resume lesson ${completedLessons + 1}`
          : 'Celebrate your progress',
      priority: remainingLessons > 3 && progressPercent < 60 ? 1 : 0,
      metadata: { suggestedAction: remainingLessons > 0 ? 'resume-course' : 'reflect-win' }
    };

    const storedGoal = storedGoalMap.get(enrollment.courseId) ?? null;
    const mergedGoal = mergeGoals(baseGoal, storedGoal);
    if (storedGoal) {
      usedStoredGoalCourseIds.add(enrollment.courseId);
    }
    computedGoalsByCourse.set(enrollment.courseId, mergedGoal);

    return {
      id: enrollment.publicId ?? `enrollment-${enrollment.id}`,
      courseId: enrollment.courseId,
      title: course?.title ?? `Course ${enrollment.courseId}`,
      status: enrollment.status,
      progress: Math.max(0, Math.min(100, progressPercent)),
      progressPercent: Math.max(0, Math.min(100, progressPercent)),
      instructor: instructorName,
      nextLesson,
      completedLessons,
      totalLessons,
      lastTouchedAt: lastCompletedAt ? lastCompletedAt.toISOString() : null,
      lastTouchedLabel,
      goalStatus: mergedGoal.statusLabel ?? mergedGoal.status ?? baseGoal.statusLabel,
      goal: mergedGoal
    };
  });

  const learnerGoals = activeEnrollments
    .map((enrollment) => computedGoalsByCourse.get(enrollment.courseId))
    .filter(Boolean);

  const orphanGoals = storedGoalsNormalised.filter(
    (goal) => !usedStoredGoalCourseIds.has(goal.courseId)
  );
  const learnerGoalsCombined = [...learnerGoals, ...orphanGoals];

  const recommendedCourses = courses
    .filter((course) => !activeEnrollments.some((enrollment) => enrollment.courseId === course.id))
    .slice(0, 5)
    .map((course) => ({
      id: course.publicId ?? `course-${course.id}`,
      title: course.title,
      summary: course.summary ?? course.description ?? null,
      rating: course.ratingAverage ? `${course.ratingAverage.toFixed(1)} (${course.ratingCount ?? 0})` : null
    }));

  const { orders: courseOrders, invoices: normalisedInvoices } = normaliseLearnerPayments({
    invoices,
    paymentIntents,
    courseMap,
    now
  });

  const totalInvoiceCents = normalisedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amountCents ?? 0),
    0
  );
  const referralCreditCents = Math.max(1500, Math.round(totalInvoiceCents * 0.08));
  const primaryCourse = activeCourses[0] ?? null;
  const coursePromotions = primaryCourse
    ? [
        {
          id: `learner-referral-${primaryCourse.courseId ?? primaryCourse.id}`,
          courseId: primaryCourse.courseId ?? primaryCourse.id ?? null,
          headline: `Earn ${formatCurrency(referralCreditCents)} in learning credits`,
          body: `Invite a peer to ${primaryCourse.title} and unlock tutoring bonuses when they enrol.`,
          actionLabel: 'Share invite link',
          actionHref: '/dashboard/learner/growth'
        }
      ]
    : [];

  if (coursePromotions.length) {
    const promotionByCourseId = new Map(
      coursePromotions.map((promotion) => [promotion.courseId ?? primaryCourse?.courseId ?? primaryCourse?.id, promotion])
    );
    activeCourses.forEach((course) => {
      const promotion = promotionByCourseId.get(course.courseId ?? course.id);
      if (promotion) {
        course.revenueOpportunity = promotion;
      }
    });
  }

  const microSurvey = (() => {
    if (!primaryCourse && learnerGoalsCombined.length === 0) {
      return null;
    }
    const leadGoal = learnerGoalsCombined[0] ?? null;
    const remainingLessons = leadGoal?.remainingLessons ?? 0;
    return {
      id: 'learner-dashboard-confidence-weekly',
      question: 'How confident do you feel about completing your next lessons this week?',
      description: remainingLessons
        ? `You have ${remainingLessons} lesson${remainingLessons === 1 ? '' : 's'} queued for the week.`
        : 'Keep momentum going by reinforcing what you learned.',
      options: [
        { value: 'ahead', label: 'Ahead of plan', description: 'I could take on more this week.' },
        { value: 'on-track', label: 'On track', description: 'Pacing feels right.' },
        { value: 'need-support', label: 'I need support', description: 'I could use tips or a tutor.' }
      ],
      ctaLabel: 'Share update',
      thankYouMessage: 'Thanks! We will adjust your dashboard tips right away.',
      channel: 'learner-dashboard',
      surface: 'dashboard.home',
      scale: { ahead: 5, 'on-track': 3, 'need-support': 1 },
      courseContext: primaryCourse
        ? { courseId: primaryCourse.courseId ?? primaryCourse.id, title: primaryCourse.title }
        : null,
      suggestedAction: remainingLessons > 0 ? 'resume-course' : 'capture-win',
      secondaryAction: { label: 'Adjust goals', href: '/dashboard/courses' }
    };
  })();

  const communityEngagement = communityMemberships.map((community) => {
    const members = coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0);
    const posts = coercePositiveInteger(community.stats?.posts ?? 0);
    const participation = members ? Math.min(100, Math.round((posts / members) * 100)) : 0;
    return {
      name: community.name ?? `Community ${community.id}`,
      participation
    };
  });

  const learningUpcoming = [];
  upcomingTutorBookings.forEach((booking) => {
    const startAtIso = booking.scheduledStart ? booking.scheduledStart.toISOString() : null;
    const endAtIso = booking.scheduledEnd
      ? booking.scheduledEnd.toISOString()
      : booking.scheduledStart
        ? new Date(booking.scheduledStart.getTime() + booking.durationMinutes * 60 * 1000).toISOString()
        : null;
    const meetingHref = sanitiseDashboardHref(
      booking.meetingUrl ??
        booking.metadata?.meetingUrl ??
        booking.metadata?.joinUrl ??
        booking.metadata?.ctaUrl ??
        booking.metadata?.lobbyUrl ??
        null
    );
    const bookingActionLabel = meetingHref ? 'Join mentor session' : 'View booking';
    const bookingAction = meetingHref
      ? { action: 'join', label: bookingActionLabel, href: meetingHref }
      : { action: 'view', label: bookingActionLabel, href: null };
    learningUpcoming.push({
      id: booking.publicId ?? `tutor-booking-${booking.id}`,
      title: booking.metadata?.topic ?? 'Mentorship session',
      type: 'Mentorship',
      calendarType: 'classroom',
      startAt: startAtIso,
      endAt: endAtIso,
      date: startAtIso,
      host: booking.tutorName
        ? booking.tutorName
        : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
      location: booking.metadata?.location ?? 'Mentor lounge',
      description: booking.metadata?.summary ?? booking.metadata?.notes ?? null,
      resources: booking.metadata?.resources ?? null,
      action: bookingAction,
      actionLabel: bookingActionLabel,
      actionHref: meetingHref,
      dateLabel: formatRelativeDay(booking.scheduledStart, now)
    });
  });

  upcomingLiveSessions.forEach((session) => {
    const metadata = safeJsonParse(session.metadata, {});
    const startAtIso = session.startAt ? session.startAt.toISOString() : null;
    const endDate = session.endAt ?? (session.startAt ? new Date(session.startAt.getTime() + 60 * 60 * 1000) : null);
    const endAtIso = endDate ? endDate.toISOString() : null;
    const facilitators = Array.isArray(metadata.facilitators)
      ? metadata.facilitators
      : metadata.facilitator
        ? [metadata.facilitator]
        : metadata.host
          ? [metadata.host]
          : [];
    const joinHref = sanitiseDashboardHref(
      metadata.joinUrl ??
        metadata.meetingUrl ??
        metadata.streamUrl ??
        metadata.ctaUrl ??
        null
    );
    const checkInHref = sanitiseDashboardHref(metadata.checkInUrl ?? metadata.lobbyUrl ?? joinHref);
    const lobbyHref = sanitiseDashboardHref(
      metadata.lobbyUrl ?? metadata.detailsUrl ?? metadata.pageUrl ?? metadata.url ?? null
    );
    let sessionAction = null;
    if (joinHref || checkInHref) {
      const hoursUntil = startAtIso ? (new Date(startAtIso).getTime() - now.getTime()) / (60 * 60 * 1000) : null;
      const actionableSoon = hoursUntil !== null && hoursUntil <= 1;
      if (actionableSoon || !checkInHref) {
        sessionAction = { action: 'join', label: 'Join live session', href: joinHref ?? checkInHref };
      } else {
        sessionAction = { action: 'check-in', label: 'Check in', href: checkInHref };
      }
    }
    const sessionActionLabel = sessionAction?.label ?? 'View session';
    const sessionActionHref = sessionAction?.href ?? lobbyHref ?? joinHref ?? checkInHref ?? null;
    if (!sessionAction) {
      sessionAction = { action: 'view', label: sessionActionLabel, href: sessionActionHref };
    }
    learningUpcoming.push({
      id: session.publicId ?? `live-session-${session.id ?? crypto.randomUUID()}`,
      title: session.title ?? 'Live classroom',
      type: session.type ?? 'Live classroom',
      calendarType: ['livestream', 'podcast', 'classroom'].includes(String(session.type).toLowerCase())
        ? String(session.type).toLowerCase()
        : 'classroom',
      startAt: startAtIso,
      endAt: endAtIso,
      date: startAtIso,
      host: facilitators.length ? facilitators.join(', ') : metadata.communityName ?? 'Facilitator',
      communityId: session.communityId ?? metadata.communityId ?? null,
      location: metadata.location ?? metadata.room ?? 'Virtual classroom',
      description: metadata.summary ?? metadata.description ?? null,
      resources: metadata.resources ?? metadata.prep ?? null,
      capacity: session.capacity ?? metadata.capacity ?? null,
      timezone: metadata.timezone ?? null,
      stage: metadata.stage ?? 'Live classroom',
      action: sessionAction,
      actionLabel: sessionActionLabel,
      actionHref: sessionActionHref,
      dateLabel: formatRelativeDay(session.startAt, now)
    });
  });

  resolvedCommunityEvents
    .map((event) => ({ ...event, startAt: normaliseDate(event.startAt) }))
    .filter((event) => event.startAt && event.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .forEach((event) => {
      const eventHref = sanitiseDashboardHref(
        event.meetingUrl ??
          event.joinUrl ??
          event.registrationUrl ??
          event.url ??
          event.actionUrl ??
          null
      );
      const eventAction = eventHref
        ? { action: 'join', label: 'View event page', href: eventHref }
        : { action: 'view', label: 'View event details', href: null };
      learningUpcoming.push({
        id: event.id ? `community-event-${event.id}` : `community-event-${event.communityId}`,
        title: event.title ?? 'Community event',
        type: 'Community',
        calendarType: 'event',
        startAt: event.startAt.toISOString(),
        endAt: event.endAt ? new Date(event.endAt).toISOString() : null,
        date: event.startAt.toISOString(),
        host: event.facilitator ?? event.communityName ?? 'Community team',
        communityId: event.communityId ?? null,
        location: event.location ?? 'Community hub',
        description: event.description ?? null,
        resources: event.resources ?? null,
        action: eventAction,
        actionLabel: eventAction.label,
        actionHref: eventHref,
        dateLabel: formatRelativeDay(event.startAt, now)
      });
    });

  normalisedInvoices
    .filter((invoice) => isInvoiceOpen(invoice.status))
    .forEach((invoice) => {
      const invoiceDate = normaliseDate(invoice.date);
      const endAt = invoiceDate ? new Date(invoiceDate.getTime() + 30 * 60 * 1000) : null;
      const invoiceHref = sanitiseDashboardHref(
        invoice.paymentUrl ??
          invoice.actionUrl ??
          invoice.ctaUrl ??
          invoice.href ??
          '/dashboard/learner/financial'
      );
      const invoiceAction = invoiceHref
        ? { action: 'pay', label: 'Pay invoice', href: invoiceHref }
        : { action: 'view', label: 'View invoice', href: '/dashboard/learner/financial' };
      learningUpcoming.push({
        id: invoice.id ?? `invoice-${crypto.randomUUID()}`,
        title: invoice.label ?? 'Invoice payment',
        type: 'Billing',
        calendarType: 'event',
        startAt: invoiceDate ? invoiceDate.toISOString() : null,
        endAt: endAt ? endAt.toISOString() : null,
        date: invoiceDate ? invoiceDate.toISOString() : null,
        host: invoice.currency ?? 'USD',
        location: 'Billing desk',
        description: invoice.reference ? `Reference ${invoice.reference}` : null,
        action: invoiceAction,
        actionLabel: invoiceAction.label,
        actionHref: invoiceAction.href,
        dateLabel: invoiceDate ? formatRelativeDay(invoiceDate, now) : null
      });
    });

  const upcomingUnique = deduplicateByKey(learningUpcoming, (item) =>
    item.id
      ? String(item.id)
      : `${(item.type ?? 'event').toLowerCase()}::${(item.startAt ?? item.date ?? '')}::${
          item.title ?? ''
        }`
  ).sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : a.startAt ? new Date(a.startAt).getTime() : Infinity;
    const bTime = b.date ? new Date(b.date).getTime() : b.startAt ? new Date(b.startAt).getTime() : Infinity;
    return aTime - bTime;
  });

  const calendarEvents = upcomingUnique
    .filter((item) => item.startAt)
    .map((item) => ({
      id: `calendar-${item.id}`,
      title: item.title,
      type: (item.calendarType ?? item.type ?? 'event').toLowerCase(),
      startAt: item.startAt,
      endAt: item.endAt ?? item.startAt,
      location: item.location ?? 'Virtual',
      facilitator: item.host ?? null,
      communityId: item.communityId ?? null,
      description: item.description ?? null,
      resources: item.resources ?? null,
      timezone: item.timezone ?? null,
      capacity: item.capacity ?? null,
      stage: item.stage ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }));

  const activeTutorBookings = upcomingTutorBookings.map((booking) => ({
    id: booking.publicId ?? `tutor-booking-${booking.id}`,
    topic: booking.metadata?.topic ?? 'Mentorship session',
    mentor: booking.tutorName
      ? booking.tutorName
      : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
    date: booking.scheduledStart ? formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    status: booking.status ?? 'confirmed',
    rating: booking.metadata?.rating ?? null
  }));

  const historicalTutorEntries = historicalTutorBookings.map((booking) => ({
    id: booking.publicId ?? `tutor-booking-${booking.id}`,
    topic: booking.metadata?.topic ?? 'Mentorship session',
    mentor: booking.tutorName
      ? booking.tutorName
      : resolveName(booking.tutorFirstName, booking.tutorLastName, 'Tutor'),
    date: booking.scheduledStart ? formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    status: booking.status ?? null,
    rating: booking.metadata?.rating ?? null
  }));

  const formattedLibraryEntries = Array.isArray(libraryEntries)
    ? libraryEntries.map((entry) => {
        const progressValue = Number(entry.progress ?? 0);
        return {
          id: entry.id ?? `library-${crypto.randomUUID()}`,
          title: entry.title ?? 'Library entry',
          format: entry.format ?? 'E-book',
          status: progressValue >= 100 ? 'Completed' : 'In progress',
          progress: progressValue,
          lastOpened: entry.lastOpened ?? null,
          lastOpenedLabel: entry.lastOpened
            ? formatDateTime(entry.lastOpened, { dateStyle: 'medium', timeStyle: 'short' })
            : 'Not opened yet',
          url: entry.url ?? null,
          summary: entry.summary ?? null,
          author: entry.author ?? null,
          coverUrl: entry.coverUrl ?? null,
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
          timeSpent: entry.metadata?.timeSpentSeconds
            ? formatTimeSpent(entry.metadata.timeSpentSeconds)
            : null,
          price: null
        };
      })
    : [];

  const ebookLibrary = formattedLibraryEntries.length
    ? formattedLibraryEntries
    : ebookProgress.map((progress) => {
        const catalogEntry = ebooks.get(progress.assetId) ?? {};
        return {
          id: catalogEntry.id ?? `ebook-${progress.assetId}`,
          title: catalogEntry.title ?? `Ebook ${progress.assetId}`,
          status: progress.progressPercent >= 100 ? 'Completed' : 'In progress',
          progress: Number(progress.progressPercent ?? 0),
          price: formatCurrency(catalogEntry.priceAmount ?? 0, catalogEntry.priceCurrency ?? 'USD'),
          highlights: Number(progress.metadata?.highlights ?? 0),
          bookmarks: Number(progress.metadata?.bookmarks ?? 0),
          timeSpent: formatTimeSpent(progress.timeSpentSeconds)
        };
      });

  const activeSubscriptions = communitySubscriptions.filter((subscription) => subscription.status === 'active');
  const pendingInvoices = normalisedInvoices.filter((invoice) => isInvoiceOpen(invoice.status));

  const financialSummary = [
    {
      label: 'Active subscriptions',
      value: `${activeSubscriptions.length}`,
      change: `${communityMemberships.length} communities`
    },
    {
      label: 'Outstanding invoices',
      value: `${pendingInvoices.length}`,
      change: pendingInvoices.length ? 'Action required' : 'All settled'
    },
    {
      label: 'Mentor sessions',
      value: `${tutorBookings.length}`,
      change: `${activeTutorBookings.length} upcoming`
    }
  ];

  const invoiceEntries = normalisedInvoices.map((invoice) => ({
    id: invoice.id ?? `invoice-${crypto.randomUUID()}`,
    label: invoice.label ?? 'Invoice',
    amount: formatCurrency(invoice.amountCents ?? 0, invoice.currency ?? 'USD'),
    status: invoice.status ?? 'open',
    date: invoice.date ? formatDateTime(invoice.date, { dateStyle: 'medium', timeStyle: undefined }) : null
  }));

  const paymentMethodEntries = resolvedPaymentMethods.map((method) => ({
    id: method.id,
    label: method.label,
    brand: method.brand,
    last4: method.last4,
    expiry: method.expiry,
    primary: Boolean(method.primary)
  }));

  const billingContactEntries = resolvedBillingContacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company
  }));

  const financePreferencesRaw =
    financialProfile?.preferences && typeof financialProfile.preferences === 'object'
      ? financialProfile.preferences
      : {};
  const financialPreferences = {
    autoPay: { enabled: Boolean(financialProfile?.autoPayEnabled) },
    reserveTarget: Math.round(Number(financialProfile?.reserveTargetCents ?? 0) / 100),
    reserveTargetCents: Number(financialProfile?.reserveTargetCents ?? 0),
    currency: financePreferencesRaw.currency ?? 'USD',
    invoiceDelivery: financePreferencesRaw.invoiceDelivery ?? 'email',
    payoutSchedule: financePreferencesRaw.payoutSchedule ?? 'monthly',
    taxId: financePreferencesRaw.taxId ?? null,
    alerts: {
      sendEmail: financePreferencesRaw.alerts?.sendEmail ?? true,
      sendSms: financePreferencesRaw.alerts?.sendSms ?? false,
      escalationEmail: financePreferencesRaw.alerts?.escalationEmail ?? null,
      notifyThresholdPercent: financePreferencesRaw.alerts?.notifyThresholdPercent ?? 80
    },
    documents: Array.isArray(financePreferencesRaw.documents)
      ? financePreferencesRaw.documents
      : [],
    reimbursements:
      financePreferencesRaw.reimbursements && typeof financePreferencesRaw.reimbursements === 'object'
        ? {
            enabled: Boolean(financePreferencesRaw.reimbursements.enabled),
            instructions: financePreferencesRaw.reimbursements.instructions ?? null
          }
        : { enabled: false, instructions: null }
  };

  const financePurchasesList = Array.isArray(financePurchases)
    ? financePurchases.map((purchase) => ({
        id: purchase.id ?? `purchase-${crypto.randomUUID()}`,
        reference: purchase.reference ?? 'Purchase',
        description: purchase.description ?? '',
        amountCents: Number(purchase.amountCents ?? 0),
        amountFormatted: formatCurrency(purchase.amountCents ?? 0, purchase.currency ?? 'USD'),
        currency: purchase.currency ?? 'USD',
        status: purchase.status ?? 'paid',
        purchasedAt: purchase.purchasedAt ?? null,
        purchasedAtLabel:
          purchase.purchasedAtLabel ??
          (purchase.purchasedAt
            ? formatDateTime(purchase.purchasedAt, { dateStyle: 'medium', timeStyle: undefined })
            : 'Pending confirmation'),
        metadata: purchase.metadata ?? {},
        createdAt: purchase.createdAt ?? null,
        updatedAt: purchase.updatedAt ?? null
      }))
    : [];

  const financeSubscriptionsList = Array.isArray(financeSubscriptions)
    ? financeSubscriptions.map((subscription) => ({
        id: subscription.id ?? `subscription-${crypto.randomUUID()}`,
        status: subscription.status ?? 'active',
        provider: subscription.provider ?? null,
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        currentPeriodEndLabel:
          subscription.currentPeriodEndLabel ??
          (subscription.currentPeriodEnd
            ? formatDateTime(subscription.currentPeriodEnd, { dateStyle: 'medium', timeStyle: undefined })
            : null),
        plan: subscription.plan ?? null,
        community: subscription.community ?? null,
        metadata: subscription.metadata ?? {},
        createdAt: subscription.createdAt ?? null,
        updatedAt: subscription.updatedAt ?? null
      }))
    : [];

  const financeSettings = {
    profile: {
      currency: financialPreferences.currency,
      taxId: financialPreferences.taxId,
      invoiceDelivery: financialPreferences.invoiceDelivery,
      payoutSchedule: financialPreferences.payoutSchedule,
      autoPayEnabled: Boolean(financialPreferences.autoPay?.enabled),
      reserveTarget: financialPreferences.reserveTarget,
      reserveTargetCents: financialPreferences.reserveTargetCents
    },
    alerts: { ...DEFAULT_FINANCE_ALERTS, ...(financialPreferences.alerts ?? {}) },
    purchases: financePurchasesList,
    subscriptions: financeSubscriptionsList,
    documents: financialPreferences.documents ?? [],
    reimbursements: financialPreferences.reimbursements ?? { enabled: false, instructions: null }
  };

  const systemSettings = normaliseSystemPreferences(systemPreferences);

  const notificationsList = Array.isArray(notifications) ? [...notifications] : [];
  activeTutorBookings.forEach((booking) => {
    notificationsList.push({
      id: `notification-booking-${booking.id}`,
      title: `Upcoming session with ${booking.mentor}`,
      timestamp: booking.date,
      type: 'mentor'
    });
  });
  pendingInvoices.forEach((invoice) => {
    notificationsList.push({
      id: `notification-invoice-${invoice.id}`,
      title: `${invoice.label ?? 'Invoice'} due`,
      timestamp: invoice.date,
      type: 'billing'
    });
  });

  const learnerFieldServices = fieldServiceWorkspace?.customer ?? null;
  const fieldServiceAssignments = Array.isArray(learnerFieldServices?.assignments)
    ? learnerFieldServices.assignments
    : [];
  const fieldServiceSearchEntries = Array.isArray(fieldServiceWorkspace?.searchIndex)
    ? fieldServiceWorkspace.searchIndex.filter((entry) => entry.role === 'learner')
    : [];

  const growthInitiativesDetailed = growthInitiativesList.map((initiative) => ({
      id: initiative.id,
      slug: initiative.slug,
      title: initiative.title,
      status: initiative.status,
      objective: initiative.objective,
      primaryMetric: initiative.primaryMetric,
      baselineValue: initiative.baselineValue,
      targetValue: initiative.targetValue,
      currentValue: initiative.currentValue,
      startAt: initiative.startAt,
      endAt: initiative.endAt,
      tags: initiative.tags,
      experiments: (growthExperimentsMap.get(initiative.id) ?? []).map((experiment) => ({
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        hypothesis: experiment.hypothesis,
        metric: experiment.metric,
        baselineValue: experiment.baselineValue,
        targetValue: experiment.targetValue,
        resultValue: experiment.resultValue,
        startAt: experiment.startAt,
        endAt: experiment.endAt,
        segments: experiment.segments
      }))
  }));

  const totalGrowthExperiments = growthInitiativesDetailed.reduce(
    (count, initiative) => count + (initiative.experiments?.length ?? 0),
    0
  );

  const growthSection = {
    initiatives: growthInitiativesDetailed,
    metrics: [
      {
        label: 'Active initiatives',
        value: growthInitiativesDetailed.filter((item) => item.status === 'active').length
      },
      { label: 'Experiments running', value: totalGrowthExperiments },
      {
        label: 'Targets hitting',
        value: growthInitiativesDetailed.filter(
          (initiative) =>
            initiative.currentValue != null &&
            initiative.targetValue != null &&
            Number(initiative.currentValue) >= Number(initiative.targetValue)
        ).length
      }
    ]
  };

  const affiliateChannelsDetailed = affiliateChannelsList.map((channel) => {
    const payouts = affiliatePayoutsList.filter((payout) => payout.channelId === channel.id);
    const outstandingCents = Math.max(0, channel.totalEarningsCents - channel.totalPaidCents);
    const nextPayout = payouts
      .filter((payout) => payout.status === 'scheduled' || payout.status === 'processing')
      .sort((a, b) => {
        const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      })[0];
    return {
      id: channel.id,
      platform: channel.platform,
      handle: channel.handle,
      referralCode: channel.referralCode,
      trackingUrl: channel.trackingUrl,
      status: channel.status,
      commissionRateBps: channel.commissionRateBps,
      totalEarningsFormatted: formatCurrency(channel.totalEarningsCents),
      totalPaidFormatted: formatCurrency(channel.totalPaidCents),
      outstandingFormatted: formatCurrency(outstandingCents),
      notes: channel.notes,
      performance: channel.performance,
      nextPayout: nextPayout
        ? {
            amount: formatCurrency(nextPayout.amountCents, nextPayout.currency),
            scheduledAt: nextPayout.scheduledAt,
            status: nextPayout.status
          }
        : null
    };
  });

  const affiliateSection = {
    channels: affiliateChannelsDetailed,
    payouts: affiliatePayoutsList.map((payout) => ({
      id: payout.id,
      channelId: payout.channelId,
      amount: formatCurrency(payout.amountCents, payout.currency),
      status: payout.status,
      scheduledAt: payout.scheduledAt,
      processedAt: payout.processedAt,
      reference: payout.reference
    })),
    summary: {
      totalChannels: affiliateChannelsDetailed.length,
      activeChannels: affiliateChannelsDetailed.filter((channel) => channel.status === 'active').length,
      outstanding: formatCurrency(
        affiliateChannelsList.reduce(
          (total, channel) => total + Math.max(0, channel.totalEarningsCents - channel.totalPaidCents),
          0
        )
      )
    }
  };

  const adCampaignsDetailed = adCampaignsList.map((campaign) => {
    const metrics = campaign.metrics && typeof campaign.metrics === 'object' ? campaign.metrics : {};
    const targeting = campaign.targeting && typeof campaign.targeting === 'object' ? campaign.targeting : {};
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: formatCurrency(campaign.dailyBudgetCents),
      dailyBudgetCents: Number(campaign.dailyBudgetCents ?? 0),
      totalSpend: formatCurrency(campaign.totalSpendCents),
      totalSpendCents: Number(campaign.totalSpendCents ?? 0),
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      lastSyncedAt: campaign.lastSyncedAt,
      metrics: {
        impressions: Number(metrics.impressions ?? metrics.totals?.impressions ?? 0),
        clicks: Number(metrics.clicks ?? metrics.totals?.clicks ?? 0),
        conversions: Number(metrics.conversions ?? metrics.totals?.conversions ?? 0),
        spendCents: Number(metrics.spendCents ?? metrics.totals?.spendCents ?? 0),
        revenueCents: Number(metrics.revenueCents ?? metrics.totals?.revenueCents ?? 0),
        ctr: metrics.ctr ?? metrics.averageCtr ?? null,
        cpc: metrics.cpc ?? metrics.cpcCents ?? null,
        cpa: metrics.cpa ?? metrics.cpaCents ?? null,
        roas: metrics.roas ?? null,
        lastSyncedAt: metrics.lastSyncedAt ?? campaign.lastSyncedAt ?? null
      },
      targeting: {
        keywords: Array.isArray(targeting.keywords) ? targeting.keywords : [],
        audiences: Array.isArray(targeting.audiences) ? targeting.audiences : [],
        locations: Array.isArray(targeting.locations) ? targeting.locations : [],
        languages: Array.isArray(targeting.languages) ? targeting.languages : [],
        summary: targeting.summary ?? ''
      },
      creative: campaign.creative && typeof campaign.creative === 'object'
        ? {
            headline: campaign.creative.headline ?? 'Untitled creative',
            description: campaign.creative.description ?? '',
            url: campaign.creative.url ?? null
          }
        : { headline: 'Untitled creative', description: '', url: null },
      placements: Array.isArray(campaign.placements) ? campaign.placements : []
    };
  });

  const adsCurrency = adCampaignsList.find((campaign) => campaign.currency)?.currency ??
    adCampaignsList[0]?.currency ??
    'USD';

  const adsSection = {
    campaigns: adCampaignsDetailed,
    summary: {
      activeCampaigns: adCampaignsDetailed.filter((campaign) => campaign.status === 'active').length,
      totalSpend: formatCurrency(
        adCampaignsList.reduce((total, campaign) => total + (campaign.totalSpendCents ?? 0), 0),
        adsCurrency
      ),
      averageDailyBudget: adCampaignsList.length
        ? formatCurrency(
            Math.round(
              adCampaignsList.reduce((total, campaign) => total + (campaign.dailyBudgetCents ?? 0), 0) /
                adCampaignsList.length
            ),
            adsCurrency
          )
        : formatCurrency(0, adsCurrency)
    }
  };

  const instructorApplicationDetails = instructorApplicationData
    ? {
        id: instructorApplicationData.id,
        status: instructorApplicationData.status,
        stage: instructorApplicationData.stage,
        motivation: instructorApplicationData.motivation,
        portfolioUrl: instructorApplicationData.portfolioUrl,
        experienceYears: instructorApplicationData.experienceYears,
        teachingFocus: instructorApplicationData.teachingFocus,
        availability: instructorApplicationData.availability,
        marketingAssets: instructorApplicationData.marketingAssets,
        submittedAt: instructorApplicationData.submittedAt,
        reviewedAt: instructorApplicationData.reviewedAt,
        decisionNote: instructorApplicationData.decisionNote
      }
    : null;

  const teachSection = {
    application: instructorApplicationDetails,
    status: instructorApplicationDetails?.status ?? 'draft',
    nextSteps: (() => {
      if (!instructorApplicationDetails) {
        return [
          'Complete your instructor application to access cohort production resources.',
          'Prepare a portfolio link that highlights flagship teaching moments.'
        ];
      }
      if (instructorApplicationDetails.status === 'submitted') {
        return [
          'Our partnerships team is reviewing your submission.',
          'Expect an interview scheduling link within 48 hours.'
        ];
      }
      if (instructorApplicationDetails.status === 'interview') {
        return [
          'Confirm your cohort launch availability and desired curriculum focus.',
          'Upload marketing assets to accelerate go-to-market planning.'
        ];
      }
      if (instructorApplicationDetails.status === 'approved') {
        return [
          'Schedule onboarding workshop with curriculum producers.',
          'Share campaign creative for Edulure Ads placement.'
        ];
      }
      if (instructorApplicationDetails.status === 'rejected') {
        return [
          'Review decision notes and request feedback from the instructor partnerships team.'
        ];
      }
      return [
        'Document your teaching motivation and curriculum outcomes.',
        'Add marketing assets to strengthen your application.'
      ];
    })()
  };

  const privacy = normalisePrivacySettings(privacySettings);

  const messaging = {
    unreadThreads: toPositiveInteger(messagingSummary?.unreadThreads),
    notificationsEnabled: messagingSummary?.notificationsEnabled !== false
  };

  const communityNameMap = new Map();
  communityMemberships.forEach((community) => {
    if (!community) return;
    communityNameMap.set(community.id, community.name ?? `Community ${community.id}`);
  });

  const communitySettings = communityMemberships.map((community) => ({
    id: `community-setting-${community.id}`,
    name: community.name ?? `Community ${community.id}`,
    role: community.membership?.role ?? 'member',
    status: community.membership?.status ?? 'active'
  }));

  const followerSection = {
    followers: followerSummary.followers ?? 0,
    following: followerSummary.following ?? 0,
    pending: Array.isArray(followerSummary.pending) ? followerSummary.pending : [],
    outgoing: Array.isArray(followerSummary.outgoing) ? followerSummary.outgoing : [],
    recommendations: Array.isArray(followerSummary.recommendations) ? followerSummary.recommendations : []
  };

  const activeCourseProgressMap = new Map();
  activeCourses.forEach((course) => {
    if (course.courseId) {
      activeCourseProgressMap.set(course.courseId, course);
    }
  });

  const activeEnrollmentsByCourse = new Map();
  activeEnrollments.forEach((enrollment) => {
    const list = activeEnrollmentsByCourse.get(enrollment.courseId) ?? [];
    list.push(enrollment);
    activeEnrollmentsByCourse.set(enrollment.courseId, list);
  });

  const assignmentsTimeline = { upcoming: [], overdue: [], completed: [] };
  const courseAssessmentSummaries = new Map();
  const analyticsByType = new Map();
  const resourceRecommendations = new Set();
  const studyPlanBlocks = [];
  const scheduleEvents = [];
  const gradingQueue = [];
  const flaggedQueue = [];

  let dueSoonCount = 0;
  let completedCount = 0;
  let overdueCount = 0;
  let pendingReviewCount = 0;
  let totalLeadTimeDays = 0;
  let leadTimeSamples = 0;

  assignments.forEach((assignment) => {
    if (!assignment) return;
    const course = courseMap.get(assignment.courseId);
    const metadata = assignment.metadata ?? {};
    const enrollmentsForCourse = activeEnrollmentsByCourse.get(assignment.courseId) ?? [];
    let dueDate = null;
    enrollmentsForCourse.forEach((enrollment) => {
      const candidate = resolveLearnerAssignmentDueDate({ assignment, course, enrollment });
      if (candidate && (!dueDate || candidate < dueDate)) {
        dueDate = candidate;
      }
    });
    if (!dueDate) {
      const fallbackDue = resolveLearnerAssignmentDueDate({ assignment, course, enrollment: null });
      if (fallbackDue) {
        dueDate = fallbackDue;
      }
    }

    const statusLabel = String(metadata.status ?? metadata.state ?? '').toLowerCase();
    const completed = Boolean(
      metadata.completed ||
        metadata.graded ||
        statusLabel.includes('graded') ||
        statusLabel.includes('complete') ||
        statusLabel === 'closed'
    );
    const requiresReview = Boolean(metadata.requiresReview || statusLabel.includes('review'));
    const asyncGradingRequested = Boolean(
      metadata.asyncGrading === true ||
        metadata.workflow === 'instructor-review' ||
        metadata.gradingMode === 'manual'
    );
    if (requiresReview) {
      pendingReviewCount += 1;
    }
    const flagged = Array.isArray(metadata.flags) && metadata.flags.length > 0;
    const submitted = Boolean(
      metadata.submitted ||
        metadata.lastSubmissionAt ||
        (Array.isArray(metadata.submissions) && metadata.submissions.length > 0)
    );

    const rawScore = Number(metadata.score ?? metadata.latestScore ?? metadata.result?.score);
    const maxScore = Number(metadata.maxScore ?? assignment.maxScore ?? metadata.totalScore ?? 0);
    const scorePercent = Number.isFinite(rawScore) && Number.isFinite(maxScore) && maxScore > 0
      ? Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100)))
      : null;

    const typeLabel = metadata.type ?? metadata.category ?? 'Assessment';
    const dueLabel = dueDate ? formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD';
    const dueInLabel = dueDate ? formatRelativeDay(dueDate, now) : null;

    let timelineStatus = 'Scheduled';
    if (completed) {
      timelineStatus = 'Completed';
      completedCount += 1;
    } else if (dueDate && dueDate.getTime() < now.getTime()) {
      timelineStatus = 'Overdue';
      overdueCount += 1;
    } else if (dueDate && dueDate.getTime() - now.getTime() <= 3 * DAY_IN_MS) {
      timelineStatus = 'Due soon';
      dueSoonCount += 1;
    } else if (submitted) {
      timelineStatus = 'Submitted';
    }

    if (dueDate) {
      const leadDays = Math.round((dueDate.getTime() - now.getTime()) / DAY_IN_MS);
      if (Number.isFinite(leadDays)) {
        totalLeadTimeDays += leadDays;
        leadTimeSamples += 1;
      }
      scheduleEvents.push({
        id: `assessment-${assignment.id ?? crypto.randomUUID()}`,
        title: assignment.title ?? 'Assessment',
        date: dueLabel
      });
    }

    const timelineEntry = {
      id: assignment.id ?? `assignment-${crypto.randomUUID()}`,
      title: assignment.title ?? 'Assessment',
      course: course?.title ?? (assignment.courseId ? `Course ${assignment.courseId}` : 'Course'),
      due: dueLabel,
      dueIn: dueInLabel,
      status: timelineStatus,
      type: typeLabel,
      mode: metadata.mode ?? metadata.format ?? 'Assessment',
      weight: metadata.weight ? `${metadata.weight}%` : metadata.difficulty ?? null,
      score: scorePercent !== null ? `${scorePercent}%` : null,
      submissionUrl: metadata.submissionUrl ?? metadata.links?.submission ?? null,
      recommended: metadata.recommended ?? metadata.prepNotes ?? null
    };

    if (timelineStatus === 'Completed') {
      assignmentsTimeline.completed.push(timelineEntry);
    } else if (timelineStatus === 'Overdue') {
      assignmentsTimeline.overdue.push(timelineEntry);
    } else {
      assignmentsTimeline.upcoming.push(timelineEntry);
    }

    const summaryKey = assignment.courseId ?? crypto.randomUUID();
    const courseSummary = courseAssessmentSummaries.get(summaryKey) ?? {
      id: course?.publicId ?? `course-${summaryKey}`,
      name: course?.title ?? `Course ${summaryKey}`,
      progress: (() => {
        const courseProgressEntry = activeCourseProgressMap.get(assignment.courseId);
        if (courseProgressEntry) {
          return `${courseProgressEntry.progress}% complete`;
        }
        return course?.status ? `${course.status}` : 'Active';
      })(),
      status: course?.status ?? 'active',
      upcoming: 0,
      awaitingFeedback: 0,
      overdue: 0,
      completed: 0,
      scores: []
    };

    if (timelineStatus === 'Completed') {
      courseSummary.completed += 1;
    } else if (timelineStatus === 'Overdue') {
      courseSummary.overdue += 1;
    } else {
      courseSummary.upcoming += 1;
    }
    if (requiresReview) {
      courseSummary.awaitingFeedback += 1;
    }
    if (scorePercent !== null) {
      courseSummary.scores.push(scorePercent);
    }
    courseAssessmentSummaries.set(summaryKey, courseSummary);

    const analyticsEntry = analyticsByType.get(typeLabel) ?? { type: typeLabel, count: 0, scores: [] };
    analyticsEntry.count += 1;
    if (scorePercent !== null) {
      analyticsEntry.scores.push(scorePercent);
    }
    analyticsByType.set(typeLabel, analyticsEntry);

    if (Array.isArray(metadata.resources)) {
      metadata.resources.filter(Boolean).forEach((resource) => resourceRecommendations.add(resource));
    } else if (typeof metadata.resources === 'string') {
      metadata.resources
        .split(',')
        .map((resource) => resource.trim())
        .filter(Boolean)
        .forEach((resource) => resourceRecommendations.add(resource));
    }
    if (metadata.prepMaterial) {
      resourceRecommendations.add(metadata.prepMaterial);
    }

    if (!completed && dueDate) {
      const durationMinutes = Number(metadata.studyMinutes ?? metadata.estimatedMinutes ?? 90);
      const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 90;
      const start = new Date(Math.max(now.getTime() + 30 * 60 * 1000, dueDate.getTime() - 24 * 60 * 60 * 1000));
      const end = new Date(start.getTime() + safeDuration * 60 * 1000);
      const materials = Array.isArray(metadata.resources)
        ? metadata.resources
        : typeof metadata.resources === 'string'
          ? metadata.resources
              .split(',')
              .map((resource) => resource.trim())
              .filter(Boolean)
          : metadata.prepMaterial
            ? [metadata.prepMaterial]
            : [];

      studyPlanBlocks.push({
        id: `study-${assignment.id ?? crypto.randomUUID()}`,
        focus: `Prep: ${assignment.title ?? 'Assessment'}`,
        course: course?.title ?? (assignment.courseId ? `Course ${assignment.courseId}` : 'Course'),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        durationMinutes: safeDuration,
        mode: metadata.studyMode ?? 'Deep work',
        materials,
        submissionUrl: metadata.submissionUrl ?? metadata.links?.submission ?? null,
        notes: metadata.studyNotes ?? metadata.summary ?? (assignment.instructions ? String(assignment.instructions).slice(0, 160) : ''),
        status: 'scheduled'
      });
    }

    if (requiresReview && asyncGradingRequested) {
      gradingQueue.push({
        id: assignment.id ?? `assignment-${crypto.randomUUID()}`,
        title: assignment.title ?? 'Assessment',
        course: course?.title ?? (assignment.courseId ? `Course ${assignment.courseId}` : 'Course'),
        pending: 'Awaiting review',
        lastSubmission: metadata.lastSubmissionAt ? formatRelativeDay(metadata.lastSubmissionAt, now) : 'Queued',
        due: dueLabel
      });
    }
    if (flagged) {
      flaggedQueue.push({
        id: assignment.id ?? `assignment-${crypto.randomUUID()}`,
        title: assignment.title ?? 'Assessment',
        flagged: 'Flagged',
        status: dueLabel
      });
    }
  });

  const courseAssessments = Array.from(courseAssessmentSummaries.values()).map((summary) => ({
    id: summary.id,
    name: summary.name,
    progress: summary.progress,
    status: summary.status,
    upcoming: summary.upcoming,
    awaitingFeedback: summary.awaitingFeedback,
    overdue: summary.overdue,
    averageScore:
      summary.scores.length > 0
        ? `${Math.round(summary.scores.reduce((sum, value) => sum + value, 0) / summary.scores.length)}%`
        : '—'
  }));

  const analyticsByTypeList = Array.from(analyticsByType.values()).map((entry) => ({
    type: entry.type,
    count: entry.count,
    averageScore:
      entry.scores.length > 0
        ? Math.round(entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length)
        : null
  }));

  const studyPlan = studyPlanBlocks
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 12);

  const scheduleEventList = scheduleEvents
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 12);

  ebookRecommendations
    .map((rec) => (typeof rec === 'string' ? rec : rec?.title))
    .filter(Boolean)
    .forEach((title) => resourceRecommendations.add(title));

  const resourcesList = Array.from(resourceRecommendations).slice(0, 12);

  const averageLeadTime = leadTimeSamples ? Math.max(0, Math.round(totalLeadTimeDays / leadTimeSamples)) : null;
  const workloadWeight = assignments.length
    ? Math.min(
        100,
        Math.round(((assignmentsTimeline.upcoming.length + assignmentsTimeline.overdue.length) / assignments.length) * 100)
      )
    : 0;

  const assessmentsSection = {
    overview: [
      { id: 'assessments-upcoming', label: 'Upcoming assessments', value: `${assignmentsTimeline.upcoming.length}` },
      { id: 'assessments-due-soon', label: 'Due soon', value: `${dueSoonCount}` },
      { id: 'assessments-overdue', label: 'Overdue assessments', value: `${overdueCount}` },
      { id: 'assessments-completed', label: 'Completed assessments', value: `${completedCount}` }
    ],
    timeline: assignmentsTimeline,
    courses: courseAssessments,
    schedule: {
      studyPlan,
      events: scheduleEventList
    },
    analytics: {
      byType: analyticsByTypeList,
      pendingReviews: pendingReviewCount,
      overdue: overdueCount,
      averageLeadTimeDays: averageLeadTime,
      workloadWeight
    },
    resources: resourcesList,
    grading: {
      queue: gradingQueue.slice(0, 10),
      flagged: flaggedQueue.slice(0, 10)
    }
  };

  const managedCommunities = communityMemberships.map((community) => {
    const initiatives = [];
    if (coercePositiveInteger(community.stats?.resources ?? 0)) {
      initiatives.push(`${community.stats.resources} curated resources`);
    }
    if (coercePositiveInteger(community.stats?.posts ?? 0)) {
      initiatives.push(`${community.stats.posts} posts last 30d`);
    }
    if (coercePositiveInteger(community.stats?.channels ?? 0)) {
      initiatives.push(`${community.stats.channels} channels`);
    }
    if (initiatives.length === 0) {
      initiatives.push('Build momentum with new programmes');
    }

    return {
      id: community.id ? `community-${community.id}` : crypto.randomUUID(),
      communityId: community.id ?? null,
      slug: community.slug ?? null,
      name: community.name ?? `Community ${community.id}`,
      members: `${coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0)} members`,
      moderators: coercePositiveInteger(community.stats?.moderators ?? 0),
      health: community.stats?.lastActivityAt ? 'Healthy' : 'New',
      initiatives,
      role: community.membership?.role ?? null,
      metadata: { lastActivityAt: community.stats?.lastActivityAt }
    };
  });

  const pipelineEntries = [...communityPipelines];
  resolvedCommunityEvents
    .filter((event) => event.startAt && event.capacity)
    .forEach((event) => {
      const capacity = coercePositiveInteger(event.capacity);
      const reserved = coercePositiveInteger(event.reservedSeats ?? event.attendanceCount ?? 0);
      const progress = capacity ? Math.min(100, Math.round((reserved / capacity) * 100)) : 0;
      pipelineEntries.push({
        id: `pipeline-event-${event.id ?? event.title}`,
        title: event.title ?? 'Live classroom',
        owner: event.facilitator ?? 'Community ops',
        progress
      });
    });

  const liveSessionsDetailed = liveClassrooms.map((session) => {
    const metadata = safeJsonParse(session.metadata, {});
    const startAt = normaliseDate(session.startAt);
    const endAt = normaliseDate(session.endAt) ?? (startAt ? new Date(startAt.getTime() + 60 * 60 * 1000) : null);
    const facilitators = Array.isArray(metadata.facilitators)
      ? metadata.facilitators
      : metadata.facilitator
        ? [metadata.facilitator]
        : metadata.host
          ? [metadata.host]
          : [];
    const occupancyReserved = Number(metadata.reservedSeats ?? metadata.registrationCount ?? session.reservedSeats ?? 0);
    const occupancyCapacity = Number(metadata.capacity ?? session.capacity ?? 0);
    const occupancyRate = occupancyCapacity
      ? Math.min(100, Math.round((occupancyReserved / occupancyCapacity) * 100))
      : null;
    const securityMeta = metadata.security ?? {};
    const whiteboardMeta = metadata.whiteboard ?? {};
    const stage = metadata.stage ?? (session.type ? String(session.type).replace(/_/g, ' ') : 'Live classroom');
    const communityId = session.communityId ?? metadata.communityId ?? null;
    const communityName = communityId ? communityNameMap.get(communityId) ?? `Community ${communityId}` : metadata.communityName;
    const joinHref = sanitiseDashboardHref(
      metadata.joinUrl ??
        metadata.meetingUrl ??
        metadata.streamUrl ??
        metadata.ctaUrl ??
        null
    );
    const checkInHref = sanitiseDashboardHref(metadata.checkInUrl ?? metadata.lobbyUrl ?? joinHref);
    const lobbyHref = sanitiseDashboardHref(
      metadata.lobbyUrl ?? metadata.detailsUrl ?? metadata.pageUrl ?? metadata.url ?? null
    );

    const nowTime = now.getTime();
    const startTime = startAt ? startAt.getTime() : null;
    const endTime = endAt ? endAt.getTime() : null;
    let phase = session.status ? String(session.status).toLowerCase() : 'scheduled';
    if (startTime && endTime) {
      if (nowTime >= startTime && nowTime <= endTime) {
        phase = 'live';
      } else if (startTime > nowTime) {
        phase = 'scheduled';
      } else if (endTime < nowTime) {
        phase = 'completed';
      }
    }

    let callToAction = null;
    if (phase === 'live') {
      callToAction = { action: 'join', label: 'Join session', enabled: true, href: joinHref ?? checkInHref ?? lobbyHref };
    } else if (phase === 'scheduled') {
      const hoursUntil = startTime ? (startTime - nowTime) / (60 * 60 * 1000) : null;
      const isSoon = hoursUntil !== null && hoursUntil <= 1;
      const scheduledHref = isSoon ? joinHref ?? checkInHref ?? lobbyHref : checkInHref ?? joinHref ?? lobbyHref;
      callToAction = {
        action: isSoon ? 'join' : 'check-in',
        label: isSoon ? 'Join session' : 'Check in',
        enabled: true,
        href: scheduledHref ?? null
      };
    }

    const whiteboard = {
      template: whiteboardMeta.template ?? whiteboardMeta.name ?? stage,
      summary: whiteboardMeta.summary ?? whiteboardMeta.description ?? null,
      lastUpdatedLabel: whiteboardMeta.updatedAt ? formatRelativeDay(whiteboardMeta.updatedAt, now) : null,
      ready: whiteboardMeta.ready !== false,
      url: whiteboardMeta.url ?? null,
      notes: Array.isArray(whiteboardMeta.notes)
        ? whiteboardMeta.notes.map((note) => String(note)).filter((note) => note.length > 0)
        : []
    };

    const attendanceCheckpointsRaw = Array.isArray(metadata.attendanceCheckpoints)
      ? metadata.attendanceCheckpoints
      : [];
    const attendanceCheckpoints = attendanceCheckpointsRaw
      .slice(-5)
      .map((checkpoint, index) => {
        const recordedAtIso = checkpoint.recordedAt ?? checkpoint.timestamp ?? null;
        const recordedAtDate = recordedAtIso ? new Date(recordedAtIso) : null;
        return {
          id:
            checkpoint.id ??
            `${session.id ?? session.publicId ?? crypto.randomUUID?.() ?? 'checkpoint'}-${index}`,
          type: checkpoint.type ?? 'attendance',
          source: checkpoint.source ?? null,
          userId: checkpoint.userId ?? null,
          recordedAt: recordedAtDate ? recordedAtDate.toISOString() : null,
          recordedLabel: recordedAtDate ? formatRelativeDay(recordedAtDate, now) : null
        };
      });

    const attendanceAnalytics = metadata.attendanceAnalytics ?? {};
    const lastRawCheckpoint =
      attendanceCheckpointsRaw.length > 0
        ? attendanceCheckpointsRaw[attendanceCheckpointsRaw.length - 1]
        : null;
    const lastRecordedIso = attendanceAnalytics.lastRecordedAt ?? lastRawCheckpoint?.recordedAt ?? null;
    const lastRecordedDate = lastRecordedIso ? new Date(lastRecordedIso) : null;
    const attendanceTotal = Number.isFinite(Number(attendanceAnalytics.total))
      ? Number(attendanceAnalytics.total)
      : attendanceCheckpointsRaw.length;

    const breakoutRooms = Array.isArray(metadata.breakoutRooms)
      ? metadata.breakoutRooms.map((room, index) => ({
          name: room?.name ?? `Room ${index + 1}`,
          capacity: room?.capacity ?? null
        }))
      : [];

    const sessionSnapshots = Array.isArray(whiteboardMeta.snapshots)
      ? whiteboardMeta.snapshots
          .map((snapshot, index) => ({
            id: `${session.id ?? crypto.randomUUID()}-snapshot-${index}`,
            template: snapshot?.template ?? whiteboard.template ?? stage,
            summary: snapshot?.summary ?? snapshot?.description ?? 'Latest collaborative updates shared.',
            updatedAt: snapshot?.updatedAt ? formatRelativeDay(snapshot.updatedAt, now) : 'Moments ago'
          }))
      : whiteboard.template
        ? [
            {
              id: `${session.id ?? crypto.randomUUID()}-snapshot`,
              template: whiteboard.template,
              summary: whiteboard.summary ?? `Templates prepared for ${stage}.`,
              updatedAt: whiteboard.lastUpdatedLabel ?? 'Ready'
            }
          ]
        : [];

    const security = {
      waitingRoom: securityMeta.waitingRoom !== false,
      passcodeRequired: securityMeta.passcodeRequired !== false
    };

    const resources = resolveSessionResources(metadata, joinHref, lobbyHref);
    const support = resolveSessionSupport(metadata, facilitators);
    const alerts = resolveSessionAlerts({ occupancyRate, metadata, security, now });
    const pricing = resolveSessionPricing(session, metadata);
    const links = {
      join: joinHref ?? null,
      checkIn: checkInHref ?? null,
      lobby: lobbyHref ?? null
    };

    const readinessStatuses = [
      {
        id: `${session.id ?? crypto.randomUUID()}-whiteboard`,
        label: `${session.title ?? 'Session'} whiteboard`,
        status: whiteboard.ready ? 'ready' : 'attention',
        owner: facilitators[0] ?? 'Facilitator'
      },
      {
        id: `${session.id ?? crypto.randomUUID()}-security`,
        label: `${session.title ?? 'Session'} security`,
        status: security.waitingRoom && security.passcodeRequired ? 'ready' : 'attention',
        owner: securityMeta.owner ?? 'Classroom ops'
      }
    ];

    return {
      id: session.id ?? session.publicId ?? crypto.randomUUID(),
      title: session.title ?? 'Live classroom',
      stage,
      startLabel: startAt ? formatDateTime(startAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'TBC',
      timezone: metadata.timezone ?? 'UTC',
      community: communityName ?? metadata.community ?? 'Learner community',
      communityId,
      summary: metadata.summary ?? metadata.description ?? null,
      occupancy: {
        reserved: occupancyReserved,
        capacity: occupancyCapacity,
        rate: occupancyRate
      },
      callToAction,
      status: phase,
      whiteboard,
      facilitators,
      breakoutRooms,
      security,
      resources,
      support,
      alerts,
      pricing,
      links,
      currency: metadata.currency ?? 'USD',
      eventId: metadata.eventId ?? session.publicId ?? session.id,
      startAt,
      endAt,
      metadata,
      attendance: {
        total: attendanceTotal,
        lastRecordedAt: lastRecordedDate ? lastRecordedDate.toISOString() : null,
        lastRecordedLabel: lastRecordedDate ? formatRelativeDay(lastRecordedDate, now) : null,
        checkpoints: attendanceCheckpoints
      },
      whiteboardSnapshots: sessionSnapshots,
      readiness: readinessStatuses
    };
  });

  liveSessionsDetailed.sort((a, b) => {
    if (!a.startAt || !b.startAt) return 0;
    return a.startAt.getTime() - b.startAt.getTime();
  });

  const activeSessions = liveSessionsDetailed.filter((session) => session.status === 'live');
  const upcomingSessions = liveSessionsDetailed.filter((session) => session.status === 'scheduled');
  const completedSessions = liveSessionsDetailed.filter((session) => session.status === 'completed');

  const uniqueCommunities = new Set(liveSessionsDetailed.map((session) => session.communityId).filter(Boolean));
  const fillRates = liveSessionsDetailed
    .map((session) => session.occupancy?.rate)
    .filter((rate) => typeof rate === 'number');
  const averageFillRate = fillRates.length
    ? Math.round(fillRates.reduce((sum, value) => sum + value, 0) / fillRates.length)
    : 0;
  const totalAttendancePings = liveSessionsDetailed.reduce(
    (sum, session) => sum + (session.attendance?.total ?? 0),
    0
  );
  const mostRecentAttendanceIso = liveSessionsDetailed
    .map((session) => session.attendance?.lastRecordedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const mostRecentAttendanceLabel = mostRecentAttendanceIso
    ? formatRelativeDay(new Date(mostRecentAttendanceIso), now)
    : null;

  const liveMetrics = [
    {
      label: 'Live today',
      value: `${activeSessions.length}`,
      change: `${upcomingSessions.length} upcoming`,
      trend: activeSessions.length ? 'up' : 'neutral'
    },
    {
      label: 'Average fill rate',
      value: `${averageFillRate}%`,
      change: fillRates.length ? 'Across cohorts' : 'Need promotion',
      trend: averageFillRate < 40 ? 'down' : 'up'
    },
    {
      label: 'Communities engaged',
      value: `${uniqueCommunities.size}`,
      change: `${communityMemberships.length} total`,
      trend: uniqueCommunities.size ? 'up' : 'neutral'
    },
    {
      label: 'Attendance pings',
      value: `${totalAttendancePings}`,
      change: mostRecentAttendanceLabel ? `Latest ${mostRecentAttendanceLabel}` : 'Awaiting attendees',
      trend: totalAttendancePings ? 'up' : 'neutral'
    }
  ];

  const cohortGroups = new Map();
  activeEnrollments.forEach((enrollment) => {
    const cohortLabel = enrollment.metadata?.cohort ?? 'General';
    const course = courseMap.get(enrollment.courseId);
    const key = `${enrollment.courseId}:${cohortLabel}`;
    const entry = cohortGroups.get(key) ?? {
      id: key,
      name: `${course?.title ?? 'Course'} · ${cohortLabel}`,
      members: 0
    };
    entry.members += 1;
    cohortGroups.set(key, entry);
  });

  const liveGroups = Array.from(cohortGroups.values())
    .sort((a, b) => b.members - a.members)
    .slice(0, 6)
    .map((entry) => ({ id: entry.id, name: entry.name, members: entry.members }));

  const whiteboardSnapshots = [];
  const readinessList = [];
  liveSessionsDetailed.forEach((session) => {
    if (Array.isArray(session.whiteboardSnapshots)) {
      whiteboardSnapshots.push(...session.whiteboardSnapshots);
    }
    if (Array.isArray(session.readiness)) {
      readinessList.push(...session.readiness);
    }
  });

  const liveDashboard = {
    metrics: liveMetrics,
    active: activeSessions.slice(0, 4),
    upcoming: upcomingSessions.slice(0, 8),
    completed: completedSessions.slice(0, 6),
    groups: liveGroups,
    whiteboard: {
      snapshots: whiteboardSnapshots.slice(0, 8),
      readiness: readinessList.slice(0, 8)
    }
  };
  const supportSection = {
    cases: supportCasesList,
    knowledgeBase: knowledgeBaseArticles,
    contacts: DEFAULT_SUPPORT_CONTACTS,
    serviceWindow: '24/7 global support',
    metrics: {
      open: supportMetricsSummary.open,
      waiting: supportMetricsSummary.waiting,
      resolved: supportMetricsSummary.resolved,
      closed: supportMetricsSummary.closed,
      awaitingLearner: supportMetricsSummary.awaitingLearner,
      averageResponseMinutes: supportMetricsSummary.averageResponseMinutes,
      latestUpdatedAt: supportMetricsSummary.latestUpdatedAt,
      firstResponseMinutes: supportMetricsSummary.averageResponseMinutes || 42
    }
  };

  const upcomingEntries = upcomingUnique;

  const quickActions = [];

  const primaryCourse = activeCourses[0] ?? null;
  if (primaryCourse) {
    const resumeCourseId = primaryCourse.courseId ?? primaryCourse.id ?? 'primary';
    const defaultCourseHref = `/dashboard/learner/courses?courseId=${encodeURIComponent(resumeCourseId)}`;
    const candidateHref =
      primaryCourse.goal?.metadata?.resumeUrl ??
      primaryCourse.goal?.metadata?.resumeHref ??
      primaryCourse.goal?.metadata?.actionHref ??
      primaryCourse.goal?.metadata?.ctaHref ??
      primaryCourse.goal?.primaryAction?.href ??
      primaryCourse.goal?.actionHref ??
      primaryCourse.goal?.cta?.href ??
      null;
    const resumeHref = sanitiseDashboardHref(candidateHref) ?? defaultCourseHref;
    const resumeDescriptionParts = [];
    if (primaryCourse.goal?.nextStep) {
      resumeDescriptionParts.push(primaryCourse.goal.nextStep);
    } else if (primaryCourse.title) {
      resumeDescriptionParts.push(`Continue ${primaryCourse.title}`);
    }
    if (primaryCourse.goal?.dueLabel) {
      resumeDescriptionParts.push(primaryCourse.goal.dueLabel);
    }
    const resumeDescription =
      resumeDescriptionParts.filter(Boolean).join(' · ') || 'Pick up where you left off.';

    quickActions.push({
      id: `resume-course-${resumeCourseId}`,
      label: 'Resume course',
      description: resumeDescription,
      href: resumeHref,
      ctaLabel: primaryCourse.goal?.metadata?.ctaLabel ?? 'Resume'
    });
  }

  const nextLiveSession = upcomingLiveSessions[0] ?? null;
  if (nextLiveSession) {
    const sessionId = nextLiveSession.publicId ?? nextLiveSession.id ?? 'session';
    const liveCandidateHref =
      nextLiveSession.metadata?.meetingUrl ??
      nextLiveSession.metadata?.joinUrl ??
      nextLiveSession.metadata?.ctaUrl ??
      nextLiveSession.action ??
      nextLiveSession.callToAction?.href ??
      null;
    const liveHref = sanitiseDashboardHref(liveCandidateHref) ?? '/dashboard/learner/live-classes';
    const liveDescriptionParts = [];
    if (nextLiveSession.title) {
      liveDescriptionParts.push(nextLiveSession.title);
    }
    const liveStartLabel = formatRelativeDay(nextLiveSession.startAt, now);
    if (liveStartLabel) {
      liveDescriptionParts.push(liveStartLabel);
    }
    const liveDescription =
      liveDescriptionParts.filter(Boolean).join(' · ') || 'Open the live classroom lobby.';
    const defaultLiveCta = liveHref.startsWith('http') ? 'Join now' : 'Open lobby';

    quickActions.push({
      id: `join-live-${sessionId}`,
      label: 'Join live session',
      description: liveDescription,
      href: liveHref,
      ctaLabel: nextLiveSession.callToAction?.label ?? defaultLiveCta
    });
  }

  const nextTutorAvailability = tutorAvailability[0] ?? null;
  let tutorDescription = 'Schedule time with a mentor to stay on track.';
  if (nextTutorAvailability) {
    const availabilityLabel = formatRelativeDay(nextTutorAvailability.startAt, now);
    const availabilityTime = formatDateTime(nextTutorAvailability.startAt, {
      dateStyle: undefined,
      timeStyle: 'short'
    });
    const availabilityParts = [];
    if (availabilityLabel) {
      availabilityParts.push(availabilityLabel);
    }
    if (availabilityTime) {
      availabilityParts.push(availabilityTime);
    }
    if (availabilityParts.length) {
      tutorDescription = `Next slot ${availabilityParts.join(' · ')}`;
    }
  }

  quickActions.push({
    id: 'book-tutor',
    label: 'Book a tutor',
    description: tutorDescription,
    href: '/dashboard/learner/bookings',
    ctaLabel: 'Book session'
  });

  const upcomingAssignment = assignmentsTimeline.upcoming[0] ?? null;
  let assignmentDescription = 'Submit coursework or upload supporting files.';
  if (upcomingAssignment) {
    const assignmentParts = [];
    if (upcomingAssignment.course) {
      assignmentParts.push(upcomingAssignment.course);
    }
    if (upcomingAssignment.dueIn) {
      assignmentParts.push(upcomingAssignment.dueIn);
    } else if (upcomingAssignment.due) {
      assignmentParts.push(`Due ${upcomingAssignment.due}`);
    }
    if (assignmentParts.length) {
      assignmentDescription = assignmentParts.join(' · ');
    }
  }

  quickActions.push({
    id: 'upload-assignment',
    label: 'Upload assignment',
    description: assignmentDescription,
    href: '/dashboard/learner/assessments',
    ctaLabel: 'Open workspace'
  });

  const dashboard = {
    metrics,
    analytics: {
      learningPace,
      communityEngagement
    },
    upcoming: upcomingEntries,
    communities: {
      managed: managedCommunities,
      pipelines: pipelineEntries
    },
    courses: {
      active: activeCourses,
      goals: learnerGoalsCombined,
      recommendations: recommendedCourses,
      orders: courseOrders,
      promotions: coursePromotions
    },
    calendar: calendarEvents,
    tutorBookings: {
      active: activeTutorBookings,
      history: historicalTutorEntries
    },
    ebooks: {
      library: ebookLibrary,
      recommendations: []
    },
    financial: {
      summary: financialSummary,
      invoices: invoiceEntries,
      paymentMethods: paymentMethodEntries,
      billingContacts: billingContactEntries,
      preferences: financialPreferences
    },
    notifications: {
      total: notificationsList.length,
      unreadMessages: messaging.unreadThreads ?? 0,
      items: notificationsList
    },
    growth: growthSection,
    affiliate: affiliateSection,
    ads: adsSection,
    fieldServices: learnerFieldServices,
    teach: teachSection,
    assessments: assessmentsSection,
    liveClassrooms: liveDashboard,
    support: supportSection,
    quickActions,
    followers: followerSection,
    settings: {
      privacy,
      messaging,
      communities: communitySettings,
      system: systemSettings,
      finance: financeSettings
    },
    feedback: {
      microSurvey
    }
  };

  const profileStats = [
    { label: 'Courses', value: `${activeEnrollments.length} active` },
    { label: 'Communities', value: `${communityMemberships.length} joined` },
    { label: 'Mentor sessions', value: `${tutorBookings.length} total` }
  ];

  if (fieldServiceAssignments.length) {
    profileStats.push({ label: 'Field assignments', value: `${fieldServiceAssignments.length} active` });
  }

  const profileBioSegments = [];
  if (activeEnrollments.length) {
    profileBioSegments.push(`Learning across ${activeEnrollments.length} course${activeEnrollments.length === 1 ? '' : 's'}`);
  }
  if (streak.current) {
    profileBioSegments.push(`maintaining a ${streak.current}-day streak`);
  }
  if (communityMemberships.length) {
    profileBioSegments.push(`while participating in ${communityMemberships.length} communit${
      communityMemberships.length === 1 ? 'y' : 'ies'
    }.`);
  }
  if (fieldServiceAssignments.length) {
    profileBioSegments.push(
      `Co-ordinating ${fieldServiceAssignments.length} field servic${
        fieldServiceAssignments.length === 1 ? 'e' : 'es'
      } in progress.`
    );
  }
  const profileBio = profileBioSegments.join(' ').trim() || null;

  const searchIndex = [
    {
      id: 'learner-overview',
      role: 'learner',
      type: 'Section',
      title: 'Learner overview',
      url: '/dashboard/learner'
    },
    {
      id: 'learner-assessments',
      role: 'learner',
      type: 'Section',
      title: 'Assessments',
      url: '/dashboard/assessments'
    },
    {
      id: 'learner-live',
      role: 'learner',
      type: 'Section',
      title: 'Live classrooms',
      url: '/dashboard/live-classes'
    },
    {
      id: 'learner-calendar',
      role: 'learner',
      type: 'Section',
      title: 'Calendar',
      url: '/dashboard/calendar'
    },
    ...activeCourses.map((course) => ({
      id: `learner-course-${course.id}`,
      role: 'learner',
      type: 'Course',
      title: course.title,
      url: '/dashboard/learner/courses'
    })),
    ...managedCommunities.map((community) => ({
      id: `learner-community-${community.id}`,
      role: 'learner',
      type: 'Community',
      title: community.name,
      url: '/dashboard/learner/communities'
    })),
    ...fieldServiceSearchEntries
  ];

  const feedHighlights = [];
  if (activeTutorBookings.length) {
    feedHighlights.push(
      `Mentorship with ${activeTutorBookings[0].mentor} scheduled for ${activeTutorBookings[0].date ?? 'soon'}.`
    );
  }
  if (ebookLibrary.length) {
    feedHighlights.push(`Reading ${ebookLibrary[0].title} (${ebookLibrary[0].progress}% complete).`);
  }
  if (fieldServiceAssignments.length) {
    const assignment = fieldServiceAssignments[0];
    feedHighlights.push(
      `Field service ${assignment.serviceType ?? 'assignment'} ${
        assignment.statusLabel ? assignment.statusLabel.toLowerCase() : 'in progress'
      }.`
    );
  }
  if (assignmentsTimeline.upcoming.length) {
    const upcomingAssessment = assignmentsTimeline.upcoming[0];
    feedHighlights.push(
      `Next assessment: ${upcomingAssessment.title} ${upcomingAssessment.dueIn ? `· ${upcomingAssessment.dueIn}` : ''}`.trim()
    );
  }
  if (upcomingSessions.length) {
    feedHighlights.push(
      `Upcoming live session: ${upcomingSessions[0].title} ${
        upcomingSessions[0].startLabel ? `on ${upcomingSessions[0].startLabel}` : 'scheduled'
      }.`
    );
  }

  return {
    role: { id: 'learner', label: 'Learner' },
    dashboard,
    upcoming: upcomingEntries,
    calendar: calendarEvents,
    support: supportSection,
    profileStats,
    profileBio,
    profileTitleSegment: 'Learner journey insights',
    searchIndex,
    feedHighlights
  };
}

export function buildCommunityDashboard({
  user: _user,
  now = new Date(),
  communities = [],
  eventsByCommunity = new Map(),
  runbooksByCommunity = new Map(),
  paywallTiersByCommunity = new Map(),
  subscriptionsByCommunity = new Map(),
  pendingMembersByCommunity = new Map(),
  moderatorsByCommunity = new Map(),
  moderationCases = [],
  communicationsByCommunity = new Map(),
  engagementTrend: _engagementTrend = [],
  engagementTotals = { current: {}, previous: {} }
} = {}) {
  const hasSignals =
    communities.length ||
    moderationCases.length ||
    subscriptionsByCommunity.size ||
    Array.from(runbooksByCommunity.values()).some((list) => list?.length);

  if (!hasSignals) {
    return null;
  }

  const metrics = [];
  const totalCommunities = communities.length;
  const totalMembers = communities.reduce(
    (sum, community) => sum + coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0),
    0
  );
  const totalPendingApprovals = Array.from(pendingMembersByCommunity.values()).reduce(
    (sum, members) => sum + coercePositiveInteger(members?.length ?? 0),
    0
  );
  const totalActiveSubscriptions = Array.from(subscriptionsByCommunity.values()).reduce(
    (sum, list) => sum + list.filter((subscription) => subscription.status === 'active').length,
    0
  );

  const totalRecurringCents = Array.from(subscriptionsByCommunity.entries()).reduce((sum, [communityId, subs]) => {
    const tiers = paywallTiersByCommunity.get(communityId) ?? [];
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
    const communitySum = subs.reduce((tierSum, subscription) => {
      const tier = tierMap.get(subscription.tierId);
      if (!tier) return tierSum;
      return tierSum + Number(tier.priceCents ?? 0);
    }, 0);
    return sum + communitySum;
  }, 0);

  metrics.push({
    label: 'Managed communities',
    value: `${totalCommunities}`,
    change: `${totalMembers} active members`
  });
  metrics.push({
    label: 'Pending approvals',
    value: `${totalPendingApprovals}`,
    change: totalPendingApprovals ? 'Review join requests' : 'All clear'
  });
  metrics.push({
    label: 'Recurring revenue',
    value: formatCurrency(totalRecurringCents),
    change: `${totalActiveSubscriptions} active subscriptions`
  });

  const caseByCommunity = new Map();
  moderationCases.forEach((incident) => {
    if (!incident.communityId) return;
    const list = caseByCommunity.get(incident.communityId) ?? [];
    list.push(incident);
    caseByCommunity.set(incident.communityId, list);
  });

  const healthOverview = communities.map((community) => {
    const communityId = community.id;
    const pendingMembers = coercePositiveInteger(pendingMembersByCommunity.get(communityId)?.length ?? 0);
    const moderators = coercePositiveInteger(moderatorsByCommunity.get(communityId)?.length ?? 0);
    const incidents = caseByCommunity.get(communityId) ?? [];
    const highSeverity = incidents.filter((incident) => incident.severity === 'high' || incident.severity === 'critical');
    const lastActivity = normaliseDate(community.stats?.lastActivityAt);
    const recentActivity = lastActivity && now - lastActivity <= 7 * DAY_IN_MS;
    const health = highSeverity.length ? 'At risk' : pendingMembers > 5 ? 'Attention' : recentActivity ? 'Healthy' : 'Monitoring';
    const trend = recentActivity ? 'up' : 'steady';

    return {
      id: communityId ? `community-${communityId}` : crypto.randomUUID(),
      name: community.name ?? `Community ${communityId}`,
      members: `${coercePositiveInteger(community.stats?.members ?? community.stats?.memberCount ?? 0)} members`,
      moderators,
      health,
      trend,
      approvalsPending: pendingMembers,
      incidentsOpen: incidents.length,
      escalationsOpen: highSeverity.length,
      metadata: { lastActivityAt: lastActivity?.toISOString() }
    };
  });

  const operationsRunbooks = [];
  runbooksByCommunity.forEach((runbooks, _communityId) => {
    runbooks
      ?.slice(0, 10)
      .forEach((runbook) => {
        const tags = parseTagsList(runbook.tags);
        const metadata = safeJsonParse(runbook.metadata, {});
        operationsRunbooks.push({
          id: `runbook-${runbook.id}`,
          title: runbook.title ?? 'Operational runbook',
          owner: runbook.createdByName ?? 'Community ops',
          automationReady: Boolean(metadata.automationReady ?? metadata.auto ?? false),
          tags
        });
      });
  });

  const operationsEscalations = moderationCases
    .filter((incident) => incident.status && ['pending', 'in_review', 'escalated'].includes(incident.status))
    .slice(0, 10)
    .map((incident) => ({
      id: incident.id ? `case-${incident.id}` : crypto.randomUUID(),
      title: incident.reason ?? 'Moderation case',
      severity: incident.severity ?? 'low',
      status: incident.status ?? 'pending',
      openedAt: incident.createdAt ? formatDateTime(incident.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
      owner: incident.assignee?.name ?? 'Unassigned'
    }));

  const upcomingEvents = [];
    eventsByCommunity.forEach((events, _communityId) => {
    events
      ?.filter((event) => event.startAt && normaliseDate(event.startAt) >= now)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, 10)
      .forEach((event) => {
        const capacity = coercePositiveInteger(event.capacity ?? event.attendanceLimit ?? 0);
        const reserved = coercePositiveInteger(event.reservedSeats ?? event.attendanceCount ?? 0);
        const seats = capacity ? `${reserved}/${capacity} seats` : `${reserved} reserved`;
        upcomingEvents.push({
          id: event.id ? `event-${event.id}` : crypto.randomUUID(),
          title: event.title ?? 'Community event',
          date: event.startAt ? formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
          facilitator: event.facilitator ?? event.metadata?.host ?? 'Community team',
          seats,
          status: event.status ?? 'scheduled'
        });
      });
  });

  const tutorPods = upcomingEvents
    .filter((event) => (event.status ?? '').toLowerCase().includes('coaching'))
    .map((event) => ({
      id: `pod-${event.id}`,
      title: event.title,
      facilitator: event.facilitator,
      nextSession: event.date
    }));

  const broadcasts = [];
  communicationsByCommunity.forEach((posts, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    posts
      ?.filter((post) => post.postType === 'announcement' || post.metadata?.stage)
      .slice(0, 10)
      .forEach((post) => {
        const metadata = safeJsonParse(post.metadata, {});
        broadcasts.push({
          id: `broadcast-${post.id}`,
          title: post.title ?? 'Broadcast',
          channel: post.channelName ?? 'General',
          stage: metadata.stage ?? post.status ?? 'draft',
          release: post.publishedAt ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD',
          community: community?.name ?? `Community ${communityId}`
        });
      });
  });

  const monetisationTiers = [];
  paywallTiersByCommunity.forEach((tiers, communityId) => {
    const subscriptions = subscriptionsByCommunity.get(communityId) ?? [];
    const active = subscriptions.filter((subscription) => subscription.status === 'active');
    tiers
      ?.slice(0, 10)
      .forEach((tier) => {
        const members = active.filter((subscription) => subscription.tierId === tier.id).length;
        monetisationTiers.push({
          id: `tier-${tier.id}`,
          name: tier.name,
          price: formatCurrency(tier.priceCents ?? 0, tier.currency ?? 'USD'),
          interval: tier.billingInterval ?? 'monthly',
          members
        });
      });
  });

  const monetisationInsights = [];
  communities.forEach((community) => {
    const subs = subscriptionsByCommunity.get(community.id) ?? [];
    if (!subs.length) return;
    const tiers = paywallTiersByCommunity.get(community.id) ?? [];
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
    const recurringCents = subs.reduce((sum, subscription) => {
      const tier = tierMap.get(subscription.tierId);
      if (!tier) return sum;
      return sum + Number(tier.priceCents ?? 0);
    }, 0);
    monetisationInsights.push(
      `${community.name ?? `Community ${community.id}`} is generating ${formatCurrency(recurringCents)} in active recurring revenue.`
    );
  });

  const monetisationExperiments = monetisationTiers.map((tier) => ({
    id: `experiment-${tier.id}`,
    name: `${tier.name} adoption`,
    hypothesis: `Grow ${tier.name} to ${tier.members + 5} members`,
    status: tier.members ? 'running' : 'planned'
  }));

  const safetyIncidents = moderationCases.slice(0, 20).map((incident) => ({
    id: incident.id ? `incident-${incident.id}` : crypto.randomUUID(),
    communityId: incident.communityId,
    title: incident.reason ?? 'Moderation incident',
    severity: incident.severity ?? 'low',
    status: incident.status ?? 'pending',
    openedAt: incident.createdAt ? formatDateTime(incident.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
    assignee: incident.assignee?.name ?? 'Unassigned'
  }));

  const safetyBacklog = [];
  caseByCommunity.forEach((cases, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    const highSeverity = cases.filter((incident) => incident.severity === 'high' || incident.severity === 'critical');
    const mediumSeverity = cases.filter((incident) => incident.severity === 'medium');
    if (highSeverity.length) {
      safetyBacklog.push({
        id: `backlog-high-${communityId}`,
        label: `${community?.name ?? `Community ${communityId}`} high severity`,
        count: highSeverity.length
      });
    }
    if (mediumSeverity.length) {
      safetyBacklog.push({
        id: `backlog-medium-${communityId}`,
        label: `${community?.name ?? `Community ${communityId}`} medium severity`,
        count: mediumSeverity.length
      });
    }
  });

  const moderatorRoster = [];
  moderatorsByCommunity.forEach((members, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    members
      ?.slice(0, 10)
      .forEach((member) => {
        moderatorRoster.push({
          id: `moderator-${communityId}-${member.userId ?? member.id}`,
          community: community?.name ?? `Community ${communityId}`,
          role: member.role ?? 'moderator',
          coverage: member.metadata?.coverage ?? 'General'
        });
      });
  });

  const communicationsHighlights = [];
  communicationsByCommunity.forEach((posts, communityId) => {
    const community = communities.find((entry) => entry.id === communityId);
    posts
      ?.slice(0, 10)
      .forEach((post) => {
        const tags = parseTagsList(post.tags);
        communicationsHighlights.push({
          id: `highlight-${post.id}`,
          community: community?.name ?? `Community ${communityId}`,
          preview: post.title ?? (post.body ? String(post.body).slice(0, 80) : 'Member update'),
          postedAt: post.publishedAt ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
          reactions: summariseReactions(post.reactionSummary),
          tags
        });
      });
  });

  const communicationsTrends = [
    {
      id: 'trend-posts-7d',
      metric: 'Posts (7d)',
      current: engagementTotals.current.posts ?? 0,
      previous: engagementTotals.previous.posts ?? 0
    },
    {
      id: 'trend-comments-7d',
      metric: 'Comments (7d)',
      current: engagementTotals.current.comments ?? 0,
      previous: engagementTotals.previous.comments ?? 0
    },
    {
      id: 'trend-events-7d',
      metric: 'Event posts (7d)',
      current: engagementTotals.current.eventPosts ?? 0,
      previous: engagementTotals.previous.eventPosts ?? 0
    }
  ];

  const communicationsBroadcasts = broadcasts;

  const dashboard = {
    metrics,
    health: {
      overview: healthOverview
    },
    operations: {
      runbooks: operationsRunbooks,
      escalations: operationsEscalations
    },
    programming: {
      upcomingEvents,
      tutorPods,
      broadcasts: communicationsBroadcasts
    },
    monetisation: {
      tiers: monetisationTiers,
      experiments: monetisationExperiments,
      insights: monetisationInsights
    },
    safety: {
      incidents: safetyIncidents,
      backlog: safetyBacklog,
      moderators: moderatorRoster
    },
    communications: {
      highlights: communicationsHighlights,
      broadcasts: communicationsBroadcasts,
      trends: communicationsTrends
    }
  };

  const profileStats = [
    { label: 'Communities', value: `${totalCommunities} managed` },
    { label: 'Members', value: `${totalMembers} active` },
    { label: 'Moderation backlog', value: `${moderationCases.length} open` }
  ];

  const profileBioSegments = [];
  if (totalCommunities) {
    profileBioSegments.push(`Stewarding ${totalCommunities} communit${totalCommunities === 1 ? 'y' : 'ies'}`);
  }
  if (totalMembers) {
    profileBioSegments.push(`with ${totalMembers} engaged members`);
  }
  if (totalPendingApprovals) {
    profileBioSegments.push(`and ${totalPendingApprovals} approvals awaiting review.`);
  }
  const profileBio = profileBioSegments.join(' ').trim() || null;

  const searchIndex = [
    {
      id: 'community-operations-overview',
      role: 'community',
      type: 'Section',
      title: 'Community operations overview',
      url: '/dashboard/community'
    },
    ...communities.map((community) => ({
      id: `community-${community.id}`,
      role: 'community',
      type: 'Community',
      title: community.name ?? `Community ${community.id}`,
      url: `/dashboard/community/${community.slug ?? community.id}`
    }))
  ];

  const feedHighlights = [];
  if (upcomingEvents.length) {
    feedHighlights.push(`Upcoming community programme: ${upcomingEvents[0].title} on ${upcomingEvents[0].date}.`);
  }
  if (operationsRunbooks.length) {
    feedHighlights.push(`New runbook published: ${operationsRunbooks[0].title}.`);
  }

  return {
    role: { id: 'community', label: 'Community' },
    dashboard,
    profileStats,
    profileBio,
    profileTitleSegment: 'Community operations steward',
    searchIndex,
    feedHighlights
  };
}

function parseMonetizationTier(settings) {
  if (!settings) {
    return { defaultCommission: { tiers: [] } };
  }
  return settings;
}

export function buildAffiliateOverview({
  affiliates = [],
  affiliatePayouts = [],
  paymentIntents = [],
  memberships = [],
  monetizationSettings = {},
  now = new Date()
} = {}) {
  const normalizedSettings = parseMonetizationTier(monetizationSettings.affiliate);

  const programs = affiliates.map((affiliate) => {
    const codes = resolveAffiliateReferralCodes(affiliate);
    const codeSet = new Set(codes);
    const intents = paymentIntents.filter((intent) => {
      const metadata = safeJsonParse(intent.metadata, {});
      const intentCodes = resolveReferralCodesFromMetadata(metadata);
      return intentCodes.some((code) => codeSet.has(code));
    });

    const totalVolumeCents = intents.reduce(
      (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
      0
    );

    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    const recentVolumeCents = intents
      .filter((intent) => {
        const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
        return capturedAt && capturedAt >= thirtyDaysAgo;
      })
      .reduce(
        (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
        0
      );

    const conversions = intents.filter(
      (intent) => Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0) > 0
    );
    const conversions30d = conversions.filter((intent) => {
      const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
      return capturedAt && capturedAt >= thirtyDaysAgo;
    });

    const programmeMembership = memberships.find((membership) => membership.communityId === affiliate.communityId);

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      community: {
        id: affiliate.communityId,
        name: affiliate.communityName ?? programmeMembership?.communityName ?? null,
        slug: programmeMembership?.communitySlug ?? null
      },
      status: affiliate.status ?? 'pending',
      earnings: {
        totalCents: Number(affiliate.totalEarnedCents ?? 0),
        totalFormatted: formatCurrency(affiliate.totalEarnedCents ?? 0),
        paidCents: Number(affiliate.totalPaidCents ?? 0),
        outstandingCents: Math.max(0, Number(affiliate.totalEarnedCents ?? 0) - Number(affiliate.totalPaidCents ?? 0))
      },
      performance: {
        conversions: conversions.length,
        conversions30d: conversions30d.length,
        volumeCents: totalVolumeCents,
        volumeFormatted: formatCurrency(totalVolumeCents),
        volume30dCents: recentVolumeCents,
        volume30dFormatted: formatCurrency(recentVolumeCents)
      },
      commission: {
        rateBps: affiliate.commissionRateBps ?? normalizedSettings?.defaultCommission?.tiers?.[0]?.rateBps ?? 0
      }
    };
  });

  const outstandingCents = programs.reduce((total, program) => total + program.earnings.outstandingCents, 0);

  const nextPayout = affiliatePayouts
    .filter((payout) => ['scheduled', 'pending'].includes(payout.status))
    .map((payout) => ({
      ...payout,
      scheduledDate: payout.scheduledAt ? new Date(payout.scheduledAt) : null
    }))
    .sort((a, b) => {
      const aTime = a.scheduledDate ? a.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledDate ? b.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })[0] ?? null;

  const statusPriority = new Map([
    ['scheduled', 0],
    ['pending', 1],
    ['processing', 1],
    ['completed', 2],
    ['cancelled', 3]
  ]);

  const payouts = affiliatePayouts
    .map((payout) => ({
      id: payout.id,
      affiliateId: payout.affiliateId,
      status: payout.status,
      amountCents: Number(payout.amountCents ?? 0),
      amountFormatted: formatCurrency(payout.amountCents ?? 0),
      scheduledAt: payout.scheduledAt ? new Date(payout.scheduledAt) : null,
      processedAt: payout.processedAt ? new Date(payout.processedAt) : null
    }))
    .sort((a, b) => {
      const statusRankA = statusPriority.get(a.status) ?? 99;
      const statusRankB = statusPriority.get(b.status) ?? 99;
      if (statusRankA !== statusRankB) return statusRankA - statusRankB;
      const aTime = a.scheduledAt ? a.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledAt ? b.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      const aProcessed = a.processedAt ? a.processedAt.getTime() : Number.POSITIVE_INFINITY;
      const bProcessed = b.processedAt ? b.processedAt.getTime() : Number.POSITIVE_INFINITY;
      if (aProcessed !== bProcessed) return aProcessed - bProcessed;
      return String(a.id).localeCompare(String(b.id));
    });

  const pendingApplications = programs.filter((program) => program.status === 'pending').length;

  const actions = [];
  if (programs.length === 0) {
    actions.push('Invite high-performing learners into the affiliate programme.');
  }
  if (outstandingCents > 0) {
    actions.push(`Release ${formatCurrency(outstandingCents)} in pending affiliate payouts.`);
  }
  if (pendingApplications > 0) {
    actions.push(`Review ${pendingApplications} pending affiliate application${pendingApplications === 1 ? '' : 's'}.`);
  }

  return {
    programs,
    payouts,
    summary: {
      totals: {
        programCount: programs.length,
        outstandingCents,
        outstandingFormatted: formatCurrency(outstandingCents)
      },
      nextPayout: nextPayout
        ? {
            id: nextPayout.id,
            affiliateId: nextPayout.affiliateId,
            amount: formatCurrency(nextPayout.amountCents),
            scheduledAt: nextPayout.scheduledDate
          }
        : null
    },
    actions
  };
}

function aggregateTutorAvailability({ availability = [], bookings = [], now }) {
  const byTutor = new Map();
  availability.forEach((slot) => {
    const tutorId = Number(slot.tutorId);
    if (!Number.isFinite(tutorId)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    record.slots += 1;
    byTutor.set(tutorId, record);
  });

  bookings.forEach((booking) => {
    const tutorId = Number(booking.tutorId);
    if (!Number.isFinite(tutorId)) return;
    if (!['confirmed', 'requested'].includes(booking.status)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    const learnerName = resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner');
    record.learners.add(learnerName);
    if (booking.status === 'confirmed' && booking.scheduledStart) {
      const start = new Date(booking.scheduledStart);
      if (start >= now) {
        record.slots += 1;
      }
    }
    byTutor.set(tutorId, record);
  });

  return Array.from(byTutor.entries()).map(([tutorId, record]) => ({
    tutorId,
    slotsCount: record.slots,
    learnersCount: record.learners.size
  }));
}

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ku', 'ps', 'ur']);

function createLanguageDisplay() {
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'language' });
    return (code) => {
      if (!code) return 'Unknown';
      return display.of(code) ?? code;
    };
  } catch (_error) {
    return (code) => code ?? 'Unknown';
  }
}

function isRightToLeft(code) {
  if (!code) return false;
  const normalised = String(code).toLowerCase();
  return RTL_LANGUAGES.has(normalised);
}

function ensureMap(value) {
  if (!value) return new Map();
  if (value instanceof Map) return value;
  if (Array.isArray(value)) {
    return new Map(value);
  }
  return new Map(Object.entries(value));
}

function deduplicateByKey(list, keyFn) {
  const seen = new Set();
  return list.filter((item) => {
    const computed = keyFn(item);
    const fallback = JSON.stringify({
      title: item?.title ?? null,
      date: item?.date ?? item?.startAt ?? null,
      type: item?.type ?? null
    });
    const key = computed ?? fallback;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function resolveAssignmentDueDate(assignment, course) {
  const releaseAt = course?.releaseAt ? new Date(course.releaseAt) : null;
  if (!releaseAt || Number.isNaN(releaseAt.getTime())) {
    return null;
  }
  const offsetDays = Number(assignment.dueOffsetDays ?? 0);
  if (!Number.isFinite(offsetDays)) {
    return null;
  }
  return new Date(releaseAt.getTime() + offsetDays * DAY_IN_MS);
}

function resolveLearnerAssignmentDueDate({ assignment, course, enrollment }) {
  const metadata = assignment?.metadata ?? {};
  const dueCandidates = [
    metadata.dueAt,
    metadata.dueDate,
    metadata.schedule?.dueAt,
    metadata.timeline?.dueAt,
    metadata.window?.dueAt,
    metadata.window?.endAt,
    metadata.availability?.dueAt
  ];
  for (const candidate of dueCandidates) {
    const parsed = normaliseDate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const offsetCandidates = [metadata.dueInDays, assignment?.dueOffsetDays];
  const enrollmentStart = enrollment ? normaliseDate(enrollment.startedAt) : null;
  const anchorDate = enrollmentStart ?? normaliseDate(course?.releaseAt) ?? normaliseDate(course?.createdAt);
  for (const offset of offsetCandidates) {
    const numeric = Number(offset);
    if (anchorDate && Number.isFinite(numeric)) {
      return new Date(anchorDate.getTime() + numeric * DAY_IN_MS);
    }
  }

  const fallback = resolveAssignmentDueDate(assignment, course);
  return fallback ? new Date(fallback) : null;
}

function mapOrderStatus(status, amountRefunded = 0, amountTotal = 0) {
  const normalised = String(status ?? '').toLowerCase();
  if (Number(amountRefunded ?? 0) > 0 && Number(amountTotal ?? 0) > 0) {
    return 'Refunded';
  }
  if (['succeeded', 'paid', 'complete', 'completed'].includes(normalised)) {
    return 'Paid';
  }
  if (['canceled', 'cancelled', 'refunded'].includes(normalised)) {
    return 'Refunded';
  }
  return 'Processing';
}

function isInvoiceOpen(status) {
  const normalised = String(status ?? '').toLowerCase();
  if (!normalised) return true;
  if (['succeeded', 'paid', 'complete', 'completed'].includes(normalised)) {
    return false;
  }
  return true;
}

function normaliseLearnerPayments({ invoices = [], paymentIntents = [], courseMap, now = new Date() }) {
  const source = Array.isArray(paymentIntents) && paymentIntents.length ? paymentIntents : invoices;
  const orders = [];
  const normalisedInvoices = [];

  source.forEach((entry) => {
    if (!entry) return;
    const metadata = safeJsonParse(entry.metadata, {});
    const amountCents = Number(entry.amountCents ?? entry.amountTotal ?? entry.amount ?? 0);
    const currency = entry.currency ?? metadata.currency ?? 'USD';
    const createdAt = normaliseDate(entry.createdAt ?? entry.date ?? entry.updatedAt) ?? now;
    const label = entry.label ?? metadata.description ?? metadata.courseTitle ?? 'Course order';
    const courseId = metadata.courseId ?? metadata.course?.id ?? entry.courseId ?? entry.entityId ?? null;
    const course = courseId ? courseMap?.get?.(courseId) : null;
    const reference = metadata.reference ?? entry.reference ?? entry.publicId ?? null;
    const orderTitle = course?.title ?? metadata.courseTitle ?? label;
    const orderId = entry.publicId ?? `order-${entry.id ?? crypto.randomUUID()}`;

    orders.push({
      id: orderId,
      title: orderTitle,
      amount: Math.round(amountCents) / 100,
      status: mapOrderStatus(entry.status, entry.amountRefunded ?? metadata.amountRefunded, amountCents),
      reference,
      purchaseDate: createdAt ? createdAt.toISOString().slice(0, 10) : null
    });

    const invoiceId =
      entry.id ?? entry.publicId ?? metadata.invoiceId ?? `invoice-${entry.id ?? crypto.randomUUID()}`;
    normalisedInvoices.push({
      id: invoiceId,
      label,
      amountCents,
      currency,
      status: entry.status ?? 'open',
      date: createdAt ? createdAt.toISOString() : null,
      metadata,
      reference
    });
  });

  return { orders, invoices: normalisedInvoices };
}

function normaliseReferralCode(value) {
  if (!value && value !== 0) return null;
  const normalised = String(value).trim().toLowerCase();
  return normalised || null;
}

function resolveReferralCodesFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];
  const codes = new Set();
  const add = (value) => {
    const normalised = normaliseReferralCode(value);
    if (normalised) codes.add(normalised);
  };

  [
    metadata.referralCode,
    metadata.referral_code,
    metadata.affiliateCode,
    metadata.affiliate_code,
    metadata.trackingCode,
    metadata.tracking_code,
    metadata.tracking?.referralCode,
    metadata.tracking?.referral_code,
    metadata.attribution?.referralCode,
    metadata.attribution?.referral_code,
    metadata.affiliate?.code,
    metadata.affiliate?.referralCode
  ].forEach(add);

  if (Array.isArray(metadata.referralCodes)) {
    metadata.referralCodes.forEach(add);
  }
  if (Array.isArray(metadata.referral_codes)) {
    metadata.referral_codes.forEach(add);
  }
  if (Array.isArray(metadata.codes)) {
    metadata.codes.forEach(add);
  }
  if (Array.isArray(metadata.trackingCodes)) {
    metadata.trackingCodes.forEach(add);
  }

  return Array.from(codes);
}

function resolveAffiliateReferralCodes(affiliate) {
  if (!affiliate) return [];
  const metadata = safeJsonParse(affiliate.metadata, {});
  const codes = new Set();
  const add = (value) => {
    const normalised = normaliseReferralCode(value);
    if (normalised) codes.add(normalised);
  };

  [affiliate.referralCode, affiliate.code, affiliate.slug].forEach(add);

  if (Array.isArray(affiliate.referralCodes)) {
    affiliate.referralCodes.forEach(add);
  }
  if (Array.isArray(affiliate.codes)) {
    affiliate.codes.forEach(add);
  }

  resolveReferralCodesFromMetadata(metadata).forEach(add);

  return Array.from(codes);
}

function resolveNextLesson(lessons = [], stats = {}) {
  if (!lessons.length) return null;
  const completed = Number(stats.completedLessons ?? 0);
  const index = Math.min(completed, lessons.length - 1);
  const lesson = lessons[index];
  if (!lesson) return null;
  return lesson.title ?? null;
}

function determineRiskLevel(enrollment, stats, now) {
  if (enrollment.status !== 'active') {
    return 'low';
  }
  const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null;
  const progressPercent = Number(enrollment.progressPercent ?? (stats?.completionRatio ?? 0) * 100);
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return progressPercent < 20 ? 'medium' : 'low';
  }
  const daysSinceStart = Math.floor((now.getTime() - startedAt.getTime()) / DAY_IN_MS);
  if (daysSinceStart >= 21 && progressPercent < 30) {
    return 'critical';
  }
  if (daysSinceStart >= 14 && progressPercent < 40) {
    return 'high';
  }
  if (daysSinceStart >= 7 && progressPercent < 50) {
    return 'medium';
  }
  return 'low';
}

function normaliseEnrollment(enrollment = {}, collaboratorDirectory = new Map()) {
  const metadata = safeJsonParse(enrollment.metadata, {});
  const userObject = typeof enrollment.user === 'object' && enrollment.user ? enrollment.user : null;
  const learnerMeta =
    (metadata && (metadata.learner ?? metadata.user ?? metadata.profile ?? {})) || {};

  const derivedUserId =
    enrollment.userId ??
    userObject?.id ??
    learnerMeta?.id ??
    learnerMeta?.userId ??
    learnerMeta?.learnerId ??
    metadata.userId ??
    metadata.learnerId ??
    null;

  const directoryUser = derivedUserId ? collaboratorDirectory.get?.(derivedUserId) : null;

  const firstName =
    enrollment.firstName ??
    learnerMeta?.firstName ??
    learnerMeta?.givenName ??
    metadata.firstName ??
    metadata.givenName ??
    userObject?.firstName ??
    directoryUser?.firstName ??
    null;

  const lastName =
    enrollment.lastName ??
    learnerMeta?.lastName ??
    learnerMeta?.familyName ??
    metadata.lastName ??
    metadata.familyName ??
    userObject?.lastName ??
    directoryUser?.lastName ??
    null;

  const email =
    enrollment.email ??
    learnerMeta?.email ??
    learnerMeta?.emailAddress ??
    metadata.email ??
    metadata.contactEmail ??
    userObject?.email ??
    directoryUser?.email ??
    null;

  return {
    ...enrollment,
    metadata,
    userId: derivedUserId ?? enrollment.userId ?? null,
    resolvedLearner: {
      id: derivedUserId ?? directoryUser?.id ?? null,
      firstName,
      lastName,
      email
    }
  };
}

function buildCourseWorkspace({
  courses = [],
  modules = [],
  lessons = [],
  assignments = [],
  enrollments = [],
  courseProgress = [],
  creationProjects = [],
  creationCollaborators = new Map(),
  creationSessions = new Map(),
  collaboratorDirectory = new Map(),
  blueprints = [],
  blueprintModules = [],
  launches = [],
  launchChecklist = [],
  launchSignals = [],
  courseReviews = [],
  refresherLessons = [],
  recordedAssets = [],
  catalogueListings = [],
  dripSequences = [],
  dripSegments = [],
  dripSchedules = [],
  mobileExperiences = [],
  now = new Date()
} = {}) {
  const workspace = {
    pipeline: [],
    production: [],
    catalogue: [],
    creationBlueprints: [],
    lifecycle: [],
    library: [],
    analytics: { cohortHealth: [], velocity: { averageCompletion: 0, trending: [] } },
    assignments: {
      summary: { total: 0, dueThisWeek: 0, requiresReview: 0 },
      queues: { upcoming: [], review: [], automation: [] }
    },
    authoring: {
      drafts: [],
      activeSessions: [],
      localisationCoverage: { totalLanguages: 0, publishedLanguages: 0, missing: [] }
    },
    learners: { roster: [], riskAlerts: [] }
  };

  if (!courses.length) {
    return workspace;
  }

  const minutesToLabel = (minutes) => {
    const numeric = Number(minutes);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '—';
    }
    const hours = Math.floor(numeric / 60);
    const remaining = Math.round(numeric % 60);
    if (hours && remaining) {
      return `${hours}h ${remaining}m`;
    }
    if (hours) {
      return `${hours}h`;
    }
    return `${remaining}m`;
  };

  const enrollmentRecords = enrollments.map((enrollment) =>
    normaliseEnrollment(enrollment, collaboratorDirectory)
  );

  const languageLabel = createLanguageDisplay();
  const courseById = new Map();
  courses.forEach((course) => {
    const metadata = safeJsonParse(course.metadata, {});
    const releaseAt = normaliseDate(course.releaseAt);
    const updatedAt = normaliseDate(course.updatedAt);
    courseById.set(course.id, { ...course, metadata, releaseAt, updatedAt });
  });

  const modulesByCourse = new Map();
  modules.forEach((module) => {
    const list = modulesByCourse.get(module.courseId) ?? [];
    list.push({ ...module, metadata: safeJsonParse(module.metadata, {}) });
    modulesByCourse.set(module.courseId, list);
  });
  modulesByCourse.forEach((list) => {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  const lessonsByCourse = new Map();
  lessons.forEach((lesson) => {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push({ ...lesson, metadata: safeJsonParse(lesson.metadata, {}) });
    lessonsByCourse.set(lesson.courseId, list);
  });
  lessonsByCourse.forEach((list) => {
    list.sort((a, b) => {
      const moduleOrder = (a.moduleId ?? 0) - (b.moduleId ?? 0);
      if (moduleOrder !== 0) return moduleOrder;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  });

  const assignmentsByCourse = new Map();
  assignments.forEach((assignment) => {
    const list = assignmentsByCourse.get(assignment.courseId) ?? [];
    list.push({ ...assignment, metadata: safeJsonParse(assignment.metadata, {}) });
    assignmentsByCourse.set(assignment.courseId, list);
  });

  const blueprintsByCourse = new Map();
  blueprints.forEach((blueprint) => {
    if (!blueprint?.courseId) return;
    const list = blueprintsByCourse.get(blueprint.courseId) ?? [];
    list.push(blueprint);
    blueprintsByCourse.set(blueprint.courseId, list);
  });

  const blueprintModulesByBlueprint = new Map();
  blueprintModules.forEach((module) => {
    if (!module?.blueprintId) return;
    const list = blueprintModulesByBlueprint.get(module.blueprintId) ?? [];
    list.push(module);
    blueprintModulesByBlueprint.set(module.blueprintId, list);
  });
  blueprintModulesByBlueprint.forEach((list) => {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  const launchesByCourse = new Map();
  launches.forEach((launch) => {
    if (!launch?.courseId) return;
    launchesByCourse.set(launch.courseId, launch);
  });

  const checklistByLaunch = new Map();
  launchChecklist.forEach((item) => {
    if (!item?.launchId) return;
    const list = checklistByLaunch.get(item.launchId) ?? [];
    list.push(item);
    checklistByLaunch.set(item.launchId, list);
  });

  const signalsByLaunch = new Map();
  launchSignals.forEach((signal) => {
    if (!signal?.launchId) return;
    const list = signalsByLaunch.get(signal.launchId) ?? [];
    list.push(signal);
    signalsByLaunch.set(signal.launchId, list);
  });

  const reviewsByCourse = new Map();
  courseReviews.forEach((review) => {
    if (!review?.courseId) return;
    const list = reviewsByCourse.get(review.courseId) ?? [];
    list.push(review);
    reviewsByCourse.set(review.courseId, list);
  });
  reviewsByCourse.forEach((list) => {
    list.sort((a, b) => {
      const aDate = a.submittedAt instanceof Date ? a.submittedAt : toDate(a.submittedAt);
      const bDate = b.submittedAt instanceof Date ? b.submittedAt : toDate(b.submittedAt);
      return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
    });
  });

  const refresherLessonsByCourse = new Map();
  refresherLessons.forEach((lesson) => {
    if (!lesson?.courseId) return;
    const list = refresherLessonsByCourse.get(lesson.courseId) ?? [];
    list.push(lesson);
    refresherLessonsByCourse.set(lesson.courseId, list);
  });

  const recordedAssetsByCourse = new Map();
  recordedAssets.forEach((asset) => {
    if (!asset?.courseId) return;
    const list = recordedAssetsByCourse.get(asset.courseId) ?? [];
    list.push(asset);
    recordedAssetsByCourse.set(asset.courseId, list);
  });

  const catalogueListingsByCourse = new Map();
  catalogueListings.forEach((listing) => {
    if (!listing?.courseId) return;
    const list = catalogueListingsByCourse.get(listing.courseId) ?? [];
    list.push(listing);
    catalogueListingsByCourse.set(listing.courseId, list);
  });

  const dripSequencesByCourse = new Map();
  dripSequences.forEach((sequence) => {
    if (!sequence?.courseId) return;
    const list = dripSequencesByCourse.get(sequence.courseId) ?? [];
    list.push(sequence);
    dripSequencesByCourse.set(sequence.courseId, list);
  });

  const dripSegmentsBySequence = new Map();
  dripSegments.forEach((segment) => {
    if (!segment?.sequenceId) return;
    const list = dripSegmentsBySequence.get(segment.sequenceId) ?? [];
    list.push(segment);
    dripSegmentsBySequence.set(segment.sequenceId, list);
  });

  const dripSchedulesBySequence = new Map();
  dripSchedules.forEach((entry) => {
    if (!entry?.sequenceId) return;
    const list = dripSchedulesBySequence.get(entry.sequenceId) ?? [];
    list.push(entry);
    dripSchedulesBySequence.set(entry.sequenceId, list);
  });
  dripSchedulesBySequence.forEach((list) => {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

  const mobileExperiencesByCourse = new Map();
  mobileExperiences.forEach((experience) => {
    if (!experience?.courseId) return;
    const list = mobileExperiencesByCourse.get(experience.courseId) ?? [];
    list.push(experience);
    mobileExperiencesByCourse.set(experience.courseId, list);
  });

  const enrollmentsByCourse = new Map();
  enrollmentRecords.forEach((enrollment) => {
    const list = enrollmentsByCourse.get(enrollment.courseId) ?? [];
    list.push(enrollment);
    enrollmentsByCourse.set(enrollment.courseId, list);
  });

  const progressByEnrollment = new Map();
  courseProgress.forEach((entry) => {
    const stats = progressByEnrollment.get(entry.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      lastCompletedAt: null,
      notes: [],
      lastLocation: null
    };
    stats.totalLessons += 1;
    if (entry.completed) {
      stats.completedLessons += 1;
      const completedAt = entry.completedAt ? new Date(entry.completedAt) : null;
      if (completedAt && (!stats.lastCompletedAt || completedAt > stats.lastCompletedAt)) {
        stats.lastCompletedAt = completedAt;
      }
    }
    const metadata = safeJsonParse(entry.metadata, {});
    if (metadata.note) {
      stats.notes.push(metadata.note);
    }
    if (metadata.lastLocation && !stats.lastLocation) {
      stats.lastLocation = metadata.lastLocation;
    }
    progressByEnrollment.set(entry.enrollmentId, stats);
  });
  progressByEnrollment.forEach((stats) => {
    stats.completionRatio = stats.totalLessons > 0 ? stats.completedLessons / stats.totalLessons : 0;
  });

  const catalogue = courses.map((course) => {
    const courseRecord = courseById.get(course.id) ?? { ...course, metadata: safeJsonParse(course.metadata, {}) };
    const modulesForCourse = modulesByCourse.get(course.id) ?? [];
    const lessonsForCourse = lessonsByCourse.get(course.id) ?? [];
    const courseEnrollments = enrollmentsByCourse.get(course.id) ?? [];
    const activeEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'active');
    const completedEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'completed');
    const totalEnrollments = courseEnrollments.length;
    const averageProgress = totalEnrollments
      ? Math.round(
          courseEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.progressPercent ?? 0), 0) /
            totalEnrollments
        )
      : 0;
    const languages = Array.isArray(courseRecord.languages) ? courseRecord.languages : [];
    const publishedLocales = Array.isArray(courseRecord.metadata?.publishedLocales)
      ? courseRecord.metadata.publishedLocales
      : [];

    const languageEntries = languages.map((code) => {
      const lower = String(code).toLowerCase();
      const published = publishedLocales.includes(code) || publishedLocales.includes(lower);
      return {
        code: lower,
        label: languageLabel(lower),
        direction: isRightToLeft(lower) ? 'rtl' : 'ltr',
        published
      };
    });

    const releaseDate = normaliseDate(course.releaseAt);
    const updatedDate = normaliseDate(course.updatedAt);

    return {
      id: courseRecord.publicId ?? `course-${course.id}`,
      courseId: course.id,
      title: courseRecord.title,
      summary: courseRecord.summary,
      status: courseRecord.status,
      format: courseRecord.deliveryFormat ?? courseRecord.metadata?.format ?? 'cohort',
      languages: languageEntries,
      price: {
        currency: courseRecord.priceCurrency,
        amountCents: Number(courseRecord.priceAmount ?? 0),
        formatted: formatCurrency(courseRecord.priceAmount ?? 0, courseRecord.priceCurrency)
      },
      rating: {
        average: Number(courseRecord.ratingAverage ?? 0),
        count: Number(courseRecord.ratingCount ?? 0)
      },
      learners: {
        total: Number(courseRecord.enrolmentCount ?? totalEnrollments),
        active: activeEnrollments.length,
        completed: completedEnrollments.length
      },
      modules: modulesForCourse.length,
      lessons: lessonsForCourse.length,
      averageProgress,
      releaseAt: releaseDate ? releaseDate.toISOString() : null,
      updatedAt: updatedDate ? updatedDate.toISOString() : null,
      localisation: {
        totalLanguages: languageEntries.length,
        published: languageEntries.filter((entry) => entry.published).length,
        missing: languageEntries.filter((entry) => !entry.published).map((entry) => entry.code)
      },
      automation: courseRecord.metadata?.dripCampaign ?? null,
      refresherLessons: Array.isArray(courseRecord.metadata?.refresherLessons)
        ? courseRecord.metadata.refresherLessons
        : []
    };
  });

  workspace.catalogue = catalogue;

  const creationBlueprints = [];
  blueprintsByCourse.forEach((blueprintList, courseId) => {
    const courseRecord = courseById.get(courseId);
    blueprintList.forEach((blueprint) => {
      const modulesForBlueprint = blueprintModulesByBlueprint.get(blueprint.id) ?? [];
      const outstanding = Array.isArray(blueprint.outstandingTasks) ? blueprint.outstandingTasks : [];
      const upcoming = Array.isArray(blueprint.upcomingMilestones) ? blueprint.upcomingMilestones : [];
      creationBlueprints.push({
        id: blueprint.publicId ?? `blueprint-${blueprint.id}`,
        courseId,
        name: blueprint.title,
        stage: blueprint.stage ?? courseRecord?.status ?? 'Planning',
        summary: blueprint.summary ?? courseRecord?.summary ?? null,
        learners:
          blueprint.targetLearners ??
          (courseRecord?.enrolmentCount ? `${courseRecord.enrolmentCount} learners` : 'Learner roster pending'),
        price: blueprint.priceLabel ?? formatCurrency(courseRecord?.priceAmount ?? 0, courseRecord?.priceCurrency ?? 'USD'),
        moduleCount: blueprint.moduleCount ?? modulesForBlueprint.length,
        readiness: Math.round(Number(blueprint.readinessScore ?? 0)),
        readinessLabel: blueprint.readinessLabel ?? 'In build',
        totalDurationLabel:
          Number.isFinite(Number(blueprint.totalDurationMinutes)) && Number(blueprint.totalDurationMinutes) > 0
            ? minutesToLabel(blueprint.totalDurationMinutes)
            : modulesForBlueprint.length
            ? `${modulesForBlueprint.length} modules`
            : '—',
        outstanding: outstanding.filter(Boolean),
        upcoming: upcoming.map((milestone, index) => ({
          id: milestone.id ?? `${blueprint.publicId ?? blueprint.id}-milestone-${index}`,
          type: milestone.type ?? 'Milestone',
          due: milestone.dueAt ? formatDateTime(milestone.dueAt, { dateStyle: 'medium' }) : null,
          title: milestone.title ?? 'Upcoming checkpoint'
        })),
        modules: modulesForBlueprint.map((module) => ({
          id: module.moduleId ? `module-${module.moduleId}` : `blueprint-module-${module.id}`,
          title: module.title,
          release: module.releaseLabel ?? null,
          lessons: module.lessonCount ?? 0,
          assignments: module.assignmentCount ?? 0,
          duration: minutesToLabel(module.durationMinutes ?? 0),
          outstanding: Array.isArray(module.outstandingTasks) ? module.outstandingTasks.filter(Boolean) : []
        }))
      });
    });
  });
  creationBlueprints.sort((a, b) => b.readiness - a.readiness);

  const lifecycleEntries = courses
    .map((course) => {
      const courseRecord = courseById.get(course.id) ?? course;
      const moduleRecords = modulesByCourse.get(course.id) ?? [];
      const moduleEntries = moduleRecords.map((module) => {
        const creationMeta = module.metadata?.creation ?? {};
        const tasks = Array.isArray(creationMeta.tasksOutstanding)
          ? creationMeta.tasksOutstanding
          : Array.isArray(module.metadata?.tasksOutstanding)
          ? module.metadata.tasksOutstanding
          : [];
        const lastUpdatedIso = creationMeta.lastUpdatedAt ?? module.updatedAt ?? courseRecord.updatedAt ?? null;
        const lastUpdatedLabel = lastUpdatedIso
          ? formatRelativeDay(new Date(lastUpdatedIso), now)
          : 'Recently updated';
        return {
          id: module.publicId ?? `module-${module.id}`,
          title: module.title,
          status: creationMeta.status ?? 'Draft',
          owner: creationMeta.owner ?? 'Unassigned',
          lastUpdated: lastUpdatedLabel,
          qualityGate: creationMeta.qualityGate ?? 'N/A',
          tasksOutstanding: tasks.filter(Boolean)
        };
      });

      const launchRecord = launchesByCourse.get(course.id) ?? null;
      const checklistItems = launchRecord ? checklistByLaunch.get(launchRecord.id) ?? [] : [];
      const signalItems = launchRecord ? signalsByLaunch.get(launchRecord.id) ?? [] : [];

      const sequenceList = dripSequencesByCourse.get(course.id) ?? [];
      const primarySequence = sequenceList[0] ?? null;
      const segmentList = primarySequence ? dripSegmentsBySequence.get(primarySequence.id) ?? [] : [];
      const scheduleList = primarySequence ? dripSchedulesBySequence.get(primarySequence.id) ?? [] : [];

      const refresherList = refresherLessonsByCourse.get(course.id) ?? [];
      const recordedList = recordedAssetsByCourse.get(course.id) ?? [];
      const catalogueList = catalogueListingsByCourse.get(course.id) ?? [];
      const reviewList = reviewsByCourse.get(course.id) ?? [];
      const mobileList = mobileExperiencesByCourse.get(course.id) ?? [];

      const ratingValues = reviewList
        .map((review) => Number(review.rating ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0);
      const reviewSummary = ratingValues.length
        ? `${(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1)}/5 · ${reviewList.length} reviews`
        : null;

      return {
        id: courseRecord.publicId ?? `lifecycle-${course.id}`,
        courseId: course.id,
        courseTitle: courseRecord.title,
        stage: launchRecord?.phase ?? courseRecord.status ?? 'Planning',
        reviewSummary,
        launch: {
          target: launchRecord?.targetDate ? launchRecord.targetDate.toISOString() : null,
          targetLabel:
            launchRecord?.targetLabel ??
            (launchRecord?.targetDate ? formatDateTime(launchRecord.targetDate, { dateStyle: 'medium' }) : 'Date pending'),
          phase: launchRecord?.phase ?? 'Planning',
          owner: launchRecord?.owner ?? 'Unassigned',
          riskLevel: launchRecord?.riskLevel ?? 'On track',
          riskTone: launchRecord?.riskTone ?? 'low',
          activationCoverage: launchRecord?.activationCoverage ?? '0% trained',
          confidence: Number(launchRecord?.confidenceScore ?? 0),
          checklist: checklistItems.map((item) => ({
            id: item.publicId ?? `check-${item.id}`,
            label: item.label,
            completed: item.completed === true,
            owner: item.owner ?? launchRecord?.owner ?? 'Unassigned',
            due: item.dueAt ? item.dueAt.toISOString() : null
          })),
          signals: signalItems.map((signal) => ({
            id: signal.publicId ?? `signal-${signal.id}`,
            label: signal.label,
            severity: signal.severity ?? 'info',
            description: signal.description ?? null,
            action: signal.actionLabel ?? null,
            actionHref: signal.actionHref ?? null
          }))
        },
        mobile: {
          status: mobileList[0]?.status ?? 'Pending review',
          experiences: mobileList
            .map((experience) => experience.experienceType ?? experience.description)
            .filter(Boolean)
        },
        drip: {
          cadence: primarySequence?.cadence ?? 'Weekly',
          anchor: primarySequence?.anchor ?? 'enrollment',
          timezone: primarySequence?.timezone ?? 'UTC',
          segments: segmentList.map((segment) => segment.label ?? segment.audience).filter(Boolean),
          schedule: scheduleList.map((entry) => ({
            id: entry.publicId ?? `drip-${entry.id}`,
            title: entry.title,
            releaseLabel:
              entry.releaseLabel ??
              (Number.isFinite(Number(entry.offsetDays)) ? `Day ${entry.offsetDays}` : 'Scheduled release'),
            gating: entry.gating ?? 'Immediate access',
            prerequisites: entry.prerequisites ?? [],
            notifications: entry.notifications ?? [],
            workspace: entry.workspace ?? entry.metadata?.workspace ?? null
          }))
        },
        modules: moduleEntries,
        refresherLessons: refresherList.map((lesson) => ({
          id: lesson.publicId ?? `refresher-${lesson.id}`,
          title: lesson.title,
          format: lesson.format ?? 'Live session',
          cadence: lesson.cadence ?? 'Ad-hoc',
          owner: lesson.owner ?? 'Unassigned',
          status: lesson.status ?? 'Scheduled',
          nextSession: lesson.nextSessionAt
            ? formatRelativeDay(lesson.nextSessionAt, now)
            : 'Scheduling required',
          channel: lesson.channel ?? 'Learning hub',
          enrollmentWindow: lesson.enrollmentWindow ?? 'TBA'
        })),
        recordedVideos: recordedList.map((asset) => ({
          id: asset.publicId ?? `recorded-${asset.id}`,
          title: asset.title,
          duration: minutesToLabel(asset.durationMinutes ?? 0),
          quality: asset.quality ?? 'HD',
          status: asset.status ?? 'Draft',
          updated: asset.updatedAtSource
            ? formatRelativeDay(asset.updatedAtSource, now)
            : asset.updatedAt
            ? formatRelativeDay(asset.updatedAt, now)
            : 'Recently updated',
          size: asset.sizeMb ? `${asset.sizeMb}MB` : null,
          language: asset.language ?? 'English',
          aspectRatio: asset.aspectRatio ?? '16:9'
        })),
        catalogue: catalogueList.map((listing) => ({
          id: listing.publicId ?? `catalog-${listing.id}`,
          channel: listing.channel,
          status: listing.status,
          price: formatCurrency(listing.priceAmount ?? 0, listing.priceCurrency ?? 'USD'),
          impressions: listing.impressions ?? 0,
          conversions: listing.conversions ?? 0,
          conversionRate:
            listing.conversionRate !== null && listing.conversionRate !== undefined
              ? `${(Number(listing.conversionRate) * 100).toFixed(2)}%`
              : '—',
          lastSynced: listing.lastSyncedAt ? formatRelativeDay(listing.lastSyncedAt, now) : 'Not synced'
        })),
        reviews: reviewList.map((review) => ({
          id: review.publicId ?? `review-${review.id}`,
          reviewer: review.reviewerName ?? 'Reviewer',
          role: review.reviewerRole ?? null,
          company: review.reviewerCompany ?? null,
          rating: review.rating ?? null,
          headline: review.headline ?? null,
          feedback: review.feedback ?? null,
          submittedAt: review.submittedAt ? formatRelativeDay(review.submittedAt, now) : null,
          delivery: review.deliveryMode ?? null,
          experience: review.experience ?? null
        }))
      };
    })
    .filter((entry) => entry.modules.length || entry.launch.checklist.length || entry.refresherLessons.length);

  const libraryAssets = recordedAssets.map((asset) => {
    const courseRecord = courseById.get(asset.courseId);
    const updatedSource = asset.updatedAtSource ?? asset.updatedAt ?? null;
    return {
      id: asset.publicId ?? `asset-${asset.id}`,
      courseId: asset.courseId,
      courseTitle: courseRecord?.title ?? 'Course',
      title: asset.title,
      format: asset.format ?? 'Video',
      status: asset.status ?? 'Draft',
      durationMinutes: asset.durationMinutes ?? 0,
      durationLabel: minutesToLabel(asset.durationMinutes ?? 0),
      updated: updatedSource ? formatRelativeDay(updatedSource, now) : 'Recently updated',
      audience: asset.audience ?? 'Learners',
      tags: Array.isArray(asset.tags) ? asset.tags : [],
      engagement: { completionRate: asset.engagementCompletionRate ?? null }
    };
  });

  workspace.creationBlueprints = creationBlueprints;
  workspace.lifecycle = lifecycleEntries;
  workspace.library = libraryAssets;

  const cohortMap = new Map();
  enrollmentRecords.forEach((enrollment) => {
    const course = courseById.get(enrollment.courseId);
    if (!course) return;
    const cohortLabel = enrollment.metadata?.cohort ?? 'General';
    const key = `${enrollment.courseId}:${cohortLabel}`;
    let record = cohortMap.get(key);
    if (!record) {
      const releaseAtDate = normaliseDate(course?.releaseAt);
      record = {
        id: `cohort-${enrollment.courseId}-${cohortLabel}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
        courseId: enrollment.courseId,
        courseTitle: course.title,
        label: cohortLabel,
        enrollments: [],
        firstStartAt: null,
        releaseAt: releaseAtDate
      };
      cohortMap.set(key, record);
    }
    record.enrollments.push(enrollment);
    const enrollmentStart = normaliseDate(enrollment.startedAt);
    if (enrollmentStart) {
      if (!record.firstStartAt || enrollmentStart < record.firstStartAt) {
        record.firstStartAt = enrollmentStart;
      }
    }
  });

  const pipeline = [];
  const cohortHealth = [];
  cohortMap.forEach((cohort) => {
    const total = cohort.enrollments.length;
    const activeCount = cohort.enrollments.filter((enr) => enr.status === 'active').length;
    const completedCount = cohort.enrollments.filter((enr) => enr.status === 'completed').length;
    const invitedCount = cohort.enrollments.filter((enr) => enr.status === 'invited').length;
    const averageProgress = total
      ? Math.round(
          cohort.enrollments.reduce((sum, enr) => sum + Number(enr.progressPercent ?? 0), 0) / total
        )
      : 0;
    const startDate = normaliseDate(cohort.firstStartAt ?? cohort.releaseAt);
    const stage = completedCount === total && total > 0 ? 'Completed' : activeCount > 0 ? 'In flight' : 'Scheduled';
    pipeline.push({
      id: cohort.id,
      name: `${cohort.courseTitle} · ${cohort.label}`,
      stage,
      startDate: startDate ? formatDateTime(startDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD',
      learners: activeCount + invitedCount
    });

    const atRiskLearners = cohort.enrollments.filter((enr) => {
      const stats = progressByEnrollment.get(enr.id);
      return determineRiskLevel(enr, stats, now) !== 'low';
    });

    const lastActivityAt = cohort.enrollments.reduce((latest, enr) => {
      const stats = progressByEnrollment.get(enr.id);
      if (stats?.lastCompletedAt && (!latest || stats.lastCompletedAt > latest)) {
        return stats.lastCompletedAt;
      }
      return latest;
    }, null);

    cohortHealth.push({
      id: cohort.id,
      courseId: cohort.courseId,
      courseTitle: cohort.courseTitle,
      cohort: cohort.label,
      stage,
      activeLearners: activeCount,
      completionRate: total ? Number((completedCount / total).toFixed(2)) : 0,
      averageProgress,
      atRiskLearners: atRiskLearners.length,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      launchAt: startDate ? startDate.toISOString() : null
    });
  });

  workspace.pipeline = pipeline;
  workspace.analytics.cohortHealth = cohortHealth;

  const averageCompletion = cohortHealth.length
    ? Math.round(
        (cohortHealth.reduce((sum, entry) => sum + entry.completionRate, 0) / cohortHealth.length) * 100
      )
    : 0;
  const trending = [...catalogue]
    .sort((a, b) => b.averageProgress - a.averageProgress)
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      averageProgress: entry.averageProgress,
      learners: entry.learners.active + entry.learners.completed,
      localisation: entry.localisation
    }));
  workspace.analytics.velocity = { averageCompletion, trending };

  const production = [];
  modulesByCourse.forEach((moduleList, courseId) => {
    const course = courseById.get(courseId);
    moduleList.forEach((module) => {
      const creationMeta = safeJsonParse(module.metadata?.creation, {});
      production.push({
        id: `module-${module.id}`,
        asset: `${course?.title ?? 'Course'} · ${module.title}`,
        status: creationMeta.status ?? 'Backlog',
        owner: creationMeta.owner ?? resolveName(course?.instructorFirstName, course?.instructorLastName, 'Owner'),
        gating: module.metadata?.drip?.gating ?? null,
        updatedAt: module.updatedAt ? module.updatedAt.toISOString() : null
      });
    });
  });
  assignments.forEach((assignment) => {
    const course = courseById.get(assignment.courseId);
    const metadata = safeJsonParse(assignment.metadata, {});
    const dueDate = resolveAssignmentDueDate(assignment, course);
    production.push({
      id: `assignment-${assignment.id}`,
      asset: `${course?.title ?? 'Course'} · ${assignment.title}`,
      status: metadata.requiresReview ? 'Awaiting review' : 'Scheduled',
      owner: metadata.owner ?? 'Curriculum',
      dueDate: dueDate ? formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD'
    });
  });
  workspace.production = production;

  const assignmentEntries = assignments.map((assignment) => {
    const course = courseById.get(assignment.courseId);
    const metadata = safeJsonParse(assignment.metadata, {});
    const dueDate = resolveAssignmentDueDate(assignment, course);
    return {
      id: assignment.id,
      courseId: assignment.courseId,
      courseTitle: course?.title ?? 'Course',
      title: assignment.title,
      dueDate,
      dueLabel: dueDate ? formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD',
      requiresReview: Boolean(metadata.requiresReview),
      workflow: metadata.workflow ?? metadata.automation?.mode ?? 'manual',
      owner: metadata.owner ?? null
    };
  });
  const upcomingAssignments = assignmentEntries.filter(
    (entry) => entry.dueDate && entry.dueDate >= now && entry.dueDate.getTime() - now.getTime() <= 7 * DAY_IN_MS
  );
  const reviewQueue = assignmentEntries.filter((entry) => entry.requiresReview);
  const automationQueue = assignmentEntries.filter((entry) => String(entry.workflow).includes('automation'));
  workspace.assignments = {
    summary: {
      total: assignmentEntries.length,
      dueThisWeek: upcomingAssignments.length,
      requiresReview: reviewQueue.length
    },
    queues: {
      upcoming: upcomingAssignments.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        dueAt: entry.dueDate ? entry.dueDate.toISOString() : null,
        owner: entry.owner
      })),
      review: reviewQueue.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        owner: entry.owner
      })),
      automation: automationQueue.map((entry) => ({
        id: entry.id,
        title: entry.title,
        courseTitle: entry.courseTitle,
        mode: entry.workflow
      }))
    }
  };

  const collaboratorMap = ensureMap(creationCollaborators);
  const sessionMap = ensureMap(creationSessions);
  const drafts = creationProjects.map((project) => {
    const collaborators = collaboratorMap.get(project.id) ?? [];
    const sessions = sessionMap.get(project.id) ?? [];
    const collaboratorEntries = collaborators.map((collaborator) => {
      const user = collaboratorDirectory.get(collaborator.userId);
      return {
        id: collaborator.userId,
        role: collaborator.role ?? 'editor',
        displayName: user ? resolveName(user.firstName, user.lastName, user.email) : `User ${collaborator.userId}`,
        permissions: Array.isArray(collaborator.permissions) ? collaborator.permissions : []
      };
    });
    const sessionEntries = sessions.map((session) => {
      const user = collaboratorDirectory.get(session.participantId);
      return {
        id: session.publicId ?? session.id,
        participantId: session.participantId,
        participant: user ? resolveName(user.firstName, user.lastName, user.email) : `User ${session.participantId}`,
        role: session.role ?? 'viewer',
        capabilities: Array.isArray(session.capabilities) ? session.capabilities : [],
        joinedAt: session.joinedAt ? new Date(session.joinedAt).toISOString() : null
      };
    });
    return {
      id: project.publicId ?? `project-${project.id}`,
      projectId: project.id,
      courseId: project.metadata?.courseId ?? null,
      title: project.title,
      status: project.status,
      updatedAt: project.updatedAt ? project.updatedAt.toISOString?.() ?? new Date(project.updatedAt).toISOString() : null,
      outlineCount: Array.isArray(project.contentOutline) ? project.contentOutline.length : 0,
      collaborators: collaboratorEntries,
      activeSessions: sessionEntries,
      locales: Array.isArray(project.metadata?.locales) ? project.metadata.locales : [],
      complianceNotes: Array.isArray(project.complianceNotes) ? project.complianceNotes : [],
      publishingChannels: Array.isArray(project.publishingChannels) ? project.publishingChannels : [],
      analyticsTargets: project.analyticsTargets ?? {}
    };
  });

  const activeSessions = [];
  drafts.forEach((draft) => {
    draft.activeSessions.forEach((session) => {
      activeSessions.push({
        ...session,
        projectId: draft.projectId,
        projectPublicId: draft.id,
        projectTitle: draft.title
      });
    });
  });

  const languageUniverse = new Set();
  const publishedUniverse = new Set();
  catalogue.forEach((entry) => {
    entry.languages.forEach((language) => {
      languageUniverse.add(language.code);
      if (language.published) {
        publishedUniverse.add(language.code);
      }
    });
  });
  drafts.forEach((draft) => {
    draft.locales.forEach((locale) => {
      const code = String(locale).toLowerCase();
      languageUniverse.add(code);
      if (draft.status === 'published' || draft.status === 'approved') {
        publishedUniverse.add(code);
      }
    });
  });
  const missingLanguages = Array.from(languageUniverse).filter((code) => !publishedUniverse.has(code));
  workspace.authoring = {
    drafts,
    activeSessions,
    localisationCoverage: {
      totalLanguages: languageUniverse.size,
      publishedLanguages: publishedUniverse.size,
      missing: missingLanguages
    }
  };

  const roster = enrollmentRecords.map((enrollment) => {
    const stats = progressByEnrollment.get(enrollment.id) ?? { completionRatio: 0, lastCompletedAt: null };
    const course = courseById.get(enrollment.courseId);
    const lessonsForCourse = lessonsByCourse.get(enrollment.courseId) ?? [];
    const enrollmentMetadata =
      typeof enrollment.metadata === 'string'
        ? safeJsonParse(enrollment.metadata, {})
        : enrollment.metadata ?? {};
    const resolvedLearner = enrollment.resolvedLearner ?? {};
    const collaboratorMatch =
      (resolvedLearner.id && collaboratorDirectory.get(resolvedLearner.id)) ??
      (enrollment.userId && collaboratorDirectory.get(enrollment.userId)) ??
      null;
    const learnerId = resolvedLearner.id ?? collaboratorMatch?.id ?? enrollment.userId ?? null;
    const displayName = resolveName(
      resolvedLearner.firstName ?? collaboratorMatch?.firstName ?? enrollment.firstName,
      resolvedLearner.lastName ?? collaboratorMatch?.lastName ?? enrollment.lastName,
      resolvedLearner.email ?? collaboratorMatch?.email ?? enrollment.email ?? `Learner ${learnerId ?? enrollment.id}`
    );
    return {
      id: enrollment.publicId ?? `enrollment-${enrollment.id}`,
      learnerId,
      name: displayName,
      courseId: enrollment.courseId,
      courseTitle: course?.title ?? 'Course',
      status: enrollment.status,
      progressPercent: Number.isFinite(Number(enrollment.progressPercent))
        ? Number(enrollment.progressPercent)
        : Math.round((stats.completionRatio ?? 0) * 100),
      cohort: enrollmentMetadata.cohort ?? 'General',
      lastActivityAt: stats.lastCompletedAt ? stats.lastCompletedAt.toISOString() : null,
      nextLesson: resolveNextLesson(lessonsForCourse, stats),
      riskLevel: determineRiskLevel(enrollment, stats, now),
      notes: stats.notes ?? enrollmentMetadata.notes ?? [],
      lastLocation: stats.lastLocation ?? null
    };
  });

  const riskPriority = { critical: 0, high: 1, medium: 2, low: 3 };
  const riskAlerts = roster
    .filter((entry) => entry.riskLevel === 'critical' || entry.riskLevel === 'high')
    .sort((a, b) => {
      const riskDelta = (riskPriority[a.riskLevel] ?? 3) - (riskPriority[b.riskLevel] ?? 3);
      if (riskDelta !== 0) return riskDelta;
      return (a.progressPercent ?? 0) - (b.progressPercent ?? 0);
    })
    .slice(0, 10);

  workspace.learners = { roster, riskAlerts };

  return workspace;
}

function buildTutorNotifications({ bookings = [], now }) {
  const notifications = [];

  bookings
    .filter((booking) => booking.status === 'requested')
    .forEach((booking) => {
      const learnerName = resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner');
      const topic = booking.metadata?.topic ?? 'Mentorship session';
      const preferredLabel = resolvePreferredSlot(booking.metadata, now);
      const slaCandidate =
        booking.metadata?.slaDueAt ??
        booking.metadata?.preferredSlot?.startAt ??
        booking.metadata?.preferredAt ??
        null;
      const slaDate = normaliseDate(slaCandidate);

      notifications.push({
        id: `booking-request-${booking.id}`,
        type: 'request',
        title: 'New mentorship request',
        detail: `${learnerName} requested ${topic}`,
        message: `${learnerName} requested ${topic}`,
        receivedAt: booking.requestedAt ? new Date(booking.requestedAt) : now,
        deadline: slaDate ? slaDate.toISOString() : null,
        preferredSlot: preferredLabel,
        tone: 'info',
        ctaLabel: 'Review request',
        ctaPath: '/dashboard/instructor/tutor-bookings'
      });
    });

  bookings
    .filter((booking) => booking.status === 'confirmed')
    .forEach((booking) => {
      const learnerName = resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner');
      const topic = booking.metadata?.topic ?? 'Mentorship session';
      const start = normaliseDate(
        booking.scheduledStart ?? booking.metadata?.startAt ?? booking.metadata?.preferredSlot?.startAt ?? null
      );
      const deadlineIso = start ? start.toISOString() : null;
      const tone = start && start.getTime() - now.getTime() <= 48 * 60 * 60 * 1000 ? 'warning' : 'success';

      notifications.push({
        id: `booking-due-${booking.id}`,
        type: 'upcoming',
        title: 'Upcoming session',
        detail: `${topic} with ${learnerName}`,
        message: `${topic} with ${learnerName}`,
        scheduledFor: start ? formatDateTime(start, { dateStyle: 'medium', timeStyle: 'short' }) : null,
        deadline: deadlineIso,
        tone,
        ctaLabel: 'Open calendar',
        ctaPath: '/dashboard/instructor/tutor-bookings'
      });
    });

  return notifications;
}

function formatDateTime(dateLike, options) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function resolveAdPlacement(campaign) {
  const metadata = safeJsonParse(campaign.metadata, {});
  if (typeof metadata.featureFlag === 'string' && metadata.featureFlag.includes('explorer')) {
    return 'Explorer';
  }
  if (metadata.promotedCommunityId) {
    return 'Community spotlight';
  }
  return 'Learning feed';
}

function parseTargetingList(value) {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
}

export function buildInstructorDashboard({
  user,
  now = new Date(),
  courses = [],
  courseEnrollments = [],
  modules = [],
  lessons = [],
  assignments = [],
  courseProgress = [],
  creationProjects = [],
  creationCollaborators = new Map(),
  creationSessions = new Map(),
  collaboratorDirectory = new Map(),
  blueprints = [],
  blueprintModules = [],
  launches = [],
  launchChecklist = [],
  launchSignals = [],
  courseReviews = [],
  refresherLessons = [],
  recordedAssets = [],
  catalogueListings = [],
  dripSequences = [],
  dripSegments = [],
  dripSchedules = [],
  mobileExperiences = [],
  tutorProfiles = [],
  tutorAvailability = [],
  tutorBookings = [],
  liveClassrooms = [],
  assets: _assets = [],
  assetEvents: _assetEvents = [],
  communityMemberships = [],
  communityStats = [],
  communityResources: _communityResources = [],
  communityPosts: _communityPosts = [],
  adsCampaigns = [],
  adsMetrics = [],
  paywallTiers = [],
  communitySubscriptions = [],
  ebookRows: _ebookRows = [],
  ebookProgressRows = []
} = {}) {
  const hasSignals =
    courses.length ||
    communityMemberships.length ||
    tutorProfiles.length ||
    tutorBookings.length ||
    liveClassrooms.length ||
    adsCampaigns.length;

  if (!hasSignals) {
    return null;
  }

  const activeEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'active');
  const recentEnrollments = activeEnrollments.filter((enrollment) => {
    if (!enrollment.startedAt) return false;
    const startedAt = new Date(enrollment.startedAt);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    return startedAt >= thirtyDaysAgo;
  });

  const completedEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'completed');
  const averageCompletion = courseEnrollments.length
    ? Math.round((completedEnrollments.length / courseEnrollments.length) * 100)
    : 0;

  const upcomingLive = liveClassrooms
    .map((session) => ({
      ...session,
      startAt: session.startAt ? new Date(session.startAt) : null
    }))
    .filter((session) => session.startAt && session.startAt >= now);

  const metrics = [
    {
      label: 'Active learners',
      value: `${activeEnrollments.length}`,
      change: `+${recentEnrollments.length} last 30d`
    },
    {
      label: 'Avg completion',
      value: `${averageCompletion}%`,
      change: `${completedEnrollments.length} cohorts completed`
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingLive.length}`,
      change: `${tutorAvailability.length} tutor slot${tutorAvailability.length === 1 ? '' : 's'}`
    }
  ];

  const bookingsWithMetadata = tutorBookings.map((booking) => ({
    ...booking,
    metadata:
      typeof booking.metadata === 'string' ? safeJsonParse(booking.metadata, {}) : booking.metadata ?? {}
  }));

  const pipelineBookings = bookingsWithMetadata
    .filter((booking) => booking.status === 'requested')
    .map((booking) => {
      const metadata = booking.metadata ?? {};
      return {
        id: `booking-${booking.id}`,
        status: 'Requested',
        learner: resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner'),
        requested: booking.requestedAt ? humanizeRelativeTime(booking.requestedAt, now) : 'Awaiting review',
        topic: metadata.topic ?? 'Mentorship session',
        segment: resolveBookingSegment(metadata),
        preferred: resolvePreferredSlot(metadata, now),
        risk: metadata.risk ?? metadata.routing?.risk ?? null
      };
    });

  const confirmedBookings = bookingsWithMetadata
    .filter((booking) => booking.status === 'confirmed')
    .map((booking) => {
      const metadata = booking.metadata ?? {};
      const start = normaliseDate(
        booking.scheduledStart ?? metadata.startAt ?? metadata.preferredSlot?.startAt ?? null
      );
      const end = normaliseDate(booking.scheduledEnd ?? metadata.endAt ?? null);
      const durationMinutes = Number.isFinite(Number(booking.durationMinutes))
        ? Number(booking.durationMinutes)
        : Number(metadata.durationMinutes ?? 0);

      return {
        id: `booking-${booking.id}`,
        status: 'Confirmed',
        learner: resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner'),
        topic: metadata.topic ?? 'Mentorship session',
        segment: resolveBookingSegment(metadata),
        startAt: start ? start.toISOString() : null,
        endAt: end ? end.toISOString() : null,
        durationMinutes: durationMinutes || null,
        location: metadata.location ?? 'Virtual classroom',
        joinUrl: sanitiseDashboardHref(metadata.joinUrl ?? booking.meetingUrl ?? metadata.meetingUrl ?? null),
        meetingUrl: sanitiseDashboardHref(booking.meetingUrl ?? metadata.meetingUrl ?? null),
        recordingUrl: sanitiseDashboardHref(metadata.recordingUrl ?? null),
        notes: Array.isArray(metadata.notes) ? metadata.notes : [],
        date: start ? formatDateTime(start, { dateStyle: 'medium', timeStyle: 'short' }) : null
      };
    });

  const bookingStats = bookingsWithMetadata.reduce(
    (acc, booking) => {
      const status = String(booking.status ?? '').toLowerCase();
      acc.total += 1;
      if (status === 'requested') acc.pending += 1;
      if (status === 'confirmed') acc.confirmed += 1;
      if (status === 'completed') acc.completed += 1;
      if (status === 'cancelled') acc.cancelled += 1;

      if (status === 'confirmed' || status === 'completed') {
        const durationMinutes = Number.isFinite(Number(booking.durationMinutes))
          ? Number(booking.durationMinutes)
          : Number(booking.metadata?.durationMinutes ?? 0);
        const hourlyRate = Number(booking.hourlyRateAmount ?? booking.metadata?.hourlyRateAmount ?? 0);
        const sessionValue = durationMinutes > 0 ? Math.round((hourlyRate * durationMinutes) / 60) : hourlyRate;
        acc.revenueMinor += sessionValue;
      }

      return acc;
    },
    { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenueMinor: 0 }
  );
  bookingStats.revenue = Number((bookingStats.revenueMinor / 100).toFixed(2));

  const roster = tutorProfiles.map((profile) => ({
    id: profile.id,
    name: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
    status: profile.status ?? 'Active',
    headline: profile.headline ?? null,
    hourlyRate: profile.hourlyRateAmount ? formatCurrency(profile.hourlyRateAmount, profile.hourlyRateCurrency) : null,
    rating: profile.ratingAverage ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount ?? 0})` : null
  }));

  const availabilitySummary = aggregateTutorAvailability({
    availability: tutorAvailability.map((entry) => ({
      ...entry,
      metadata: typeof entry.metadata === 'string' ? safeJsonParse(entry.metadata, {}) : entry.metadata ?? {}
    })),
    bookings: bookingsWithMetadata,
    now
  });

  const tutorNotifications = buildTutorNotifications({ bookings: bookingsWithMetadata, now });

  const communityMap = new Map();
  communityMemberships.forEach((membership) => {
    const communityId = Number(membership.communityId);
    if (!Number.isFinite(communityId)) return;
    communityMap.set(communityId, {
      id: communityId,
      title: membership.communityName ?? `Community ${communityId}`,
      role: membership.role ?? 'member',
      status: membership.status ?? 'active'
    });
  });

  communityStats.forEach((stat) => {
    const communityId = Number(stat.community_id ?? stat.communityId);
    if (!communityMap.has(communityId)) return;
    const entry = communityMap.get(communityId);
    entry.metrics = {
      active: Number(stat.active_members ?? 0),
      pending: Number(stat.pending_members ?? 0),
      moderators: Number(stat.moderators ?? 0)
    };
  });

  const manageDeck = Array.from(communityMap.values()).map((community) => ({
    id: `community-${community.id}`,
    title: community.title,
    role: community.role,
    status: community.status,
    metrics: community.metrics ?? { active: 0, pending: 0, moderators: 0 }
  }));

  const paywallSummary = paywallTiers.map((tier) => {
    const subscribers = communitySubscriptions.filter(
      (subscription) => subscription.tierName === tier.name && subscription.status === 'active'
    );
    return {
      id: tier.id,
      name: tier.name,
      price: formatCurrency(tier.priceCents, tier.currency ?? 'USD'),
      interval: tier.billingInterval ?? 'monthly',
      members: `${subscribers.length} active`
    };
  });

  const campaigns = adsCampaigns.map((campaign) => {
    const metadata = safeJsonParse(campaign.metadata, {});
    const metricsForCampaign = adsMetrics
      .filter((metric) => Number(metric.campaignId) === Number(campaign.id))
      .map((metric) => ({
        ...metric,
        metricDate: metric.metricDate ? new Date(metric.metricDate) : null
      }));

    const totals = metricsForCampaign.reduce(
      (acc, metric) => {
        acc.impressions += Number(metric.impressions ?? 0);
        acc.clicks += Number(metric.clicks ?? 0);
        acc.conversions += Number(metric.conversions ?? 0);
        acc.spendCents += Number(metric.spendCents ?? 0);
        acc.revenueCents += Number(metric.revenueCents ?? 0);
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0, revenueCents: 0 }
    );

    const averageCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      placement: {
        surface: resolveAdPlacement(campaign)
      },
      targeting: {
        keywords: parseTargetingList(campaign.targetingKeywords),
        audiences: parseTargetingList(campaign.targetingAudiences),
        locations: parseTargetingList(campaign.targetingLocations),
        languages: parseTargetingList(campaign.targetingLanguages)
      },
      budget: {
        currency: campaign.budgetCurrency ?? 'USD',
        dailyCents: Number(campaign.budgetDailyCents ?? 0)
      },
      metrics: {
        totals,
        averageCtr,
        cpcCents: Number(campaign.cpcCents ?? 0),
        cpaCents: Number(campaign.cpaCents ?? 0)
      },
      metadata
    };
  });

  const totalSpendCents = campaigns.reduce((total, campaign) => total + campaign.metrics.totals.spendCents, 0);
  const totalCtr = campaigns.length
    ? campaigns.reduce((sum, campaign) => sum + campaign.metrics.averageCtr, 0) / campaigns.length
    : 0;

  const adsSummary = {
    activeCampaigns: campaigns.length,
    totalSpend: {
      cents: totalSpendCents,
      formatted: formatCurrency(totalSpendCents)
    },
    averageCtr: `${totalCtr.toFixed(2)}%`
  };

  const adPlacements = campaigns.map((campaign) => ({
    id: `placement-${campaign.id}`,
    name: campaign.name,
    surface: campaign.placement.surface,
    budgetLabel: `${formatCurrency(campaign.budget.dailyCents, campaign.budget.currency)}/day`
  }));

  const adTags = campaigns.flatMap((campaign) =>
    campaign.targeting.keywords.slice(0, 3).map((keyword) => ({
      campaignId: campaign.id,
      category: 'Keyword',
      label: keyword
    }))
  );

  const upcomingAssignments = assignments
    .map((assignment) => ({
      ...assignment,
      metadata: safeJsonParse(assignment.metadata, {}),
      courseTitle: assignment.courseTitle,
      dueDate: (() => {
        if (assignment.courseReleaseAt && Number.isFinite(Number(assignment.dueOffsetDays))) {
          const base = new Date(assignment.courseReleaseAt);
          return new Date(base.getTime() + Number(assignment.dueOffsetDays ?? 0) * DAY_IN_MS);
        }
        return null;
      })()
    }))
    .filter((assignment) => assignment.dueDate && assignment.dueDate >= now);

  const assessmentOverview = [
    {
      id: 'active-assessments',
      label: 'Active assessments',
      value: assignments.length
    },
    {
      id: 'pending-grading',
      label: 'Pending grading',
      value: assignments.filter((assignment) => assignment.metadata?.status === 'pending').length
    }
  ];

  const learningPace = buildLearningPace(
    ebookProgressRows.map((progress) => ({
      completedAt: progress.completedAt ?? now,
      durationMinutes: Number(progress.progressPercent ?? 0)
    })),
    now
  );

  const coursesWorkspace = buildCourseWorkspace({
    courses,
    modules,
    lessons,
    assignments,
    enrollments: courseEnrollments,
    courseProgress,
    creationProjects,
    creationCollaborators,
    creationSessions,
    collaboratorDirectory,
    blueprints,
    blueprintModules,
    launches,
    launchChecklist,
    launchSignals,
    courseReviews,
    refresherLessons,
    recordedAssets,
    catalogueListings,
    dripSequences,
    dripSegments,
    dripSchedules,
    mobileExperiences,
    now
  });

  const searchIndex = [
    ...courses.map((course) => ({
      id: `search-course-${course.id}`,
      role: 'instructor',
      type: 'Course',
      title: course.title,
      url: '/dashboard/instructor/courses/manage'
    })),
    ...tutorProfiles.map((profile) => ({
      id: `search-tutor-${profile.id}`,
      role: 'instructor',
      type: 'Tutor',
      title: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
      url: '/dashboard/instructor/tutor-management'
    }))
  ];

  const profileStats = [
    { label: 'Cohorts', value: `${courses.length} active` },
    { label: 'Communities', value: `${communityMemberships.length} managed` },
    { label: 'Tutor bookings', value: `${tutorBookings.length} total` }
  ];

  const profileBio = `Currently coaching ${courses.length} cohort${courses.length === 1 ? '' : 's'} and stewarding ${
    communityMemberships.length
  } community${communityMemberships.length === 1 ? '' : 'ies'}.`;

  return {
    role: { id: 'instructor', label: 'Instructor' },
    dashboard: {
      metrics,
      courses: coursesWorkspace,
      bookings: {
        pipeline: pipelineBookings,
        confirmed: confirmedBookings,
        stats: bookingStats
      },
      tutors: {
        roster,
        availability: availabilitySummary,
        notifications: tutorNotifications
      },
      communities: {
        manageDeck
      },
      pricing: {
        subscriptions: paywallSummary
      },
      ads: {
        summary: adsSummary,
        active: campaigns,
        placements: adPlacements,
        tags: adTags
      },
      assessments: {
        overview: assessmentOverview,
        timeline: {
          upcoming: upcomingAssignments.map((assignment) => ({
            id: `assignment-${assignment.id}`,
            course: assignment.courseTitle,
            type: 'Assignment',
            dueDate: formatDateTime(assignment.dueDate, {
              dateStyle: 'medium',
              timeStyle: undefined
            })
          }))
        }
      },
      analytics: {
        learningPace
      }
    },
    profileStats,
    profileBio,
    profileTitleSegment: 'Instructor operations overview',
    searchIndex
  };
}

function toInteger(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
  }
  return fallback;
}

function extractLatestTimestamp(values) {
  if (!values) {
    return null;
  }
  const flattened = Array.isArray(values) ? values.flat(Infinity) : [values];
  const timestamps = flattened
    .map((entry) => normaliseDate(entry))
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());
  if (!timestamps.length) {
    return null;
  }
  return new Date(Math.max(...timestamps)).toISOString();
}

function summariseBookingsSurface(dashboard) {
  if (!dashboard) {
    return null;
  }
  const base = dashboard.bookings && typeof dashboard.bookings === 'object' ? dashboard.bookings : {};
  const tutorBookings =
    dashboard.tutorBookings && typeof dashboard.tutorBookings === 'object' ? dashboard.tutorBookings : {};
  const active = Array.isArray(tutorBookings.active) ? tutorBookings.active : [];
  const history = Array.isArray(tutorBookings.history) ? tutorBookings.history : [];
  const allTutorBookings = [...active, ...history];
  const statusOf = (booking) => String(booking?.status ?? '').toLowerCase();
  const pendingTutorCount = allTutorBookings.filter((booking) => {
    const status = statusOf(booking);
    return (
      status === 'requested' ||
      status === 'pending' ||
      status === 'awaiting_confirmation' ||
      status === 'awaiting' ||
      status === 'reschedule_requested'
    );
  }).length;
  const scheduledTutorCount = allTutorBookings.filter((booking) => {
    const status = statusOf(booking);
    return status === 'confirmed' || status === 'scheduled' || status === 'approved';
  }).length;
  const completedTutorCount = allTutorBookings.filter((booking) => statusOf(booking) === 'completed').length;

  const fieldServices =
    dashboard.fieldServices && typeof dashboard.fieldServices === 'object' ? dashboard.fieldServices : {};
  const assignments = Array.isArray(fieldServices.assignments) ? fieldServices.assignments : [];
  const totals =
    fieldServices.summary && typeof fieldServices.summary === 'object' ? fieldServices.summary.totals ?? {} : {};
  const activeAssignments = toInteger(totals.active);
  const incidentTotal = toInteger(totals.incidents);
  const slaBreaches = toInteger(totals.slaBreaches);
  const riskAssignments = assignments.filter((assignment) => {
    const risk = String(assignment?.riskLevel ?? '').toLowerCase();
    if (['critical', 'severe', 'urgent', 'warning'].includes(risk)) {
      return true;
    }
    const status = String(assignment?.status ?? '').toLowerCase();
    return ['pending', 'pending_assignment', 'paused', 'investigating'].includes(status);
  }).length;

  const pendingCount = pendingTutorCount + activeAssignments;
  const scheduledCount = scheduledTutorCount;
  const openConflicts = riskAssignments + incidentTotal + slaBreaches;
  const unreadCount = pendingTutorCount;

  const lastSyncedAt = extractLatestTimestamp([
    base.lastSyncedAt,
    tutorBookings.syncedAt,
    fieldServices.summary?.updatedAt,
    fieldServices.lastUpdated,
    fieldServices.lastSyncedAt
  ]);

  const serviceHealth =
    openConflicts > 0
      ? 'critical'
      : incidentTotal > 0 || pendingCount > 4
        ? 'degraded'
        : pendingCount > 0
          ? 'notice'
          : 'operational';

  const metrics =
    Array.isArray(base.metrics) && base.metrics.length
      ? base.metrics
      : [
          { label: 'Pending', value: `${pendingCount}` },
          { label: 'Scheduled', value: `${scheduledCount}` },
          { label: 'Conflicts', value: `${openConflicts}` }
        ];

  return {
    ...base,
    pendingCount,
    scheduledCount,
    completedCount: completedTutorCount,
    openConflicts,
    unreadCount,
    serviceHealth,
    lastSyncedAt,
    metrics
  };
}

function summariseEbookSurface(dashboard) {
  if (!dashboard || !dashboard.ebooks) {
    return null;
  }
  const base = typeof dashboard.ebooks === 'object' ? dashboard.ebooks : {};
  const library = Array.isArray(base.library) ? base.library : [];
  const completedCount = library.filter((entry) => {
    const status = String(entry?.status ?? '').toLowerCase();
    if (status.includes('complete')) {
      return true;
    }
    const progress = Number(entry?.progress ?? entry?.progressPercent ?? 0);
    return Number.isFinite(progress) && progress >= 100;
  }).length;
  const inProgressCount = library.filter((entry) => {
    const progress = Number(entry?.progress ?? entry?.progressPercent ?? 0);
    return Number.isFinite(progress) && progress > 0 && progress < 100;
  }).length;
  const notStartedCount = Math.max(library.length - completedCount - inProgressCount, 0);
  const highlights = library.reduce(
    (sum, entry) => sum + toInteger(entry?.highlights ?? entry?.metadata?.highlights),
    0
  );
  const lastSyncedAt = extractLatestTimestamp([
    base.syncedAt,
    ...library.map((entry) => entry.lastOpened ?? entry.lastOpenedAt ?? entry.updatedAt)
  ]);

  const serviceHealth = completedCount || inProgressCount ? 'operational' : library.length ? 'notice' : 'attention';

  return {
    ...base,
    libraryCount: library.length,
    completedCount,
    inProgressCount,
    notStartedCount,
    highlights,
    unreadCount: notStartedCount,
    lastSyncedAt,
    serviceHealth
  };
}

function summariseAffiliateSurface(dashboard) {
  if (!dashboard || !dashboard.affiliate) {
    return null;
  }
  const base = typeof dashboard.affiliate === 'object' ? dashboard.affiliate : {};
  const channels = Array.isArray(base.channels) ? base.channels : [];
  const payouts = Array.isArray(base.payouts) ? base.payouts : [];
  const inactiveChannels = channels.filter((channel) => String(channel?.status ?? '').toLowerCase() !== 'active').length;
  const pendingPayouts = payouts.filter((payout) => {
    const status = String(payout?.status ?? '').toLowerCase();
    return status === 'scheduled' || status === 'processing';
  }).length;
  const totalChannels = base.summary?.totalChannels ?? channels.length;
  const activeChannels =
    base.summary?.activeChannels ?? channels.filter((channel) => String(channel?.status ?? '').toLowerCase() === 'active').length;
  const outstanding = base.summary?.outstanding ?? null;
  const lastSyncedAt = extractLatestTimestamp([
    base.summary?.updatedAt,
    ...channels.map((channel) => channel.updatedAt ?? channel.lastSyncedAt ?? channel.syncedAt)
  ]);

  const summary = {
    ...(base.summary ?? {}),
    totalChannels: toInteger(totalChannels, channels.length),
    activeChannels: toInteger(activeChannels, channels.length - inactiveChannels),
    outstanding
  };

  const pendingCount = inactiveChannels + pendingPayouts;
  const serviceHealth = inactiveChannels > 0 ? 'attention' : pendingPayouts > 0 ? 'notice' : 'operational';

  return {
    ...base,
    summary,
    alerts: inactiveChannels,
    openTasks: pendingPayouts,
    pendingCount,
    lastSyncedAt,
    serviceHealth
  };
}

function summariseAssessmentSurface(dashboard) {
  if (!dashboard || !dashboard.assessments) {
    return null;
  }
  const base = typeof dashboard.assessments === 'object' ? dashboard.assessments : {};
  const overview = Array.isArray(base.overview) ? base.overview : [];
  const metricMap = overview.reduce((acc, item) => {
    if (item?.id) {
      acc[item.id] = item.value;
    }
    return acc;
  }, {});
  const dueSoon = toInteger(metricMap['assessments-due-soon']);
  const overdue = toInteger(metricMap['assessments-overdue']);
  const completedCount = toInteger(metricMap['assessments-completed']);
  const upcomingCount = toInteger(metricMap['assessments-upcoming']);
  const pendingReviews = toInteger(base.analytics?.pendingReviews);
  const flaggedCount = Array.isArray(base.grading?.flagged)
    ? base.grading.flagged.length
    : toInteger(base.grading?.flagged);
  const lastSyncedAt = extractLatestTimestamp([
    base.syncedAt,
    base.timeline?.lastUpdated,
    ...(Array.isArray(base.timeline?.upcoming)
      ? base.timeline.upcoming.map((item) => item.dueDate ?? item.due ?? item.startAt)
      : []),
    ...(Array.isArray(base.timeline?.overdue)
      ? base.timeline.overdue.map((item) => item.dueDate ?? item.due ?? item.startAt)
      : [])
  ]);

  const serviceHealth = overdue > 0 || pendingReviews > 0 ? 'notice' : 'operational';

  return {
    ...base,
    dueSoon,
    overdue,
    completedCount,
    upcomingCount,
    pendingReviews,
    flaggedCount,
    lastSyncedAt,
    serviceHealth
  };
}

function summariseInboxSurface(dashboard, { now = new Date() } = {}) {
  const source =
    (dashboard && typeof dashboard.inbox === 'object' && dashboard.inbox) ||
    (dashboard && typeof dashboard.support === 'object' && dashboard.support);
  if (!source) {
    return null;
  }
  const metrics = source.metrics && typeof source.metrics === 'object' ? source.metrics : {};
  const cases = Array.isArray(source.cases) ? source.cases : [];
  const openTickets = toInteger(metrics.open);
  const waiting = toInteger(metrics.waiting);
  const awaitingLearner = toInteger(metrics.awaitingLearner);
  const averageResponseMinutes = toInteger(metrics.averageResponseMinutes);
  const casesRisk = cases.filter((ticket) => {
    const priority = String(ticket?.priority ?? '').toLowerCase();
    if (priority === 'urgent' || priority === 'high') {
      return true;
    }
    const status = String(ticket?.status ?? '').toLowerCase();
    if (status === 'escalated') {
      return true;
    }
    const severity = String(ticket?.metadata?.severity ?? ticket?.metadata?.risk ?? '').toLowerCase();
    if (['critical', 'high'].includes(severity)) {
      return true;
    }
    const followUp = normaliseDate(ticket?.followUpDueAt ?? ticket?.metadata?.followUpDueAt);
    return followUp && followUp.getTime() < (now instanceof Date ? now.getTime() : Date.now());
  }).length;
  const unreadCount = cases.filter((ticket) => {
    const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
    const lastMessage = messages[messages.length - 1];
    const status = String(ticket?.status ?? '').toLowerCase();
    return (
      lastMessage &&
      lastMessage.author === 'learner' &&
      (status === 'open' || status === 'waiting' || status === 'pending')
    );
  }).length;

  const lastSyncedAt = extractLatestTimestamp([
    metrics.latestUpdatedAt,
    ...cases.map((ticket) => ticket.updatedAt ?? ticket.metadata?.updatedAt ?? ticket.messages?.slice(-1)?.[0]?.createdAt)
  ]);

  const pendingCount = waiting + awaitingLearner;
  const serviceHealth = casesRisk > 0 ? 'degraded' : pendingCount > 0 ? 'notice' : 'operational';

  return {
    ...source,
    openTickets,
    pendingCount,
    unreadCount,
    averageResponseMinutes,
    riskCount: casesRisk,
    lastSyncedAt,
    serviceHealth
  };
}

function summariseCourseSurface(dashboard) {
  if (!dashboard) {
    return null;
  }
  const courseModule = dashboard.courses && typeof dashboard.courses === 'object' ? dashboard.courses : null;
  if (!courseModule) {
    return null;
  }
  const base = dashboard.course && typeof dashboard.course === 'object' ? dashboard.course : {};
  const catalogue = Array.isArray(courseModule.catalogue) ? courseModule.catalogue : [];
  const activeCourses = Array.isArray(courseModule.active) ? courseModule.active : [];
  const goals = Array.isArray(courseModule.goals) ? courseModule.goals : [];
  const modulesTotal = catalogue.reduce((sum, course) => sum + toInteger(course?.modules), 0);
  const completedLessons = activeCourses.reduce((sum, course) => sum + toInteger(course?.completedLessons), 0);
  const certificatesReady = activeCourses.filter((course) => {
    const progress = toInteger(course?.progress ?? course?.progressPercent);
    const status = String(course?.goal?.statusKey ?? course?.goalStatus ?? '').toLowerCase();
    return progress >= 100 || status === 'completed' || status === 'ready';
  }).length;

  const notificationItems = Array.isArray(dashboard.notifications?.items) ? dashboard.notifications.items : [];
  const unreadAnnouncements = notificationItems.filter((item) => {
    const type = String(item?.type ?? '').toLowerCase();
    return Boolean(item?.unread) || type === 'announcement' || type === 'mentor';
  }).length;

  const lastSyncedAt = extractLatestTimestamp([
    base.lastSyncedAt,
    ...activeCourses.map((course) => course.lastTouchedAt ?? course.goal?.dueDate),
    ...goals.map((goal) => goal?.dueDate ?? goal?.updatedAt)
  ]);

  const serviceHealth = activeCourses.length
    ? certificatesReady > 0
      ? 'operational'
      : 'notice'
    : 'attention';

  return {
    ...base,
    activeModules: modulesTotal,
    completedLessons,
    certificatesReady,
    unreadAnnouncements,
    lastSyncedAt,
    serviceHealth
  };
}

function attachDashboardSurfaceSummaries(dashboards, { now } = {}) {
  if (!dashboards || typeof dashboards !== 'object') {
    return;
  }
  const reference = normaliseDate(now) ?? new Date();
  Object.entries(dashboards).forEach(([, dashboard]) => {
    if (!dashboard || typeof dashboard !== 'object') {
      return;
    }

    const bookings = summariseBookingsSurface(dashboard);
    if (bookings) {
      dashboard.bookings = { ...(dashboard.bookings ?? {}), ...bookings };
    }

    const ebooks = summariseEbookSurface(dashboard);
    if (ebooks) {
      dashboard.ebooks = { ...(dashboard.ebooks ?? {}), ...ebooks };
    }

    const affiliate = summariseAffiliateSurface(dashboard);
    if (affiliate) {
      dashboard.affiliate = { ...(dashboard.affiliate ?? {}), ...affiliate };
    }

    const assessments = summariseAssessmentSurface(dashboard);
    if (assessments) {
      dashboard.assessments = { ...(dashboard.assessments ?? {}), ...assessments };
    }

    const inbox = summariseInboxSurface(dashboard, { now: reference });
    if (inbox) {
      dashboard.support = { ...(dashboard.support ?? {}), ...inbox };
      dashboard.inbox = { ...(dashboard.inbox ?? {}), ...inbox };
    }

    const courseSurface = summariseCourseSurface(dashboard);
    if (courseSurface) {
      dashboard.course = { ...(dashboard.course ?? {}), ...courseSurface };
      dashboard.courseViewer = { ...(dashboard.courseViewer ?? {}), ...courseSurface };
    }
  });
}

export default class DashboardService {
  static async getDashboardForUser(userId, { referenceDate = new Date() } = {}) {
    const { default: UserModel } = await import('../models/UserModel.js');
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const dashboardPreferencesRaw = safeJsonParse(user.dashboardPreferences ?? user.dashboard_preferences, {});
    const pinnedNavigation = Array.isArray(dashboardPreferencesRaw.pinnedNavigation)
      ? Array.from(
          new Set(
            dashboardPreferencesRaw.pinnedNavigation
              .filter((entry) => typeof entry === 'string')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0)
          )
        )
      : [];

    let supportCases = [];
    let knowledgeBaseArticles = DEFAULT_SUPPORT_KB;
    const supportMetrics = {
      open: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      awaitingLearner: 0,
      averageResponseMinutes: 0,
      latestUpdatedAt: null
    };
    let growthInitiativesRaw = [];
    let growthExperimentsByInitiative = new Map();
    let affiliateChannelsRaw = [];
    let affiliatePayoutsRaw = [];
    let adCampaignsRaw = [];
    let instructorApplicationRaw = null;
    try {
      supportCases = await LearnerSupportRepository.listCases(user.id);
      const responseDurations = [];
      const categoryHistogram = new Map();
      supportCases.forEach((supportCase) => {
        const status = (supportCase.status ?? 'open').toLowerCase();
        if (supportMetrics[status] !== undefined) {
          supportMetrics[status] += 1;
        } else {
          supportMetrics.open += 1;
        }
        const categoryLabel =
          typeof supportCase.category === 'string' && supportCase.category.trim().length
            ? supportCase.category.trim()
            : 'General';
        categoryHistogram.set(categoryLabel, (categoryHistogram.get(categoryLabel) ?? 0) + 1);
        const messages = Array.isArray(supportCase.messages) ? supportCase.messages : [];
        if (messages.length) {
          const latestMessage = messages[messages.length - 1];
          if (latestMessage.author !== 'learner' && status !== 'resolved' && status !== 'closed') {
            supportMetrics.awaitingLearner += 1;
          }
          messages.forEach((message, index) => {
            if (message.author !== 'learner') {
              for (let previous = index - 1; previous >= 0; previous -= 1) {
                const candidate = messages[previous];
                if (candidate.author === 'learner') {
                  const agentDate = new Date(message.createdAt ?? 0);
                  const learnerDate = new Date(candidate.createdAt ?? 0);
                  if (!Number.isNaN(agentDate.getTime()) && !Number.isNaN(learnerDate.getTime())) {
                    const diffMinutes = Math.max(
                      0,
                      Math.round((agentDate.getTime() - learnerDate.getTime()) / (60 * 1000))
                    );
                    responseDurations.push(diffMinutes);
                  }
                  break;
                }
              }
            }
          });
          const latestTimestamp = latestMessage.createdAt ?? supportCase.updatedAt;
          if (latestTimestamp) {
            const latestDate = new Date(latestTimestamp);
            if (!Number.isNaN(latestDate.getTime())) {
              if (!supportMetrics.latestUpdatedAt) {
                supportMetrics.latestUpdatedAt = latestDate.toISOString();
              } else if (new Date(supportMetrics.latestUpdatedAt) < latestDate) {
                supportMetrics.latestUpdatedAt = latestDate.toISOString();
              }
            }
          }
        }
      });
      if (responseDurations.length) {
        supportMetrics.averageResponseMinutes = Math.round(
          responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
        );
      }

      try {
        const sortedCategories = Array.from(categoryHistogram.entries()).sort((a, b) => b[1] - a[1]);
        const topCategory = sortedCategories.length ? sortedCategories[0][0] : null;
        const searchOptions = { limit: 6 };
        if (topCategory) {
          searchOptions.category = topCategory;
        }

        let articles = await SupportKnowledgeBaseService.searchArticles(searchOptions);
        if ((!articles || !articles.length) && topCategory) {
          articles = await SupportKnowledgeBaseService.searchArticles({ limit: 6 });
        }

        if (Array.isArray(articles) && articles.length) {
          const deduped = new Map();
          articles.forEach((article, index) => {
            if (!article) {
              return;
            }
            const id =
              article.id ??
              article.slug ??
              (crypto.randomUUID ? crypto.randomUUID() : `kb-${Date.now()}-${index}`);
            if (deduped.has(id)) {
              return;
            }
            const minutes = Number.isFinite(Number(article.minutes)) ? Number(article.minutes) : 3;
            deduped.set(id, {
              id,
              title: article.title ?? 'Support article',
              excerpt: article.excerpt ?? article.summary ?? '',
              url: article.url ?? '#',
              category: article.category ?? 'General',
              minutes,
              helpfulnessScore: Number(article.helpfulnessScore ?? 0)
            });
          });
          if (deduped.size) {
            knowledgeBaseArticles = Array.from(deduped.values());
          }
        }
      } catch (knowledgeBaseError) {
        log.warn({ err: knowledgeBaseError }, 'Failed to load support knowledge base articles');
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load learner support workspace data');
      supportCases = [];
      knowledgeBaseArticles = DEFAULT_SUPPORT_KB;
    }

    let courseWorkspaceInput = {
      courses: [],
      modules: [],
      lessons: [],
      assignments: [],
      enrollments: [],
      courseProgress: [],
      creationProjects: [],
      creationCollaborators: new Map(),
      creationSessions: new Map(),
      collaboratorDirectory: new Map(),
      blueprints: [],
      blueprintModules: [],
      launches: [],
      launchChecklist: [],
      launchSignals: [],
      courseReviews: [],
      refresherLessons: [],
      recordedAssets: [],
      catalogueListings: [],
      dripSequences: [],
      dripSegments: [],
      dripSchedules: [],
      mobileExperiences: []
    };

    try {
      const { default: CourseModel } = await import('../models/CourseModel.js');
      const courses = await CourseModel.listByInstructor(user.id, {
        includeArchived: false,
        includeDrafts: true,
        limit: 50
      });
      courseWorkspaceInput.courses = courses;

      if (courses.length) {
        const courseIds = courses.map((course) => course.id);
        const [
          { default: CourseModuleModel },
          { default: CourseLessonModel },
          { default: CourseAssignmentModel },
          { default: CourseEnrollmentModel },
          { default: CourseProgressModel },
          { default: CourseBlueprintModel },
          { default: CourseBlueprintModuleModel },
          { default: CourseLaunchModel },
          { default: CourseLaunchChecklistItemModel },
          { default: CourseLaunchSignalModel },
          { default: CourseReviewModel },
          { default: CourseRefresherLessonModel },
          { default: CourseRecordedAssetModel },
          { default: CourseCatalogueListingModel },
          { default: CourseDripSequenceModel },
          { default: CourseDripSegmentModel },
          { default: CourseDripScheduleModel },
          { default: CourseMobileExperienceModel }
        ] = await Promise.all([
          import('../models/CourseModuleModel.js'),
          import('../models/CourseLessonModel.js'),
          import('../models/CourseAssignmentModel.js'),
          import('../models/CourseEnrollmentModel.js'),
          import('../models/CourseProgressModel.js'),
          import('../models/CourseBlueprintModel.js'),
          import('../models/CourseBlueprintModuleModel.js'),
          import('../models/CourseLaunchModel.js'),
          import('../models/CourseLaunchChecklistItemModel.js'),
          import('../models/CourseLaunchSignalModel.js'),
          import('../models/CourseReviewModel.js'),
          import('../models/CourseRefresherLessonModel.js'),
          import('../models/CourseRecordedAssetModel.js'),
          import('../models/CourseCatalogueListingModel.js'),
          import('../models/CourseDripSequenceModel.js'),
          import('../models/CourseDripSegmentModel.js'),
          import('../models/CourseDripScheduleModel.js'),
          import('../models/CourseMobileExperienceModel.js')
        ]);

        const [
          modules,
          lessons,
          assignments,
          enrollments,
          blueprints,
          launches,
          reviews,
          refresherLessons,
          recordedAssets,
          catalogueListings,
          dripSequences,
          mobileExperiences
        ] = await Promise.all([
          CourseModuleModel.listByCourseIds(courseIds),
          CourseLessonModel.listByCourseIds(courseIds),
          CourseAssignmentModel.listByCourseIds(courseIds),
          CourseEnrollmentModel.listByCourseIds(courseIds),
          CourseBlueprintModel.listByCourseIds(courseIds),
          CourseLaunchModel.listByCourseIds(courseIds),
          CourseReviewModel.listByCourseIds(courseIds),
          CourseRefresherLessonModel.listByCourseIds(courseIds),
          CourseRecordedAssetModel.listByCourseIds(courseIds),
          CourseCatalogueListingModel.listByCourseIds(courseIds),
          CourseDripSequenceModel.listByCourseIds(courseIds),
          CourseMobileExperienceModel.listByCourseIds(courseIds)
        ]);

        const enrollmentIds = enrollments.map((enrollment) => enrollment.id).filter(Boolean);
        const courseProgressRows = enrollmentIds.length
          ? await CourseProgressModel.listByEnrollmentIds(enrollmentIds)
          : [];

        let blueprintModules = [];
        const blueprintIds = blueprints.map((blueprint) => blueprint.id).filter(Boolean);
        if (blueprintIds.length) {
          blueprintModules = await CourseBlueprintModuleModel.listByBlueprintIds(blueprintIds);
        }

        let launchChecklist = [];
        let launchSignals = [];
        const launchIds = launches.map((launch) => launch.id).filter(Boolean);
        if (launchIds.length) {
          [launchChecklist, launchSignals] = await Promise.all([
            CourseLaunchChecklistItemModel.listByLaunchIds(launchIds),
            CourseLaunchSignalModel.listByLaunchIds(launchIds)
          ]);
        }

        let dripSegments = [];
        let dripSchedules = [];
        const sequenceIds = dripSequences.map((sequence) => sequence.id).filter(Boolean);
        if (sequenceIds.length) {
          [dripSegments, dripSchedules] = await Promise.all([
            CourseDripSegmentModel.listBySequenceIds(sequenceIds),
            CourseDripScheduleModel.listBySequenceIds(sequenceIds)
          ]);
        }

        courseWorkspaceInput = {
          ...courseWorkspaceInput,
          modules,
          lessons,
          assignments,
          enrollments,
          courseProgress: courseProgressRows,
          blueprints,
          blueprintModules,
          launches,
          launchChecklist,
          launchSignals,
          courseReviews: reviews,
          refresherLessons,
          recordedAssets,
          catalogueListings,
          dripSequences,
          dripSegments,
          dripSchedules,
          mobileExperiences
        };
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load instructor course catalogue data');
    }

    try {
      const [
        { default: CreationProjectModel },
        { default: CreationProjectCollaboratorModel },
        { default: CreationCollaborationSessionModel }
      ] = await Promise.all([
        import('../models/CreationProjectModel.js'),
        import('../models/CreationProjectCollaboratorModel.js'),
        import('../models/CreationCollaborationSessionModel.js')
      ]);

      const projects = await CreationProjectModel.list({
        ownerId: user.id,
        type: ['course'],
        includeArchived: false,
        limit: 25
      });

      const collaboratorMap = new Map();
      const sessionMap = new Map();
      if (projects.length) {
        const [collaboratorLists, sessionLists] = await Promise.all([
          Promise.all(projects.map((project) => CreationProjectCollaboratorModel.listByProject(project.id))),
          Promise.all(projects.map((project) => CreationCollaborationSessionModel.listActiveByProject(project.id)))
        ]);
        projects.forEach((project, index) => {
          collaboratorMap.set(project.id, collaboratorLists[index] ?? []);
          sessionMap.set(project.id, sessionLists[index] ?? []);
        });
      }

      courseWorkspaceInput = {
        ...courseWorkspaceInput,
        creationProjects: projects,
        creationCollaborators: collaboratorMap,
        creationSessions: sessionMap
      };
    } catch (error) {
      log.warn({ err: error }, 'Failed to load instructor authoring workspace data');
    }

    try {
      const collaboratorIds = new Set();
      courseWorkspaceInput.enrollments.forEach((enrollment) => collaboratorIds.add(enrollment.userId));
      courseWorkspaceInput.creationCollaborators.forEach((collaborators) => {
        collaborators.forEach((collaborator) => collaboratorIds.add(collaborator.userId));
      });
      courseWorkspaceInput.creationSessions.forEach((sessions) => {
        sessions.forEach((session) => collaboratorIds.add(session.participantId));
      });
      collaboratorIds.add(user.id);

      if (collaboratorIds.size) {
        const collaboratorRecords = await UserModel.findByIds(Array.from(collaboratorIds));
        const directory = new Map();
        collaboratorRecords.forEach((record) => {
          directory.set(record.id, record);
        });
        courseWorkspaceInput = {
          ...courseWorkspaceInput,
          collaboratorDirectory: directory
        };
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load collaborator directory for course workspace');
    }

    learnerSnapshot = undefined;
    communitySnapshot = undefined;
    communityMemberships = [];
    let communitySummaries = [];
    let communityMemberships = [];
    const communityEventsByCommunity = new Map();
    const communityRunbooksByCommunity = new Map();
    const communityPaywallTiersByCommunity = new Map();
    const communitySubscriptionsByCommunity = new Map();
    const communityPendingMembersByCommunity = new Map();
    const communityModeratorsByCommunity = new Map();
    const communicationsByCommunity = new Map();
    const communityModerationCases = [];
    let engagementTotals = { current: {}, previous: {} };

    try {
      const [
        { default: db },
        { default: CourseEnrollmentModel },
        { default: CourseProgressModel },
        { default: CourseModel },
        { default: EbookProgressModel },
        { default: CommunityService },
        { default: CommunitySubscriptionModel },
        { default: CommunityEventModel },
        { default: UserFollowModel },
        { default: UserPrivacySettingModel },
        { default: FollowRecommendationModel }
      ] = await Promise.all([
        import('../config/database.js'),
        import('../models/CourseEnrollmentModel.js'),
        import('../models/CourseProgressModel.js'),
        import('../models/CourseModel.js'),
        import('../models/EbookProgressModel.js'),
        import('./CommunityService.js'),
        import('../models/CommunitySubscriptionModel.js'),
        import('../models/CommunityEventModel.js'),
        import('../models/UserFollowModel.js'),
        import('../models/UserPrivacySettingModel.js'),
        import('../models/FollowRecommendationModel.js')
      ]);

      const enrollmentRows = await db('course_enrollments as ce')
        .select([
          'ce.id',
          'ce.public_id as publicId',
          'ce.course_id as courseId',
          'ce.user_id as userId',
          'ce.status',
          'ce.progress_percent as progressPercent',
          'ce.started_at as startedAt',
          'ce.completed_at as completedAt',
          'ce.last_accessed_at as lastAccessedAt',
          'ce.metadata',
          'ce.created_at as createdAt',
          'ce.updated_at as updatedAt'
        ])
        .where('ce.user_id', user.id)
        .orderBy('ce.created_at', 'desc');
      const enrollments = enrollmentRows.map((row) => CourseEnrollmentModel.deserialize(row));
      const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
      const courseProgress = enrollmentIds.length
        ? await CourseProgressModel.listByEnrollmentIds(enrollmentIds)
        : [];

      const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.courseId))).filter(Boolean);
      const courseRecords = courseIds.length
        ? await Promise.all(courseIds.map((id) => CourseModel.findById(id)))
        : [];
      const courses = courseRecords.filter(Boolean);

      const tutorBookingRows = await db('tutor_bookings as tb')
        .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
        .leftJoin('users as tu', 'tp.user_id', 'tu.id')
        .select([
          'tb.id',
          'tb.public_id as publicId',
          'tb.tutor_id as tutorId',
          'tb.learner_id as learnerId',
          'tb.scheduled_start as scheduledStart',
          'tb.scheduled_end as scheduledEnd',
          'tb.duration_minutes as durationMinutes',
          'tb.hourly_rate_amount as hourlyRateAmount',
          'tb.hourly_rate_currency as hourlyRateCurrency',
          'tb.meeting_url as meetingUrl',
          'tb.status',
          'tb.metadata',
          'tp.display_name as tutorDisplayName',
          'tu.first_name as tutorFirstName',
          'tu.last_name as tutorLastName'
        ])
        .where('tb.learner_id', user.id)
        .orderBy('tb.scheduled_start', 'desc')
        .limit(100);
      const tutorBookings = tutorBookingRows.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        tutorId: row.tutorId,
        learnerId: row.learnerId,
        tutorFirstName: row.tutorFirstName,
        tutorLastName: row.tutorLastName,
        tutorName: row.tutorDisplayName ?? resolveName(row.tutorFirstName, row.tutorLastName, `Tutor ${row.tutorId}`),
        scheduledStart: row.scheduledStart ? new Date(row.scheduledStart) : null,
        scheduledEnd: row.scheduledEnd ? new Date(row.scheduledEnd) : null,
        durationMinutes: Number(row.durationMinutes ?? 60),
        hourlyRateAmount: Number(row.hourlyRateAmount ?? 0),
        hourlyRateCurrency: row.hourlyRateCurrency ?? 'USD',
        meetingUrl: row.meetingUrl ?? null,
        status: row.status ?? 'requested',
        metadata: safeJsonParse(row.metadata, {})
      }));

      const tutorIds = Array.from(new Set(tutorBookings.map((booking) => booking.tutorId).filter(Boolean)));
      const availabilityRows = tutorIds.length
        ? await db('tutor_availability_slots as tas')
            .select([
              'tas.id',
              'tas.tutor_id as tutorId',
              'tas.start_at as startAt',
              'tas.end_at as endAt',
              'tas.status',
              'tas.metadata'
            ])
            .whereIn('tas.tutor_id', tutorIds)
            .andWhere('tas.start_at', '>=', referenceDate)
            .orderBy('tas.start_at', 'asc')
            .limit(100)
        : [];
      const tutorAvailability = availabilityRows.map((row) => ({
        tutorId: row.tutorId,
        startAt: row.startAt ? new Date(row.startAt) : null,
        endAt: row.endAt ? new Date(row.endAt) : null,
        status: row.status,
        metadata: safeJsonParse(row.metadata, {})
      }));

      communitySummaries = await CommunityService.listForUser(user.id);
      const communityIds = communitySummaries
        .map((community) => (Number.isFinite(Number(community.id)) ? Number(community.id) : null))
        .filter((id) => id !== null);

      const ebookProgressRows = await db('ebook_read_progress as erp')
        .select([
          'erp.id',
          'erp.asset_id as assetId',
          'erp.user_id as userId',
          'erp.progress_percent as progressPercent',
          'erp.last_location as lastLocation',
          'erp.time_spent_seconds as timeSpentSeconds',
          'erp.updated_at as updatedAt',
          'erp.created_at as createdAt'
        ])
        .where('erp.user_id', user.id)
        .orderBy('erp.updated_at', 'desc')
        .limit(100);
      const ebookProgress = ebookProgressRows.map((row) => EbookProgressModel.deserialize(row));

      const ebookAssetIds = Array.from(new Set(ebookProgress.map((entry) => entry.assetId).filter(Boolean)));
      const ebookCatalog = new Map();
      if (ebookAssetIds.length) {
        const ebookRows = await db('ebooks')
          .select(['id', 'public_id as publicId', 'asset_id as assetId', 'title', 'price_amount as priceAmount', 'price_currency as priceCurrency', 'status'])
          .whereIn('asset_id', ebookAssetIds);
        ebookRows.forEach((row) => {
          ebookCatalog.set(row.assetId, {
            id: row.publicId ?? `ebook-${row.id}`,
            title: row.title,
            priceAmount: Number(row.priceAmount ?? 0),
            priceCurrency: row.priceCurrency ?? 'USD',
            status: row.status ?? 'draft'
          });
        });
      }

      const paymentRows = await db('payment_intents as pi')
        .select([
          'pi.id',
          'pi.public_id as publicId',
          'pi.amount_total as amountTotal',
          'pi.amount_refunded as amountRefunded',
          'pi.currency',
          'pi.status',
          'pi.metadata',
          'pi.created_at as createdAt'
        ])
        .where('pi.user_id', user.id)
        .orderBy('pi.created_at', 'desc')
        .limit(25);
      const invoices = paymentRows.map((row) => ({
        id: row.publicId ?? `invoice-${row.id}`,
        label: safeJsonParse(row.metadata, {}).description ?? 'Invoice',
        amountCents: Number(row.amountTotal ?? 0),
        currency: row.currency ?? 'USD',
        status: row.status ?? 'open',
        date: row.createdAt ? new Date(row.createdAt) : null
      }));

      const [
        paymentMethodsRaw,
        billingContactsRaw,
        financialProfile,
        financePurchasesRaw,
        systemPreferencesRaw,
        growthInitiativesData,
        affiliateChannelsData,
        adCampaignsData,
        instructorApplicationData
      ] = await Promise.all([
        LearnerPaymentMethodModel.listByUserId(user.id),
        LearnerBillingContactModel.listByUserId(user.id),
        LearnerFinancialProfileModel.findByUserId(user.id),
        LearnerFinancePurchaseModel.listByUserId(user.id),
        LearnerSystemPreferenceModel.getForUser(user.id),
        LearnerGrowthInitiativeModel.listByUserId(user.id),
        LearnerAffiliateChannelModel.listByUserId(user.id),
        LearnerAdCampaignModel.listByUserId(user.id),
        InstructorApplicationModel.findByUserId(user.id)
      ]);

      growthInitiativesRaw = growthInitiativesData;
      affiliateChannelsRaw = affiliateChannelsData;
      adCampaignsRaw = adCampaignsData;
      instructorApplicationRaw = instructorApplicationData;

      const affiliateChannelIds = affiliateChannelsRaw.map((channel) => channel.id).filter(Boolean);
      affiliatePayoutsRaw = affiliateChannelIds.length
        ? await LearnerAffiliatePayoutModel.listByChannelIds(affiliateChannelIds)
        : [];

      growthExperimentsByInitiative = new Map();
      if (growthInitiativesRaw.length) {
        await Promise.all(
          growthInitiativesRaw.map(async (initiative) => {
            const experiments = await LearnerGrowthExperimentModel.listByInitiativeId(initiative.id);
            growthExperimentsByInitiative.set(initiative.id, experiments);
          })
        );
      }

      const communitySubscriptions = await CommunitySubscriptionModel.listByUser(user.id);

      const [followersCount, followingCount, pendingFollowersData, outgoingFollowersData, recommendationData, privacySettings] =
        await Promise.all([
          UserFollowModel.countFollowers(user.id),
          UserFollowModel.countFollowing(user.id),
          UserFollowModel.listFollowers(user.id, { status: 'pending', limit: 10 }),
          UserFollowModel.listFollowing(user.id, { status: 'pending', limit: 10 }),
          FollowRecommendationModel.listForUser(user.id, { limit: 10 }),
          UserPrivacySettingModel.getForUser(user.id)
        ]);

      const mapFollowEntry = (entry, prefix) => ({
        id: `${prefix}-${entry.relationship.id}`,
        name: resolveName(entry.user?.firstName, entry.user?.lastName, entry.user?.email ?? 'Member'),
        email: entry.user?.email ?? null,
        requestedAt: entry.relationship?.createdAt ?? null,
        score: entry.relationship?.metadata?.score ?? null,
        reason: entry.relationship?.reason ?? null
      });

      const pendingFollowers = Array.isArray(pendingFollowersData?.items)
        ? pendingFollowersData.items.map((entry) => mapFollowEntry(entry, 'pending'))
        : [];
      const outgoingFollowers = Array.isArray(outgoingFollowersData?.items)
        ? outgoingFollowersData.items.map((entry) => mapFollowEntry(entry, 'outgoing'))
        : [];
      const followRecommendations = Array.isArray(recommendationData)
        ? recommendationData.map((entry) => ({
            id: `recommendation-${entry.recommendation.id}`,
            name: resolveName(entry.user?.firstName, entry.user?.lastName, entry.user?.email ?? 'Member'),
            email: entry.user?.email ?? null,
            score: entry.recommendation?.score ?? null,
            reason: entry.recommendation?.reasonCode ?? null
          }))
        : [];

      const communityEventsList =
        communityIds.length > 0
          ? await Promise.all(
              communityIds.map((communityId) =>
                CommunityEventModel.listForCommunity(communityId, { from: referenceDate, limit: 10 })
              )
            )
          : [];

      const flattenedCommunityEvents = [];
      communityIds.forEach((communityId, index) => {
        const events = communityEventsList[index] ?? [];
        communityEventsByCommunity.set(communityId, events);
        const community = communitySummaries.find((entry) => entry.id === communityId);
        events.forEach((event) => {
          flattenedCommunityEvents.push({
            ...event,
            communityId,
            communityName: community?.name ?? `Community ${communityId}`
          });
        });
      });

      const liveClassroomRows =
        communityIds.length > 0
          ? await db('live_classrooms as lc')
              .select([
                'lc.id',
                'lc.public_id as publicId',
                'lc.community_id as communityId',
                'lc.title',
                'lc.type',
                'lc.status',
                'lc.start_at as startAt',
                'lc.end_at as endAt',
                'lc.capacity',
                'lc.reserved_seats as reservedSeats',
                'lc.metadata'
              ])
              .whereIn('lc.community_id', communityIds)
              .andWhere('lc.status', 'scheduled')
              .andWhere('lc.start_at', '>=', referenceDate)
              .orderBy('lc.start_at', 'asc')
              .limit(50)
          : [];
      const liveClassrooms = liveClassroomRows.map((row) => ({
        id: row.publicId ?? `live-${row.id}`,
        communityId: row.communityId,
        title: row.title,
        type: row.type,
        status: row.status,
        startAt: row.startAt ? new Date(row.startAt) : null,
        endAt: row.endAt ? new Date(row.endAt) : null,
        capacity: Number(row.capacity ?? 0),
        reservedSeats: Number(row.reservedSeats ?? 0),
        metadata: safeJsonParse(row.metadata, {})
      }));

      const learnerFollowerSummary = {
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        pending: pendingFollowers,
        outgoing: outgoingFollowers,
        recommendations: followRecommendations
      };

      const communitySummaryMap = new Map(communitySummaries.map((summary) => [summary.id, summary]));
      const financeSubscriptionsDetailed = communitySubscriptions.map((subscription) => ({
        ...subscription,
        community: communitySummaryMap.get(subscription.communityId ?? null)
          ? {
              id: communitySummaryMap.get(subscription.communityId ?? null).id,
              name: communitySummaryMap.get(subscription.communityId ?? null).name,
              slug: communitySummaryMap.get(subscription.communityId ?? null).slug,
              coverImageUrl: communitySummaryMap.get(subscription.communityId ?? null).coverImageUrl ?? null
            }
          : null,
        currentPeriodEndLabel: subscription.currentPeriodEnd
          ? formatDateTime(subscription.currentPeriodEnd, { dateStyle: 'medium', timeStyle: undefined })
          : null
      }));

      learnerFieldServiceWorkspace = null;
      const fieldServiceOrders = await FieldServiceOrderModel.listForUser(user.id);
      if (fieldServiceOrders.length) {
        const fieldServiceOrderIds = fieldServiceOrders.map((order) => order.id).filter(Boolean);
        const fieldServiceEvents = fieldServiceOrderIds.length
          ? await FieldServiceEventModel.listByOrderIds(fieldServiceOrderIds)
          : [];
        const providerIds = Array.from(new Set(fieldServiceOrders.map((order) => order.providerId).filter(Boolean)));
        const fieldServiceProviders = providerIds.length
          ? await FieldServiceProviderModel.listByIds(providerIds)
          : [];
        learnerFieldServiceWorkspace = buildFieldServiceWorkspace({
          now: referenceDate,
          user,
          orders: fieldServiceOrders,
          events: fieldServiceEvents,
          providers: fieldServiceProviders
        });
      }

      multiRoleLearnerSnapshot =
        buildLearnerDashboard({
          user,
          now: referenceDate,
          enrollments,
          courses,
          courseProgress,
          courseGoals: learnerCourseGoals,
          assignments: courseWorkspaceInput?.assignments ?? [],
          tutorBookings,
          tutorAvailability,
          liveClassrooms,
          instructorDirectory: courseWorkspaceInput?.collaboratorDirectory ?? new Map(),
          ebookProgress,
          ebooks: ebookCatalog,
          invoices,
          communityMemberships: communitySummaries,
          communityEvents: flattenedCommunityEvents,
          communityPipelines: [],
          communitySubscriptions,
          followerSummary: learnerFollowerSummary,
          privacySettings,
          messagingSummary: null,
          notifications: [],
          libraryEntries,
          fieldServiceWorkspace: learnerFieldServiceWorkspace,
          financialProfile,
          paymentMethods: paymentMethodsRaw,
          billingContacts: billingContactsRaw,
          financePurchases: financePurchasesRaw,
          financeSubscriptions: financeSubscriptionsDetailed,
          systemPreferences: systemPreferencesRaw,
          growthInitiatives: growthInitiativesRaw,
          growthExperimentsByInitiative,
          affiliateChannels: affiliateChannelsRaw,
          affiliatePayouts: affiliatePayoutsRaw,
          adCampaigns: adCampaignsRaw,
          instructorApplication: instructorApplicationRaw,
          supportCases,
          supportMetrics,
          supportKnowledgeBase: knowledgeBaseArticles
        }) ?? undefined;
    } catch (error) {
      log.warn({ err: error }, 'Failed to load learner dashboard data');
    }

    try {
      if (communitySummaries.length) {
        const [
          { default: CommunityMemberModel },
          { default: CommunityResourceModel },
          { default: CommunityPaywallTierModel },
          { default: CommunitySubscriptionModel },
          { default: CommunityPostModerationCaseModel },
          { default: ReportingCommunityEngagementDailyView },
          { default: CommunityPostModel },
          { default: CommunityEventModel }
        ] = await Promise.all([
          import('../models/CommunityMemberModel.js'),
          import('../models/CommunityResourceModel.js'),
          import('../models/CommunityPaywallTierModel.js'),
          import('../models/CommunitySubscriptionModel.js'),
          import('../models/CommunityPostModerationCaseModel.js'),
          import('../models/ReportingCommunityEngagementDailyView.js'),
          import('../models/CommunityPostModel.js'),
          import('../models/CommunityEventModel.js')
        ]);

        const communityIds = communitySummaries
          .map((community) => (Number.isFinite(Number(community.id)) ? Number(community.id) : null))
          .filter((id) => id !== null);

        if (communityIds.length && communityEventsByCommunity.size === 0) {
          const eventsLists = await Promise.all(
            communityIds.map((communityId) =>
              CommunityEventModel.listForCommunity(communityId, { from: referenceDate, limit: 10 })
            )
          );
          communityIds.forEach((communityId, index) => {
            communityEventsByCommunity.set(communityId, eventsLists[index] ?? []);
          });
        }

        const memberLists = await Promise.all(communityIds.map((id) => CommunityMemberModel.listByCommunity(id)));
        const runbookLists = await Promise.all(
          communityIds.map((id) => CommunityResourceModel.listForCommunity(id, { resourceType: 'runbook', limit: 10 }))
        );
        const tierLists = await Promise.all(communityIds.map((id) => CommunityPaywallTierModel.listByCommunity(id)));
        const subscriptionLists = await Promise.all(
          communityIds.map((id) => CommunitySubscriptionModel.listByCommunity(id, { status: 'active' }))
        );
        const moderationLists = await Promise.all(
          communityIds.map((id) =>
            CommunityPostModerationCaseModel.list(
              { communityId: id, status: ['pending', 'in_review', 'escalated'] },
              { perPage: 50 }
            )
          )
        );
        const communicationsLists = await Promise.all(
          communityIds.map((id) => CommunityPostModel.paginateForCommunity(id, { perPage: 10 }))
        );

        communityIds.forEach((communityId, index) => {
          const members = memberLists[index] ?? [];
          communityPendingMembersByCommunity.set(
            communityId,
            members.filter((member) => member.status && member.status !== 'active')
          );
          communityModeratorsByCommunity.set(
            communityId,
            members.filter((member) => ['owner', 'admin', 'moderator'].includes(member.role))
          );
          communityRunbooksByCommunity.set(communityId, runbookLists[index]?.items ?? []);
          communityPaywallTiersByCommunity.set(communityId, tierLists[index] ?? []);
          communitySubscriptionsByCommunity.set(communityId, subscriptionLists[index] ?? []);
          communityModerationCases.push(...(moderationLists[index]?.items ?? []));
          communicationsByCommunity.set(communityId, communicationsLists[index]?.items ?? []);
        });

        const engagementStart = new Date(referenceDate.getTime() - 7 * DAY_IN_MS);
        const previousStart = new Date(engagementStart.getTime() - 7 * DAY_IN_MS);
        const previousEnd = new Date(engagementStart.getTime() - DAY_IN_MS);
        const currentTotals = await ReportingCommunityEngagementDailyView.fetchTotals({
          start: engagementStart,
          end: referenceDate
        });
        const previousTotals = await ReportingCommunityEngagementDailyView.fetchTotals({
          start: previousStart,
          end: previousEnd
        });
        engagementTotals = { current: currentTotals, previous: previousTotals };

      multiRoleCommunitySnapshot =
          buildCommunityDashboard({
            user,
            now: referenceDate,
            communities: communitySummaries,
            eventsByCommunity: communityEventsByCommunity,
            runbooksByCommunity: communityRunbooksByCommunity,
            paywallTiersByCommunity: communityPaywallTiersByCommunity,
            subscriptionsByCommunity: communitySubscriptionsByCommunity,
            pendingMembersByCommunity: communityPendingMembersByCommunity,
            moderatorsByCommunity: communityModeratorsByCommunity,
            moderationCases: communityModerationCases,
            communicationsByCommunity,
            engagementTotals
          }) ?? undefined;
      }
    } catch (error) {
      log.warn({ err: error }, 'Failed to load community operations dashboard data');
    }

    const instructorSnapshot =
      buildInstructorDashboard({
        user,
        now: referenceDate,
        courses: courseWorkspaceInput?.courses ?? [],
        courseEnrollments: courseWorkspaceInput?.enrollments ?? [],
        modules: courseWorkspaceInput?.modules ?? [],
        lessons: courseWorkspaceInput?.lessons ?? [],
        assignments: courseWorkspaceInput?.assignments ?? [],
        courseProgress: courseWorkspaceInput?.courseProgress ?? [],
        creationProjects: courseWorkspaceInput?.creationProjects ?? [],
        creationCollaborators: courseWorkspaceInput?.creationCollaborators ?? new Map(),
        creationSessions: courseWorkspaceInput?.creationSessions ?? new Map(),
        collaboratorDirectory: courseWorkspaceInput?.collaboratorDirectory ?? new Map(),
        blueprints: courseWorkspaceInput?.blueprints ?? [],
        blueprintModules: courseWorkspaceInput?.blueprintModules ?? [],
        launches: courseWorkspaceInput?.launches ?? [],
        launchChecklist: courseWorkspaceInput?.launchChecklist ?? [],
        launchSignals: courseWorkspaceInput?.launchSignals ?? [],
        courseReviews: courseWorkspaceInput?.courseReviews ?? [],
        refresherLessons: courseWorkspaceInput?.refresherLessons ?? [],
        recordedAssets: courseWorkspaceInput?.recordedAssets ?? [],
        catalogueListings: courseWorkspaceInput?.catalogueListings ?? [],
        dripSequences: courseWorkspaceInput?.dripSequences ?? [],
        dripSegments: courseWorkspaceInput?.dripSegments ?? [],
        dripSchedules: courseWorkspaceInput?.dripSchedules ?? [],
        mobileExperiences: courseWorkspaceInput?.mobileExperiences ?? []
      }) ?? undefined;
    let operatorSnapshot;
    if (['admin', 'operator'].includes(user.role)) {
      operatorSnapshot = await getOperatorDashboardService().build({ user, now: referenceDate });
    }

    let learnerSnapshot;
    let communitySnapshot;
    let multiRoleLearnerSnapshot;
    let multiRoleCommunitySnapshot;
    let libraryEntries = [];
    let learnerFieldServiceWorkspace = null;
    let learnerCourseGoals = [];

    try {
      const [
        { default: CourseEnrollmentModel },
        { default: CourseProgressModel },
        { default: CourseModel },
        { default: CourseAssignmentModel },
        { default: TutorBookingModel },
        { default: LiveClassroomModel },
        { default: EbookProgressModel },
        { default: EbookModel },
        { default: PaymentIntentModel },
        { default: CommunityService },
        { default: CommunityResourceModel },
        { default: CommunityEventModel },
        { default: CommunityPaywallTierModel },
        { default: CommunitySubscriptionModel },
        { default: SecurityIncidentModel }
      ] = await Promise.all([
        import('../models/CourseEnrollmentModel.js'),
        import('../models/CourseProgressModel.js'),
        import('../models/CourseModel.js'),
        import('../models/CourseAssignmentModel.js'),
        import('../models/TutorBookingModel.js'),
        import('../models/LiveClassroomModel.js'),
        import('../models/EbookProgressModel.js'),
        import('../models/EbookModel.js'),
        import('../models/PaymentIntentModel.js'),
        import('../services/CommunityService.js'),
        import('../models/CommunityResourceModel.js'),
        import('../models/CommunityEventModel.js'),
        import('../models/CommunityPaywallTierModel.js'),
        import('../models/CommunitySubscriptionModel.js'),
        import('../models/SecurityIncidentModel.js')
      ]);

      const learnerEnrollments = await CourseEnrollmentModel.listByUserId(user.id);
      const learnerEnrollmentIds = learnerEnrollments.map((enrollment) => enrollment.id);
      const [
        learnerProgress,
        learnerBookings,
        learnerLiveClassrooms,
        learnerEbookProgress,
        learnerPaymentIntents,
        memberships
      ] = await Promise.all([
        learnerEnrollmentIds.length ? CourseProgressModel.listByEnrollmentIds(learnerEnrollmentIds) : Promise.resolve([]),
        TutorBookingModel.listByLearnerId(user.id, { limit: 50 }),
        LiveClassroomModel.listForLearner(user.id, { limit: 50 }),
        EbookProgressModel.listByUser(user.id),
        PaymentIntentModel.listByUser(user.id, { limit: 50 }),
        CommunityService.listForUser(user.id)
      ]);

      communityMemberships = memberships ?? [];
      libraryEntries = await LearnerLibraryEntryModel.listByUserId(user.id);
      learnerCourseGoals = await LearnerCourseGoalModel.listActiveByUserId(user.id);
      const courseIds = Array.from(new Set(learnerEnrollments.map((enrollment) => enrollment.courseId).filter(Boolean)));
      const learnerCourses = courseIds.length ? await CourseModel.listByIds(courseIds) : [];
      const learnerAssignments = courseIds.length ? await CourseAssignmentModel.listByCourseIds(courseIds) : [];
      const recommendedCourses = await CourseModel.listPublished({ limit: 6, excludeIds: courseIds });

      const instructorDirectory = new Map();
      const instructorIds = new Set(learnerCourses.map((course) => course.instructorId).filter(Boolean));
      if (instructorIds.size) {
        const instructorRecords = await UserModel.findByIds(Array.from(instructorIds));
        instructorRecords.forEach((record) => instructorDirectory.set(record.id, record));
      }

      const ebookAssetIds = learnerEbookProgress.map((progress) => progress.assetId).filter(Boolean);
      const ebookLibrary = ebookAssetIds.length ? await EbookModel.listByAssetIds(ebookAssetIds) : [];
      const ebookRecommendations = [];

      const communityIds = communityMemberships.map((community) => community.id).filter(Boolean);
      const [runbookLists, eventLists, tierLists, subscriptionLists, incidentLists] = communityIds.length
        ? await Promise.all([
            Promise.all(
              communityIds.map((communityId) =>
                CommunityResourceModel.listForCommunity(communityId, { limit: 10, resourceType: 'runbook' })
              )
            ),
            Promise.all(
              communityIds.map((communityId) =>
                CommunityEventModel.listForCommunity(communityId, {
                  from: new Date(referenceDate.getTime() - 14 * DAY_IN_MS).toISOString(),
                  limit: 15
                })
              )
            ),
            Promise.all(communityIds.map((communityId) => CommunityPaywallTierModel.listByCommunity(communityId))),
            Promise.all(communityIds.map((communityId) => CommunitySubscriptionModel.listByCommunity(communityId))),
            Promise.all(communityIds.map((communityId) => SecurityIncidentModel.listActive({ tenantId: `community-${communityId}` })))
          ])
        : [[], [], [], [], []];

      const runbookMap = new Map();
      const eventMap = new Map();
      const tierMap = new Map();
      const subscriptionMap = new Map();
      const incidentMap = new Map();

      communityIds.forEach((communityId, index) => {
        const runbookPayload = runbookLists[index];
        runbookMap.set(communityId, Array.isArray(runbookPayload?.items) ? runbookPayload.items : runbookPayload ?? []);
        eventMap.set(communityId, eventLists[index] ?? []);
        tierMap.set(communityId, tierLists[index] ?? []);
        subscriptionMap.set(communityId, subscriptionLists[index] ?? []);
        incidentMap.set(communityId, incidentLists[index] ?? []);
      });

      const communityPipelines = communityMemberships.flatMap((community) => {
        const pipelines = Array.isArray(community.metadata?.pipelines) ? community.metadata.pipelines : [];
        return pipelines.map((pipeline, index) => ({
          id: `${community.id}-pipeline-${index}`,
          title: pipeline.title ?? `${community.name} pipeline`,
          owner: pipeline.owner ?? 'Community ops',
          progress: Number(pipeline.progress ?? pipeline.completion ?? 50)
        }));
      });

      const [financialProfile, financePurchasesRaw, financeSubscriptionsRaw, systemPreferencesRaw] = await Promise.all([
        LearnerFinancialProfileModel.findByUserId(user.id),
        LearnerFinancePurchaseModel.listByUserId(user.id),
        CommunitySubscriptionModel.listByUser(user.id),
        LearnerSystemPreferenceModel.getForUser(user.id)
      ]);

      const subscriptionCommunityIds = Array.from(
        new Set(financeSubscriptionsRaw.map((subscription) => subscription.communityId).filter(Boolean))
      );
      const subscriptionTierIds = Array.from(
        new Set(financeSubscriptionsRaw.map((subscription) => subscription.tierId).filter(Boolean))
      );
      const [subscriptionCommunities, subscriptionTiers] = await Promise.all([
        Promise.all(subscriptionCommunityIds.map((communityId) => CommunityModel.findById(communityId))),
        Promise.all(subscriptionTierIds.map((tierId) => CommunityPaywallTierModel.findById(tierId)))
      ]);
      const subscriptionCommunityMap = new Map(
        subscriptionCommunities.filter(Boolean).map((community) => [community.id, community])
      );
      const subscriptionTierMap = new Map(
        subscriptionTiers.filter(Boolean).map((tier) => [tier.id, tier])
      );
      const financeSubscriptionsDetailed = financeSubscriptionsRaw.map((subscription) => {
        const community = subscriptionCommunityMap.get(subscription.communityId ?? null);
        const tier = subscriptionTierMap.get(subscription.tierId ?? null);
        return {
          ...subscription,
          community: community
            ? {
                id: community.id,
                name: community.name,
                slug: community.slug,
                coverImageUrl: community.coverImageUrl ?? null
              }
            : null,
          plan: tier
            ? {
                id: tier.id,
                name: tier.name,
                priceFormatted: formatCurrency(tier.priceCents, tier.currency),
                billingInterval: tier.billingInterval
              }
            : subscription.plan ?? null,
          currentPeriodEndLabel: subscription.currentPeriodEnd
            ? formatDateTime(subscription.currentPeriodEnd, { dateStyle: 'medium', timeStyle: undefined })
            : null
        };
      });

      learnerSnapshot =
        buildLearnerDashboard({
          user,
          now: referenceDate,
          enrollments: learnerEnrollments,
          courses: [...learnerCourses, ...recommendedCourses],
          courseProgress: learnerProgress,
          courseGoals: learnerCourseGoals,
          assignments: learnerAssignments,
          instructorDirectory,
          tutorBookings: learnerBookings,
          liveClassrooms: learnerLiveClassrooms,
          ebookLibrary,
          ebookProgress: learnerEbookProgress,
          ebookRecommendations,
          paymentIntents: learnerPaymentIntents,
          communities: communityMemberships,
          communityPipelines,
          libraryEntries,
          fieldServiceWorkspace: learnerFieldServiceWorkspace,
          financialProfile,
          paymentMethods: [],
          billingContacts: [],
          financePurchases: financePurchasesRaw,
          financeSubscriptions: financeSubscriptionsDetailed,
          systemPreferences: systemPreferencesRaw,
          growthInitiatives: growthInitiativesRaw,
          growthExperimentsByInitiative,
          affiliateChannels: affiliateChannelsRaw,
          affiliatePayouts: affiliatePayoutsRaw,
          adCampaigns: adCampaignsRaw,
          instructorApplication: instructorApplicationRaw,
          supportCases,
          supportMetrics,
          supportKnowledgeBase: knowledgeBaseArticles
        }) ?? undefined;

      communitySnapshot =
        buildCommunityDashboard({
          now: referenceDate,
          communities: communityMemberships,
          runbooks: runbookMap,
          events: eventMap,
          paywallTiers: tierMap,
          subscriptions: subscriptionMap,
          safetyIncidents: incidentMap,
          communications: new Map()
        }) ?? undefined;
    } catch (error) {
      log.warn({ err: error }, 'Failed to load learner or community dashboard data');
    }

    const dashboards = {};
    const searchIndex = [];
    const roles = [];
    const profileStats = [];
    const profileBioSegments = [];
    const feedHighlights = [];
    let profileTitleSegment = null;

    const pushRole = (role) => {
      if (!role || !role.id) return;
      if (roles.some((entry) => entry.id === role.id)) return;
      roles.push({ id: role.id, label: role.label ?? role.id });
    };

    const applySnapshot = (key, snapshot) => {
      if (!snapshot) return;
      if (snapshot.dashboard && typeof snapshot.dashboard === 'object') {
        dashboards[key] = {
          ...(dashboards[key] ?? {}),
          ...snapshot.dashboard
        };
      } else if (dashboards[key] === undefined) {
        dashboards[key] = snapshot.dashboard ?? null;
      }
      if (Array.isArray(snapshot.searchIndex)) {
        searchIndex.push(...snapshot.searchIndex);
      }
      if (Array.isArray(snapshot.profileStats)) {
        profileStats.push(...snapshot.profileStats);
      }
      if (snapshot.profileBio) {
        profileBioSegments.push(snapshot.profileBio);
      }
      if (!profileTitleSegment && snapshot.profileTitleSegment) {
        profileTitleSegment = snapshot.profileTitleSegment;
      }
      if (Array.isArray(snapshot.feedHighlights)) {
        feedHighlights.push(...snapshot.feedHighlights);
      }
      pushRole(snapshot.role);
    };

    applySnapshot('learner', multiRoleLearnerSnapshot);
    applySnapshot('learner', learnerSnapshot);
    applySnapshot('community', multiRoleCommunitySnapshot);
    applySnapshot('community', communitySnapshot);
    applySnapshot('instructor', instructorSnapshot);

    if (operatorSnapshot) {
      dashboards.admin = operatorSnapshot.dashboard;
      if (Array.isArray(operatorSnapshot.searchIndex)) {
        searchIndex.push(...operatorSnapshot.searchIndex);
      }
      if (Array.isArray(operatorSnapshot.profileStats)) {
        profileStats.push(...operatorSnapshot.profileStats);
      }
      if (operatorSnapshot.profileBio) {
        profileBioSegments.push(operatorSnapshot.profileBio);
      }
      if (!profileTitleSegment && operatorSnapshot.profileTitleSegment) {
        profileTitleSegment = operatorSnapshot.profileTitleSegment;
      }
      if (Array.isArray(operatorSnapshot.feedHighlights)) {
        feedHighlights.push(...operatorSnapshot.feedHighlights);
      }
      pushRole({ id: 'admin', label: 'Admin' });
    }

    if (user.role && !roles.some((role) => role.id === user.role)) {
      roles.push({ id: user.role, label: user.role.charAt(0).toUpperCase() + user.role.slice(1) });
    }

    const profileBio = profileBioSegments.join(' ').trim() || null;
    const uniqueFeedHighlights = Array.from(new Set(feedHighlights));

    const profile = {
      id: user.id,
      name: resolveName(user.firstName, user.lastName, user.email),
      email: user.email,
      avatar: buildAvatarUrl(user.email),
      title: profileTitleSegment,
      bio: profileBio,
      stats: profileStats,
      feedHighlights: uniqueFeedHighlights
    };

    Object.keys(dashboards).forEach((key) => {
      const value = dashboards[key];
      if (!value || typeof value !== 'object') {
        return;
      }
      const existingPreferences =
        value.preferences && typeof value.preferences === 'object' ? value.preferences : {};
      dashboards[key] = {
        ...value,
        preferences: {
          ...existingPreferences,
          pinnedNavigation
        }
      };
    });

    attachDashboardSurfaceSummaries(dashboards, { now: referenceDate });

    return {
      profile,
      roles,
      dashboards,
      searchIndex
    };
  }
}
