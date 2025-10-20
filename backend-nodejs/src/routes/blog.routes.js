import BlogController from '../controllers/BlogController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET'] });

router.get('/posts', BlogController.list);
router.get('/posts/:slug', BlogController.show);
router.get('/categories', BlogController.categories);
router.get('/tags', BlogController.tags);

export default router;
