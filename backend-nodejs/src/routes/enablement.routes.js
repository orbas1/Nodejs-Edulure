import { Router } from 'express';

import EnablementController from '../controllers/EnablementController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/articles', auth('admin'), EnablementController.listArticles);
router.get('/articles/:slug', auth('admin'), EnablementController.getArticle);
router.get('/capability-matrix', auth('admin'), EnablementController.getCapabilityMatrix);
router.post('/reindex', auth('admin'), EnablementController.refreshIndex);

export default router;
