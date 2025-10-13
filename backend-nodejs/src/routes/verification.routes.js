import { Router } from 'express';

import {
  attachDocument,
  createUploadRequest,
  getAdminOverview,
  getOwnVerification,
  listAuditTrail,
  reviewVerification,
  submitForReview
} from '../controllers/IdentityVerificationController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/me', auth(), getOwnVerification);
router.post('/me/upload-requests', auth(), createUploadRequest);
router.post('/me/documents', auth(), attachDocument);
router.post('/me/submit', auth(), submitForReview);

router.get('/admin/overview', auth('admin'), getAdminOverview);
router.post('/:verificationId/review', auth('admin'), reviewVerification);
router.get('/:verificationId/audit', auth('admin'), listAuditTrail);

export default router;
