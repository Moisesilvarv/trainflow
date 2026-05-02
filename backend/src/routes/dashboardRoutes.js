import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { getDashboardMetrics } from '../controllers/dashboardController.js';

const router = Router();
router.get('/', authRequired, getDashboardMetrics);

export default router;
