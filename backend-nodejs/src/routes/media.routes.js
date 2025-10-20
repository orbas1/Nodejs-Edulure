import MediaUploadController from '../controllers/MediaUploadController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post('/uploads', auth(), MediaUploadController.requestUpload);

export default router;
