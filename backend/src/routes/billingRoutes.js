import express, { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { cancelSubscription, createCheckoutSession, stripeWebhook } from '../controllers/billingController.js';

const router = Router();
const checkoutLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: 'Muitas tentativas de checkout. Aguarde alguns minutos.'
});
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Webhook temporariamente limitado.'
});

export const stripeWebhookHandler = [webhookLimiter, express.raw({ type: 'application/json' }), stripeWebhook];

router.post('/checkout', authRequired, checkoutLimiter, createCheckoutSession);
router.post('/subscription/cancel', authRequired, createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: 'Muitas tentativas de cancelamento. Aguarde alguns minutos.'
}), cancelSubscription);

export default router;
