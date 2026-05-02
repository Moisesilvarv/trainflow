import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  getAccountIntegrations,
  getAccountPreferences,
  getAccountProfile,
  updateAccountPreferences,
  updateAccountProfile
} from '../controllers/accountController.js';

const router = Router();

router.get('/profile', authRequired, getAccountProfile);
router.put('/profile', authRequired, updateAccountProfile);
router.get('/preferences', authRequired, getAccountPreferences);
router.put('/preferences', authRequired, updateAccountPreferences);
router.get('/integrations', authRequired, getAccountIntegrations);

export default router;
