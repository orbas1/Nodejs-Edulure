import adminRoutes from './admin.routes.js';
import adsRoutes from './ads.routes.js';
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import blogRoutes from './blog.routes.js';
import chatRoutes from './chat.routes.js';
import communityRoutes from './community.routes.js';
import contentRoutes from './content.routes.js';
import courseRoutes from './course.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import ebookRoutes from './ebook.routes.js';
import explorerRoutes from './explorer.routes.js';
import paymentRoutes from './payment.routes.js';
import runtimeConfigRoutes from './runtimeConfig.routes.js';
import socialRoutes from './social.routes.js';
import userRoutes from './user.routes.js';
import verificationRoutes from './verification.routes.js';

export const apiRouteRegistry = [
  {
    name: 'auth',
    capability: 'identity-authentication',
    description: 'User registration, login, session lifecycle, and verification endpoints.',
    basePath: '/auth',
    flagKey: 'platform.api.v1.auth',
    defaultState: 'enabled',
    router: authRoutes,
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
    router: userRoutes,
    fallbackStatus: 503,
    disabledMessage: 'User management APIs are currently disabled for this environment.'
  },
  {
    name: 'communities',
    capability: 'community-collaboration',
    description: 'Community creation, membership, and scheduling APIs.',
    basePath: '/communities',
    flagKey: 'platform.api.v1.communities',
    defaultState: 'enabled',
    router: communityRoutes
  },
  {
    name: 'content',
    capability: 'content-library',
    description: 'Content ingestion, cataloguing, and lifecycle management endpoints.',
    basePath: '/content',
    flagKey: 'platform.api.v1.content',
    defaultState: 'enabled',
    router: contentRoutes
  },
  {
    name: 'runtime-config',
    capability: 'platform-runtime-config',
    description: 'Runtime configuration and capability manifest endpoints consumed by clients.',
    basePath: '/runtime',
    flagKey: 'platform.api.v1.runtime-config',
    defaultState: 'enabled',
    router: runtimeConfigRoutes
  },
  {
    name: 'payments',
    capability: 'payments-and-payouts',
    description: 'Payments, escrow, and billing orchestration endpoints.',
    basePath: '/payments',
    flagKey: 'platform.api.v1.payments',
    defaultState: 'enabled',
    router: paymentRoutes,
    fallbackStatus: 503,
    disabledMessage:
      'Payments are unavailable for your tenant. Please contact an administrator to enable billing capabilities.'
  },
  {
    name: 'chat',
    capability: 'realtime-chat',
    description: 'Realtime chat messaging, channel presence, and DM APIs.',
    basePath: '/chat',
    flagKey: 'platform.api.v1.chat',
    defaultState: 'enabled',
    router: chatRoutes
  },
  {
    name: 'social',
    capability: 'social-graph',
    description: 'Follows, recommendations, and user engagement APIs.',
    basePath: '/social',
    flagKey: 'platform.api.v1.social',
    defaultState: 'enabled',
    router: socialRoutes
  },
  {
    name: 'explorer',
    capability: 'search-and-discovery',
    description: 'Explorer search, browse, and recommendation endpoints.',
    basePath: '/explorer',
    flagKey: 'platform.api.v1.explorer',
    defaultState: 'enabled',
    router: explorerRoutes
  },
  {
    name: 'ads',
    capability: 'ads-manager',
    description: 'Advertising campaign management and insights APIs.',
    basePath: '/ads',
    flagKey: 'platform.api.v1.ads',
    defaultState: 'enabled',
    router: adsRoutes,
    fallbackStatus: 404,
    disabledMessage: 'Ads manager is not enabled for this workspace.'
  },
  {
    name: 'analytics',
    capability: 'analytics-insights',
    description: 'Reporting, dashboards, and analytics export APIs.',
    basePath: '/analytics',
    flagKey: 'platform.api.v1.analytics',
    defaultState: 'enabled',
    router: analyticsRoutes
  },
  {
    name: 'dashboard',
    capability: 'operator-dashboard',
    description: 'Operational dashboards, incident insights, and governance endpoints.',
    basePath: '/dashboard',
    flagKey: 'platform.api.v1.dashboard',
    defaultState: 'enabled',
    router: dashboardRoutes
  },
  {
    name: 'courses',
    capability: 'course-management',
    description: 'Course authoring, publishing, and lifecycle endpoints.',
    basePath: '/courses',
    flagKey: 'platform.api.v1.courses',
    defaultState: 'enabled',
    router: courseRoutes
  },
  {
    name: 'admin',
    capability: 'administration-tools',
    description: 'Administrative controls, policy enforcement, and guardrail APIs.',
    basePath: '/admin',
    flagKey: 'platform.api.v1.admin',
    defaultState: 'enabled',
    router: adminRoutes,
    fallbackStatus: 403,
    disabledMessage: 'Administration endpoints are disabled. Contact the platform owner to request access.'
  },
  {
    name: 'verification',
    capability: 'identity-verification',
    description: 'Identity verification, KYC, and trust signals APIs.',
    basePath: '/verification',
    flagKey: 'platform.api.v1.verification',
    defaultState: 'enabled',
    router: verificationRoutes
  },
  {
    name: 'ebooks',
    capability: 'digital-asset-delivery',
    description: 'E-book catalogue and DRM-controlled delivery endpoints.',
    basePath: '/ebooks',
    flagKey: 'platform.api.v1.ebooks',
    defaultState: 'enabled',
    router: ebookRoutes
  },
  {
    name: 'blog',
    capability: 'marketing-blog',
    description: 'Blog posts, marketing pages, and public content endpoints.',
    basePath: '/blog',
    flagKey: 'platform.api.v1.blog',
    defaultState: 'enabled',
    router: blogRoutes,
    fallbackStatus: 404,
    disabledMessage: 'Marketing blog endpoints are not available for this deployment.'
  }
];

export default apiRouteRegistry;
