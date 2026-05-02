import { Router } from 'express';
import { getStudentChatHistory, studentChat } from '../controllers/aiController.js';
import { authRequired } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();
const aiLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: 'Muitas consultas de IA. Aguarde alguns minutos.'
});

router.get('/student-chat/:studentId/history', authRequired, aiLimiter, getStudentChatHistory);
router.post('/student-chat', authRequired, aiLimiter, requireActiveSubscriptionAction, studentChat);

export default router;
