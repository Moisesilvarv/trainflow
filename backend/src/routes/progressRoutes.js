import { Router } from 'express';
import { createProgress, listProgress } from '../controllers/progressController.js';
import { authRequired } from '../middleware/auth.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/', authRequired, listProgress);
router.post('/', authRequired, requireActiveSubscriptionAction, createProgress);

export default router;
