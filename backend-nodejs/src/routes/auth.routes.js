import AuthController from '../controllers/AuthController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET', 'POST'] });

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/refresh', AuthController.refresh);
router.post('/logout', auth(), AuthController.logout);
router.post('/logout-all', auth(), AuthController.logoutAll);
router.get('/password-policy', AuthController.passwordPolicy);

export default router;
