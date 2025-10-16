export const apiRouteMetadata = [
  {
    name: 'auth',
    capability: 'identity-authentication',
    description: 'User registration, login, session lifecycle, and verification endpoints.',
    basePath: '/auth',
    flagKey: 'platform.api.v1.auth',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage:
      'Authentication services are temporarily unavailable. Please retry or contact support if the issue persists.'
  },
  {
    name: 'users',
    capability: 'user-profile-management',
    description: 'Account profile, preferences, and administrative management endpoints.',
    basePath: '/users',
    flagKey: 'platform.api.v1.users',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'User management APIs are currently disabled for this environment.'
  },
  {
    name: 'communities',
    capability: 'community-collaboration',
    description: 'Community creation, membership, and scheduling APIs.',
    basePath: '/communities',
    flagKey: 'platform.api.v1.communities',
    defaultState: 'enabled'
  },
  {
    name: 'community-moderation',
    capability: 'community-moderation',
    description: 'Community moderation queues, scam reporting, and safety analytics APIs.',
    basePath: '/moderation',
    flagKey: 'platform.api.v1.community-moderation',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Moderation APIs are restricted for this tenant.'
  },
  {
    name: 'content',
    capability: 'content-library',
    description: 'Content ingestion, cataloguing, and lifecycle management endpoints.',
    basePath: '/content',
    flagKey: 'platform.api.v1.content',
    defaultState: 'enabled'
  },
  {
    name: 'creation',
    capability: 'creation-studio',
    description: 'Creation studio projects, templates, collaboration, and campaign promotion endpoints.',
    basePath: '/creation',
    flagKey: 'platform.api.v1.creation',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Creation studio is disabled for this tenant.'
  },
  {
    name: 'runtime-config',
    capability: 'platform-runtime-config',
    description: 'Runtime configuration and capability manifest endpoints consumed by clients.',
    basePath: '/runtime',
    flagKey: 'platform.api.v1.runtime-config',
    defaultState: 'enabled'
  },
  {
    name: 'payments',
    capability: 'payments-and-payouts',
    description: 'Payments, escrow, and billing orchestration endpoints.',
    basePath: '/payments',
    flagKey: 'platform.api.v1.payments',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage:
      'Payments are unavailable for your tenant. Please contact an administrator to enable billing capabilities.'
  },
  {
    name: 'compliance',
    capability: 'data-governance',
    description: 'GDPR, consent management, and incident governance endpoints.',
    basePath: '/compliance',
    flagKey: 'platform.api.v1.compliance',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Compliance endpoints are restricted in this environment.'
  },
  {
    name: 'chat',
    capability: 'realtime-chat',
    description: 'Realtime chat messaging, channel presence, and DM APIs.',
    basePath: '/chat',
    flagKey: 'platform.api.v1.chat',
    defaultState: 'enabled'
  },
  {
    name: 'social',
    capability: 'social-graph',
    description: 'Follows, recommendations, and user engagement APIs.',
    basePath: '/social',
    flagKey: 'platform.api.v1.social',
    defaultState: 'enabled'
  },
  {
    name: 'feed',
    capability: 'experience-feed',
    description: 'Live feed aggregation, ad placements, and analytics query endpoints.',
    basePath: '/feed',
    flagKey: 'platform.api.v1.feed',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Live feed services are currently disabled for this tenant.'
  },
  {
    name: 'explorer',
    capability: 'search-and-discovery',
    description: 'Explorer search, browse, and recommendation endpoints.',
    basePath: '/explorer',
    flagKey: 'platform.api.v1.explorer',
    defaultState: 'enabled'
  },
  {
    name: 'ads',
    capability: 'ads-manager',
    description: 'Advertising campaign management and insights APIs.',
    basePath: '/ads',
    flagKey: 'platform.api.v1.ads',
    defaultState: 'enabled',
    fallbackStatus: 404,
    disabledMessage: 'Ads manager is not enabled for this workspace.'
  },
  {
    name: 'analytics',
    capability: 'analytics-insights',
    description: 'Reporting, dashboards, and analytics export APIs.',
    basePath: '/analytics',
    flagKey: 'platform.api.v1.analytics',
    defaultState: 'enabled'
  },
  {
    name: 'dashboard',
    capability: 'operator-dashboard',
    description: 'Operational dashboards, incident insights, and governance endpoints.',
    basePath: '/dashboard',
    flagKey: 'platform.api.v1.dashboard',
    defaultState: 'enabled'
  },
  {
    name: 'courses',
    capability: 'course-management',
    description: 'Course authoring, publishing, and lifecycle endpoints.',
    basePath: '/courses',
    flagKey: 'platform.api.v1.courses',
    defaultState: 'enabled'
  },
  {
    name: 'admin',
    capability: 'administration-tools',
    description: 'Administrative controls, policy enforcement, and guardrail APIs.',
    basePath: '/admin',
    flagKey: 'platform.api.v1.admin',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Administration endpoints are disabled. Contact the platform owner to request access.'
  },
  {
    name: 'integration-invites',
    capability: 'integrations-governance',
    description: 'Public credential invitation verification and submission endpoints.',
    basePath: '/integration-invites',
    flagKey: 'platform.api.v1.integrationInvites',
    defaultState: 'enabled',
    audience: 'partner',
    fallbackStatus: 404,
    disabledMessage: 'Credential invitation endpoints are not available. Contact your integrations administrator.'
  },
  {
    name: 'verification',
    capability: 'identity-verification',
    description: 'Identity verification, KYC, and trust signals APIs.',
    basePath: '/verification',
    flagKey: 'platform.api.v1.verification',
    defaultState: 'enabled'
  },
  {
    name: 'ebooks',
    capability: 'digital-asset-delivery',
    description: 'E-book catalogue and DRM-controlled delivery endpoints.',
    basePath: '/ebooks',
    flagKey: 'platform.api.v1.ebooks',
    defaultState: 'enabled'
  },
  {
    name: 'blog',
    capability: 'marketing-blog',
    description: 'Blog posts, marketing pages, and public content endpoints.',
    basePath: '/blog',
    flagKey: 'platform.api.v1.blog',
    defaultState: 'enabled',
    fallbackStatus: 404,
    disabledMessage: 'Marketing blog endpoints are not available for this deployment.'
  }
];

export default apiRouteMetadata;
