import { getUserPlanProfile } from '../services/planService.js';

const SUBSCRIPTION_REQUIRED_ERROR = {
  error: 'subscription_required',
  message: 'Seu plano expirou. Faca upgrade para continuar.'
};

function canPerformCriticalAction(planProfile) {
  return ['active', 'trialing'].includes(String(planProfile?.planStatus || '').toLowerCase());
}

export function requireActiveSubscriptionAction(req, res, next) {
  return getUserPlanProfile(req.user.id)
    .then((planProfile) => {
      req.planProfile = planProfile;
      console.log('SUBSCRIPTION:', planProfile.subscription || planProfile);

      if (canPerformCriticalAction(planProfile)) {
        return next();
      }

      console.log('BLOCK REASON:', planProfile.accessReason || 'inactive_subscription_action');
      return res.status(403).json({
        ...SUBSCRIPTION_REQUIRED_ERROR,
        plan: planProfile.plan,
        billingPlan: planProfile.billingPlan,
        planStatus: planProfile.planStatus,
        appAccess: planProfile.appAccess,
        accessReason: planProfile.accessReason
      });
    })
    .catch(next);
}

export function buildSubscriptionRequiredError() {
  return { ...SUBSCRIPTION_REQUIRED_ERROR };
}
