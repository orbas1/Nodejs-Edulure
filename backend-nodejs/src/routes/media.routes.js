import express from 'express';

import MediaUploadController from '../controllers/MediaUploadController.js';
import auth from '../middleware/auth.js';
import { storageDescriptor, storageLimits } from '../config/storage.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post('/uploads', auth(), MediaUploadController.requestUpload);

if (storageDescriptor.driver === 'local') {
  router.post(
    '/uploads/:token',
    auth(),
    express.raw({ type: '*/*', limit: storageLimits.maxUploadBytes }),
    MediaUploadController.completeLocalUpload
  );
}

export default router;
