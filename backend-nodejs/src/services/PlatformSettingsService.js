import { randomUUID } from 'crypto';

import PlatformSettingModel from '../models/PlatformSettingModel.js';
import db from '../config/database.js';
import { env } from '../config/env.js';

const SETTINGS_KEYS = Object.freeze({
  ADMIN_PROFILE: 'admin_profile',
  PAYMENT: 'payment',
  EMAIL: 'email',
  SECURITY: 'security',
  FINANCE: 'finance',
  MONETIZATION: 'monetization',
  APPEARANCE: 'appearance',
  PREFERENCES: 'preferences',
  SYSTEM: 'system',
  INTEGRATIONS: 'integrations',
  THIRD_PARTY: 'third_party'
});

const DEFAULT_APPEARANCE = Object.freeze({
  branding: {
    primaryColor: '#2563EB',
    secondaryColor: '#9333EA',
    accentColor: '#F59E0B',
    logoUrl: '',
    faviconUrl: ''
  },
  theme: {
    mode: 'system',
    borderRadius: 'rounded',
    density: 'comfortable',
    fontFamily: 'Inter',
    headingFontFamily: 'Cal Sans'
  },
  hero: {
    heading: 'Inspire learners at scale',
    subheading:
      'Craft immersive cohort experiences, digitise your expertise, and operate a vibrant learning community from a single console.',
    backgroundImageUrl: '',
    backgroundVideoUrl: '',
    primaryCtaLabel: 'Explore programs',
    primaryCtaUrl: '/explore',
    secondaryCtaLabel: 'Book a demo',
    secondaryCtaUrl: '/demo'
  },
  mediaLibrary: []
});

const DEFAULT_PREFERENCES = Object.freeze({
  localisation: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    currency: 'USD',
    timezone: 'UTC'
  },
  experience: {
    enableRecommendations: true,
    enableSocialSharing: true,
    enableLiveChatSupport: false,
    allowGuestCheckout: false,
    requireEmailVerification: true
  },
  communications: {
    supportEmail: 'support@edulure.io',
    supportPhone: '',
    marketingEmail: '',
    sendWeeklyDigest: true,
    sendProductUpdates: true
  }
});

const DEFAULT_SYSTEM = Object.freeze({
  maintenanceMode: {
    enabled: false,
    message: '',
    scheduledWindow: null
  },
  operations: {
    timezone: 'UTC',
    weeklyBackupDay: 'sunday',
    autoUpdatesEnabled: true,
    dataRetentionDays: 365
  },
  security: {
    enforceMfaForAdmins: true,
    sessionTimeoutMinutes: 60,
    allowSessionResume: true
  },
  observability: {
    enableAuditTrail: true,
    errorReportingEmail: '',
    notifyOnIntegrationFailure: true
  }
});

const DEFAULT_INTEGRATIONS = Object.freeze({
  webhooks: [],
  services: []
});

const DEFAULT_THIRD_PARTY = Object.freeze({
  credentials: []
});

function deepMergeLimited(base, patch) {
  if (!patch || typeof patch !== 'object') {
    return { ...base };
  }

  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      result[key] = value.slice(0, 20);
    } else if (value && typeof value === 'object') {
      result[key] = deepMergeLimited(base?.[key] ?? {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const DEFAULT_ADMIN_PROFILE = Object.freeze({
  organisation: {
    name: 'Edulure Operations',
    mission: 'Deliver resilient learning operations with trust and transparency.',
    tagline: 'Ops excellence hub',
    headquarters: 'London, United Kingdom',
    established: '2018',
    statement:
      'Edulure admin console centralises operational controls so administrators can support partners and learners with pace.',
    heroVideoUrl: 'https://cdn.edulure.test/media/admin-console-tour.mp4',
    heroPosterUrl: 'https://cdn.edulure.test/media/admin-console-tour.jpg'
  },
  leadership: [
    {
      id: 'ops-director',
      name: 'Avery Chen',
      role: 'Director of Platform Operations',
      email: 'avery.chen@edulure.test',
      phone: '+44 20 1234 5678',
      avatarUrl: 'https://cdn.edulure.test/avatars/avery-chen.png',
      bio: 'Leads global operations, incident response and partner enablement.'
    }
  ],
  supportChannels: [
    {
      id: 'channel-email',
      type: 'Email',
      label: 'Operations desk',
      destination: 'ops@edulure.test',
      slaMinutes: 120,
      activeHours: '24/7'
    },
    {
      id: 'channel-slack',
      type: 'Slack',
      label: 'Escalations',
      destination: '#admin-escalations',
      slaMinutes: 15,
      activeHours: 'Weekdays'
    }
  ],
  runbooks: [
    {
      id: 'runbook-incident',
      title: 'Critical incident response playbook',
      url: 'https://support.edulure.test/runbooks/incident-response',
      lastReviewed: '2024-01-04'
    }
  ],
  media: [
    {
      id: 'media-tour',
      type: 'video',
      title: 'Admin console walkthrough',
      url: 'https://cdn.edulure.test/media/admin-console-tour.mp4',
      thumbnailUrl: 'https://cdn.edulure.test/media/admin-console-tour.jpg'
    }
  ],
  onCall: {
    rotation: 'Follow-the-sun (EMEA · AMER · APAC)',
    timezone: 'UTC',
    currentPrimary: 'Avery Chen',
    backup: 'Noah Patel',
    escalationChannel: '#admin-escalations'
  }
});

const DEFAULT_PAYMENT_SETTINGS = Object.freeze({
  processors: [
    {
      id: 'stripe',
      provider: 'Stripe',
      status: 'active',
      merchantId: 'acct_12345',
      capabilities: ['card_payments', 'payouts'],
      settlementTimeframe: 'T+2',
      currencies: ['USD', 'GBP', 'EUR'],
      supportContact: 'finance@edulure.test'
    }
  ],
  payoutRules: {
    schedule: 'weekly',
    dayOfWeek: 'friday',
    minimumPayoutCents: 10000,
    reservePercentage: 5,
    autoApproveRefunds: false,
    riskThreshold: 'medium'
  },
  bankAccounts: [
    {
      id: 'primary',
      name: 'Primary Operating',
      bankName: 'Barclays UK',
      last4: '6789',
      currency: 'GBP',
      primary: true
    }
  ],
  webhooks: [
    {
      id: 'payment-failures',
      event: 'payment.failed',
      url: 'https://ops.edulure.test/webhooks/payments',
      active: true
    }
  ]
});

const DEFAULT_EMAIL_SETTINGS = Object.freeze({
  branding: {
    fromName: 'Edulure Operations',
    fromEmail: 'ops@mailer.edulure.test',
    replyTo: 'support@edulure.test'
  },
  notifications: {
    onboarding: true,
    weeklyDigest: true,
    incidentAlerts: true,
    marketingOptInDefault: false
  },
  escalationRecipients: ['incident@edulure.test', 'compliance@edulure.test'],
  domains: [
    {
      id: 'mailer-edulure-test',
      domain: 'mailer.edulure.test',
      status: 'verified',
      dkimStatus: 'valid',
      spfStatus: 'valid'
    }
  ],
  templates: [
    {
      id: 'template-incident',
      name: 'Incident escalation',
      category: 'operations',
      subject: 'Immediate attention required: {incidentReference}',
      lastUpdated: '2024-02-10'
    },
    {
      id: 'template-onboarding',
      name: 'New administrator onboarding',
      category: 'onboarding',
      subject: 'Welcome to Edulure operations',
      lastUpdated: '2024-01-06'
    }
  ]
});

const DEFAULT_SECURITY_SETTINGS = Object.freeze({
  enforcement: {
    requiredForAdmins: true,
    requiredForInstructors: true,
    requiredForFinance: true,
    rememberDeviceDays: 30,
    sessionTimeoutMinutes: 30
  },
  methods: [
    { id: 'totp', type: 'totp', enabled: true, description: 'Authenticator apps (TOTP)' },
    { id: 'sms', type: 'sms', enabled: false, description: 'SMS fallback (restricted markets)' },
    { id: 'webauthn', type: 'webauthn', enabled: true, description: 'Hardware security keys' }
  ],
  backup: {
    backupCodesEnabled: true,
    requireRegenerationOnUse: true
  },
  audits: [{ id: '2023-q4', label: 'Quarterly access review Q4', completedAt: '2023-12-11' }]
});

const DEFAULT_FINANCE_SETTINGS = Object.freeze({
  policies: {
    billingContact: 'finance@edulure.test',
    invoiceGraceDays: 7,
    reconciliationCadence: 'weekly',
    payoutScheduleDays: 30,
    defaultCommissionBps: 250,
    minimumCommissionCents: 0,
    currency: 'USD'
  },
  tiers: [
    {
      id: 'digital',
      name: 'Digital catalogues',
      appliesTo: ['course', 'ebook'],
      thresholdCents: 0,
      rateBps: 500
    },
    {
      id: 'live',
      name: 'Live sessions',
      appliesTo: ['live_stream', 'tutoring'],
      thresholdCents: 0,
      rateBps: 250
    }
  ],
  adjustments: [],
  revenueStreams: [
    { id: 'subscriptions', name: 'Community subscriptions', shareBps: 250, active: true },
    { id: 'donations', name: 'Live donations', shareBps: 1000, active: true }
  ],
  approvals: {
    requireDualApproval: true,
    financeReviewer: 'finance-controller@edulure.test'
  }
});

const DEFAULT_MONETIZATION = Object.freeze({
  commissions: {
    enabled: true,
    rateBps: 250,
    minimumFeeCents: 0,
    allowCommunityOverride: true,
    default: {
      rateBps: 250,
      minimumFeeCents: 0,
      affiliateShare: 0.25
    },
    categories: {
      community_subscription: { rateBps: 250, minimumFeeCents: 0, affiliateShare: 0.25 },
      community_live_donation: { rateBps: 1000, minimumFeeCents: 0, affiliateShare: 0.25 },
      course_sale: { rateBps: 500, minimumFeeCents: 0, affiliateShare: 0.25 },
      ebook_sale: { rateBps: 500, minimumFeeCents: 0, affiliateShare: 0.25 },
      tutor_booking: { rateBps: 250, minimumFeeCents: 0, affiliateShare: 0.25 }
    }
  },
  subscriptions: {
    enabled: true,
    restrictedFeatures: [],
    gracePeriodDays: 3,
    restrictOnFailure: true
  },
  payments: {
    defaultProvider: 'stripe',
    stripeEnabled: true,
    escrowEnabled: false
  },
  affiliate: {
    enabled: true,
    autoApprove: true,
    cookieWindowDays: 30,
    payoutScheduleDays: 30,
    requireTaxInformation: true,
    defaultCommission: {
      recurrence: 'infinite',
      maxOccurrences: null,
      tiers: [
        { thresholdCents: 0, rateBps: 1000 },
        { thresholdCents: 50_000, rateBps: 1500 }
      ]
    },
    security: {
      blockSelfReferral: true,
      enforceTwoFactorForPayouts: true
    }
  },
  workforce: {
    providerControlsCompensation: true,
    minimumServicemanShareBps: 0,
    recommendedServicemanShareBps: 7500,
    nonCustodialWallets: true,
    complianceNarrative:
      'Platform commission remains capped at 2.5% for communities and mentoring (5% on digital catalogues and 10% on live donations) with funds routed directly between customers and providers; the platform operates a non-custodial ledger to avoid FCA regulated activity.'
  }
});

function createStableId(prefix, seed = '') {
  const trimmed = typeof seed === 'string' ? seed.trim() : '';
  if (trimmed) {
    return trimmed.slice(0, 64);
  }
  try {
    return `${prefix}_${randomUUID()}`;
  } catch (_error) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function normaliseHexColour(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback;
}

function normaliseUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, 2048);
}

function normaliseText(value, { max = 240, fallback = '', allowEmpty = true } = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const text = String(value).trim();
  if (!text && !allowEmpty) {
    return fallback;
  }
  return text.slice(0, max);
}

function dedupeById(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry?.id) {
      return true;
    }
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  });
}

