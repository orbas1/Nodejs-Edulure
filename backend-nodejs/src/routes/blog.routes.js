import { Router } from 'express';

import BlogController from '../controllers/BlogController.js';

const router = Router();

router.get('/posts', BlogController.list);
router.get('/posts/:slug', BlogController.show);
router.get('/categories', BlogController.categories);
router.get('/tags', BlogController.tags);

export default router;
