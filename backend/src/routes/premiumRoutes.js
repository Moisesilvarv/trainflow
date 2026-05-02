import { Router } from 'express';
import {
  createContract,
  createRecurringBilling,
  getAutomationAudit,
  getContracts,
  getPaymentIntegrations,
  getPremiumAutomationDefaults,
  getPremiumResourcesOverview,
  getRecurringBilling,
  getSmartDashboard,
  getWhatsappAutomationSettings,
  signContract,
  updatePaymentIntegrations,
  updateRecurringBillingStatus,
  updateWhatsappAutomationSettings
} from '../controllers/premiumController.js';
import { authRequired } from '../middleware/auth.js';
import { checkPlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/resources', authRequired, checkPlanFeature('simple_reports'), getPremiumResourcesOverview);
router.get('/automation-defaults', authRequired, checkPlanFeature('advanced_automations'), getPremiumAutomationDefaults);

router.get('/payments/integrations', authRequired, checkPlanFeature('payment_integrations'), getPaymentIntegrations);
router.put('/payments/integrations', authRequired, requireActiveSubscriptionAction, checkPlanFeature('payment_integrations'), updatePaymentIntegrations);

router.get('/contracts', authRequired, checkPlanFeature('digital_contracts'), getContracts);
router.post('/contracts', authRequired, requireActiveSubscriptionAction, checkPlanFeature('digital_contracts'), createContract);
router.post('/contracts/:contractId/sign', authRequired, requireActiveSubscriptionAction, checkPlanFeature('digital_contracts'), signContract);

router.get('/recurring-payments', authRequired, checkPlanFeature('recurring_billing'), getRecurringBilling);
router.post('/recurring-payments', authRequired, requireActiveSubscriptionAction, checkPlanFeature('recurring_billing'), createRecurringBilling);
router.patch('/recurring-payments/:recurringPaymentId/status', authRequired, requireActiveSubscriptionAction, checkPlanFeature('recurring_billing'), updateRecurringBillingStatus);

router.get('/automations/whatsapp', authRequired, checkPlanFeature('whatsapp_automation'), getWhatsappAutomationSettings);
router.put('/automations/whatsapp', authRequired, requireActiveSubscriptionAction, checkPlanFeature('whatsapp_automation'), updateWhatsappAutomationSettings);
router.get('/automations/logs', authRequired, checkPlanFeature('advanced_automations'), getAutomationAudit);

router.get('/dashboard', authRequired, checkPlanFeature('smart_dashboard'), getSmartDashboard);

export default router;