function normaliseAppearance(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_APPEARANCE);

  if (rawSettings.branding && typeof rawSettings.branding === 'object') {
    result.branding.primaryColor = normaliseHexColour(
      rawSettings.branding.primaryColor,
      result.branding.primaryColor
    );
    result.branding.secondaryColor = normaliseHexColour(
      rawSettings.branding.secondaryColor,
      result.branding.secondaryColor
    );
    result.branding.accentColor = normaliseHexColour(
      rawSettings.branding.accentColor,
      result.branding.accentColor
    );
    result.branding.logoUrl = normaliseUrl(rawSettings.branding.logoUrl) || result.branding.logoUrl;
    result.branding.faviconUrl = normaliseUrl(rawSettings.branding.faviconUrl);
  }

  if (rawSettings.theme && typeof rawSettings.theme === 'object') {
    const modes = new Set(['light', 'dark', 'system']);
    const radii = new Set(['sharp', 'rounded', 'pill']);
    const densities = new Set(['comfortable', 'compact', 'expanded']);

    const requestedMode = String(rawSettings.theme.mode ?? '').toLowerCase();
    if (modes.has(requestedMode)) {
      result.theme.mode = requestedMode;
    }
    const requestedRadius = String(rawSettings.theme.borderRadius ?? '').toLowerCase();
    if (radii.has(requestedRadius)) {
      result.theme.borderRadius = requestedRadius;
    }
    const requestedDensity = String(rawSettings.theme.density ?? '').toLowerCase();
    if (densities.has(requestedDensity)) {
      result.theme.density = requestedDensity;
    }
    result.theme.fontFamily = normaliseText(rawSettings.theme.fontFamily, {
      max: 120,
      fallback: result.theme.fontFamily
    });
    result.theme.headingFontFamily = normaliseText(rawSettings.theme.headingFontFamily, {
      max: 120,
      fallback: result.theme.headingFontFamily
    });
  }

  if (rawSettings.hero && typeof rawSettings.hero === 'object') {
    result.hero.heading = normaliseText(rawSettings.hero.heading, {
      max: 120,
      fallback: result.hero.heading,
      allowEmpty: false
    });
    result.hero.subheading = normaliseText(rawSettings.hero.subheading, {
      max: 240,
      fallback: result.hero.subheading
    });
    result.hero.backgroundImageUrl = normaliseUrl(rawSettings.hero.backgroundImageUrl);
    result.hero.backgroundVideoUrl = normaliseUrl(rawSettings.hero.backgroundVideoUrl);
    result.hero.primaryCtaLabel = normaliseText(rawSettings.hero.primaryCtaLabel, { max: 60, fallback: result.hero.primaryCtaLabel });
    result.hero.primaryCtaUrl = normaliseUrl(rawSettings.hero.primaryCtaUrl) || result.hero.primaryCtaUrl;
    result.hero.secondaryCtaLabel = normaliseText(rawSettings.hero.secondaryCtaLabel, { max: 60, fallback: result.hero.secondaryCtaLabel });
    result.hero.secondaryCtaUrl = normaliseUrl(rawSettings.hero.secondaryCtaUrl);
  }

  if (Array.isArray(rawSettings.mediaLibrary)) {
    const assets = rawSettings.mediaLibrary
      .map((asset) => ({
        id: createStableId('asset', asset?.id),
        label: normaliseText(asset?.label, { max: 120, fallback: '' }),
        type: ['image', 'video'].includes(String(asset?.type ?? '').toLowerCase())
          ? String(asset?.type).toLowerCase()
          : 'image',
        url: normaliseUrl(asset?.url),
        altText: normaliseText(asset?.altText, { max: 160, fallback: '' }),
        featured: Boolean(asset?.featured)
      }))
      .filter((asset) => asset.url);

    result.mediaLibrary = dedupeById(assets).slice(0, 24);
  }

  return result;
}

function normalisePreferences(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_PREFERENCES);

  if (rawSettings.localisation && typeof rawSettings.localisation === 'object') {
    result.localisation.defaultLanguage = normaliseText(rawSettings.localisation.defaultLanguage, {
      max: 12,
      fallback: result.localisation.defaultLanguage,
      allowEmpty: false
    }).toLowerCase();
    result.localisation.currency = normaliseText(rawSettings.localisation.currency, {
      max: 12,
      fallback: result.localisation.currency,
      allowEmpty: false
    }).toUpperCase();
    result.localisation.timezone = normaliseText(rawSettings.localisation.timezone, {
      max: 60,
      fallback: result.localisation.timezone,
      allowEmpty: false
    });
    if (rawSettings.localisation.supportedLanguages !== undefined) {
      result.localisation.supportedLanguages = normalizeStringArray(
        rawSettings.localisation.supportedLanguages
      )
        .map((language) => language.toLowerCase())
        .slice(0, 12);
      if (!result.localisation.supportedLanguages.length) {
        result.localisation.supportedLanguages = [result.localisation.defaultLanguage];
      }
    }
  }

  if (rawSettings.experience && typeof rawSettings.experience === 'object') {
    result.experience.enableRecommendations = Boolean(rawSettings.experience.enableRecommendations);
    result.experience.enableSocialSharing = Boolean(rawSettings.experience.enableSocialSharing);
    result.experience.enableLiveChatSupport = Boolean(rawSettings.experience.enableLiveChatSupport);
    result.experience.allowGuestCheckout = Boolean(rawSettings.experience.allowGuestCheckout);
    result.experience.requireEmailVerification = Boolean(
      rawSettings.experience.requireEmailVerification ?? result.experience.requireEmailVerification
    );
  }

  if (rawSettings.communications && typeof rawSettings.communications === 'object') {
    result.communications.supportEmail = normaliseText(rawSettings.communications.supportEmail, {
      max: 180,
      fallback: result.communications.supportEmail
    });
    result.communications.supportPhone = normaliseText(rawSettings.communications.supportPhone, {
      max: 40,
      fallback: ''
    });
    result.communications.marketingEmail = normaliseText(rawSettings.communications.marketingEmail, {
      max: 180,
      fallback: ''
    });
    result.communications.sendWeeklyDigest = Boolean(rawSettings.communications.sendWeeklyDigest);
    result.communications.sendProductUpdates = Boolean(rawSettings.communications.sendProductUpdates);
  }

  return result;
}

