import { Router } from 'express';

import AdminBlogController from '../controllers/AdminBlogController.js';
import AdminFeatureFlagController from '../controllers/AdminFeatureFlagController.js';
import AdminIntegrationsController from '../controllers/AdminIntegrationsController.js';
import AdminSettingsController from '../controllers/AdminSettingsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/monetization/settings', auth('admin'), AdminSettingsController.getMonetizationSettings);
router.put('/monetization/settings', auth('admin'), AdminSettingsController.updateMonetizationSettings);

router.get('/blog/posts', auth('admin'), AdminBlogController.list);
router.post('/blog/posts', auth('admin'), AdminBlogController.create);
router.patch('/blog/posts/:postId', auth('admin'), AdminBlogController.update);

router.get(
  '/integrations/dashboard',
  auth('admin'),
  AdminIntegrationsController.getIntegrationDashboard
);
router.post(
  '/integrations/:integration/runs',
  auth('admin'),
  AdminIntegrationsController.triggerIntegrationSync
);

router.get(
  '/integrations/api-keys',
  auth('admin'),
  AdminIntegrationsController.listIntegrationApiKeys
);

router.get(
  '/integrations/api-keys/invitations',
  auth('admin'),
  AdminIntegrationsController.listIntegrationApiKeyInvitations
);

router.post(
  '/integrations/api-keys',
  auth('admin'),
  AdminIntegrationsController.createIntegrationApiKey
);

router.post(
  '/integrations/api-keys/invitations',
  auth('admin'),
  AdminIntegrationsController.createIntegrationApiKeyInvitation
);

router.post(
  '/integrations/api-keys/:id/rotate',
  auth('admin'),
  AdminIntegrationsController.rotateIntegrationApiKey
);

router.post(
  '/integrations/api-keys/:id/disable',
  auth('admin'),
  AdminIntegrationsController.disableIntegrationApiKey
);

router.post(
  '/integrations/api-keys/invitations/:id/resend',
  auth('admin'),
  AdminIntegrationsController.resendIntegrationApiKeyInvitation
);

router.post(
  '/integrations/api-keys/invitations/:id/cancel',
  auth('admin'),
  AdminIntegrationsController.cancelIntegrationApiKeyInvitation
);

router.get('/feature-flags', auth('admin'), AdminFeatureFlagController.snapshot);
router.post('/feature-flags/sync', auth('admin'), AdminFeatureFlagController.syncManifest);
router.post(
  '/feature-flags/:flagKey/overrides',
  auth('admin'),
  AdminFeatureFlagController.applyOverride
);
router.delete(
  '/feature-flags/:flagKey/overrides',
  auth('admin'),
  AdminFeatureFlagController.removeOverride
);

export default router;
