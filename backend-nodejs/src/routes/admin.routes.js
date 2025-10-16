import { Router } from 'express';

import AdminBlogController from '../controllers/AdminBlogController.js';
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

router.post(
  '/integrations/api-keys',
  auth('admin'),
  AdminIntegrationsController.createIntegrationApiKey
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

export default router;