function normaliseSystem(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_SYSTEM);

  if (rawSettings.maintenanceMode && typeof rawSettings.maintenanceMode === 'object') {
    result.maintenanceMode.enabled = Boolean(rawSettings.maintenanceMode.enabled);
    result.maintenanceMode.message = normaliseText(rawSettings.maintenanceMode.message, {
      max: 360,
      fallback: ''
    });
    if (rawSettings.maintenanceMode.scheduledWindow) {
      const value = normaliseText(rawSettings.maintenanceMode.scheduledWindow, {
        max: 120,
        fallback: null
      });
      result.maintenanceMode.scheduledWindow = value || null;
    }
  }

  if (rawSettings.operations && typeof rawSettings.operations === 'object') {
    result.operations.timezone = normaliseText(rawSettings.operations.timezone, {
      max: 60,
      fallback: result.operations.timezone,
      allowEmpty: false
    });
    const days = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    const requestedDay = String(rawSettings.operations.weeklyBackupDay ?? '').toLowerCase();
    if (days.has(requestedDay)) {
      result.operations.weeklyBackupDay = requestedDay;
    }
    result.operations.autoUpdatesEnabled = Boolean(rawSettings.operations.autoUpdatesEnabled);
    result.operations.dataRetentionDays = clampInt(rawSettings.operations.dataRetentionDays, {
      min: 30,
      max: 3650,
      fallback: result.operations.dataRetentionDays
    });
  }

  if (rawSettings.security && typeof rawSettings.security === 'object') {
    result.security.enforceMfaForAdmins = Boolean(rawSettings.security.enforceMfaForAdmins);
    result.security.sessionTimeoutMinutes = clampInt(rawSettings.security.sessionTimeoutMinutes, {
      min: 5,
      max: 600,
      fallback: result.security.sessionTimeoutMinutes
    });
    result.security.allowSessionResume = Boolean(rawSettings.security.allowSessionResume);
  }

  if (rawSettings.observability && typeof rawSettings.observability === 'object') {
    result.observability.enableAuditTrail = Boolean(rawSettings.observability.enableAuditTrail);
    result.observability.errorReportingEmail = normaliseText(
      rawSettings.observability.errorReportingEmail,
      { max: 180, fallback: '' }
    );
    result.observability.notifyOnIntegrationFailure = Boolean(
      rawSettings.observability.notifyOnIntegrationFailure
    );
  }

  return result;
}

function normaliseIntegrations(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_INTEGRATIONS);

  if (Array.isArray(rawSettings.webhooks)) {
    result.webhooks = dedupeById(
      rawSettings.webhooks
        .map((webhook) => ({
          id: createStableId('webhook', webhook?.id),
          name: normaliseText(webhook?.name, { max: 120, fallback: 'Webhook destination' }),
          url: normaliseUrl(webhook?.url),
          events: normalizeStringArray(webhook?.events).slice(0, 20),
          secret: normaliseText(webhook?.secret, { max: 120, fallback: '' }),
          active: Boolean(webhook?.active)
        }))
        .filter((entry) => entry.url)
    ).slice(0, 20);
  }

  if (Array.isArray(rawSettings.services)) {
    const allowedStatuses = new Set(['active', 'paused', 'error']);
    result.services = dedupeById(
      rawSettings.services
        .map((service) => ({
          id: createStableId('service', service?.id),
          provider: normaliseText(service?.provider, { max: 120, fallback: 'integration' }),
          status: allowedStatuses.has(String(service?.status ?? '').toLowerCase())
            ? String(service.status).toLowerCase()
            : 'active',
          connectedAccount: normaliseText(service?.connectedAccount, { max: 120, fallback: '' }),
          notes: normaliseText(service?.notes, { max: 360, fallback: '' })
        }))
    ).slice(0, 20);
  }

  return result;
}

function normaliseThirdParty(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_THIRD_PARTY);

  if (Array.isArray(rawSettings.credentials)) {
    const allowedStatus = new Set(['active', 'disabled', 'revoked']);
    result.credentials = dedupeById(
      rawSettings.credentials
        .map((credential) => {
          const resolvedStatus = allowedStatus.has(String(credential?.status ?? '').toLowerCase())
            ? String(credential.status).toLowerCase()
            : 'active';
          const environment = normaliseText(credential?.environment, {
            max: 60,
            fallback: 'production',
            allowEmpty: false
          }).toLowerCase();
          return {
            id: createStableId('credential', credential?.id),
            provider: normaliseText(credential?.provider, { max: 120, fallback: 'integration' }),
            environment,
            alias: normaliseText(credential?.alias, { max: 120, fallback: '' }),
            ownerEmail: normaliseText(credential?.ownerEmail, { max: 180, fallback: '' }),
            status: resolvedStatus,
            maskedKey: normaliseText(credential?.maskedKey, { max: 120, fallback: '' }),
            createdAt: normaliseText(credential?.createdAt, { max: 40, fallback: '' }),
            lastRotatedAt: normaliseText(credential?.lastRotatedAt, { max: 40, fallback: '' }),
            notes: normaliseText(credential?.notes, { max: 360, fallback: '' })
          };
        })
        .filter((credential) => credential.provider)
    ).slice(0, 30);
  }

  return result;
}

function normaliseAdminProfile(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_ADMIN_PROFILE);

  if (rawSettings.organisation && typeof rawSettings.organisation === 'object') {
    result.organisation = {
      ...result.organisation,
      name: normaliseText(rawSettings.organisation.name, {
        max: 160,
        fallback: result.organisation.name,
        allowEmpty: false
      }),
      mission: normaliseText(rawSettings.organisation.mission, { max: 360, fallback: result.organisation.mission }),
      tagline: normaliseText(rawSettings.organisation.tagline, { max: 160, fallback: result.organisation.tagline }),
      headquarters: normaliseText(rawSettings.organisation.headquarters, {
        max: 160,
        fallback: result.organisation.headquarters
      }),
      established: normaliseText(rawSettings.organisation.established, {
        max: 40,
        fallback: result.organisation.established
      }),
      statement: normaliseText(rawSettings.organisation.statement, {
        max: 720,
        fallback: result.organisation.statement
      }),
      heroVideoUrl: normaliseUrl(rawSettings.organisation.heroVideoUrl) || result.organisation.heroVideoUrl,
      heroPosterUrl: normaliseUrl(rawSettings.organisation.heroPosterUrl) || result.organisation.heroPosterUrl
    };
  }

  if (Array.isArray(rawSettings.leadership)) {
    result.leadership = dedupeById(
      rawSettings.leadership
        .map((member) => ({
          id: createStableId('leader', member?.id),
          name: normaliseText(member?.name, { max: 160, fallback: '', allowEmpty: false }),
          role: normaliseText(member?.role, { max: 160, fallback: '' }),
          email: normaliseText(member?.email, { max: 180, fallback: '' }),
          phone: normaliseText(member?.phone, { max: 60, fallback: '' }),
          avatarUrl: normaliseUrl(member?.avatarUrl),
          bio: normaliseText(member?.bio, { max: 360, fallback: '' })
        }))
        .filter((entry) => entry.name)
    ).slice(0, 12);
  }

  if (Array.isArray(rawSettings.supportChannels)) {
    result.supportChannels = dedupeById(
      rawSettings.supportChannels
        .map((channel) => ({
          id: createStableId('channel', channel?.id),
          type: normaliseText(channel?.type, { max: 60, fallback: 'Channel', allowEmpty: false }),
          label: normaliseText(channel?.label, { max: 160, fallback: '' }),
          destination: normaliseText(channel?.destination, { max: 180, fallback: '' }),
          slaMinutes: clampInt(channel?.slaMinutes, { min: 5, max: 2880, fallback: 120 }),
          activeHours: normaliseText(channel?.activeHours, { max: 120, fallback: '' })
        }))
        .filter((entry) => entry.destination || entry.label)
    ).slice(0, 20);
  }

  if (Array.isArray(rawSettings.runbooks)) {
    result.runbooks = dedupeById(
      rawSettings.runbooks
        .map((runbook) => ({
          id: createStableId('runbook', runbook?.id),
          title: normaliseText(runbook?.title, { max: 200, fallback: 'Operational runbook', allowEmpty: false }),
          url: normaliseUrl(runbook?.url) || '',
          lastReviewed: normaliseText(runbook?.lastReviewed, { max: 40, fallback: '' })
        }))
        .filter((entry) => entry.url)
    ).slice(0, 30);
  }

  if (Array.isArray(rawSettings.media)) {
    const allowedTypes = new Set(['image', 'video']);
    result.media = dedupeById(
      rawSettings.media
        .map((asset) => {
          const type = String(asset?.type ?? 'image').toLowerCase();
          return {
            id: createStableId('media', asset?.id),
            type: allowedTypes.has(type) ? type : 'image',
            title: normaliseText(asset?.title, { max: 160, fallback: 'Media asset' }),
            url: normaliseUrl(asset?.url) || '',
            thumbnailUrl: normaliseUrl(asset?.thumbnailUrl)
          };
        })
        .filter((asset) => asset.url)
    ).slice(0, 20);
  }

  if (rawSettings.onCall && typeof rawSettings.onCall === 'object') {
    result.onCall = {
      rotation: normaliseText(rawSettings.onCall.rotation, { max: 160, fallback: result.onCall.rotation }),
      timezone: normaliseText(rawSettings.onCall.timezone, { max: 60, fallback: result.onCall.timezone }),
      currentPrimary: normaliseText(rawSettings.onCall.currentPrimary, {
        max: 160,
        fallback: result.onCall.currentPrimary
      }),
      backup: normaliseText(rawSettings.onCall.backup, { max: 160, fallback: result.onCall.backup }),
      escalationChannel: normaliseText(rawSettings.onCall.escalationChannel, {
        max: 160,
        fallback: result.onCall.escalationChannel
      })
    };
  }

  return result;
}

