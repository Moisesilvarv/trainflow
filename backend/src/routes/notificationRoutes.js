import { Router } from 'express';
import {
  runClassReminders,
  runInactiveStudents,
  runWeeklyFinancialSummary
} from '../controllers/notificationController.js';
import { cronSecretRequired } from '../middleware/cronAuth.js';

const router = Router();

router.post('/run-class-reminders', cronSecretRequired, runClassReminders);
router.post('/run-inactive-students', cronSecretRequired, runInactiveStudents);
router.post('/run-weekly-financial-summary', cronSecretRequired, runWeeklyFinancialSummary);

export default router;
