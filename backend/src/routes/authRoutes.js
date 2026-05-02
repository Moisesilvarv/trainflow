import { Router } from 'express';
import { changePassword, forgotPassword, login, logout, me, register, resendVerification, verifyEmail } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const authWriteLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de autenticacao. Aguarde alguns minutos para tentar novamente.'
});

router.post('/register', authWriteLimiter, register);
router.post('/login', authWriteLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authRequired, createRateLimiter({
  windowMs: 2 * 60 * 1000,
  max: 1,
  message: 'Aguarde 2 minutos antes de reenviar um novo email de verificacao.'
}), resendVerification);
router.post('/forgot-password', authWriteLimiter, forgotPassword);
router.post('/change-password', authRequired, changePassword);
router.post('/logout', authRequired, logout);
router.get('/me', authRequired, me);

export default router;