function normalisePaymentSettings(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_PAYMENT_SETTINGS);
  const statusSet = new Set(['active', 'paused', 'error', 'testing']);
  const scheduleSet = new Set(['daily', 'weekly', 'biweekly', 'monthly', 'adhoc']);
  const daySet = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

  if (Array.isArray(rawSettings.processors)) {
    result.processors = dedupeById(
      rawSettings.processors
        .map((processor) => ({
          id: createStableId('processor', processor?.id),
          provider: normaliseText(processor?.provider, { max: 160, fallback: 'processor', allowEmpty: false }),
          status: statusSet.has(String(processor?.status ?? '').toLowerCase())
            ? String(processor.status).toLowerCase()
            : 'active',
          merchantId: normaliseText(processor?.merchantId, { max: 160, fallback: '' }),
          capabilities: normalizeStringArray(processor?.capabilities).slice(0, 10),
          settlementTimeframe: normaliseText(processor?.settlementTimeframe, {
            max: 40,
            fallback: 'T+2'
          }),
          currencies: normalizeStringArray(processor?.currencies).slice(0, 10),
          supportContact: normaliseText(processor?.supportContact, { max: 180, fallback: '' })
        }))
        .filter((entry) => entry.provider)
    ).slice(0, 10);
  }

  if (rawSettings.payoutRules && typeof rawSettings.payoutRules === 'object') {
    const schedule = String(rawSettings.payoutRules.schedule ?? '').toLowerCase();
    const dayOfWeek = String(rawSettings.payoutRules.dayOfWeek ?? '').toLowerCase();
    result.payoutRules = {
      schedule: scheduleSet.has(schedule) ? schedule : result.payoutRules.schedule,
      dayOfWeek: daySet.has(dayOfWeek) ? dayOfWeek : result.payoutRules.dayOfWeek,
      minimumPayoutCents: clampInt(rawSettings.payoutRules.minimumPayoutCents, {
        min: 0,
        max: 1_000_000_000,
        fallback: result.payoutRules.minimumPayoutCents
      }),
      reservePercentage: clampInt(rawSettings.payoutRules.reservePercentage, {
        min: 0,
        max: 100,
        fallback: result.payoutRules.reservePercentage
      }),
      autoApproveRefunds: Boolean(
        rawSettings.payoutRules.autoApproveRefunds ?? result.payoutRules.autoApproveRefunds
      ),
      riskThreshold: normaliseText(rawSettings.payoutRules.riskThreshold, {
        max: 60,
        fallback: result.payoutRules.riskThreshold
      })
    };
  }

  if (Array.isArray(rawSettings.bankAccounts)) {
    result.bankAccounts = dedupeById(
      rawSettings.bankAccounts
        .map((account) => {
          const last4Digits = normaliseText(account?.last4, { max: 4, fallback: '' }).replace(/[^0-9]/g, '');
          return {
            id: createStableId('bank', account?.id),
            name: normaliseText(account?.name, { max: 160, fallback: 'Settlement account', allowEmpty: false }),
            bankName: normaliseText(account?.bankName, { max: 160, fallback: '' }),
            last4: last4Digits.slice(-4),
            currency: normaliseText(account?.currency, { max: 12, fallback: 'USD' }).toUpperCase(),
            primary: Boolean(account?.primary)
          };
        })
        .filter((entry) => entry.name)
    ).slice(0, 10);
    if (!result.bankAccounts.some((account) => account.primary) && result.bankAccounts.length) {
      result.bankAccounts[0].primary = true;
    }
  }

  if (Array.isArray(rawSettings.webhooks)) {
    result.webhooks = dedupeById(
      rawSettings.webhooks
        .map((webhook) => ({
          id: createStableId('payments-webhook', webhook?.id),
          event: normaliseText(webhook?.event, { max: 160, fallback: 'payment.succeeded', allowEmpty: false }),
          url: normaliseUrl(webhook?.url) || '',
          active: Boolean(webhook?.active ?? true)
        }))
        .filter((entry) => entry.url)
    ).slice(0, 20);
  }

  return result;
}

function normaliseEmailSettings(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_EMAIL_SETTINGS);

  if (rawSettings.branding && typeof rawSettings.branding === 'object') {
    result.branding = {
      fromName: normaliseText(rawSettings.branding.fromName, { max: 160, fallback: result.branding.fromName }),
      fromEmail: normaliseText(rawSettings.branding.fromEmail, { max: 180, fallback: result.branding.fromEmail }),
      replyTo: normaliseText(rawSettings.branding.replyTo, { max: 180, fallback: result.branding.replyTo })
    };
  }

  if (rawSettings.notifications && typeof rawSettings.notifications === 'object') {
    result.notifications = {
      onboarding: Boolean(rawSettings.notifications.onboarding ?? result.notifications.onboarding),
      weeklyDigest: Boolean(rawSettings.notifications.weeklyDigest ?? result.notifications.weeklyDigest),
      incidentAlerts: Boolean(rawSettings.notifications.incidentAlerts ?? result.notifications.incidentAlerts),
      marketingOptInDefault: Boolean(
        rawSettings.notifications.marketingOptInDefault ?? result.notifications.marketingOptInDefault
      )
    };
  }

  if (rawSettings.escalationRecipients !== undefined) {
    result.escalationRecipients = normalizeStringArray(rawSettings.escalationRecipients).slice(0, 20);
  }

  if (Array.isArray(rawSettings.domains)) {
    const allowedStatus = new Set(['verified', 'pending', 'failed']);
    const dnsStatus = new Set(['valid', 'pending', 'failed']);
    result.domains = dedupeById(
      rawSettings.domains
        .map((domain) => ({
          id: createStableId('email-domain', domain?.id),
          domain: normaliseText(domain?.domain, { max: 180, fallback: '', allowEmpty: false }).toLowerCase(),
          status: allowedStatus.has(String(domain?.status ?? '').toLowerCase())
            ? String(domain.status).toLowerCase()
            : 'pending',
          dkimStatus: dnsStatus.has(String(domain?.dkimStatus ?? '').toLowerCase())
            ? String(domain.dkimStatus).toLowerCase()
            : 'pending',
          spfStatus: dnsStatus.has(String(domain?.spfStatus ?? '').toLowerCase())
            ? String(domain.spfStatus).toLowerCase()
            : 'pending'
        }))
        .filter((entry) => entry.domain)
    ).slice(0, 10);
  }

  if (Array.isArray(rawSettings.templates)) {
    result.templates = dedupeById(
      rawSettings.templates
        .map((template) => ({
          id: createStableId('email-template', template?.id),
          name: normaliseText(template?.name, { max: 160, fallback: 'Template', allowEmpty: false }),
          category: normaliseText(template?.category, { max: 120, fallback: 'general' }),
          subject: normaliseText(template?.subject, { max: 200, fallback: '' }),
          lastUpdated: normaliseText(template?.lastUpdated, { max: 40, fallback: '' })
        }))
        .filter((entry) => entry.name)
    ).slice(0, 30);
  }

  return result;
}

function normaliseSecuritySettings(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_SECURITY_SETTINGS);
  const methodTypes = new Set(['totp', 'sms', 'webauthn', 'email']);

  if (rawSettings.enforcement && typeof rawSettings.enforcement === 'object') {
    result.enforcement = {
      requiredForAdmins: Boolean(
        rawSettings.enforcement.requiredForAdmins ?? result.enforcement.requiredForAdmins
      ),
      requiredForInstructors: Boolean(
        rawSettings.enforcement.requiredForInstructors ?? result.enforcement.requiredForInstructors
      ),
      requiredForFinance: Boolean(
        rawSettings.enforcement.requiredForFinance ?? result.enforcement.requiredForFinance
      ),
      rememberDeviceDays: clampInt(rawSettings.enforcement.rememberDeviceDays, {
        min: 0,
        max: 90,
        fallback: result.enforcement.rememberDeviceDays
      }),
      sessionTimeoutMinutes: clampInt(rawSettings.enforcement.sessionTimeoutMinutes, {
        min: 5,
        max: 600,
        fallback: result.enforcement.sessionTimeoutMinutes
      })
    };
  }

  if (Array.isArray(rawSettings.methods)) {
    result.methods = dedupeById(
      rawSettings.methods
        .map((method) => {
          const type = String(method?.type ?? '').toLowerCase();
          return {
            id: createStableId('mfa-method', method?.id),
            type: methodTypes.has(type) ? type : 'totp',
            enabled: Boolean(method?.enabled ?? true),
            description: normaliseText(method?.description, { max: 200, fallback: '' })
          };
        })
        .filter((entry) => entry.id && entry.type)
    ).slice(0, 10);
  }

  if (rawSettings.backup && typeof rawSettings.backup === 'object') {
    result.backup = {
      backupCodesEnabled: Boolean(
        rawSettings.backup.backupCodesEnabled ?? result.backup.backupCodesEnabled
      ),
      requireRegenerationOnUse: Boolean(
        rawSettings.backup.requireRegenerationOnUse ?? result.backup.requireRegenerationOnUse
      )
    };
  }

  if (Array.isArray(rawSettings.audits)) {
    result.audits = dedupeById(
      rawSettings.audits
        .map((audit) => ({
          id: createStableId('mfa-audit', audit?.id),
          label: normaliseText(audit?.label, { max: 200, fallback: 'Access review' }),
          completedAt: normaliseText(audit?.completedAt, { max: 40, fallback: '' })
        }))
        .filter((entry) => entry.label)
    ).slice(0, 20);
  }

  return result;
}

