import auth from '../middleware/auth.js';
import OperatorSupportController from '../controllers/OperatorSupportController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.use(auth('admin'));

router.get('/support/overview', OperatorSupportController.overview);
router.get('/support/tenants', OperatorSupportController.listTenants);
router.patch(
  '/support/tenants/:tenantId/tickets/:ticketId/assign',
  OperatorSupportController.assignTicket
);
router.patch(
  '/support/tenants/:tenantId/tickets/:ticketId/escalate',
  OperatorSupportController.escalateTicket
);
router.patch(
  '/support/tenants/:tenantId/tickets/:ticketId/resolve',
  OperatorSupportController.resolveTicket
);
router.post(
  '/support/tenants/:tenantId/communications/broadcasts',
  OperatorSupportController.scheduleBroadcast
);
router.put(
  '/support/tenants/:tenantId/notification-policies/:policyId',
  OperatorSupportController.updateNotificationPolicy
);

export default router;
