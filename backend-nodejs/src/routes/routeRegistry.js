import adminRoutes from './admin.routes.js';
import adsRoutes from './ads.routes.js';
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import blogRoutes from './blog.routes.js';
import providerTransitionRoutes from './providerTransition.routes.js';
import chatRoutes from './chat.routes.js';
import complianceRoutes from './compliance.routes.js';
import communityRoutes from './community.routes.js';
import communityModerationRoutes from './communityModeration.routes.js';
import contentRoutes from './content.routes.js';
import creationRoutes from './creation.routes.js';
import courseRoutes from './course.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import enablementRoutes from './enablement.routes.js';
import ebookRoutes from './ebook.routes.js';
import explorerRoutes from './explorer.routes.js';
import feedRoutes from './feed.routes.js';
import paymentRoutes from './payment.routes.js';
import integrationInviteRoutes from './integrationInvite.routes.js';
import runtimeConfigRoutes from './runtimeConfig.routes.js';
import socialRoutes from './social.routes.js';
import userRoutes from './user.routes.js';
import verificationRoutes from './verification.routes.js';
import observabilityRoutes from './observability.routes.js';
import environmentParityRoutes from './environmentParity.routes.js';
import securityRoutes from './security.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import governanceRoutes from './governance.routes.js';
import releaseRoutes from './release.routes.js';
import { apiRouteMetadata } from './routeMetadata.js';

const routerMap = {
  auth: authRoutes,
  users: userRoutes,
  communities: communityRoutes,
  'community-moderation': communityModerationRoutes,
  content: contentRoutes,
  creation: creationRoutes,
  'runtime-config': runtimeConfigRoutes,
  payments: paymentRoutes,
  'integration-invites': integrationInviteRoutes,
  compliance: complianceRoutes,
  security: securityRoutes,
  chat: chatRoutes,
  social: socialRoutes,
  feed: feedRoutes,
  explorer: explorerRoutes,
  ads: adsRoutes,
  analytics: analyticsRoutes,
  dashboard: dashboardRoutes,
  courses: courseRoutes,
  admin: adminRoutes,
  verification: verificationRoutes,
  ebooks: ebookRoutes,
  blog: blogRoutes,
  'provider-transition': providerTransitionRoutes,
  observability: observabilityRoutes,
  environment: environmentParityRoutes,
  telemetry: telemetryRoutes,
  enablement: enablementRoutes,
  governance: governanceRoutes,
  release: releaseRoutes
};

export const apiRouteRegistry = apiRouteMetadata.map((descriptor) => ({
  ...descriptor,
  router: routerMap[descriptor.name]
}));

export default apiRouteRegistry;