function normaliseFinanceSettings(rawSettings = {}) {
  const result = deepMergeLimited({}, DEFAULT_FINANCE_SETTINGS);
  const adjustmentStatus = new Set(['draft', 'scheduled', 'processing', 'processed', 'cancelled']);

  if (rawSettings.policies && typeof rawSettings.policies === 'object') {
    result.policies = {
      billingContact: normaliseText(rawSettings.policies.billingContact, {
        max: 180,
        fallback: result.policies.billingContact
      }),
      invoiceGraceDays: clampInt(rawSettings.policies.invoiceGraceDays, {
        min: 0,
        max: 60,
        fallback: result.policies.invoiceGraceDays
      }),
      reconciliationCadence: normaliseText(rawSettings.policies.reconciliationCadence, {
        max: 120,
        fallback: result.policies.reconciliationCadence
      }),
      payoutScheduleDays: clampInt(rawSettings.policies.payoutScheduleDays, {
        min: 7,
        max: 120,
        fallback: result.policies.payoutScheduleDays
      }),
      defaultCommissionBps: clampInt(rawSettings.policies.defaultCommissionBps, {
        min: 0,
        max: 5000,
        fallback: result.policies.defaultCommissionBps
      }),
      minimumCommissionCents: clampInt(rawSettings.policies.minimumCommissionCents, {
        min: 0,
        max: 1_000_000_000,
        fallback: result.policies.minimumCommissionCents
      }),
      currency: normaliseText(rawSettings.policies.currency, { max: 12, fallback: result.policies.currency }).toUpperCase()
    };
  }

  if (Array.isArray(rawSettings.tiers)) {
    result.tiers = dedupeById(
      rawSettings.tiers
        .map((tier) => ({
          id: createStableId('finance-tier', tier?.id),
          name: normaliseText(tier?.name, { max: 160, fallback: 'Commission tier', allowEmpty: false }),
          appliesTo: normalizeStringArray(tier?.appliesTo).slice(0, 10),
          thresholdCents: clampInt(tier?.thresholdCents, { min: 0, max: 1_000_000_000, fallback: 0 }),
          rateBps: clampInt(tier?.rateBps, { min: 0, max: 5000, fallback: result.policies.defaultCommissionBps })
        }))
        .filter((entry) => entry.name)
    ).slice(0, 20);
  }

  if (Array.isArray(rawSettings.adjustments)) {
    result.adjustments = dedupeById(
      rawSettings.adjustments
        .map((adjustment) => ({
          id: createStableId('finance-adjustment', adjustment?.id),
          description: normaliseText(adjustment?.description, { max: 240, fallback: 'Adjustment' }),
          amountCents: clampInt(adjustment?.amountCents, { min: -1_000_000_000, max: 1_000_000_000, fallback: 0 }),
          status: adjustmentStatus.has(String(adjustment?.status ?? '').toLowerCase())
            ? String(adjustment.status).toLowerCase()
            : 'draft',
          createdAt: normaliseText(adjustment?.createdAt, { max: 40, fallback: '' })
        }))
        .filter((entry) => entry.description)
    ).slice(0, 20);
  }

  if (Array.isArray(rawSettings.revenueStreams)) {
    result.revenueStreams = dedupeById(
      rawSettings.revenueStreams
        .map((stream) => ({
          id: createStableId('finance-stream', stream?.id),
          name: normaliseText(stream?.name, { max: 160, fallback: 'Revenue stream', allowEmpty: false }),
          shareBps: clampInt(stream?.shareBps, { min: 0, max: 5000, fallback: 0 }),
          active: Boolean(stream?.active ?? true)
        }))
        .filter((entry) => entry.name)
    ).slice(0, 20);
  }

  if (rawSettings.approvals && typeof rawSettings.approvals === 'object') {
    result.approvals = {
      requireDualApproval: Boolean(
        rawSettings.approvals.requireDualApproval ?? result.approvals.requireDualApproval
      ),
      financeReviewer: normaliseText(rawSettings.approvals.financeReviewer, {
        max: 180,
        fallback: result.approvals.financeReviewer
      })
    };
  }

  return result;
}

function sanitizeAppearancePayload(payload = {}) {
  const sanitized = {};
  if (payload.branding !== undefined) {
    sanitized.branding = normaliseAppearance({ branding: payload.branding }).branding;
  }
  if (payload.theme !== undefined) {
    sanitized.theme = normaliseAppearance({ theme: payload.theme }).theme;
  }
  if (payload.hero !== undefined) {
    sanitized.hero = normaliseAppearance({ hero: payload.hero }).hero;
  }
  if (payload.mediaLibrary !== undefined) {
    sanitized.mediaLibrary = normaliseAppearance({ mediaLibrary: payload.mediaLibrary }).mediaLibrary;
  }
  return sanitized;
}

function sanitizePreferencesPayload(payload = {}) {
  const sanitized = {};
  if (payload.localisation !== undefined) {
    sanitized.localisation = normalisePreferences({ localisation: payload.localisation }).localisation;
  }
  if (payload.experience !== undefined) {
    sanitized.experience = normalisePreferences({ experience: payload.experience }).experience;
  }
  if (payload.communications !== undefined) {
    sanitized.communications = normalisePreferences({ communications: payload.communications }).communications;
  }
  return sanitized;
}

function sanitizeSystemPayload(payload = {}) {
  const sanitized = {};
  if (payload.maintenanceMode !== undefined) {
    sanitized.maintenanceMode = normaliseSystem({ maintenanceMode: payload.maintenanceMode }).maintenanceMode;
  }
  if (payload.operations !== undefined) {
    sanitized.operations = normaliseSystem({ operations: payload.operations }).operations;
  }
  if (payload.security !== undefined) {
    sanitized.security = normaliseSystem({ security: payload.security }).security;
  }
  if (payload.observability !== undefined) {
    sanitized.observability = normaliseSystem({ observability: payload.observability }).observability;
  }
  return sanitized;
}

function sanitizeIntegrationsPayload(payload = {}) {
  const sanitized = {};
  if (payload.webhooks !== undefined) {
    sanitized.webhooks = normaliseIntegrations({ webhooks: payload.webhooks }).webhooks;
  }
  if (payload.services !== undefined) {
    sanitized.services = normaliseIntegrations({ services: payload.services }).services;
  }
  return sanitized;
}

function sanitizeThirdPartyPayload(payload = {}) {
  const sanitized = {};
  if (payload.credentials !== undefined) {
    sanitized.credentials = normaliseThirdParty({ credentials: payload.credentials }).credentials;
  }
  return sanitized;
}

function sanitizeAdminProfilePayload(payload = {}) {
  const sanitized = {};
  if (payload.organisation !== undefined) {
    sanitized.organisation = normaliseAdminProfile({ organisation: payload.organisation }).organisation;
  }
  if (payload.leadership !== undefined) {
    sanitized.leadership = normaliseAdminProfile({ leadership: payload.leadership }).leadership;
  }
  if (payload.supportChannels !== undefined) {
    sanitized.supportChannels = normaliseAdminProfile({ supportChannels: payload.supportChannels }).supportChannels;
  }
  if (payload.runbooks !== undefined) {
    sanitized.runbooks = normaliseAdminProfile({ runbooks: payload.runbooks }).runbooks;
  }
  if (payload.media !== undefined) {
    sanitized.media = normaliseAdminProfile({ media: payload.media }).media;
  }
  if (payload.onCall !== undefined) {
    sanitized.onCall = normaliseAdminProfile({ onCall: payload.onCall }).onCall;
  }
  return sanitized;
}

function sanitizePaymentSettingsPayload(payload = {}) {
  const sanitized = {};
  if (payload.processors !== undefined) {
    sanitized.processors = normalisePaymentSettings({ processors: payload.processors }).processors;
  }
  if (payload.payoutRules !== undefined) {
    sanitized.payoutRules = normalisePaymentSettings({ payoutRules: payload.payoutRules }).payoutRules;
  }
  if (payload.bankAccounts !== undefined) {
    sanitized.bankAccounts = normalisePaymentSettings({ bankAccounts: payload.bankAccounts }).bankAccounts;
  }
  if (payload.webhooks !== undefined) {
    sanitized.webhooks = normalisePaymentSettings({ webhooks: payload.webhooks }).webhooks;
  }
  return sanitized;
}

function sanitizeEmailSettingsPayload(payload = {}) {
  const sanitized = {};
  if (payload.branding !== undefined) {
    sanitized.branding = normaliseEmailSettings({ branding: payload.branding }).branding;
  }
  if (payload.notifications !== undefined) {
    sanitized.notifications = normaliseEmailSettings({ notifications: payload.notifications }).notifications;
  }
  if (payload.escalationRecipients !== undefined) {
    sanitized.escalationRecipients = normaliseEmailSettings({
      escalationRecipients: payload.escalationRecipients
    }).escalationRecipients;
  }
  if (payload.domains !== undefined) {
    sanitized.domains = normaliseEmailSettings({ domains: payload.domains }).domains;
  }
  if (payload.templates !== undefined) {
    sanitized.templates = normaliseEmailSettings({ templates: payload.templates }).templates;
  }
  return sanitized;
}

function sanitizeSecuritySettingsPayload(payload = {}) {
  const sanitized = {};
  if (payload.enforcement !== undefined) {
    sanitized.enforcement = normaliseSecuritySettings({ enforcement: payload.enforcement }).enforcement;
  }
  if (payload.methods !== undefined) {
    sanitized.methods = normaliseSecuritySettings({ methods: payload.methods }).methods;
  }
  if (payload.backup !== undefined) {
    sanitized.backup = normaliseSecuritySettings({ backup: payload.backup }).backup;
  }
  if (payload.audits !== undefined) {
    sanitized.audits = normaliseSecuritySettings({ audits: payload.audits }).audits;
  }
  return sanitized;
}

