import SlackIntegrationController from '../controllers/SlackIntegrationController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post('/slack/events', auth(), SlackIntegrationController.dispatchEvent);

export default router;

