import { Router } from 'express';

import AdminBlogController from '../controllers/AdminBlogController.js';
import AdminSettingsController from '../controllers/AdminSettingsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/monetization/settings', auth('admin'), AdminSettingsController.getMonetizationSettings);
router.put('/monetization/settings', auth('admin'), AdminSettingsController.updateMonetizationSettings);

router.get('/blog/posts', auth('admin'), AdminBlogController.list);
router.post('/blog/posts', auth('admin'), AdminBlogController.create);
router.patch('/blog/posts/:postId', auth('admin'), AdminBlogController.update);

export default router;