function sanitizeFinanceSettingsPayload(payload = {}) {
  const sanitized = {};
  if (payload.policies !== undefined) {
    sanitized.policies = normaliseFinanceSettings({ policies: payload.policies }).policies;
  }
  if (payload.tiers !== undefined) {
    sanitized.tiers = normaliseFinanceSettings({ tiers: payload.tiers }).tiers;
  }
  if (payload.adjustments !== undefined) {
    sanitized.adjustments = normaliseFinanceSettings({ adjustments: payload.adjustments }).adjustments;
  }
  if (payload.revenueStreams !== undefined) {
    sanitized.revenueStreams = normaliseFinanceSettings({
      revenueStreams: payload.revenueStreams
    }).revenueStreams;
  }
  if (payload.approvals !== undefined) {
    sanitized.approvals = normaliseFinanceSettings({ approvals: payload.approvals }).approvals;
  }
  return sanitized;
}

function deepMerge(base, overrides) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  if (!overrides || typeof overrides !== 'object') {
    return result;
  }

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      result[key] = [...value];
      return;
    }

    if (value && typeof value === 'object') {
      const baseValue = result[key] && typeof result[key] === 'object' ? result[key] : {};
      result[key] = deepMerge(baseValue, value);
      return;
    }

    result[key] = value;
  });

  return result;
}

function clampInt(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const numeric = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  return Math.min(Math.max(rounded, min), max);
}

function clampRatio(value, { min = 0, max = 1, fallback = 0 } = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric < min) {
    return min;
  }
  if (numeric > max) {
    return max;
  }

  return numeric;
}

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }

  const array = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  const seen = new Set();
  const result = [];

  array.forEach((entry) => {
    const trimmed = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!trimmed) {
      return;
    }
    const normalized = trimmed.slice(0, 120);
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      result.push(normalized);
    }
  });

  return result;
}

function sanitizeCommissionTiers(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const tiers = value
    .map((tier) => {
      if (!tier || typeof tier !== 'object') {
        return null;
      }
      return {
        thresholdCents: clampInt(tier.thresholdCents, {
          min: 0,
          max: 1_000_000_000,
          fallback: 0
        }),
        rateBps: clampInt(tier.rateBps, { min: 0, max: 5000, fallback: 1000 })
      };
    })
    .filter(Boolean);

  return tiers.length ? tiers : null;
}

function normaliseCommissionTiers(tiers, fallbackTiers = []) {
  const source = Array.isArray(tiers) ? tiers : fallbackTiers;
  const entries = (Array.isArray(source) ? source : []).map((tier) => ({
    thresholdCents: clampInt(tier.thresholdCents, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0
    }),
    rateBps: clampInt(tier.rateBps, { min: 0, max: 5000, fallback: 1000 })
  }));

  const deduped = [];
  const seenThresholds = new Set();
  entries
    .sort((a, b) => a.thresholdCents - b.thresholdCents)
    .forEach((tier) => {
      const key = tier.thresholdCents;
      if (seenThresholds.has(key)) {
        return;
      }
      seenThresholds.add(key);
      deduped.push(tier);
    });

  if (!deduped.some((tier) => tier.thresholdCents === 0)) {
    const fallbackRate =
      fallbackTiers?.find((tier) => tier?.thresholdCents === 0)?.rateBps ?? deduped[0]?.rateBps ?? 1000;
    deduped.unshift({ thresholdCents: 0, rateBps: clampInt(fallbackRate, { min: 0, max: 5000, fallback: 1000 }) });
  }

  return deduped.slice(0, 10);
}

function resolveDefaultMonetization() {
  const defaults = deepMerge({}, DEFAULT_MONETIZATION);
  const stripeConfigured = Boolean(env.payments?.stripe?.secretKey);
  const escrowConfigured = Boolean(env.payments?.escrow?.apiKey && env.payments?.escrow?.apiSecret);

  defaults.payments.stripeEnabled = stripeConfigured;
  defaults.payments.escrowEnabled = escrowConfigured;
  if (!stripeConfigured && escrowConfigured) {
    defaults.payments.defaultProvider = 'escrow';
  }

  return defaults;
}

function sanitizeMonetizationPayload(payload = {}) {
  const sanitized = {};

  if (payload.commissions && typeof payload.commissions === 'object') {
    const commission = {};
    if (payload.commissions.enabled !== undefined) {
      commission.enabled = Boolean(payload.commissions.enabled);
    }
    if (payload.commissions.rateBps !== undefined) {
      commission.rateBps = clampInt(payload.commissions.rateBps, { min: 0, max: 5000, fallback: 250 });
    }
    if (payload.commissions.minimumFeeCents !== undefined) {
      commission.minimumFeeCents = clampInt(payload.commissions.minimumFeeCents, { min: 0, max: 10_000_000, fallback: 0 });
    }
    if (payload.commissions.allowCommunityOverride !== undefined) {
      commission.allowCommunityOverride = Boolean(payload.commissions.allowCommunityOverride);
    }
    if (payload.commissions.default && typeof payload.commissions.default === 'object') {
      commission.default = {
        rateBps: clampInt(payload.commissions.default.rateBps, {
          min: 0,
          max: 5000,
          fallback: DEFAULT_MONETIZATION.commissions.default.rateBps
        }),
        minimumFeeCents: clampInt(payload.commissions.default.minimumFeeCents, {
          min: 0,
          max: 10_000_000,
          fallback: DEFAULT_MONETIZATION.commissions.default.minimumFeeCents
        }),
        affiliateShare: clampRatio(payload.commissions.default.affiliateShare, {
          min: 0,
          max: 1,
          fallback: DEFAULT_MONETIZATION.commissions.default.affiliateShare
        })
      };
    }
    if (payload.commissions.categories && typeof payload.commissions.categories === 'object') {
      const categories = {};
      Object.entries(payload.commissions.categories).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') {
          return;
        }
        categories[String(key).trim()] = {
          rateBps: clampInt(value.rateBps, {
            min: 0,
            max: 5000,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.rateBps ??
              DEFAULT_MONETIZATION.commissions.default.rateBps
          }),
          minimumFeeCents: clampInt(value.minimumFeeCents, {
            min: 0,
            max: 10_000_000,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.minimumFeeCents ??
              DEFAULT_MONETIZATION.commissions.default.minimumFeeCents
          }),
          affiliateShare: clampRatio(value.affiliateShare, {
            min: 0,
            max: 1,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.affiliateShare ??
              DEFAULT_MONETIZATION.commissions.default.affiliateShare
          })
        };
      });
      commission.categories = categories;
    }
    if (Object.keys(commission).length) {
      sanitized.commissions = commission;
    }
  }

  if (payload.subscriptions && typeof payload.subscriptions === 'object') {
    const subscriptions = {};
    if (payload.subscriptions.enabled !== undefined) {
      subscriptions.enabled = Boolean(payload.subscriptions.enabled);
    }
    if (payload.subscriptions.restrictedFeatures !== undefined) {
      subscriptions.restrictedFeatures = normalizeStringArray(payload.subscriptions.restrictedFeatures);
    }
    if (payload.subscriptions.gracePeriodDays !== undefined) {
      subscriptions.gracePeriodDays = clampInt(payload.subscriptions.gracePeriodDays, { min: 0, max: 90, fallback: 3 });
    }
    if (payload.subscriptions.restrictOnFailure !== undefined) {
      subscriptions.restrictOnFailure = Boolean(payload.subscriptions.restrictOnFailure);
    }
    if (Object.keys(subscriptions).length) {
      sanitized.subscriptions = subscriptions;
    }
  }

  if (payload.payments && typeof payload.payments === 'object') {
    const payments = {};
    if (payload.payments.defaultProvider !== undefined) {
      const provider = String(payload.payments.defaultProvider).toLowerCase();
      if (['stripe', 'escrow'].includes(provider)) {
        payments.defaultProvider = provider;
      }
    }
    if (payload.payments.stripeEnabled !== undefined) {
      payments.stripeEnabled = Boolean(payload.payments.stripeEnabled);
    }
    if (payload.payments.escrowEnabled !== undefined) {
      payments.escrowEnabled = Boolean(payload.payments.escrowEnabled);
    }
    if (Object.keys(payments).length) {
      sanitized.payments = payments;
    }
  }

  if (payload.affiliate && typeof payload.affiliate === 'object') {
    const affiliate = {};
    if (payload.affiliate.enabled !== undefined) {
      affiliate.enabled = Boolean(payload.affiliate.enabled);
    }
    if (payload.affiliate.autoApprove !== undefined) {
      affiliate.autoApprove = Boolean(payload.affiliate.autoApprove);
    }
    if (payload.affiliate.cookieWindowDays !== undefined) {
      affiliate.cookieWindowDays = clampInt(payload.affiliate.cookieWindowDays, {
        min: 1,
        max: 365,
        fallback: 30
      });
    }
    if (payload.affiliate.payoutScheduleDays !== undefined) {
      affiliate.payoutScheduleDays = clampInt(payload.affiliate.payoutScheduleDays, {
        min: 7,
        max: 120,
        fallback: 30
      });
    }
    if (payload.affiliate.requireTaxInformation !== undefined) {
      affiliate.requireTaxInformation = Boolean(payload.affiliate.requireTaxInformation);
    }
    if (payload.affiliate.defaultCommission && typeof payload.affiliate.defaultCommission === 'object') {
      const commission = {};
      if (payload.affiliate.defaultCommission.recurrence !== undefined) {
        const recurrence = String(payload.affiliate.defaultCommission.recurrence).toLowerCase();
        if (['once', 'finite', 'infinite'].includes(recurrence)) {
          commission.recurrence = recurrence;
        }
      }
      if (payload.affiliate.defaultCommission.maxOccurrences !== undefined) {
        commission.maxOccurrences = clampInt(payload.affiliate.defaultCommission.maxOccurrences, {
          min: 1,
          max: 120,
          fallback: null
        });
      }
      const tiers = sanitizeCommissionTiers(payload.affiliate.defaultCommission.tiers);
      if (tiers) {
        commission.tiers = tiers;
      }
      if (Object.keys(commission).length) {
        affiliate.defaultCommission = commission;
      }
    }
    if (payload.affiliate.security && typeof payload.affiliate.security === 'object') {
      const security = {};
      if (payload.affiliate.security.blockSelfReferral !== undefined) {
        security.blockSelfReferral = Boolean(payload.affiliate.security.blockSelfReferral);
      }
      if (payload.affiliate.security.enforceTwoFactorForPayouts !== undefined) {
        security.enforceTwoFactorForPayouts = Boolean(
          payload.affiliate.security.enforceTwoFactorForPayouts
        );
      }
      if (Object.keys(security).length) {
        affiliate.security = security;
      }
    }
    if (Object.keys(affiliate).length) {
      sanitized.affiliate = affiliate;
    }
  }

  if (payload.workforce && typeof payload.workforce === 'object') {
    const workforce = {};
    if (payload.workforce.providerControlsCompensation !== undefined) {
      workforce.providerControlsCompensation = Boolean(
        payload.workforce.providerControlsCompensation
      );
    }
    if (payload.workforce.minimumServicemanShareBps !== undefined) {
      workforce.minimumServicemanShareBps = clampInt(
        payload.workforce.minimumServicemanShareBps,
        { min: 0, max: 10_000, fallback: 0 }
      );
    }
    if (payload.workforce.recommendedServicemanShareBps !== undefined) {
      workforce.recommendedServicemanShareBps = clampInt(
        payload.workforce.recommendedServicemanShareBps,
        { min: 0, max: 10_000, fallback: 7500 }
      );
    }
    if (payload.workforce.nonCustodialWallets !== undefined) {
      workforce.nonCustodialWallets = Boolean(payload.workforce.nonCustodialWallets);
    }
    if (payload.workforce.complianceNarrative !== undefined) {
      const narrative = String(payload.workforce.complianceNarrative ?? '').trim();
      workforce.complianceNarrative = narrative.slice(0, 2000);
    }
    if (Object.keys(workforce).length) {
      sanitized.workforce = workforce;
    }
  }

  return sanitized;
}

