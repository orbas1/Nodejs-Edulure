import IntegrationKeyInviteController from '../controllers/IntegrationKeyInviteController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/:token', IntegrationKeyInviteController.getInvitation);
router.post('/:token', IntegrationKeyInviteController.submitInvitation);

export default router;
