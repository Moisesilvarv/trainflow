import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { requirePlanFeature } from '../middleware/planFeature.js';
import { getAdvancedReport, getStudentHistory } from '../controllers/reportsController.js';

const router = Router();

router.get('/advanced', authRequired, requirePlanFeature('monthly_reports', {
  message: 'Relatorios avancados estao disponiveis a partir do plano Pro.'
}), getAdvancedReport);

router.get('/history/:studentId', authRequired, requirePlanFeature('evolution_history', {
  message: 'Historico avancado esta disponivel a partir do plano Pro.'
}), getStudentHistory);

export default router;
