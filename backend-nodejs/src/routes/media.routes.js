import { Router } from 'express';

import MediaUploadController from '../controllers/MediaUploadController.js';
import auth from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.post('/uploads', auth(), MediaUploadController.requestUpload);

export default router;
