import { Router } from 'express';
import { applyWorkoutTemplate, listWorkoutTemplates } from '../controllers/workoutLibraryController.js';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/templates', authRequired, requirePlanFeature('workout_library', {
  message: 'Biblioteca de treinos estah disponivel a partir do plano Pro.'
}), listWorkoutTemplates);

router.post('/templates/:templateId/apply', authRequired, requireActiveSubscriptionAction, requirePlanFeature('workout_library', {
  message: 'Biblioteca de treinos estah disponivel a partir do plano Pro.'
}), applyWorkoutTemplate);

export default router;
