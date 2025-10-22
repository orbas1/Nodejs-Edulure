import express from 'express';

import SetupController from '../controllers/SetupController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowDevelopmentOrigins: true });

router.get('/status', SetupController.getStatus);
router.post('/runs', express.json({ limit: '1mb' }), SetupController.startRun);

export default router;