function normaliseMonetization(rawSettings = {}) {
  const defaults = resolveDefaultMonetization();
  const merged = deepMerge(defaults, rawSettings);

  merged.commissions.rateBps = clampInt(merged.commissions.rateBps, { min: 0, max: 5000, fallback: defaults.commissions.rateBps });
  merged.commissions.minimumFeeCents = clampInt(merged.commissions.minimumFeeCents, { min: 0, max: 10_000_000, fallback: defaults.commissions.minimumFeeCents });
  merged.commissions.enabled = Boolean(merged.commissions.enabled);
  merged.commissions.allowCommunityOverride = Boolean(merged.commissions.allowCommunityOverride);

  const commissionDefault = merged.commissions.default ?? {};
  commissionDefault.rateBps = clampInt(commissionDefault.rateBps ?? merged.commissions.rateBps, {
    min: 0,
    max: 5000,
    fallback: defaults.commissions.default.rateBps
  });
  commissionDefault.minimumFeeCents = clampInt(
    commissionDefault.minimumFeeCents ?? merged.commissions.minimumFeeCents,
    {
      min: 0,
      max: 10_000_000,
      fallback: defaults.commissions.default.minimumFeeCents
    }
  );
  commissionDefault.affiliateShare = clampRatio(
    commissionDefault.affiliateShare ?? defaults.commissions.default.affiliateShare,
    { fallback: defaults.commissions.default.affiliateShare }
  );
  merged.commissions.default = commissionDefault;
  merged.commissions.rateBps = commissionDefault.rateBps;
  merged.commissions.minimumFeeCents = commissionDefault.minimumFeeCents;

  const categoryDefaults = defaults.commissions.categories ?? {};
  const providedCategories = merged.commissions.categories ?? {};
  const categoryKeys = new Set([
    ...Object.keys(categoryDefaults),
    ...Object.keys(providedCategories)
  ]);
  const normalisedCategories = {};
  categoryKeys.forEach((key) => {
    const base = providedCategories[key] ?? {};
    const fallback = categoryDefaults[key] ?? commissionDefault;
    normalisedCategories[key] = {
      rateBps: clampInt(base.rateBps ?? fallback.rateBps ?? commissionDefault.rateBps, {
        min: 0,
        max: 5000,
        fallback: fallback.rateBps ?? commissionDefault.rateBps
      }),
      minimumFeeCents: clampInt(
        base.minimumFeeCents ?? fallback.minimumFeeCents ?? commissionDefault.minimumFeeCents,
        {
          min: 0,
          max: 10_000_000,
          fallback: fallback.minimumFeeCents ?? commissionDefault.minimumFeeCents
        }
      ),
      affiliateShare: clampRatio(
        base.affiliateShare ?? fallback.affiliateShare ?? commissionDefault.affiliateShare,
        { fallback: fallback.affiliateShare ?? commissionDefault.affiliateShare }
      )
    };
  });
  merged.commissions.categories = normalisedCategories;

  merged.subscriptions.enabled = Boolean(merged.subscriptions.enabled);
  merged.subscriptions.restrictOnFailure = Boolean(merged.subscriptions.restrictOnFailure);
  merged.subscriptions.gracePeriodDays = clampInt(merged.subscriptions.gracePeriodDays, {
    min: 0,
    max: 90,
    fallback: defaults.subscriptions.gracePeriodDays
  });
  merged.subscriptions.restrictedFeatures = normalizeStringArray(merged.subscriptions.restrictedFeatures);

  merged.payments.stripeEnabled = Boolean(merged.payments.stripeEnabled);
  merged.payments.escrowEnabled = Boolean(merged.payments.escrowEnabled);
  const requestedProvider = String(merged.payments.defaultProvider ?? defaults.payments.defaultProvider).toLowerCase();
  if (requestedProvider === 'escrow' && merged.payments.escrowEnabled) {
    merged.payments.defaultProvider = 'escrow';
  } else {
    merged.payments.defaultProvider = merged.payments.stripeEnabled ? 'stripe' : merged.payments.escrowEnabled ? 'escrow' : 'stripe';
  }

  merged.affiliate = merged.affiliate ?? {};
  const affiliateDefaults = defaults.affiliate;
  merged.affiliate.enabled = Boolean(merged.affiliate.enabled);
  merged.affiliate.autoApprove = Boolean(
    merged.affiliate.autoApprove ?? affiliateDefaults.autoApprove
  );
  merged.affiliate.cookieWindowDays = clampInt(merged.affiliate.cookieWindowDays, {
    min: 1,
    max: 365,
    fallback: affiliateDefaults.cookieWindowDays
  });
  merged.affiliate.payoutScheduleDays = clampInt(merged.affiliate.payoutScheduleDays, {
    min: 7,
    max: 120,
    fallback: affiliateDefaults.payoutScheduleDays
  });
  merged.affiliate.requireTaxInformation = Boolean(
    merged.affiliate.requireTaxInformation ?? affiliateDefaults.requireTaxInformation
  );

  const affiliateDefault = merged.affiliate.defaultCommission ?? {};
  const defaultRecurrence = String(
    affiliateDefault.recurrence ?? affiliateDefaults.defaultCommission.recurrence
  ).toLowerCase();
  const recurrence = ['once', 'finite', 'infinite'].includes(defaultRecurrence)
    ? defaultRecurrence
    : affiliateDefaults.defaultCommission.recurrence;
  let maxOccurrences = affiliateDefault.maxOccurrences;
  if (recurrence === 'finite') {
    maxOccurrences = clampInt(maxOccurrences, {
      min: 1,
      max: 120,
      fallback: affiliateDefaults.defaultCommission.maxOccurrences ?? 1
    });
  } else {
    maxOccurrences = null;
  }
  const tiers = normaliseCommissionTiers(
    affiliateDefault.tiers,
    affiliateDefaults.defaultCommission.tiers
  );
  merged.affiliate.defaultCommission = {
    recurrence,
    maxOccurrences,
    tiers
  };

  const security = merged.affiliate.security ?? {};
  merged.affiliate.security = {
    blockSelfReferral: Boolean(
      security.blockSelfReferral ?? affiliateDefaults.security.blockSelfReferral
    ),
    enforceTwoFactorForPayouts: Boolean(
      security.enforceTwoFactorForPayouts ?? affiliateDefaults.security.enforceTwoFactorForPayouts
    )
  };

  merged.workforce = merged.workforce ?? {};
  merged.workforce.providerControlsCompensation = Boolean(
    merged.workforce.providerControlsCompensation ?? defaults.workforce.providerControlsCompensation
  );
  merged.workforce.minimumServicemanShareBps = clampInt(
    merged.workforce.minimumServicemanShareBps,
    {
      min: 0,
      max: 10_000,
      fallback: defaults.workforce.minimumServicemanShareBps
    }
  );
  merged.workforce.recommendedServicemanShareBps = clampInt(
    merged.workforce.recommendedServicemanShareBps,
    {
      min: 0,
      max: 10_000,
      fallback: defaults.workforce.recommendedServicemanShareBps
    }
  );
  merged.workforce.nonCustodialWallets = Boolean(
    merged.workforce.nonCustodialWallets ?? defaults.workforce.nonCustodialWallets
  );
  merged.workforce.complianceNarrative = String(
    merged.workforce.complianceNarrative ?? defaults.workforce.complianceNarrative
  )
    .trim()
    .slice(0, 2000);

  return merged;
}

