import {
  cancelUserSubscription,
  createCheckoutSessionForPlanUpgrade,
  handleStripeWebhookEvent,
  verifyStripeWebhookSignature
} from '../services/billingService.js';
import { ensureObjectPayload, toTrimmedString } from '../utils/payloadValidation.js';

function parseOptionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return false;
  if (String(value).trim().toLowerCase() === 'true') return true;
  if (String(value).trim().toLowerCase() === 'false') return false;
  throw Object.assign(new Error('trialRequested deve ser true ou false.'), { status: 400 });
}

function getRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || '';
}

export async function createCheckoutSession(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    const plan = toTrimmedString(payload.plan, { fieldLabel: 'Plano', required: true, maxLength: 32 });
    const trialRequested = parseOptionalBoolean(payload.trialRequested ?? false);
    const paymentMethod = toTrimmedString(payload.paymentMethod ?? 'card', { fieldLabel: 'Forma de pagamento', required: true, maxLength: 16 }).toLowerCase();
    const session = await createCheckoutSessionForPlanUpgrade(req.user, plan, {
      trialRequested,
      paymentMethod,
      ipAddress: getRequestIp(req),
      userAgent: req.headers['user-agent'] || ''
    });
    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const result = await cancelUserSubscription(req.user.id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function stripeWebhook(req, res, next) {
  try {
    verifyStripeWebhookSignature(req.body, req.headers['stripe-signature']);
    const event = JSON.parse(req.body.toString('utf8'));
    const result = await handleStripeWebhookEvent(event);
    return res.json({ received: true, ...result });
  } catch (error) {
    return next(error);
  }
}
