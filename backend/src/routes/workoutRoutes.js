import { Router } from 'express';
import { createWorkout, deleteWorkout, exportWorkoutPdf, listWorkouts, sendWorkoutByEmail, updateWorkout } from '../controllers/workoutController.js';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/', authRequired, listWorkouts);
router.post('/', authRequired, requireActiveSubscriptionAction, createWorkout);
router.put('/:id', authRequired, requireActiveSubscriptionAction, updateWorkout);
router.delete('/:id', authRequired, requireActiveSubscriptionAction, deleteWorkout);
router.post('/:id/send-email', authRequired, requireActiveSubscriptionAction, sendWorkoutByEmail);
router.get(
  '/:id/pdf',
  authRequired,
  requirePlanFeature('workout_pdf_export', {
    message: 'Exportacao de PDF esta disponivel a partir do plano Pro.'
  }),
  exportWorkoutPdf
);

export default router;
