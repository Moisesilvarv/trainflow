import { Router } from 'express';
import {
  analyzeAnamnesis,
  getAdvancedPhysicalEval,
  suggestWorkoutWithAi,
  suggestNutritionPartnershipFlow
} from '../controllers/intelligenceController.js';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.post('/workout-suggestions', authRequired, requireActiveSubscriptionAction, requirePlanFeature('ai_workout_suggestions', {
  message: 'Assistente IA disponivel no plano Pro e Premium.'
}), suggestWorkoutWithAi);

router.get('/physical-eval/:studentId/advanced', authRequired, requirePlanFeature('evolution_history', {
  message: 'Acompanhamento avancado de evolucao estah disponivel a partir do plano Pro.'
}), getAdvancedPhysicalEval);

router.post('/anamnesis/analyze', authRequired, requireActiveSubscriptionAction, requirePlanFeature('ai_workout_suggestions', {
  message: 'Assistente IA disponivel no plano Pro e Premium.'
}), analyzeAnamnesis);

router.post('/nutrition/referral', authRequired, requireActiveSubscriptionAction, requirePlanFeature('ai_workout_suggestions', {
  message: 'Assistente IA disponivel no plano Pro e Premium.'
}), suggestNutritionPartnershipFlow);

export default router;
