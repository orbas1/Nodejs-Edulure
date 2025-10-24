import AuthController from '../controllers/AuthController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET', 'POST'] });

router.get('/password-policy', AuthController.describePasswordPolicy);

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/refresh', AuthController.refresh);
router.post('/logout', auth(), AuthController.logout);
router.post('/logout-all', auth(), AuthController.logoutAll);
router.post('/magic-link', AuthController.requestMagicLink);
router.post('/magic-link/consume', AuthController.consumeMagicLink);
router.post('/passkeys/register/options', auth(), AuthController.passkeyRegistrationOptions);
router.post('/passkeys/register/complete', auth(), AuthController.passkeyRegistrationComplete);
router.post('/passkeys/login/options', AuthController.passkeyLoginOptions);
router.post('/passkeys/login/complete', AuthController.passkeyLoginComplete);

export default router;
