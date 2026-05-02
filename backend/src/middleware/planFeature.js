import { getPlanConfigById, hasPlanFeature } from '../constants/plans.js';
import { buildSubscriptionRequiredError } from './subscriptionAction.js';
import { getUserPlanProfile } from '../services/planService.js';

function buildInactiveFeatureMessage(planProfile) {
  if (planProfile.planStatus === 'expired') {
    if (planProfile.accessReason === 'pix_expired') {
      return 'Seu acesso mensal via Pix expirou. Renove o plano para usar este recurso.';
    }
    return 'Seu teste gratis terminou. Escolha um plano para continuar usando o TrainFlow.';
  }

  if (planProfile.planStatus === 'past_due') {
    return 'Sua assinatura esta com pagamento pendente. Regularize o plano para usar este recurso.';
  }

  if (planProfile.planStatus === 'incomplete') {
    return 'Sua assinatura ainda nao foi concluida. Finalize o pagamento para liberar este recurso.';
  }

  return 'Sua assinatura nao esta ativa para usar este recurso.';
}

export function checkPlanFeature(featureKey, options = {}) {
  return async (req, res, next) => {
    try {
      const planProfile = await getUserPlanProfile(req.user.id);
      req.planProfile = planProfile;
      console.log('SUBSCRIPTION:', planProfile.subscription || planProfile);

      if (!planProfile.appAccess) {
        console.log('BLOCK REASON:', planProfile.accessReason || 'feature_app_access_denied');
        return res.status(403).json({
          ...buildSubscriptionRequiredError(),
          message:
            planProfile.planStatus === 'expired'
              ? buildSubscriptionRequiredError().message
              : options.inactiveMessage || buildInactiveFeatureMessage(planProfile),
          feature: featureKey,
          plan: planProfile.plan,
          billingPlan: planProfile.billingPlan,
          planStatus: planProfile.planStatus,
          appAccess: false,
          accessReason: planProfile.accessReason
        });
      }

      const allowed = hasPlanFeature(planProfile.plan, featureKey);
      if (!allowed) {
        const currentPlan = getPlanConfigById(planProfile.plan);
        console.log('BLOCK REASON:', `missing_feature:${featureKey}`);
        return res.status(403).json({
          message:
            options.message ||
            `Recurso disponivel apenas em planos superiores. Plano atual: ${currentPlan.name}.`,
          feature: featureKey,
          plan: planProfile.plan,
          planStatus: planProfile.planStatus
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const requirePlanFeature = checkPlanFeature;
