import { Router } from 'express';
import { adminOverview, updateUserPlanAsAdmin } from '../controllers/adminController.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authRequired, roleRequired(['admin']), adminOverview);
router.patch('/users/:userId/plan', authRequired, roleRequired(['admin']), updateUserPlanAsAdmin);

export default router;
