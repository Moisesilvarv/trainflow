import { Router } from 'express';
import { createPayment, deletePayment, dispatchPaymentReminders, financeSummary, listPayments, markPaymentAsPaid } from '../controllers/financeController.js';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/', authRequired, listPayments);
router.get('/summary', authRequired, financeSummary);
router.post(
  '/reminders/dispatch',
  authRequired,
  requireActiveSubscriptionAction,
  requirePlanFeature('recurring_billing', {
    message: 'Lembretes automaticos de pagamento estao disponiveis no plano Premium.'
  }),
  dispatchPaymentReminders
);
router.post('/', authRequired, requireActiveSubscriptionAction, createPayment);
router.patch('/:id/paid', authRequired, requireActiveSubscriptionAction, markPaymentAsPaid);
router.delete('/:id', authRequired, requireActiveSubscriptionAction, deletePayment);

export default router;
