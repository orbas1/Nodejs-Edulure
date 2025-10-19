import { Router } from 'express';

import AdminBlogController from '../controllers/AdminBlogController.js';
import AdminControlController from '../controllers/AdminControlController.js';
import AdminFeatureFlagController from '../controllers/AdminFeatureFlagController.js';
import AdminIntegrationsController from '../controllers/AdminIntegrationsController.js';
import AdminSettingsController from '../controllers/AdminSettingsController.js';
import AdminMonetizationController from '../controllers/AdminMonetizationController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/monetization/settings', auth('admin'), AdminSettingsController.getMonetizationSettings);
router.put('/monetization/settings', auth('admin'), AdminSettingsController.updateMonetizationSettings);
router.get('/monetization/catalog', auth('admin'), AdminMonetizationController.listCatalogItems);
router.post('/monetization/catalog', auth('admin'), AdminMonetizationController.upsertCatalogItem);
router.post('/monetization/usage', auth('admin'), AdminMonetizationController.recordUsage);
router.get('/monetization/revenue-schedules', auth('admin'), AdminMonetizationController.listRevenueSchedules);
router.post('/monetization/reconciliations/run', auth('admin'), AdminMonetizationController.triggerReconciliation);
router.get('/monetization/reconciliations', auth('admin'), AdminMonetizationController.listReconciliationRuns);

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

router.get('/control/communities', auth('admin'), AdminControlController.listCommunities);
router.post('/control/communities', auth('admin'), AdminControlController.createCommunity);
router.put('/control/communities/:communityId', auth('admin'), AdminControlController.updateCommunity);
router.delete('/control/communities/:communityId', auth('admin'), AdminControlController.deleteCommunity);

router.get('/control/courses', auth('admin'), AdminControlController.listCourses);
router.post('/control/courses', auth('admin'), AdminControlController.createCourse);
router.put('/control/courses/:courseId', auth('admin'), AdminControlController.updateCourse);
router.delete('/control/courses/:courseId', auth('admin'), AdminControlController.deleteCourse);

router.get('/control/tutors', auth('admin'), AdminControlController.listTutors);
router.post('/control/tutors', auth('admin'), AdminControlController.createTutor);
router.put('/control/tutors/:tutorId', auth('admin'), AdminControlController.updateTutor);
router.delete('/control/tutors/:tutorId', auth('admin'), AdminControlController.deleteTutor);

router.get('/control/ebooks', auth('admin'), AdminControlController.listEbooks);
router.post('/control/ebooks', auth('admin'), AdminControlController.createEbook);
router.put('/control/ebooks/:ebookId', auth('admin'), AdminControlController.updateEbook);
router.delete('/control/ebooks/:ebookId', auth('admin'), AdminControlController.deleteEbook);

router.get('/control/live-streams', auth('admin'), AdminControlController.listLiveStreams);
router.post('/control/live-streams', auth('admin'), AdminControlController.createLiveStream);
router.put('/control/live-streams/:streamId', auth('admin'), AdminControlController.updateLiveStream);
router.delete('/control/live-streams/:streamId', auth('admin'), AdminControlController.deleteLiveStream);

router.get('/control/podcasts', auth('admin'), AdminControlController.listPodcastShows);
router.post('/control/podcasts', auth('admin'), AdminControlController.createPodcastShow);
router.put('/control/podcasts/:showId', auth('admin'), AdminControlController.updatePodcastShow);
router.delete('/control/podcasts/:showId', auth('admin'), AdminControlController.deletePodcastShow);

router.get('/control/podcasts/:showId/episodes', auth('admin'), AdminControlController.listPodcastEpisodes);
router.post('/control/podcasts/:showId/episodes', auth('admin'), AdminControlController.createPodcastEpisode);
router.put('/control/podcasts/:showId/episodes/:episodeId', auth('admin'), AdminControlController.updatePodcastEpisode);
router.delete('/control/podcasts/:showId/episodes/:episodeId', auth('admin'), AdminControlController.deletePodcastEpisode);

export default router;
