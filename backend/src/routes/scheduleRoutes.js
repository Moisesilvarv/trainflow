import { Router } from 'express';
import { cancelSchedule, createSchedule, deleteSchedule, listSchedule, runReminderDispatch, updateSchedule } from '../controllers/scheduleController.js';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/', authRequired, listSchedule);
router.post('/', authRequired, requireActiveSubscriptionAction, createSchedule);
router.post(
  '/reminders/dispatch',
  authRequired,
  requireActiveSubscriptionAction,
  requirePlanFeature('whatsapp_automation', {
    message: 'Lembretes automaticos via WhatsApp estao disponiveis a partir do plano Pro.'
  }),
  runReminderDispatch
);
router.put('/:id', authRequired, requireActiveSubscriptionAction, updateSchedule);
router.patch('/:id/cancel', authRequired, requireActiveSubscriptionAction, cancelSchedule);
router.delete('/:id', authRequired, requireActiveSubscriptionAction, deleteSchedule);

export default router;
