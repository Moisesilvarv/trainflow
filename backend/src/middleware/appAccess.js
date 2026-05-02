import { getUserPlanProfile } from '../services/planService.js';

function buildInactiveAccessMessage(planProfile) {
  if (planProfile.planStatus === 'pending_email' || planProfile.accessReason === 'email_pending') {
    return 'Confirme seu email para ativar seu teste gratis do TrainFlow.';
  }

  if (planProfile.planStatus === 'expired') {
    if (planProfile.accessReason === 'pix_expired') {
      return 'Seu acesso mensal via Pix expirou. Renove o plano para continuar usando o TrainFlow.';
    }
    return 'Seu teste gratis terminou. Escolha um plano para continuar usando o TrainFlow.';
  }

  if (planProfile.planStatus === 'past_due') {
    return 'Sua assinatura esta com pagamento pendente. Regularize o plano para continuar usando o TrainFlow.';
  }

  if (planProfile.planStatus === 'incomplete') {
    return 'Sua assinatura ainda nao foi concluida. Finalize o pagamento para liberar o acesso.';
  }

  return 'Sua assinatura nao esta ativa para continuar usando o TrainFlow.';
}

function buildInactiveAccessCode(planProfile) {
  if (planProfile.planStatus === 'pending_email' || planProfile.accessReason === 'email_pending') return 'email_pending';
  if (planProfile.planStatus === 'expired') return planProfile.accessReason === 'pix_expired' ? 'pix_expired' : 'trial_expired';
  if (planProfile.planStatus === 'past_due') return 'payment_issue';
  if (planProfile.planStatus === 'incomplete') return 'subscription_incomplete';
  return 'subscription_inactive';
}

export async function requireAppAccess(req, res, next) {
  try {
    const planProfile = await getUserPlanProfile(req.user.id);
    req.planProfile = planProfile;
    console.log('SUBSCRIPTION:', planProfile.subscription || planProfile);

    if (planProfile.appAccess) {
      return next();
    }

    console.log('BLOCK REASON:', planProfile.accessReason || 'app_access_denied');
    return res.status(403).json({
      error: 'subscription_required',
      message: buildInactiveAccessMessage(planProfile),
      code: buildInactiveAccessCode(planProfile),
      plan: planProfile.plan,
      billingPlan: planProfile.billingPlan,
      planStatus: planProfile.planStatus,
      appAccess: false,
      accessReason: planProfile.accessReason,
      trialStartedAt: planProfile.trialStartedAt,
      trialEndsAt: planProfile.trialEndsAt,
      trialDaysRemaining: planProfile.trialDaysRemaining
    });
  } catch (error) {
    return next(error);
  }
}
