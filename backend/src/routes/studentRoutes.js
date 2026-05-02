import { Router } from 'express';
import { createStudent, deleteStudent, getStudentById, listStudents, updateStudent } from '../controllers/studentController.js';
import { authRequired } from '../middleware/auth.js';
import { requireActiveSubscriptionAction } from '../middleware/subscriptionAction.js';

const router = Router();

router.get('/', authRequired, listStudents);
router.post('/', authRequired, requireActiveSubscriptionAction, createStudent);
router.get('/:id', authRequired, getStudentById);
router.put('/:id', authRequired, requireActiveSubscriptionAction, updateStudent);
router.delete('/:id', authRequired, requireActiveSubscriptionAction, deleteStudent);

export default router;
