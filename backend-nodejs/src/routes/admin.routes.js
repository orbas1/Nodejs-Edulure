import { Router } from 'express';

import AdminSettingsController from '../controllers/AdminSettingsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/monetization/settings', auth('admin'), AdminSettingsController.getMonetizationSettings);
router.put('/monetization/settings', auth('admin'), AdminSettingsController.updateMonetizationSettings);

export default router;
