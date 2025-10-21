import ContentController from '../controllers/ContentController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post('/assets/upload-session', auth('instructor'), ContentController.createUploadSession);
router.post('/assets/:assetId/ingest', auth('instructor'), ContentController.confirmUpload);
router.get('/assets', auth('instructor'), ContentController.list);
router.get('/assets/:assetId', auth(), ContentController.show);
router.get('/assets/:assetId/viewer-token', auth(), ContentController.viewerToken);
router.post('/assets/:assetId/events', auth(), ContentController.recordEvent);
router.post('/assets/:assetId/progress', auth(), ContentController.updateProgress);
router.get('/assets/:assetId/progress', auth(), ContentController.getProgress);
router.get('/assets/:assetId/analytics', auth('instructor'), ContentController.analytics);
router.patch('/assets/:assetId/metadata', auth('instructor'), ContentController.updateMetadata);

export default router;
