import { Router } from 'express';
import { createFootballAssessment, listFootballAssessments } from '../controllers/footballController.js';
import { authRequired } from '../middleware/auth.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/assessments', authRequired, listFootballAssessments);
router.post('/assessments', authRequired, requireActiveSubscriptionAction, createFootballAssessment);

export default router;