export default class PlatformSettingsService {
  static async getAdminProfileSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.ADMIN_PROFILE, connection);
    return normaliseAdminProfile(record?.value ?? {});
  }

  static async updateAdminProfileSettings(payload, connection = db) {
    const sanitized = sanitizeAdminProfilePayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getAdminProfileSettings(connection);
    }
    const current = await this.getAdminProfileSettings(connection);
    const merged = normaliseAdminProfile(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.ADMIN_PROFILE, merged, connection);
    return merged;
  }

  static async getPaymentSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.PAYMENT, connection);
    return normalisePaymentSettings(record?.value ?? {});
  }

  static async updatePaymentSettings(payload, connection = db) {
    const sanitized = sanitizePaymentSettingsPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getPaymentSettings(connection);
    }
    const current = await this.getPaymentSettings(connection);
    const merged = normalisePaymentSettings(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.PAYMENT, merged, connection);
    return merged;
  }

  static async getEmailSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.EMAIL, connection);
    return normaliseEmailSettings(record?.value ?? {});
  }

  static async updateEmailSettings(payload, connection = db) {
    const sanitized = sanitizeEmailSettingsPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getEmailSettings(connection);
    }
    const current = await this.getEmailSettings(connection);
    const merged = normaliseEmailSettings(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.EMAIL, merged, connection);
    return merged;
  }

  static async getSecuritySettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.SECURITY, connection);
    return normaliseSecuritySettings(record?.value ?? {});
  }

  static async updateSecuritySettings(payload, connection = db) {
    const sanitized = sanitizeSecuritySettingsPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getSecuritySettings(connection);
    }
    const current = await this.getSecuritySettings(connection);
    const merged = normaliseSecuritySettings(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.SECURITY, merged, connection);
    return merged;
  }

  static async getFinanceSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.FINANCE, connection);
    return normaliseFinanceSettings(record?.value ?? {});
  }

  static async updateFinanceSettings(payload, connection = db) {
    const sanitized = sanitizeFinanceSettingsPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getFinanceSettings(connection);
    }
    const current = await this.getFinanceSettings(connection);
    const merged = normaliseFinanceSettings(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.FINANCE, merged, connection);
    return merged;
  }

  static async getAppearanceSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.APPEARANCE, connection);
    return normaliseAppearance(record?.value ?? {});
  }

  static async updateAppearanceSettings(payload, connection = db) {
    const sanitized = sanitizeAppearancePayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getAppearanceSettings(connection);
    }
    const current = await this.getAppearanceSettings(connection);
    const merged = normaliseAppearance(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.APPEARANCE, merged, connection);
    return merged;
  }

  static async getPreferenceSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.PREFERENCES, connection);
    return normalisePreferences(record?.value ?? {});
  }

  static async updatePreferenceSettings(payload, connection = db) {
    const sanitized = sanitizePreferencesPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getPreferenceSettings(connection);
    }
    const current = await this.getPreferenceSettings(connection);
    const merged = normalisePreferences(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.PREFERENCES, merged, connection);
    return merged;
  }

  static async getSystemSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.SYSTEM, connection);
    return normaliseSystem(record?.value ?? {});
  }

  static async updateSystemSettings(payload, connection = db) {
    const sanitized = sanitizeSystemPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getSystemSettings(connection);
    }
    const current = await this.getSystemSettings(connection);
    const merged = normaliseSystem(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.SYSTEM, merged, connection);
    return merged;
  }

  static async getIntegrationSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.INTEGRATIONS, connection);
    return normaliseIntegrations(record?.value ?? {});
  }

  static async updateIntegrationSettings(payload, connection = db) {
    const sanitized = sanitizeIntegrationsPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getIntegrationSettings(connection);
    }
    const current = await this.getIntegrationSettings(connection);
    const merged = normaliseIntegrations(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.INTEGRATIONS, merged, connection);
    return merged;
  }

  static async getThirdPartySettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.THIRD_PARTY, connection);
    return normaliseThirdParty(record?.value ?? {});
  }

  static async updateThirdPartySettings(payload, connection = db) {
    const sanitized = sanitizeThirdPartyPayload(payload);
    if (!Object.keys(sanitized).length) {
      return this.getThirdPartySettings(connection);
    }
    const current = await this.getThirdPartySettings(connection);
    const merged = normaliseThirdParty(deepMerge(current, sanitized));
    await PlatformSettingModel.upsert(SETTINGS_KEYS.THIRD_PARTY, merged, connection);
    return merged;
  }

  static async getMonetizationSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.MONETIZATION, connection);
    return normaliseMonetization(record?.value ?? {});
  }

  static async updateMonetizationSettings(payload, connection = db) {
    const sanitized = sanitizeMonetizationPayload(payload);
    const current = await this.getMonetizationSettings(connection);
    const merged = normaliseMonetization(deepMerge(current, sanitized));

    await PlatformSettingModel.upsert(SETTINGS_KEYS.MONETIZATION, {
      commissions: {
        enabled: merged.commissions.enabled,
        rateBps: merged.commissions.rateBps,
        minimumFeeCents: merged.commissions.minimumFeeCents,
        allowCommunityOverride: merged.commissions.allowCommunityOverride,
        default: merged.commissions.default,
        categories: merged.commissions.categories
      },
      subscriptions: {
        enabled: merged.subscriptions.enabled,
        restrictedFeatures: merged.subscriptions.restrictedFeatures,
        gracePeriodDays: merged.subscriptions.gracePeriodDays,
        restrictOnFailure: merged.subscriptions.restrictOnFailure
      },
      payments: {
        defaultProvider: merged.payments.defaultProvider,
        stripeEnabled: merged.payments.stripeEnabled,
        escrowEnabled: merged.payments.escrowEnabled
      },
      affiliate: {
        enabled: merged.affiliate.enabled,
        autoApprove: merged.affiliate.autoApprove,
        cookieWindowDays: merged.affiliate.cookieWindowDays,
        payoutScheduleDays: merged.affiliate.payoutScheduleDays,
        requireTaxInformation: merged.affiliate.requireTaxInformation,
        defaultCommission: merged.affiliate.defaultCommission,
        security: merged.affiliate.security
      },
      workforce: {
        providerControlsCompensation: merged.workforce.providerControlsCompensation,
        minimumServicemanShareBps: merged.workforce.minimumServicemanShareBps,
        recommendedServicemanShareBps: merged.workforce.recommendedServicemanShareBps,
        nonCustodialWallets: merged.workforce.nonCustodialWallets,
        complianceNarrative: merged.workforce.complianceNarrative
      }
    }, connection);

    return merged;
  }

  static async getOperationalSnapshot(connection = db) {
    const [profile, security, finance, monetization, integrations] = await Promise.all([
      this.getAdminProfileSettings(connection),
      this.getSecuritySettings(connection),
      this.getFinanceSettings(connection),
      this.getMonetizationSettings(connection),
      this.getIntegrationsSettings(connection)
    ]);

    return {
      profile: deepMerge(DEFAULT_ADMIN_PROFILE, profile ?? {}),
      security: deepMerge(DEFAULT_SYSTEM.security, security?.security ?? {}),
      finance: deepMerge(DEFAULT_SYSTEM.operations, finance ?? {}),
      monetization: deepMerge(DEFAULT_MONETIZATION, monetization ?? {}),
      integrations: deepMerge(DEFAULT_INTEGRATIONS, integrations ?? {}),
      generatedAt: new Date().toISOString()
    };
  }

  static calculateCommission(amountCents, commissionConfig, { category } = {}) {
    const fallback = {
      platformAmountCents: 0,
      affiliateAmountCents: 0,
      appliedRateBps: 0,
      affiliateShareRatio: 0,
      appliedMinimumFeeCents: 0,
      category: category ?? null
    };

    if (!commissionConfig || !commissionConfig.enabled) {
      return fallback;
    }

    const amount = clampInt(amountCents, { min: 0, fallback: 0 });
    const defaultCommission = commissionConfig.default ?? {};
    const categoryConfig = category && commissionConfig.categories
      ? commissionConfig.categories[category]
      : undefined;

    const rate = clampInt(
      categoryConfig?.rateBps ?? defaultCommission.rateBps ?? commissionConfig.rateBps,
      { min: 0, max: 5000, fallback: 0 }
    );
    const minimum = clampInt(
      categoryConfig?.minimumFeeCents ?? defaultCommission.minimumFeeCents ?? commissionConfig.minimumFeeCents,
      { min: 0, max: 10_000_000, fallback: 0 }
    );
    const affiliateShare = clampRatio(
      categoryConfig?.affiliateShare ?? defaultCommission.affiliateShare ?? 0,
      { fallback: 0 }
    );

    const calculated = Math.max(Math.floor((amount * rate) / 10_000), minimum);
    const affiliateAmount = Math.floor(calculated * affiliateShare);

    return {
      platformAmountCents: calculated,
      affiliateAmountCents: affiliateAmount,
      appliedRateBps: rate,
      affiliateShareRatio: affiliateShare,
      appliedMinimumFeeCents: minimum,
      category: categoryConfig ? category : null
    };
  }
}

export {
  resolveDefaultMonetization,
  normaliseMonetization,
  normaliseAppearance,
  normalisePreferences,
  normaliseSystem,
  normaliseIntegrations,
  normaliseThirdParty,
  normaliseAdminProfile,
  normalisePaymentSettings,
  normaliseEmailSettings,
  normaliseSecuritySettings,
  normaliseFinanceSettings
};
