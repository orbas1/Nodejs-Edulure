import logger from '../config/logger.js';
import { env } from '../config/env.js';
import db from '../config/database.js';
import CapabilityManifestService from './CapabilityManifestService.js';
import IntegrationDashboardService from './IntegrationDashboardService.js';
import SecurityIncidentModel from '../models/SecurityIncidentModel.js';
import IdentityVerificationService from './IdentityVerificationService.js';
import ComplianceService from './ComplianceService.js';
import AuditEventService from './AuditEventService.js';
import dataPartitionService from './DataPartitionService.js';
import storageService from './StorageService.js';
import BusinessIntelligenceService from './BusinessIntelligenceService.js';
import PlatformSettingsService, {
  normaliseAdminProfile as exportedNormaliseAdminProfile,
  normalisePaymentSettings as exportedNormalisePaymentSettings,
  normaliseEmailSettings as exportedNormaliseEmailSettings,
  normaliseSecuritySettings as exportedNormaliseSecuritySettings,
  normaliseFinanceSettings as exportedNormaliseFinanceSettings,
  normaliseMonetization as exportedNormaliseMonetization
} from './PlatformSettingsService.js';
import { runtimeConfigService } from './FeatureFlagService.js';
import { castAsBigInt } from '../database/utils/casts.js';

const mergeWithDefaults = (defaults, payload) => {
  const base = structuredClone(defaults);
  if (!payload || typeof payload !== 'object') {
    return base;
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }
    if (Array.isArray(value)) {
      acc[key] = value.map((entry) => (typeof entry === 'object' && entry !== null ? { ...entry } : entry));
      return acc;
    }
    if (value && typeof value === 'object') {
      acc[key] = mergeWithDefaults(acc[key] ?? {}, value);
      return acc;
    }
    acc[key] = value;
    return acc;
  }, base);
};

const DEFAULT_ADMIN_PROFILE_FALLBACK = Object.freeze({
  organisation: {
    name: '',
    mission: '',
    tagline: '',
    headquarters: '',
    established: '',
    statement: '',
    heroVideoUrl: '',
    heroPosterUrl: ''
  },
  leadership: [],
  supportChannels: [],
  runbooks: [],
  media: [],
  onCall: {
    rotation: '',
    timezone: 'UTC',
    currentPrimary: '',
    backup: '',
    escalationChannel: ''
  }
});

const DEFAULT_PAYMENT_SETTINGS_FALLBACK = Object.freeze({
  processors: [],
  payoutRules: {
    schedule: 'weekly',
    dayOfWeek: 'monday',
    minimumPayoutCents: 0,
    reservePercentage: 0,
    autoApproveRefunds: false,
    riskThreshold: 'medium'
  },
  bankAccounts: [],
  webhooks: []
});

const DEFAULT_EMAIL_SETTINGS_FALLBACK = Object.freeze({
  branding: {
    supportSignature: '',
    replyTo: '',
    senderName: ''
  },
  notifications: {},
  templates: {}
});

const DEFAULT_SECURITY_SETTINGS_FALLBACK = Object.freeze({
  mfa: { enforcedRoles: [], gracePeriodHours: 0 },
  passwordPolicy: {
    minLength: 12,
    requireNumbers: true,
    requireSymbols: true,
    rotationDays: 180
  },
  sessionManagement: { maxConcurrentSessions: 5, idleTimeoutMinutes: 30 },
  ipAllowlist: [],
  alerting: { channels: [] }
});

const DEFAULT_FINANCE_SETTINGS_FALLBACK = Object.freeze({
  approvals: { required: false, thresholdCents: 0 },
  tax: { defaultRateBps: 0, registrationNumber: '' },
  integrations: []
});

const DEFAULT_MONETIZATION_SETTINGS_FALLBACK = Object.freeze({
  commissions: {
    enabled: false,
    default: { rateBps: 0, affiliateShare: 0 },
    categories: {}
  },
  subscriptions: { plans: [] },
  upsells: []
});

const normaliseAdminProfile =
  typeof exportedNormaliseAdminProfile === 'function'
    ? exportedNormaliseAdminProfile
    : (payload) => mergeWithDefaults(DEFAULT_ADMIN_PROFILE_FALLBACK, payload);
const normalisePaymentSettings =
  typeof exportedNormalisePaymentSettings === 'function'
    ? exportedNormalisePaymentSettings
    : (payload) => mergeWithDefaults(DEFAULT_PAYMENT_SETTINGS_FALLBACK, payload);
const normaliseEmailSettings =
  typeof exportedNormaliseEmailSettings === 'function'
    ? exportedNormaliseEmailSettings
    : (payload) => mergeWithDefaults(DEFAULT_EMAIL_SETTINGS_FALLBACK, payload);
const normaliseSecuritySettings =
  typeof exportedNormaliseSecuritySettings === 'function'
    ? exportedNormaliseSecuritySettings
    : (payload) => mergeWithDefaults(DEFAULT_SECURITY_SETTINGS_FALLBACK, payload);
const normaliseFinanceSettings =
  typeof exportedNormaliseFinanceSettings === 'function'
    ? exportedNormaliseFinanceSettings
    : (payload) => mergeWithDefaults(DEFAULT_FINANCE_SETTINGS_FALLBACK, payload);
const normaliseMonetization =
  typeof exportedNormaliseMonetization === 'function'
    ? exportedNormaliseMonetization
    : (payload) => mergeWithDefaults(DEFAULT_MONETIZATION_SETTINGS_FALLBACK, payload);

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const INCIDENT_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const INCIDENT_CATEGORY_LABELS = {
  scam: 'Marketplace scams',
  fraud: 'Payments & fraud',
  account_takeover: 'Account takeover',
  abuse: 'Platform abuse',
  data_breach: 'Data breach',
  other: 'Other incidents'
};

const evidenceRoleOverrides = (process.env.COMPLIANCE_EVIDENCE_ROLES ?? '')
  .split(',')
  .map((role) => role.trim())
  .filter(Boolean);

const EVIDENCE_ACCESS_ROLES = evidenceRoleOverrides.length
  ? evidenceRoleOverrides
  : ['admin', 'compliance_manager', 'legal'];

const currencyFormatterCache = new Map();
const percentFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const DEFAULT_DASHBOARD_HELPER_TEXT =
  'Use saved views, task lists, and the operations handbook to triage incidents, finance checks, and integrations quickly.';
const DEFAULT_ESCALATION_CHANNEL = '#admin-escalations';
const DEFAULT_POLICY_OWNER = 'Trust & Safety';
const DEFAULT_POLICY_CONTACT = 'mailto:compliance@edulure.com';
const DEFAULT_POLICY_STATUS = 'Operational';
const DEFAULT_POLICY_HUB_URL = '/policies';
const DEFAULT_POLICY_SLA_HOURS = 24;

function getCurrencyFormatter(currency = 'USD', { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {}) {
  const key = `${currency}:${minimumFractionDigits}:${maximumFractionDigits}`;
  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits
      })
    );
  }
  return currencyFormatterCache.get(key);
}

function formatCurrencyValue(value, currency = 'USD', { denominator = 100, minimumFractionDigits = 0, maximumFractionDigits = 0, fallback = '—' } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const formatter = getCurrencyFormatter(currency, { minimumFractionDigits, maximumFractionDigits });
  return formatter.format(numeric / denominator);
}

function formatPercentChange(change) {
  if (!change || typeof change !== 'object') {
    return null;
  }
  const percent = Number(change.percentage ?? change.percent);
  if (!Number.isFinite(percent)) {
    return null;
  }
  const formatted = percentFormatter.format(Math.abs(percent));
  const arrow = percent > 0 ? '▲' : percent < 0 ? '▼' : '•';
  const prefix = percent > 0 ? '+' : percent < 0 ? '−' : '';
  return `${arrow} ${prefix}${formatted}%`;
}

function formatNumberValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric);
}

