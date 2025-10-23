export const featureFlagManifest = [
  {
    key: 'platform.api.v1.auth',
    name: 'Platform API v1 – Authentication',
    description:
      'Controls availability of login, registration, MFA, and session lifecycle endpoints exposed to first-party clients.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Identity Platform',
      tags: ['api', 'critical', 'security'],
      escalationChannel: '#identity-ops',
      runbook: 'https://runbooks.edulure.internal/identity/api-auth',
      docs: 'https://docs.edulure.internal/platform/authentication'
    },
    tenantDefaults: [
      {
        tenantId: '*',
        environment: 'development',
        state: 'enabled',
        notes: 'Expose auth endpoints to all tenants in development to support integration testing.'
      }
    ]
  },
  {
    key: 'platform.api.v1.users',
    name: 'Platform API v1 – User Management',
    description: 'Enables account profile, preference, and impersonation APIs for operator tooling.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Identity Platform',
      tags: ['api', 'operators'],
      escalationChannel: '#identity-ops',
      runbook: 'https://runbooks.edulure.internal/identity/user-service',
      docs: 'https://docs.edulure.internal/platform/users'
    }
  },
  {
    key: 'platform.api.v1.communities',
    name: 'Platform API v1 – Communities',
    description: 'Gates the community collaboration REST surface including scheduling and availability endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Learning Operations',
      tags: ['api', 'communities'],
      escalationChannel: '#learning-ops',
      runbook: 'https://runbooks.edulure.internal/communities/service',
      docs: 'https://docs.edulure.internal/platform/communities'
    }
  },
  {
    key: 'platform.api.v1.community-moderation',
    name: 'Platform API v1 – Community Moderation',
    description: 'Enforces moderation workflow APIs, safety queue ingestion, and policy attestation endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['staging', 'production'],
    metadata: {
      owner: 'Trust & Safety',
      tags: ['api', 'compliance'],
      escalationChannel: '#trust-safety',
      runbook: 'https://runbooks.edulure.internal/trust/moderation-api',
      docs: 'https://docs.edulure.internal/platform/moderation'
    },
    tenantDefaults: [
      {
        tenantId: 'compliance-review-lab',
        environment: 'staging',
        state: 'enabled',
        notes: 'Compliance lab tenants require access to safety review tooling before GA.'
      }
    ]
  },
  {
    key: 'platform.api.v1.content',
    name: 'Platform API v1 – Content Library',
    description: 'Gates ingestion, cataloguing, and lifecycle endpoints for the shared content library.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Content Platform',
      tags: ['api', 'content'],
      escalationChannel: '#content-platform',
      runbook: 'https://runbooks.edulure.internal/content/library-api',
      docs: 'https://docs.edulure.internal/platform/content'
    }
  },
  {
    key: 'platform.api.v1.creation',
    name: 'Platform API v1 – Creation Studio',
    description: 'Controls campaign, template, and collaboration APIs for the creation studio experience.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Creator Tools',
      tags: ['api', 'creation'],
      escalationChannel: '#creator-tools',
      runbook: 'https://runbooks.edulure.internal/creation/studio-api',
      docs: 'https://docs.edulure.internal/platform/creation'
    }
  },
  {
    key: 'platform.api.v1.runtime-config',
    name: 'Platform API v1 – Runtime Configuration',
    description: 'Publishes capability manifests and runtime configuration snapshots used by clients during bootstrap.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Platform Ops',
      tags: ['api', 'configuration'],
      escalationChannel: '#platform-ops',
      runbook: 'https://runbooks.edulure.internal/platform/runtime-config',
      docs: 'https://docs.edulure.internal/platform/runtime-config'
    }
  },
  {
    key: 'platform.api.v1.payments',
    name: 'Platform API v1 – Payments & Payouts',
    description: 'Controls billing orchestration, escrow, and payout approvals endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'percentage',
    rolloutPercentage: 85,
    environments: ['staging', 'production'],
    metadata: {
      owner: 'Revenue Operations',
      tags: ['api', 'commerce'],
      escalationChannel: '#revenue-ops',
      runbook: 'https://runbooks.edulure.internal/payments/platform-api',
      docs: 'https://docs.edulure.internal/platform/payments'
    },
    tenantDefaults: [
      {
        tenantId: 'edulure-enterprise',
        environment: 'production',
        state: 'enabled',
        notes: 'Enterprise tenant participates in payments GA rollout.'
      }
    ]
  },
  {
    key: 'platform.api.v1.compliance',
    name: 'Platform API v1 – Compliance',
    description: 'Surfaces GDPR, consent, and incident governance APIs.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['staging', 'production'],
    metadata: {
      owner: 'Trust & Safety',
      tags: ['api', 'compliance'],
      escalationChannel: '#trust-safety',
      runbook: 'https://runbooks.edulure.internal/compliance/api',
      docs: 'https://docs.edulure.internal/platform/compliance'
    }
  },
  {
    key: 'platform.api.v1.chat',
    name: 'Platform API v1 – Realtime Chat',
    description: 'Enables realtime messaging, presence, and DM APIs for operator and learner experiences.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'segment',
    environments: ['development', 'staging', 'production'],
    segmentRules: {
      allowedTenants: ['edulure-internal', 'learning-ops-guild'],
      allowedRoles: ['admin', 'moderator', 'support']
    },
    metadata: {
      owner: 'Engagement Platform',
      tags: ['api', 'chat'],
      escalationChannel: '#engagement-ops',
      runbook: 'https://runbooks.edulure.internal/chat/service',
      docs: 'https://docs.edulure.internal/platform/chat'
    }
  },
  {
    key: 'platform.api.v1.social',
    name: 'Platform API v1 – Social Graph',
    description: 'Gates follower graph, recommendation, and social engagement endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Engagement Platform',
      tags: ['api', 'social'],
      escalationChannel: '#engagement-ops',
      runbook: 'https://runbooks.edulure.internal/social/service',
      docs: 'https://docs.edulure.internal/platform/social'
    }
  },
  {
    key: 'platform.api.v1.feed',
    name: 'Platform API v1 – Experience Feed',
    description: 'Controls personalised feed aggregation, placements, and analytics query endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'percentage',
    rolloutPercentage: 70,
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Engagement Platform',
      tags: ['api', 'feed'],
      escalationChannel: '#engagement-ops',
      runbook: 'https://runbooks.edulure.internal/feed/service',
      docs: 'https://docs.edulure.internal/platform/feed'
    },
    tenantDefaults: [
      {
        tenantId: 'growth-partners',
        environment: 'staging',
        state: 'enabled',
        notes: 'Growth partners validate feed ranking experiments pre-release.'
      }
    ]
  },
  {
    key: 'platform.api.v1.explorer',
    name: 'Platform API v1 – Search & Discovery',
    description: 'Gates Explorer search, browse, and recommendation endpoints backed by the database search provider.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Search Platform',
      tags: ['api', 'search'],
      escalationChannel: '#search-platform',
      runbook: 'https://runbooks.edulure.internal/search/explorer-api',
      docs: 'https://docs.edulure.internal/platform/explorer'
    }
  },
  {
    key: 'platform.api.v1.ads',
    name: 'Platform API v1 – Ads Manager',
    description: 'Controls advertising campaign management, pacing, and reporting endpoints.',
    enabled: false,
    killSwitch: false,
    rolloutStrategy: 'percentage',
    rolloutPercentage: 15,
    environments: ['staging', 'production'],
    metadata: {
      owner: 'Revenue Operations',
      tags: ['api', 'ads'],
      escalationChannel: '#revenue-ops',
      runbook: 'https://runbooks.edulure.internal/ads/service',
      docs: 'https://docs.edulure.internal/platform/ads'
    },
    tenantDefaults: [
      {
        tenantId: 'advertising-pilot',
        environment: 'staging',
        state: 'enabled',
        notes: 'Advertising pilot tenant manages the beta rollout.'
      }
    ]
  },
  {
    key: 'platform.api.v1.analytics',
    name: 'Platform API v1 – Analytics & Insights',
    description: 'Controls analytics reporting, dashboard export, and insight endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Data Platform',
      tags: ['api', 'analytics'],
      escalationChannel: '#data-platform',
      runbook: 'https://runbooks.edulure.internal/analytics/api',
      docs: 'https://docs.edulure.internal/platform/analytics'
    }
  },
  {
    key: 'platform.api.v1.dashboard',
    name: 'Platform API v1 – Operator Dashboard',
    description: 'Enables operator dashboards, incident insights, and governance endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Platform Ops',
      tags: ['api', 'dashboard'],
      escalationChannel: '#platform-ops',
      runbook: 'https://runbooks.edulure.internal/platform/dashboard-api',
      docs: 'https://docs.edulure.internal/platform/dashboard'
    }
  },
  {
    key: 'platform.api.v1.courses',
    name: 'Platform API v1 – Course Management',
    description: 'Gates course authoring, publishing, and drip scheduling APIs.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Learning Operations',
      tags: ['api', 'courses'],
      escalationChannel: '#learning-ops',
      runbook: 'https://runbooks.edulure.internal/courses/service',
      docs: 'https://docs.edulure.internal/platform/courses'
    }
  },
  {
    key: 'platform.api.v1.admin',
    name: 'Platform API v1 – Administration',
    description: 'Controls administrative tooling, policy enforcement, and guardrail APIs.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'segment',
    environments: ['staging', 'production'],
    segmentRules: {
      allowedRoles: ['admin'],
      allowedTenants: ['edulure-internal', 'platform-ops-guild']
    },
    metadata: {
      owner: 'Platform Ops',
      tags: ['api', 'admin'],
      escalationChannel: '#platform-ops',
      runbook: 'https://runbooks.edulure.internal/platform/admin-api',
      docs: 'https://docs.edulure.internal/platform/admin'
    }
  },
  {
    key: 'platform.api.v1.integrationInvites',
    name: 'Platform API v1 – Integration Invites',
    description: 'Controls credential invitation and verification endpoints for partners.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Ecosystem Partnerships',
      tags: ['api', 'integrations'],
      escalationChannel: '#ecosystem-partnerships',
      runbook: 'https://runbooks.edulure.internal/integrations/invite-api',
      docs: 'https://docs.edulure.internal/platform/integrations'
    }
  },
  {
    key: 'platform.api.v1.verification',
    name: 'Platform API v1 – Identity Verification',
    description: 'Controls KYC, identity verification, and trust signal endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['staging', 'production'],
    metadata: {
      owner: 'Trust & Safety',
      tags: ['api', 'identity'],
      escalationChannel: '#trust-safety',
      runbook: 'https://runbooks.edulure.internal/identity/verification',
      docs: 'https://docs.edulure.internal/platform/verification'
    }
  },
  {
    key: 'platform.api.v1.ebooks',
    name: 'Platform API v1 – Digital Asset Delivery',
    description: 'Gates e-book catalogue, DRM, and download endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Content Platform',
      tags: ['api', 'ebooks'],
      escalationChannel: '#content-platform',
      runbook: 'https://runbooks.edulure.internal/content/ebooks',
      docs: 'https://docs.edulure.internal/platform/ebooks'
    }
  },
  {
    key: 'platform.api.v1.blog',
    name: 'Platform API v1 – Marketing Blog',
    description: 'Controls marketing blog and public content endpoints.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Marketing',
      tags: ['api', 'marketing'],
      escalationChannel: '#marketing-digital',
      runbook: 'https://runbooks.edulure.internal/marketing/blog',
      docs: 'https://docs.edulure.internal/platform/blog'
    }
  },
  {
    key: 'admin.operational-console',
    name: 'Operator Console',
    description: 'Gates the operator command console, workflows, and incident timelines.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'segment',
    environments: ['staging', 'production'],
    segmentRules: {
      allowedRoles: ['admin'],
      allowedTenants: ['edulure-internal', 'platform-ops-guild'],
      schedule: { start: '2024-10-01T00:00:00.000Z' }
    },
    metadata: {
      owner: 'Platform Ops',
      tags: ['console', 'operators'],
      escalationChannel: '#platform-ops',
      runbook: 'https://runbooks.edulure.internal/platform/operator-console',
      docs: 'https://docs.edulure.internal/platform/operator-console'
    },
    tenantDefaults: [
      {
        tenantId: 'platform-ops-guild',
        environment: 'staging',
        state: 'enabled',
        notes: 'Ops guild exercises the console before production deployments.'
      }
    ]
  },
  {
    key: 'platform.feature-console',
    name: 'Feature Flag Console',
    description: 'Enables the tenant-aware feature flag governance UI and audit APIs.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'boolean',
    environments: ['development', 'staging', 'production'],
    metadata: {
      owner: 'Platform Ops',
      tags: ['console', 'governance'],
      escalationChannel: '#platform-ops',
      runbook: 'https://runbooks.edulure.internal/platform/feature-flags',
      docs: 'https://docs.edulure.internal/platform/feature-flags'
    },
    tenantDefaults: [
      {
        tenantId: '*',
        environment: 'development',
        state: 'enabled',
        notes: 'Allow all dev tenants to manage feature flags without manual intervention.'
      }
    ]
  },
  {
    key: 'commerce.checkout-v2',
    name: 'Commerce Checkout v2',
    description: 'Rolls out tax-aware checkout and split payments across commerce tenants.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'percentage',
    rolloutPercentage: 45,
    environments: ['staging', 'production'],
    variants: [
      { key: 'control', weight: 55 },
      { key: 'checkout-v2', weight: 45 }
    ],
    metadata: {
      owner: 'Revenue Operations',
      tags: ['commerce', 'experiment'],
      escalationChannel: '#revenue-ops',
      experimentId: 'exp_checkout_v2',
      runbook: 'https://runbooks.edulure.internal/payments/checkout-v2',
      docs: 'https://docs.edulure.internal/payments/checkout-v2'
    },
    tenantDefaults: [
      {
        tenantId: 'edulure-enterprise',
        environment: 'staging',
        state: 'enabled',
        variantKey: 'checkout-v2',
        notes: 'Enterprise tenant provides production-like validation for checkout v2.'
      }
    ]
  },
  {
    key: 'learning.live-classrooms',
    name: 'Learning – Live Classrooms',
    description: 'Controls Agora-backed live classroom scheduling, recording, and moderation flows.',
    enabled: true,
    killSwitch: false,
    rolloutStrategy: 'segment',
    rolloutPercentage: 70,
    environments: ['development', 'staging', 'production'],
    segmentRules: {
      allowedRoles: ['admin', 'instructor'],
      allowedTenants: ['learning-ops-guild', 'creator-growth-lab'],
      percentage: 70,
      schedule: { start: '2024-09-15T08:00:00.000Z' }
    },
    metadata: {
      owner: 'Learning Operations',
      tags: ['learning', 'live'],
      escalationChannel: '#learning-ops',
      runbook: 'https://runbooks.edulure.internal/learning/live-classrooms',
      docs: 'https://docs.edulure.internal/learning/live-classrooms'
    }
  }
];

export default featureFlagManifest;
