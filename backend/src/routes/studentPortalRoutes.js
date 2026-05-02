import { Router } from 'express';
import {
  generateStudentPortalAccess,
  getPortalSession,
  getStudentPortalAccess,
  revokeStudentPortalAccess,
  resendStudentPortalInvite
} from '../controllers/studentPortalController.js';
import { authRequired } from '../middleware/auth.js';
import { emailVerifiedRequired } from '../middleware/emailVerification.js';
import { checkPlanFeature } from '../middleware/planFeature.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const portalLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'Muitas tentativas de acesso ao portal. Aguarde alguns minutos.'
});

router.get('/session/:token', portalLimiter, getPortalSession);
router.get('/access/:studentId', authRequired, emailVerifiedRequired, checkPlanFeature('student_portal'), getStudentPortalAccess);
router.post('/access/:studentId/generate', authRequired, emailVerifiedRequired, checkPlanFeature('student_portal'), generateStudentPortalAccess);
router.post('/access/:studentId/resend', authRequired, emailVerifiedRequired, checkPlanFeature('student_portal'), resendStudentPortalInvite);
router.post('/access/:studentId/revoke', authRequired, emailVerifiedRequired, checkPlanFeature('student_portal'), revokeStudentPortalAccess);

export default router;