function formatRelativeTimeFrom(value, reference = new Date()) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffMs = date.getTime() - reference.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(diffMinutes) >= 60 * 24) {
    return date.toISOString().slice(0, 10);
  }
  if (Math.abs(diffMinutes) >= 60) {
    return relativeFormatter.format(Math.round(diffMinutes / 60), 'hour');
  }
  return relativeFormatter.format(diffMinutes, 'minute');
}

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const sized = bytes / 1024 ** exponent;
  return `${sized.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function safeIsoString(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function readRuntimeConfigValue(runtimeConfig, key, { environment = env.nodeEnv, defaultValue = null } = {}) {
  if (!runtimeConfig || typeof runtimeConfig.getValue !== 'function') {
    return defaultValue;
  }

  try {
    return runtimeConfig.getValue(key, {
      environment: environment ?? env.nodeEnv ?? 'production',
      audience: 'ops',
      defaultValue
    });
  } catch (error) {
    logger.debug({ err: error, key }, 'Failed to read runtime configuration for operator dashboard meta');
    return defaultValue;
  }
}

export function buildDashboardMeta({
  runtimeConfig,
  tenantId = 'global',
  now = new Date(),
  manifestGeneratedAt = null,
  operationalScore = null,
  environment = env.nodeEnv
} = {}) {
  const escalationChannel =
    readRuntimeConfigValue(runtimeConfig, 'admin.console.escalation-channel', {
      environment,
      defaultValue: DEFAULT_ESCALATION_CHANNEL
    }) ?? DEFAULT_ESCALATION_CHANNEL;
  const policyOwner =
    readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-owner', {
      environment,
      defaultValue: DEFAULT_POLICY_OWNER
    }) ?? DEFAULT_POLICY_OWNER;
  const policyContact =
    readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-contact', {
      environment,
      defaultValue: DEFAULT_POLICY_CONTACT
    }) ?? DEFAULT_POLICY_CONTACT;
  const policyStatus =
    readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-status', {
      environment,
      defaultValue: DEFAULT_POLICY_STATUS
    }) ?? DEFAULT_POLICY_STATUS;
  const policySlaRaw = readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-sla-hours', {
    environment,
    defaultValue: DEFAULT_POLICY_SLA_HOURS
  });
  const policyHubUrl =
    readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-hub-url', {
      environment,
      defaultValue: DEFAULT_POLICY_HUB_URL
    }) ?? DEFAULT_POLICY_HUB_URL;
  const policyLastReviewedRaw = readRuntimeConfigValue(runtimeConfig, 'admin.console.policy-last-reviewed', {
    environment,
    defaultValue: null
  });

  const policySlaHours = Number(policySlaRaw);
  const lastReviewedIso = safeIsoString(policyLastReviewedRaw);
  const lastReviewedRelative = lastReviewedIso ? formatRelativeTimeFrom(lastReviewedIso, now) : null;

  const helperSegments = [DEFAULT_DASHBOARD_HELPER_TEXT];

  if (policyStatus) {
    helperSegments.push(`Policy status: ${policyStatus}.`);
  }

  if (Number.isFinite(policySlaHours) && policySlaHours > 0) {
    helperSegments.push(`Reviews target ${policySlaHours}h SLA.`);
  }

  if (lastReviewedRelative) {
    helperSegments.push(`Last reviewed ${lastReviewedRelative}.`);
  }

  if (policyHubUrl) {
    helperSegments.push(`Handbook: ${policyHubUrl}.`);
  }

  if (policyContact) {
    helperSegments.push(`Contact ${policyContact} for escalations.`);
  }

  const helperText = helperSegments.join(' ');
  const note = `Escalation channel: ${escalationChannel}. Policy owner: ${policyOwner}.`;

  return {
    generatedAt: now.toISOString(),
    tenantId,
    manifestGeneratedAt,
    operationalScore,
    helperText,
    note,
    policy: {
      escalationChannel,
      owner: policyOwner,
      contact: policyContact,
      status: policyStatus,
      slaHours: Number.isFinite(policySlaHours) ? policySlaHours : null,
      lastReviewedAt: lastReviewedIso,
      lastReviewedRelative,
      hubUrl: policyHubUrl
    }
  };
}

export function composeRevenueSnapshot({
  executiveOverview = null,
  savedViews = null,
  paymentsRow = null,
  timeframeDays = executiveOverview?.timeframe?.days ?? 30,
  fallbackCurrency = 'USD'
} = {}) {
  const overallView = savedViews?.views?.find((view) => view.id?.startsWith('overall-')) ?? savedViews?.views?.[0] ?? null;
  const totals = overallView?.totals ?? {};
  const change = overallView?.change ?? {};
  const currency = overallView?.currency ?? fallbackCurrency;

  const recognisedCents = Number(
    totals.recognisedVolumeCents ?? executiveOverview?.scorecard?.recognisedRevenue?.cents ?? 0
  );
  const netRevenueCents = Number(
    executiveOverview?.scorecard?.netRevenue?.cents ?? recognisedCents - Number(totals.refundedCents ?? 0)
  );
  const grossCents = Number(totals.grossVolumeCents ?? 0);
  const discountCents = Number(totals.discountCents ?? 0);
  const refundCents = Number(totals.refundedCents ?? paymentsRow?.refundedCents ?? 0);
  const timeframe = Number(timeframeDays ?? 30);
  const timeframeSafe = Number.isFinite(timeframe) && timeframe > 0 ? timeframe : 30;
  const mrrCents = timeframeSafe > 0 ? Math.round((recognisedCents / timeframeSafe) * 30) : recognisedCents;
  const arrCents = Math.round(mrrCents * 12);
  const captureRate = grossCents > 0 ? (netRevenueCents / grossCents) * 100 : null;

  const overview = {
    netRevenue: formatCurrencyValue(netRevenueCents, currency, { denominator: 100, minimumFractionDigits: 0 }),
    netRevenueChange: formatPercentChange(executiveOverview?.scorecard?.netRevenue?.change ?? change?.recognisedVolume),
    arr: formatCurrencyValue(arrCents, currency, { denominator: 100, minimumFractionDigits: 0 }),
    mrr: formatCurrencyValue(mrrCents, currency, { denominator: 100, minimumFractionDigits: 0 }),
    captureRate: captureRate === null ? '—' : `${percentFormatter.format(Math.abs(captureRate))}%`,
    failedPayments: formatNumberValue(paymentsRow?.failedIntents ?? totals?.intents?.failedIntents ?? 0),
    refundsPending: formatCurrencyValue(refundCents, currency, { denominator: 100, minimumFractionDigits: 0 }),
    discountImpact: formatCurrencyValue(discountCents, currency, { denominator: 100, minimumFractionDigits: 0 })
  };

  const paymentHealth = {
    succeeded: formatNumberValue(paymentsRow?.succeededIntents ?? totals?.intents?.succeededIntents ?? 0),
    processing: formatNumberValue(paymentsRow?.processingIntents ?? totals?.intents?.processingIntents ?? 0),
    requiresAction: formatNumberValue(
      paymentsRow?.requiresActionIntents ?? totals?.intents?.requiresActionIntents ?? 0
    ),
    failed: formatNumberValue(paymentsRow?.failedIntents ?? totals?.intents?.failedIntents ?? 0)
  };

  const topCommunities = Array.isArray(executiveOverview?.topCommunities)
    ? executiveOverview.topCommunities.slice(0, 6).map((community, index) => ({
        id: community.communityId ?? `community-${index}`,
        name: community.name ?? `Community ${community.communityId ?? index + 1}`,
        revenue: formatCurrencyValue(community.recognisedRevenueCents ?? community.posts ?? 0, currency, {
          denominator: community.recognisedRevenueCents ? 100 : 1,
          minimumFractionDigits: 0
        }),
        currency,
        subscribers: formatNumberValue(community.comments ?? 0),
        share: percentFormatter.format(
          community.share ?? (grossCents > 0 ? ((community.recognisedRevenueCents ?? 0) / grossCents) * 100 : 0)
        ),
        trend: formatPercentChange(community.change)
      }))
    : [];

  return {
    overview,
    paymentHealth,
    topCommunities,
    refundsPendingCents: refundCents,
    currency
  };
}

export function buildOperationsSnapshot({
  queueSummary,
  complianceSnapshot,
  platformSnapshot,
  revenueSnapshot,
  integrationSnapshot,
  upcomingLaunches,
  now
}) {
  const alertsOpen =
    Number(queueSummary?.severityCounts?.critical ?? 0) + Number(queueSummary?.severityCounts?.high ?? 0);

  const support = {
    backlog: Number(queueSummary?.totalOpen ?? 0),
    pendingMemberships: Number(complianceSnapshot?.queue?.length ?? 0),
    followRequests: Number(complianceSnapshot?.manualReviewQueue ?? 0),
    avgResponseMinutes: Number(queueSummary?.medianAckMinutes ?? 0),
    dailyActiveMembers: Number(queueSummary?.watchers ?? platformSnapshot?.totalUsers ?? 0)
  };

  const risk = {
    payoutsProcessing: formatNumberValue(revenueSnapshot?.paymentHealth?.processing ?? 0),
    failedPayments: formatNumberValue(revenueSnapshot?.paymentHealth?.failed ?? 0),
    refundsPending: revenueSnapshot
      ? formatCurrencyValue(revenueSnapshot.refundsPendingCents, revenueSnapshot.currency, {
          denominator: 100,
          minimumFractionDigits: 0
        })
      : '—',
    alertsOpen: formatNumberValue(alertsOpen)
  };

  const platform = {
    totalUsers: formatNumberValue(platformSnapshot?.totalUsers ?? 0),
    newUsers30d: formatNumberValue(platformSnapshot?.newUsers30d ?? 0),
    newUsersChange: platformSnapshot?.newUsersChange ?? '0%',
    communitiesLive: formatNumberValue(platformSnapshot?.communitiesLive ?? 0),
    instructors: formatNumberValue(platformSnapshot?.instructors ?? 0)
  };

  const launches = Array.isArray(upcomingLaunches)
    ? upcomingLaunches.map((launch) => ({
        id: launch.id,
        title: launch.title,
        community: launch.community,
        startAt: launch.startAt,
        owner: launch.owner,
        callToAction: launch.status && launch.status !== 'scheduled' ? launch.status : null
      }))
    : [];

  const integrations = Array.isArray(integrationSnapshot?.integrations)
    ? integrationSnapshot.integrations.map((integration) => ({
        id: integration.id,
        name: integration.label ?? integration.name ?? integration.id,
        status: integration.health?.status ?? integration.health ?? 'unknown',
        lifecycleStage: integration.lifecycleStage ?? integration.category ?? 'General',
        category: integration.category ?? 'Platform tooling',
        owner: integration.owner ?? integration.team ?? 'Integrations',
        ownerEmail: integration.ownerEmail ?? null,
        utilisation: integration.summary?.successRate ?? null,
        availableUnits: integration.summary?.recordsPushed ?? null,
        totalCapacity: integration.summary?.recordsFailed
          ? (integration.summary.recordsPushed ?? 0) + integration.summary.recordsFailed
          : null,
        adoptionVelocity: integration.summary?.averageDurationSeconds ?? null,
        demandLevel: integration.callHealth?.errorRate ?? null,
        healthScore: integration.health?.score ?? null,
        rentalContracts: integration.summary?.openFailures ?? null,
        value: integration.revenueContribution ?? null,
        lastAudit: integration.reconciliation?.latestGeneratedAt ?? integration.summary?.lastRunAt ?? null
      }))
    : [];

  const cards = Array.isArray(integrationSnapshot?.integrations)
    ? [
        {
          id: 'integrations-enabled',
          label: 'Integrations enabled',
          value: integrationSnapshot.integrations.filter((integration) => integration.enabled).length,
          helper: 'Active connections'
        },
        {
          id: 'integrations-alerts',
          label: 'Open failures',
          value: integrationSnapshot.integrations.reduce(
            (acc, integration) => acc + Number(integration.summary?.openFailures ?? 0),
            0
          ),
          helper: 'Requires follow-up'
        },
        {
          id: 'integrations-success',
          label: 'Median success rate',
          value:
            integrationSnapshot.integrations.length === 0
              ? 0
              : Math.round(
                  integrationSnapshot.integrations.reduce(
                    (acc, integration) => acc + Number(integration.summary?.successRate ?? 0),
                    0
                  ) / Math.max(integrationSnapshot.integrations.length, 1)
                ),
          helper: 'Successful sync runs',
          kind: 'percent'
        },
        {
          id: 'integrations-concurrency',
          label: 'Active jobs',
          value: Number(integrationSnapshot?.concurrency?.activeJobs ?? 0),
          helper: `Max ${integrationSnapshot?.concurrency?.maxConcurrentJobs ?? 0}`
        }
      ]
    : [];

  return {
    support,
    risk,
    platform,
    upcomingLaunches: launches,
    tools: {
      summary: {
        cards,
        meta: {
          pipelineValue: integrationSnapshot?.pipelineValue ?? null,
          occupancy: integrationSnapshot?.occupancy ?? null,
          lastAudit: integrationSnapshot?.generatedAt ?? null
        }
      },
      listing: integrations
    },
    generatedAt: now?.toISOString?.() ?? null
  };
}

export function buildActivitySnapshot(activeIncidents, timeline, referenceDate = new Date()) {
  const alerts = Array.isArray(activeIncidents)
    ? activeIncidents.slice(0, 15).map((incident, index) => ({
        id: incident.incidentUuid ?? `alert-${index}`,
        severity: (incident.severity ?? 'info').toLowerCase(),
        detectedLabel: formatRelativeTimeFrom(incident.reportedAt, referenceDate) ?? 'Just now',
        resolvedLabel: incident.resolution?.resolvedAt
          ? formatRelativeTimeFrom(incident.resolution.resolvedAt, referenceDate)
          : null,
        message: incident.metadata?.summary ?? incident.description ?? 'Incident detected'
      }))
    : [];

  const events = Array.isArray(timeline)
    ? timeline.slice(0, 25).map((event, index) => ({
        id: event.id ?? `event-${index}`,
        entity: event.category ?? 'System',
        occurredLabel: formatRelativeTimeFrom(event.timestamp, referenceDate) ?? '',
        summary: event.label ?? event.description ?? 'Activity captured'
      }))
    : [];

  return { alerts, events };
}

export function buildBlogSnapshot({ summaryRows = [], recentPosts = [], totalViewsRow = null } = {}) {
  const summary = (Array.isArray(summaryRows) ? summaryRows : []).reduce(
    (acc, row) => {
      const status = row.status ?? 'draft';
      const total = Number(row.total ?? 0);
      if (status === 'published') {
        acc.published += total;
      } else if (status === 'scheduled') {
        acc.scheduled += total;
      } else {
        acc.drafts += total;
      }
      return acc;
    },
    { published: 0, drafts: 0, scheduled: 0 }
  );

  const totalViews = Number(totalViewsRow?.totalViews ?? totalViewsRow?.total ?? 0);

  const recent = (Array.isArray(recentPosts) ? recentPosts : []).map((post, index) => ({
    id: post.id ?? `post-${index}`,
    slug: post.slug ?? null,
    title: post.title ?? 'Untitled post',
    status: post.status ?? 'draft',
    publishedAt: post.publishedAt ?? null,
    readingTimeMinutes: Number(post.readingTimeMinutes ?? 0),
    views: Number(post.views ?? post.viewCount ?? 0)
  }));

  return {
    summary: {
      published: summary.published,
      drafts: summary.drafts,
      scheduled: summary.scheduled,
      totalViews
    },
    recent
  };
}

export function buildComplianceRiskHeatmap(incidents = []) {
  const categoryBuckets = new Map();

  incidents.forEach((incident) => {
    const category = incident.category ?? 'other';
    const severity = (incident.severity ?? 'medium').toLowerCase();

    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(
        category,
        INCIDENT_SEVERITIES.reduce((acc, key) => acc.set(key, 0), new Map())
      );
    }

    const severityCounts = categoryBuckets.get(category);
    const severityKey = INCIDENT_SEVERITIES.includes(severity) ? severity : 'medium';
    severityCounts.set(severityKey, (severityCounts.get(severityKey) ?? 0) + 1);
  });

  return Array.from(categoryBuckets.entries())
    .map(([category, severityCounts]) => ({
      category,
      label: INCIDENT_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' '),
      total: INCIDENT_SEVERITIES.reduce(
        (acc, severity) => acc + (severityCounts.get(severity) ?? 0),
        0
      ),
      severities: INCIDENT_SEVERITIES.map((severity) => ({
        severity,
        count: severityCounts.get(severity) ?? 0
      }))
    }))
    .sort((a, b) => b.total - a.total);
}

function buildIncidentResponseFlows(activeIncidents = [], auditSummary = {}) {
  const eventsByIncident = new Map();
  (auditSummary.latestEvents ?? []).forEach((event) => {
    if (event.entityType !== 'security_incident' || !event.entityId) {
      return;
    }
    const key = event.entityId;
    if (!eventsByIncident.has(key)) {
      eventsByIncident.set(key, []);
    }
    eventsByIncident.get(key).push({
      id: event.eventUuid,
      type: event.eventType,
      occurredAt: event.occurredAt,
      severity: event.severity,
      actor: event.actor
    });
  });

  return activeIncidents.map((incident) => ({
    incidentUuid: incident.incidentUuid,
    reference: incident.metadata?.reference ?? incident.incidentUuid,
    severity: incident.severity,
    status: incident.status,
    reportedAt: incident.reportedAt,
    acknowledgement: incident.acknowledgement ?? {},
    resolution: incident.resolution ?? {},
    detectionChannel: incident.metadata?.detectionChannel ?? incident.source ?? 'unknown',
    recommendedActions: incident.metadata?.recommendedActions ?? [],
    watchers: Number(incident.metadata?.watchers ?? 0),
    timeline: (eventsByIncident.get(incident.incidentUuid) ?? []).sort((a, b) =>
      new Date(a.occurredAt) - new Date(b.occurredAt)
    )
  }));
}

function buildComplianceSearchIndex({ frameworks = [], audits, evidence }) {
  const entries = [];

  frameworks.forEach((framework) => {
    entries.push({
      id: `compliance-framework-${framework.id}`,
      role: 'admin',
      type: 'Compliance framework',
      title: `${framework.name} status`,
      url: '/dashboard/admin/operator#compliance',
      category: 'compliance'
    });
  });

  (audits?.eventTypeBreakdown ?? []).slice(0, 5).forEach((event) => {
    entries.push({
      id: `audit-${event.eventType}`,
      role: 'admin',
      type: 'Audit event',
      title: `Audit trail: ${event.eventType}`,
      url: '/dashboard/admin/operator#compliance',
      category: 'compliance'
    });
  });

  (evidence?.exports ?? []).forEach((archive) => {
    entries.push({
      id: `evidence-${archive.id}`,
      role: 'admin',
      type: 'Evidence export',
      title: `Evidence export ${archive.tableName} ${archive.partitionName}`,
      url: '/dashboard/admin/operator#compliance',
      category: 'compliance'
    });
  });

  return entries;
}

function minutesBetween(start, end) {
  if (!start || !end) {
    return null;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function hoursBetween(start, end) {
  const minutes = minutesBetween(start, end);
  return typeof minutes === 'number' ? Number((minutes / 60).toFixed(1)) : null;
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function sum(array, accessor) {
  return array.reduce((total, item) => total + (Number(accessor(item)) || 0), 0);
}

function deriveOperationalScore({ incidents, integrations, storageUsage }) {
  const incidentPenalty = Math.min(incidents.active * 12 + incidents.critical * 20, 60);
  const integrationBonus = Math.min(integrations.operational * 5, 25);
  const storagePenalty = storageUsage.usedPercentage > 85 ? 10 : storageUsage.usedPercentage > 70 ? 5 : 0;

  const baseline = 100 - incidentPenalty - storagePenalty + integrationBonus;
  return Math.max(0, Math.min(100, Math.round(baseline)));
}

export function summariseIncidentQueue(incidents, { now = new Date() } = {}) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const ackMinutes = [];
  const detectionChannels = new Map();
  let breachedAcks = 0;
  let resolutionBreaches = 0;
  let watchers = 0;

  incidents.forEach((incident) => {
    const severity = (incident.severity ?? 'medium').toLowerCase();
    if (severityCounts[severity] !== undefined) {
      severityCounts[severity] += 1;
    }

    const acknowledgement = incident.acknowledgement ?? {};
    if (acknowledgement.acknowledgedAt) {
      const minutesToAck = minutesBetween(incident.reportedAt, acknowledgement.acknowledgedAt);
      if (typeof minutesToAck === 'number') {
        ackMinutes.push(minutesToAck);
      }
    }

    if (acknowledgement.ackBreached) {
      breachedAcks += 1;
    }

    const resolution = incident.resolution ?? {};
    if (resolution.resolutionBreached) {
      resolutionBreaches += 1;
    }

    const channel = incident.metadata?.detectionChannel ?? incident.source ?? 'unknown';
    detectionChannels.set(channel, (detectionChannels.get(channel) ?? 0) + 1);

    watchers += Number(incident.metadata?.watchers ?? 0);
  });

  const totalOpen = incidents.length;
  const oldest = incidents.reduce((old, incident) => {
    const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
    if (!reported) return old;
    if (!old) return reported;
    return reported < old ? reported : old;
  }, null);

  const averageOpenHours = totalOpen
    ? Number(
        (
          incidents.reduce((total, incident) => {
            const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
            if (!reported) return total;
            return total + hoursBetween(reported, now);
          }, 0) / totalOpen
        ).toFixed(1)
      )
    : 0;

  return {
    totalOpen,
    severityCounts,
    medianAckMinutes: median(ackMinutes),
    ackBreaches: breachedAcks,
    resolutionBreaches,
    detectionChannels: Array.from(detectionChannels.entries()).map(([channel, count]) => ({ channel, count })),
    watchers,
    oldestOpenAt: oldest ? oldest.toISOString() : null,
    averageOpenHours
  };
}

export function buildScamSummary(incidents, { now: _now = new Date() } = {}) {
  const scamIncidents = incidents.filter((incident) => incident.category === 'scam' || incident.metadata?.tags?.includes('scam'));
  if (!scamIncidents.length) {
    return {
      activeCases: 0,
      criticalCases: 0,
      impactedLearners: 0,
      blockedPaymentsCents: 0,
      blockedPaymentsFormatted: '$0.00',
      lastDetectedAt: null,
      alerts: []
    };
  }

  const blockedPaymentsCents = sum(scamIncidents, (incident) => incident.metadata?.metrics?.blockedPayments);
  const impactedLearners = sum(scamIncidents, (incident) => incident.metadata?.metrics?.flaggedLearners);
  const lastDetected = scamIncidents.reduce((latest, incident) => {
    const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
    if (!reported) return latest;
    if (!latest) return reported;
    return reported > latest ? reported : latest;
  }, null);

  return {
    activeCases: scamIncidents.length,
    criticalCases: scamIncidents.filter((incident) => (incident.severity ?? '').toLowerCase() === 'critical').length,
    impactedLearners,
    blockedPaymentsCents,
    blockedPaymentsFormatted: `$${(blockedPaymentsCents / 100).toFixed(2)}`,
    lastDetectedAt: lastDetected ? lastDetected.toISOString() : null,
    alerts: scamIncidents.map((incident) => ({
      id: incident.incidentUuid,
      reference: incident.metadata?.reference ?? incident.incidentUuid,
      severity: incident.severity,
      summary: incident.metadata?.summary ?? incident.description,
      reportedAt: incident.reportedAt,
      watchers: incident.metadata?.watchers ?? 0,
      recommendedActions: incident.metadata?.recommendedActions ?? [],
      detectionChannel: incident.metadata?.detectionChannel ?? incident.source
    }))
  };
}

function normaliseServiceHealth(manifest, incidents) {
  const services = Array.isArray(manifest?.services) ? manifest.services : [];
  const capabilities = Array.isArray(manifest?.capabilities) ? manifest.capabilities : [];
  const summary = manifest?.summary ?? { services: {}, capabilities: {} };

  const impactedCapabilities = capabilities
    .filter((capability) => capability.status && capability.status !== 'operational')
    .map((capability) => ({
      key: capability.capability,
      name: capability.name ?? capability.capability,
      status: capability.status,
      summary: capability.summary,
      dependencies: capability.dependencies ?? [],
      evaluation: capability.evaluation ?? null
    }));

  const serviceDetails = services
    .map((service) => ({
      key: service.key,
      name: service.name,
      status: service.status,
      summary: service.summary,
      checkedAt: service.checkedAt,
      components: Array.isArray(service.components)
        ? service.components.map((component) => ({
            name: component.name,
            status: component.status,
            message: component.message,
            updatedAt: component.updatedAt
          }))
        : []
    }))
    .sort((a, b) => {
      const rankA = SEVERITY_RANK[a.status] ?? 0;
      const rankB = SEVERITY_RANK[b.status] ?? 0;
      if (rankA === rankB) {
        return a.name.localeCompare(b.name);
      }
      return rankB - rankA;
    });

  const detectionChannels = incidents.reduce((acc, incident) => {
    const channel = incident.metadata?.detectionChannel ?? incident.source ?? 'unknown';
    acc.set(channel, (acc.get(channel) ?? 0) + 1);
    return acc;
  }, new Map());

  const contactPoints = incidents
    .flatMap((incident) => {
      const contacts = incident.metadata?.contactPoints;
      if (!contacts || typeof contacts !== 'object') {
        return [];
      }
      return Object.entries(contacts);
    })
    .reduce((acc, [key, value]) => {
      if (!value) {
        return acc;
      }
      if (!acc.some((entry) => entry.key === key && entry.value === value)) {
        acc.push({ key, value });
      }
      return acc;
    }, []);

  return {
    summary: {
      manifestGeneratedAt: manifest?.generatedAt ?? null,
      totalServices: services.length,
      impactedServices: (summary.services?.degraded ?? 0) + (summary.services?.outage ?? 0) + (summary.services?.unknown ?? 0),
      totalCapabilities: capabilities.length,
      impactedCapabilities: impactedCapabilities.length,
      statusCounts: summary.services ?? {},
      capabilityStatusCounts: summary.capabilities ?? {},
      watchers: sum(incidents, (incident) => incident.metadata?.watchers),
      detectionChannels: Array.from(detectionChannels.entries()).map(([channel, count]) => ({ channel, count }))
    },
    services: serviceDetails,
    impactedCapabilities,
    contactPoints
  };
}

function formatIncidentForPresentation(incident, { now = new Date() } = {}) {
  const acknowledgement = incident.acknowledgement ?? {};
  const resolution = incident.resolution ?? {};
  const metrics = incident.metadata?.metrics ?? {};

  return {
    id: incident.id,
    incidentUuid: incident.incidentUuid,
    reference: incident.metadata?.reference ?? incident.incidentUuid,
    category: incident.category,
    severity: incident.severity,
    status: incident.status,
    source: incident.source,
    detectionChannel: incident.metadata?.detectionChannel ?? incident.source,
    summary: incident.metadata?.summary ?? null,
    reportedAt: incident.reportedAt,
    acknowledgedAt: acknowledgement.acknowledgedAt ?? null,
    resolutionTargetAt: resolution.targetAt ?? null,
    resolvedAt: resolution.resolvedAt ?? null,
    ackSlaMinutes: acknowledgement.ackSlaMinutes ?? null,
    ackBreached: acknowledgement.ackBreached ?? false,
    resolutionSlaMinutes: resolution.resolutionSlaMinutes ?? null,
    resolutionBreached: resolution.resolutionBreached ?? false,
    recommendedActions: incident.metadata?.recommendedActions ?? [],
    playbook: incident.metadata?.playbook ?? null,
    watchers: incident.metadata?.watchers ?? 0,
    relatedCapabilities: incident.metadata?.relatedCapabilities ?? [],
    metrics: {
      impactedLearners: metrics.flaggedLearners ?? 0,
      blockedPaymentsCents: metrics.blockedPayments ?? 0,
      elevatedSessions: metrics.elevatedSessions ?? 0
    },
    contactPoints: incident.metadata?.contactPoints ?? {},
    timeOpenMinutes: minutesBetween(incident.reportedAt, now),
    attachments: incident.metadata?.attachments ?? []
  };
}

function formatResolvedIncident(incident) {
  const resolution = incident.resolution ?? {};
  const durationMinutes = minutesBetween(incident.reportedAt, resolution.resolvedAt ?? incident.resolvedAt);
  return {
    id: incident.id,
    incidentUuid: incident.incidentUuid,
    reference: incident.metadata?.reference ?? incident.incidentUuid,
    category: incident.category,
    severity: incident.severity,
    resolvedAt: resolution.resolvedAt ?? incident.resolvedAt,
    durationMinutes,
    followUp: resolution.followUp ?? null,
    detectionChannel: incident.metadata?.detectionChannel ?? incident.source
  };
}

function buildRunbookShortcuts(activeIncidents, resolvedIncidents) {
  const runbooks = new Map();
  const allIncidents = [...activeIncidents, ...resolvedIncidents];
  allIncidents.forEach((incident) => {
    const playbook = incident.metadata?.playbook;
    if (!playbook || !playbook.id) {
      return;
    }
    const existing = runbooks.get(playbook.id);
    const severityRank = SEVERITY_RANK[(incident.severity ?? 'low').toLowerCase()] ?? 0;
    if (!existing) {
      runbooks.set(playbook.id, {
        id: playbook.id,
        title: playbook.title ?? playbook.id,
        description: incident.metadata?.summary ?? 'Operational response playbook',
        url: playbook.url ?? null,
        highestSeverity: severityRank,
        references: new Set([incident.metadata?.reference ?? incident.incidentUuid]),
        categories: new Set([incident.category])
      });
    } else {
      existing.highestSeverity = Math.max(existing.highestSeverity, severityRank);
      existing.references.add(incident.metadata?.reference ?? incident.incidentUuid);
      existing.categories.add(incident.category);
    }
  });

  return Array.from(runbooks.values())
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      url: entry.url,
      severity: entry.highestSeverity,
      references: Array.from(entry.references),
      categories: Array.from(entry.categories)
    }))
    .sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
}

function buildTimeline(activeIncidents, resolvedIncidents) {
  const items = [];
  activeIncidents.forEach((incident) => {
    const reference = incident.metadata?.reference ?? incident.incidentUuid;
    const severity = incident.severity ?? 'medium';
    if (incident.reportedAt) {
      items.push({
        id: `${reference}-reported`,
        timestamp: incident.reportedAt,
        label: `${reference} reported`,
        description: incident.metadata?.summary ?? 'Incident reported',
        severity,
        category: incident.category
      });
    }
    if (incident.acknowledgement?.acknowledgedAt) {
      items.push({
        id: `${reference}-acknowledged`,
        timestamp: incident.acknowledgement.acknowledgedAt,
        label: `${reference} acknowledged`,
        description: `Responder ${incident.acknowledgement.responder ?? 'Ops'} engaged.`,
        severity,
        category: incident.category
      });
    }
    const timelineEntries = Array.isArray(incident.metadata?.timeline) ? incident.metadata.timeline : [];
    timelineEntries.forEach((entry, index) => {
      if (!entry?.timestamp) {
        return;
      }
      items.push({
        id: `${reference}-timeline-${index}`,
        timestamp: entry.timestamp,
        label: `${reference} ${entry.event ?? 'update'}`,
        description: entry.detail ?? null,
        severity,
        category: incident.category
      });
    });
  });

  resolvedIncidents.forEach((incident) => {
    const reference = incident.metadata?.reference ?? incident.incidentUuid;
    const severity = incident.severity ?? 'medium';
    if (incident.resolution?.resolvedAt ?? incident.resolvedAt) {
      items.push({
        id: `${reference}-resolved`,
        timestamp: incident.resolution?.resolvedAt ?? incident.resolvedAt,
        label: `${reference} resolved`,
        description: incident.resolution?.followUp ?? 'Resolution confirmed.',
        severity,
        category: incident.category
      });
    }
  });

  return items
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 25);
}

function buildSearchIndex(activeIncidents, runbooks) {
  const incidentEntries = activeIncidents.map((incident) => ({
    id: `incident-${incident.incidentUuid}`,
    role: 'admin',
    type: 'Incident',
    title: `${incident.metadata?.reference ?? incident.incidentUuid} (${incident.severity})`,
    url: '/dashboard/admin/operator',
    category: incident.category
  }));

  const runbookEntries = runbooks.map((runbook) => ({
    id: `runbook-${runbook.id}`,
    role: 'admin',
    type: 'Runbook',
    title: runbook.title,
    url: runbook.url ?? '/dashboard/admin/operator',
    category: runbook.categories[0] ?? 'operations'
  }));

  return [
    {
      id: 'operator-overview',
      role: 'admin',
      type: 'Dashboard',
      title: 'Operator command centre',
      url: '/dashboard/admin/operator',
      category: 'operations'
    },
    ...incidentEntries,
    ...runbookEntries
  ];
}

function buildProfileStats(queueSummary, scamSummary, integrationSnapshot, complianceSnapshot) {
  const stats = [
    {
      label: 'Open incidents',
      value: `${queueSummary.totalOpen} active`
    },
    {
      label: 'Critical alerts',
      value: `${queueSummary.severityCounts.critical} critical`
    },
    {
      label: 'Scam cases',
      value: `${scamSummary.activeCases} monitoring`
    }
  ];

  if (integrationSnapshot?.integrations?.length) {
    const totalOpenFailures = integrationSnapshot.integrations.reduce(
      (acc, integration) => acc + (integration.summary?.openFailures ?? 0),
      0
    );
    stats.push({
      label: 'Integration alerts',
      value: `${totalOpenFailures} pending`
    });
  }

  if (complianceSnapshot) {
    stats.push({
      label: 'KYC queue',
      value: `${complianceSnapshot.queue.length} queued`
    });
    stats.push({
      label: 'Attestation coverage',
      value: `${Number(complianceSnapshot.attestations?.totals?.coverage ?? 0).toFixed(1)}%`
    });
  }

  return stats;
}

function buildProfileBio(queueSummary, scamSummary, healthSummary, complianceSnapshot) {
  const impacted = healthSummary.impactedServices;
  const watchers = healthSummary.watchers;
  const dsarOutstanding = complianceSnapshot?.gdpr?.dsar?.overdue ?? 0;
  const attestationCoverage = complianceSnapshot
    ? Number(complianceSnapshot.attestations?.totals?.coverage ?? 0).toFixed(1)
    : null;
  const base = `Monitoring ${queueSummary.totalOpen} live incidents (${queueSummary.severityCounts.critical} critical) with ${
    watchers ?? 0
  } watchers engaged across ${impacted} impacted services.`;
  if (complianceSnapshot) {
    return `${base} Tracking ${dsarOutstanding} overdue DSARs with ${attestationCoverage}% policy attestation coverage.`;
  }
  return base;
}

export default class OperatorDashboardService {
  constructor({
    manifestService = new CapabilityManifestService(),
    incidentsModel = SecurityIncidentModel,
    integrationDashboardService = new IntegrationDashboardService(),
    complianceService = new ComplianceService(),
    auditEventService = new AuditEventService(),
    identityVerificationService = IdentityVerificationService,
    partitionService = dataPartitionService,
    storage = storageService,
    businessIntelligenceService = new BusinessIntelligenceService(),
    runtimeConfig = runtimeConfigService,
    nowProvider = () => new Date(),
    loggerInstance = logger.child({ service: 'OperatorDashboardService' })
  } = {}) {
    this.manifestService = manifestService;
    this.incidentsModel = incidentsModel;
    this.integrationDashboardService = integrationDashboardService;
    this.complianceService = complianceService;
    this.auditEventService = auditEventService;
    this.identityVerificationService = identityVerificationService;
    this.partitionService = partitionService;
    this.storage = storage;
    this.businessIntelligenceService = businessIntelligenceService;
    this.runtimeConfig = runtimeConfig;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
  }

  async #loadRevenueSnapshot({ tenantId, now }) {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(now.getTime() - thirtyDaysMs);

    let executiveOverview = null;
    let savedViews = null;

    if (this.businessIntelligenceService) {
      try {
        [executiveOverview, savedViews] = await Promise.all([
          this.businessIntelligenceService.getExecutiveOverview({ range: '30d', tenantId }),
          this.businessIntelligenceService.getRevenueSavedViews({ range: '30d', tenantId })
        ]);
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to load business intelligence snapshots for operator dashboard');
      }
    }

    let paymentsRow = null;
    try {
      paymentsRow = await db('payment_intents')
        .select({
          succeededIntents: castAsBigInt(
            db,
            "SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END)"
          ),
          processingIntents: castAsBigInt(
            db,
            "SUM(CASE WHEN status IN ('processing','requires_capture') THEN 1 ELSE 0 END)"
          ),
          requiresActionIntents: castAsBigInt(
            db,
            "SUM(CASE WHEN status IN ('requires_action','requires_payment_method') THEN 1 ELSE 0 END)"
          ),
          failedIntents: castAsBigInt(
            db,
            "SUM(CASE WHEN status IN ('canceled','failed') THEN 1 ELSE 0 END)"
          ),
          totalIntents: castAsBigInt(db, 'COUNT(*)'),
          capturedCents: castAsBigInt(
            db,
            "SUM(CASE WHEN status IN ('succeeded','requires_capture') THEN amount_total ELSE 0 END)"
          ),
          pendingCents: castAsBigInt(
            db,
            "SUM(CASE WHEN status IN ('processing','requires_action') THEN amount_total ELSE 0 END)"
          ),
          refundedCents: castAsBigInt(db, 'SUM(amount_refunded)')
        })
        .where('created_at', '>=', thirtyDaysAgo)
        .first();
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to aggregate payment intent status for operator dashboard');
    }

    return composeRevenueSnapshot({ executiveOverview, savedViews, paymentsRow });
  }

  async #loadPlatformSnapshot({ now }) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let totalUsersRow = null;
    let newUsersRow = null;
    let previousNewUsersRow = null;
    let communityRow = null;
    let instructorsRow = null;

    try {
      [totalUsersRow, newUsersRow, previousNewUsersRow, communityRow, instructorsRow] = await Promise.all([
        db('users').count({ total: '*' }).first(),
        db('users').where('created_at', '>=', thirtyDaysAgo).count({ total: '*' }).first(),
        db('users')
          .where('created_at', '>=', sixtyDaysAgo)
          .andWhere('created_at', '<', thirtyDaysAgo)
          .count({ total: '*' })
          .first(),
        db('communities').whereNull('deleted_at').count({ total: '*' }).first(),
        db('users').where('role', 'instructor').count({ total: '*' }).first()
      ]);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load platform snapshot for operator dashboard');
    }

    const totalUsers = Number(totalUsersRow?.total ?? 0);
    const newUsers = Number(newUsersRow?.total ?? 0);
    const previousNewUsers = Number(previousNewUsersRow?.total ?? 0);
    const changeBase = previousNewUsers === 0 ? (newUsers > 0 ? newUsers : 1) : previousNewUsers;
    const newUsersChangePercentage = ((newUsers - previousNewUsers) / changeBase) * 100;

    return {
      totalUsers,
      newUsers30d: newUsers,
      newUsersChange: Number.isFinite(newUsersChangePercentage)
        ? `${newUsersChangePercentage >= 0 ? '+' : ''}${percentFormatter.format(Math.abs(newUsersChangePercentage))}%`
        : '0%',
      communitiesLive: Number(communityRow?.total ?? 0),
      instructors: Number(instructorsRow?.total ?? 0)
    };
  }

  async #loadUpcomingLaunches({ now }) {
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
      const rows = await db('courses as c')
        .leftJoin('users as u', 'u.id', 'c.instructor_id')
        .select({
          id: 'c.id',
          title: 'c.title',
          releaseAt: 'c.release_at',
          status: 'c.status',
          instructorFirstName: 'u.first_name',
          instructorLastName: 'u.last_name'
        })
        .whereNotNull('c.release_at')
        .andWhere('c.release_at', '>=', now)
        .andWhere('c.release_at', '<=', fourteenDaysAhead)
        .andWhereNull('c.deleted_at')
        .orderBy('c.release_at', 'asc')
        .limit(12);

      return rows.map((row) => ({
        id: `course-${row.id}`,
        title: row.title ?? 'Course launch',
        community: 'Courses',
        startAt: row.releaseAt,
        owner: [row.instructorFirstName, row.instructorLastName].filter(Boolean).join(' ') || 'Curriculum',
        status: row.status ?? 'scheduled'
      }));
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load upcoming course launches for operator dashboard');
      return [];
    }
  }

  #buildApprovalsSnapshot(complianceSnapshot, referenceDate = new Date()) {
    const queue = Array.isArray(complianceSnapshot?.queue) ? complianceSnapshot.queue : [];
    const items = queue.slice(0, 8).map((item, index) => {
      const submittedAt = item.lastSubmittedAt ?? item.verification?.submittedAt ?? null;
      const waitingLabel = item.waitingHours
        ? `${Math.round(Number(item.waitingHours))}h in queue`
        : submittedAt
          ? formatRelativeTimeFrom(submittedAt, referenceDate)
          : null;

      return {
        id: item.id ? `kyc-${item.id}` : `approval-${index}`,
        name: item.user?.name ?? item.reference ?? `Verification ${item.id ?? index + 1}`,
        type: 'KYC',
        summary: `Risk ${Number(item.riskScore ?? 0)}/10 · Docs ${Number(item.documentsSubmitted ?? 0)}/${
          Number(item.documentsRequired ?? 0)
        }`,
        status: item.status ?? 'pending_review',
        submittedAt: waitingLabel,
        amount: null,
        action: item.hasBreachedSla ? 'Escalate' : 'Review'
      };
    });

    return {
      pendingCount: queue.length,
      items
    };
  }

  async #loadBlogSnapshot() {
    try {
      const [summaryRows, recentPosts] = await Promise.all([
        db('blog_posts')
          .select({ status: 'status' })
          .count({ total: '*' })
          .groupBy('status'),
        db('blog_posts as bp')
          .select({
            id: 'bp.id',
            slug: 'bp.slug',
            title: 'bp.title',
            status: 'bp.status',
            publishedAt: 'bp.published_at',
            readingTimeMinutes: 'bp.reading_time_minutes',
            views: 'bp.view_count'
          })
          .orderBy('bp.published_at', 'desc')
          .orderBy('bp.created_at', 'desc')
          .limit(8)
      ]);

      const totalViewsRow = await db('blog_posts').sum({ totalViews: 'view_count' }).first();
      return buildBlogSnapshot({ summaryRows, recentPosts, totalViewsRow });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load blog snapshot for operator dashboard');
      return buildBlogSnapshot();
    }
  }

  async #buildComplianceSnapshot({ tenantId, now, activeIncidents, resolvedIncidents }) {
    let kycOverview = {
      metrics: [],
      queue: [],
      slaBreaches: 0,
      manualReviewQueue: 0,
      gdpr: {}
    };

    try {
      kycOverview = await this.identityVerificationService.getAdminOverview({ now, limit: 25 });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to load identity verification overview for compliance dashboard');
    }

    let auditSummary = {
      totals: { events: 0, investigations: 0, controlsTested: 0, policyUpdates: 0 },
      countsBySeverity: { info: 0, notice: 0, warning: 0, error: 0, critical: 0 },
      eventTypeBreakdown: [],
      actorBreakdown: [],
      latestEvents: [],
      lastEventAt: null
    };
    try {
      auditSummary = await this.auditEventService.summariseRecent({
        tenantId,
        since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to summarise recent audit events');
    }

    let attestationSummary = { policies: [], totals: { required: 0, granted: 0, outstanding: 0, coverage: 100 } };
    try {
      attestationSummary = await this.complianceService.summarisePolicyAttestations({ tenantId, now });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to summarise policy attestations for compliance console');
    }

    const archiveTables = ['audit_events', 'dsr_requests', 'consent_records'];
    let archives = [];
    try {
      const archiveResults = await Promise.all(
        archiveTables.map((tableName) =>
          this.partitionService.listArchives({ tableName, limit: 4 }).catch((error) => {
            this.logger.warn({ err: error, tableName }, 'Failed to fetch evidence archives for table');
            return [];
          })
        )
      );
      archives = archiveResults.flat().slice(0, 10);
    } catch (error) {
      this.logger.warn({ err: error }, 'Unable to compile compliance evidence archives');
    }

    const riskHeatmap = buildComplianceRiskHeatmap(activeIncidents);
    const severityTotals = INCIDENT_SEVERITIES.reduce((acc, severity) => {
      acc[severity] = riskHeatmap.reduce((total, row) => {
        const bucket = row.severities.find((entry) => entry.severity === severity);
        return total + (bucket?.count ?? 0);
      }, 0);
      return acc;
    }, {});

    const exposures = riskHeatmap.slice(0, 3).map((row) => {
      const dominant = row.severities.reduce(
        (prev, current) => (current.count > prev.count ? current : prev),
        { severity: 'low', count: 0 }
      );
      const watcherTotal = activeIncidents
        .filter((incident) => (incident.category ?? 'other') === row.category)
        .reduce((sum, incident) => sum + Number(incident.metadata?.watchers ?? 0), 0);
      return {
        category: row.category,
        label: row.label,
        total: row.total,
        dominantSeverity: dominant.severity,
        watchers: watcherTotal
      };
    });

    const incidentResponse = {
      flows: buildIncidentResponseFlows(activeIncidents, auditSummary),
      recentResolved: resolvedIncidents.slice(0, 5).map((incident) => ({
        incidentUuid: incident.incidentUuid,
        reference: incident.metadata?.reference ?? incident.incidentUuid,
        severity: incident.severity,
        status: incident.status,
        resolvedAt: incident.resolution?.resolvedAt ?? incident.resolvedAt,
        resolutionMinutes: minutesBetween(incident.reportedAt, incident.resolution?.resolvedAt ?? incident.resolvedAt),
        followUp: incident.resolution?.followUp ?? null
      })),
      queueSummary: summariseIncidentQueue(activeIncidents, { now })
    };

    const evidenceExports = await Promise.all(
      archives.map(async (archive) => {
        let downloadUrl = null;
        let downloadExpiresAt = null;
        if (archive.storageBucket && archive.storageKey) {
          try {
            const download = await this.storage.createDownloadUrl({
              bucket: archive.storageBucket,
              key: archive.storageKey,
              visibility: 'workspace',
              responseContentDisposition: `attachment; filename="${archive.tableName}-${archive.partitionName}.parquet"`
            });
            downloadUrl = download.url;
            downloadExpiresAt = download.expiresAt instanceof Date ? download.expiresAt.toISOString() : null;
          } catch (error) {
            this.logger.warn({ err: error, archiveId: archive.id }, 'Failed to generate evidence download URL');
          }
        }

        return {
          id: archive.id,
          tableName: archive.tableName,
          partitionName: archive.partitionName,
          rangeStart: archive.rangeStart,
          rangeEnd: archive.rangeEnd,
          retentionDays: archive.retentionDays,
          archivedAt: archive.archivedAt,
          droppedAt: archive.droppedAt,
          byteSize: archive.byteSize,
          sizeLabel: formatBytes(archive.byteSize),
          rowCount: archive.rowCount,
          checksum: archive.checksum,
          metadata: archive.metadata,
          storageBucket: archive.storageBucket,
          storageKey: archive.storageKey,
          downloadUrl,
          downloadExpiresAt
        };
      })
    );

    const frameworkSummaries = (() => {
      const dsar = kycOverview.gdpr?.dsar ?? {};
      const ico = kycOverview.gdpr?.ico ?? {};
      const criticalIncidents = severityTotals.critical ?? 0;
      const auditCritical = auditSummary.countsBySeverity?.critical ?? 0;
      const auditErrors = auditSummary.countsBySeverity?.error ?? 0;
      const overdueDsar = dsar.overdue ?? 0;
      const kycBreaches = kycOverview.slaBreaches ?? 0;
      const complianceCoverage = attestationSummary.totals.coverage ?? 100;

      const deriveStatus = (score) => {
        if (score >= 3) return 'attention';
        if (score === 2) return 'watch';
        return 'passing';
      };

      const soc2Score = auditCritical > 0 || criticalIncidents > 0 ? 3 : auditErrors > 0 ? 2 : 1;
      const isoScore = criticalIncidents > 0 ? 3 : severityTotals.high > 2 ? 2 : 1;
      const gdprScore = overdueDsar + kycBreaches > 0 ? 2 : 1;

      return [
        {
          id: 'soc2',
          name: 'SOC 2 Type II',
          status: deriveStatus(soc2Score),
          owner: process.env.SOC2_OWNER ?? 'Security & Compliance Lead',
          renewalDue: process.env.SOC2_RENEWAL_DUE ?? null,
          controlsTested: auditSummary.totals.controlsTested ?? 0,
          outstandingActions: auditSummary.totals.investigations ?? 0,
          description: 'Trust service criteria coverage and automated audit trail integrity.'
        },
        {
          id: 'iso27001',
          name: 'ISO 27001',
          status: deriveStatus(isoScore),
          owner: process.env.ISO27001_OWNER ?? 'Infrastructure & Security',
          renewalDue: process.env.ISO27001_RENEWAL_DUE ?? null,
          outstandingActions: severityTotals.high + severityTotals.critical,
          description: 'Operational security controls and incident management maturity.'
        },
        {
          id: 'uk-gdpr',
          name: 'UK GDPR & ICO',
          status: deriveStatus(gdprScore),
          owner: dsar.owner ?? process.env.GDPR_DATA_PROTECTION_OFFICER ?? 'Data Protection Officer',
          renewalDue: ico.renewalDue ?? null,
          outstandingActions: overdueDsar,
          coverage: complianceCoverage,
          description: 'Data subject rights, consent attestation, and ICO registration cadence.'
        }
      ];
    })();

    return {
      metrics: kycOverview.metrics ?? [],
      queue: kycOverview.queue ?? [],
      slaBreaches: kycOverview.slaBreaches ?? 0,
      manualReviewQueue: kycOverview.manualReviewQueue ?? 0,
      gdpr: kycOverview.gdpr ?? {},
      audits: auditSummary,
      attestations: attestationSummary,
      frameworks: frameworkSummaries,
      risk: {
        heatmap: riskHeatmap,
        severityTotals,
        exposures
      },
      incidentResponse,
      evidence: {
        exports: evidenceExports,
        permissions: {
          roles: EVIDENCE_ACCESS_ROLES,
          requestChannel: process.env.COMPLIANCE_EVIDENCE_REQUEST_CHANNEL ?? '#security-compliance'
        },
        storage: env.partitioning?.archive ?? {}
      }
    };
  }

  async #loadSettingsSnapshot() {
    const safeCall = async (factory, fallback) => {
      try {
        return await factory();
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to load admin settings snapshot');
        return fallback;
      }
    };

    const [profile, payments, emails, security, finance, monetization] = await Promise.all([
      safeCall(() => PlatformSettingsService.getAdminProfileSettings(), normaliseAdminProfile({})),
      safeCall(() => PlatformSettingsService.getPaymentSettings(), normalisePaymentSettings({})),
      safeCall(() => PlatformSettingsService.getEmailSettings(), normaliseEmailSettings({})),
      safeCall(() => PlatformSettingsService.getSecuritySettings(), normaliseSecuritySettings({})),
      safeCall(() => PlatformSettingsService.getFinanceSettings(), normaliseFinanceSettings({})),
      safeCall(() => PlatformSettingsService.getMonetizationSettings(), normaliseMonetization({}))
    ]);

    return {
      profile: profile ?? normaliseAdminProfile({}),
      payments: payments ?? normalisePaymentSettings({}),
      emails: emails ?? normaliseEmailSettings({}),
      security: security ?? normaliseSecuritySettings({}),
      finance: finance ?? normaliseFinanceSettings({}),
      monetization: monetization ?? normaliseMonetization({})
    };
  }

  async build({ user, tenantId = 'global', now = this.nowProvider() } = {}) {
    const userContext = {
      userId: user?.id ?? null,
      role: user?.role ?? null,
      tenantId
    };

    const [manifest, activeIncidents, resolvedIncidents, integrationSnapshot, settingsSnapshot] = await Promise.all([
      this.manifestService
        .buildManifest({
          audience: 'ops',
          userContext
        })
        .catch((error) => {
          this.logger.warn({ err: error }, 'Failed to build capability manifest for operator dashboard');
          return null;
        }),
      this.incidentsModel.listActive({ tenantId, limit: 25 }).catch((error) => {
        this.logger.error({ err: error }, 'Failed to load active security incidents');
        return [];
      }),
      this.incidentsModel.listRecentlyResolved({ tenantId, limit: 15 }).catch((error) => {
        this.logger.error({ err: error }, 'Failed to load resolved security incidents');
        return [];
      }),
      this.integrationDashboardService
        .buildSnapshot({ runLimit: 8, failureLimit: 25, reportLimit: 3 })
        .catch((error) => {
          this.logger.error({ err: error }, 'Failed to build integration dashboard snapshot');
          return null;
        }),
      this.#loadSettingsSnapshot()
    ]);

    const queueSummary = summariseIncidentQueue(activeIncidents, { now });
    const scamSummary = buildScamSummary(activeIncidents, { now });
    const serviceHealth = normaliseServiceHealth(manifest, activeIncidents);
    const runbooks = buildRunbookShortcuts(activeIncidents, resolvedIncidents);
    const timeline = buildTimeline(activeIncidents, resolvedIncidents);
    const complianceSnapshot = await this.#buildComplianceSnapshot({
      tenantId,
      now,
      activeIncidents,
      resolvedIncidents
    });

    const integrationList = Array.isArray(integrationSnapshot?.integrations)
      ? integrationSnapshot.integrations
      : [];

    const integrationStats = {
      operational: integrationList.filter((integration) => integration.health === 'operational').length,
      degraded: integrationList.filter((integration) => integration.health === 'warning').length,
      critical: integrationList.filter((integration) => integration.health === 'critical').length,
      total: integrationList.length
    };

    const evidenceUsageBytes = (complianceSnapshot.evidence?.exports ?? []).reduce(
      (total, archive) => total + Number(archive.byteSize ?? 0),
      0
    );
    const assumedCapacityBytes = Math.max(Number(env.storage?.maxUploadBytes ?? 500 * 1024 * 1024) * 200, 1);
    const storageUsage = {
      usedBytes: evidenceUsageBytes,
      totalBytes: assumedCapacityBytes,
      usedPercentage: Math.min(100, Math.round((evidenceUsageBytes / assumedCapacityBytes) * 100)),
      formattedUsed: formatBytes(evidenceUsageBytes),
      formattedTotal: formatBytes(assumedCapacityBytes)
    };

    const incidentStats = {
      active: queueSummary.totalOpen,
      critical: queueSummary.severityCounts?.critical ?? 0
    };

    const operationalScore = deriveOperationalScore({
      incidents: incidentStats,
      integrations: integrationStats,
      storageUsage
    });

    const [revenueSnapshot, platformSnapshot, upcomingLaunches, blogSnapshot] = await Promise.all([
      this.#loadRevenueSnapshot({ tenantId, now }),
      this.#loadPlatformSnapshot({ now }),
      this.#loadUpcomingLaunches({ now }),
      this.#loadBlogSnapshot()
    ]);

    const approvals = this.#buildApprovalsSnapshot(complianceSnapshot, now);
    const operationsSnapshot = buildOperationsSnapshot({
      queueSummary,
      complianceSnapshot,
      platformSnapshot,
      revenueSnapshot,
      integrationSnapshot,
      upcomingLaunches,
      now
    });
    const activitySnapshot = buildActivitySnapshot(activeIncidents, timeline, now);
    const meta = buildDashboardMeta({
      runtimeConfig: this.runtimeConfig,
      tenantId,
      now,
      manifestGeneratedAt: serviceHealth.summary?.manifestGeneratedAt ?? null,
      operationalScore
    });

    return {
      dashboard: {
        meta,
        metrics: {
          serviceHealth: serviceHealth.summary,
          incidents: queueSummary,
          scams: scamSummary,
          compliance: {
            kycQueue: complianceSnapshot.queue.length,
            dsarOutstanding: complianceSnapshot.gdpr?.dsar?.overdue ?? 0,
            attestationCoverage: complianceSnapshot.attestations.totals.coverage ?? 100,
            storageUsage
          },
          integrations: integrationStats
        },
        serviceHealth,
        incidents: {
          active: activeIncidents.map((incident) => formatIncidentForPresentation(incident, { now })),
          recentResolved: resolvedIncidents.map(formatResolvedIncident)
        },
        runbooks,
        timeline,
        integrations: integrationSnapshot,
        compliance: complianceSnapshot,
        approvals,
        revenue: revenueSnapshot,
        operations: {
          support: operationsSnapshot.support,
          risk: operationsSnapshot.risk,
          platform: operationsSnapshot.platform,
          upcomingLaunches: operationsSnapshot.upcomingLaunches
        },
        tools: operationsSnapshot.tools,
        activity: activitySnapshot,
        settings: settingsSnapshot,
        blog: blogSnapshot
      },
      searchIndex: [
        ...buildSearchIndex(activeIncidents, runbooks),
        ...buildComplianceSearchIndex({
          frameworks: complianceSnapshot.frameworks,
          audits: complianceSnapshot.audits,
          evidence: complianceSnapshot.evidence
        }),
        ...(integrationSnapshot?.searchIndex ?? [])
      ],
      profileStats: buildProfileStats(queueSummary, scamSummary, integrationSnapshot, complianceSnapshot),
      profileTitleSegment: 'Platform operations overview',
      profileBio: buildProfileBio(queueSummary, scamSummary, serviceHealth.summary, complianceSnapshot)
    };
  }
}
