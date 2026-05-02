import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { DEFAULT_PLAN, PLAN_CATALOG, normalizePlanStatus, parsePlanId } from '../constants/plans.js';
import { sendPaymentConfirmedEmail } from './notificationService.js';
import { supabase } from './supabase.js';

const TRIAL_PERIOD_DAYS = 7;
const TRIAL_IP_LIMIT = 3;
const PIX_ACCESS_DAYS = 30;

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  const normalizedColumn = String(columnName || '').toLowerCase();
  return (
    message.includes(`column "${normalizedColumn}"`) && message.includes('does not exist')
  ) || message.includes(`could not find the '${normalizedColumn}' column`);
}

function stripUnsupportedTrialColumns(payload = {}, error) {
  const next = { ...payload };
  if (isMissingColumnError(error, 'trial_started_at')) delete next.trial_started_at;
  if (isMissingColumnError(error, 'trial_ends_at')) delete next.trial_ends_at;
  if (isMissingColumnError(error, 'provider')) delete next.provider;
  if (isMissingColumnError(error, 'updated_at')) delete next.updated_at;
  if (isMissingColumnError(error, 'payment_method')) delete next.payment_method;
  if (isMissingColumnError(error, 'expires_at')) delete next.expires_at;
  if (isMissingColumnError(error, 'external_checkout_session_id')) delete next.external_checkout_session_id;
  return next;
}

async function upsertSubscriptionRecord(payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase
      .from('subscriptions')
      .upsert(nextPayload, { onConflict: 'user_id,provider' });

    if (!result.error) return;

    const strippedPayload = stripUnsupportedTrialColumns(nextPayload, result.error);
    const changed = Object.keys(strippedPayload).length !== Object.keys(nextPayload).length;

    if (!changed) throw result.error;
    nextPayload = strippedPayload;
  }
}

async function updateAccessTable(table, userId, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase.from(table).update(nextPayload).eq('id', userId);

    if (!result.error) return;

    const strippedPayload = stripUnsupportedTrialColumns(nextPayload, result.error);
    const changed = Object.keys(strippedPayload).length !== Object.keys(nextPayload).length;

    if (!changed) throw result.error;
    nextPayload = strippedPayload;
  }
}

function normalizeStoredStatus(status) {
  return normalizePlanStatus(status || 'inactive');
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnlyOrNull(value) {
  const isoValue = toIsoDateOrNull(value);
  return isoValue ? isoValue.slice(0, 10) : null;
}

function toPlanAmountInCents(planId) {
  return Math.round(Number(PLAN_CATALOG[planId]?.price || 0) * 100);
}

function addDaysIso(days, baseDate = new Date()) {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizePaymentMethod(value) {
  const normalized = String(value || 'card').trim().toLowerCase();
  return normalized === 'pix' ? 'pix' : 'card';
}

export function getStripePriceIdForPlan(planId) {
  if (planId === 'basic') return env.stripeBasicPriceId;
  if (planId === 'pro') return env.stripeProPriceId;
  if (planId === 'premium') return env.stripePremiumPriceId;
  return '';
}

export function getPlanIdFromStripePriceId(priceId) {
  if (!priceId) return null;
  if (priceId === env.stripeBasicPriceId) return 'basic';
  if (priceId === env.stripeProPriceId) return 'pro';
  if (priceId === env.stripePremiumPriceId) return 'premium';
  return null;
}

export function getStripeCheckoutRedirectUrls() {
  return {
    successUrl: `${env.frontendUrl}${env.checkoutSuccessPath}`,
    cancelUrl: `${env.frontendUrl}${env.checkoutCancelPath}`
  };
}

function ensureStripeConfigured(planId) {
  if (!env.stripeSecretKey) {
    throw Object.assign(new Error('Checkout indisponivel. Configure STRIPE_SECRET_KEY.'), {
      status: 503,
      code: 'billing_not_configured'
    });
  }

  const priceId = getStripePriceIdForPlan(planId);
  if (!priceId) {
    throw Object.assign(new Error(`Checkout indisponivel. Configure o price do plano ${planId.toUpperCase()}.`), {
      status: 503,
      code: 'billing_price_missing'
    });
  }

  if (!priceId.startsWith('price_')) {
    throw Object.assign(new Error(`Checkout indisponivel. O plano ${planId.toUpperCase()} precisa usar um Stripe Price ID valido (price_...).`), {
      status: 503,
      code: 'billing_price_invalid'
    });
  }

  return priceId;
}

async function stripeRequest(path, payload, { method = 'POST', headers = {} } = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    },
    body: payload ? payload.toString() : undefined
  });

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(body || 'Falha ao comunicar com Stripe.'), { status: 502 });
  }

  return response.json();
}

async function getStripeSubscription(subscriptionId) {
  if (!subscriptionId) return null;
  return stripeRequest(`/v1/subscriptions/${subscriptionId}`, null, { method: 'GET' });
}

async function getBillingCustomerByUserId(userId) {
  const { data, error } = await supabase
    .from('billing_customers')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getBillingCustomerByExternalId(customerId) {
  const { data, error } = await supabase
    .from('billing_customers')
    .select('*')
    .eq('provider', 'stripe')
    .eq('external_customer_id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function hasTrialClaimByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const { data, error } = await supabase
    .from('trial_claims')
    .select('id')
    .eq('email_normalized', normalizedEmail)
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

async function countTrialClaimsByIp(ipAddress) {
  if (!ipAddress) return 0;

  const { count, error } = await supabase
    .from('trial_claims')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ipAddress);

  if (error) throw error;
  return Number(count || 0);
}

async function assertTrialEligibility({ user, ipAddress }) {
  if (await hasTrialClaimByEmail(user.email)) {
    throw Object.assign(new Error('Este email ja utilizou o teste gratis.'), {
      status: 409,
      code: 'trial_already_used_email'
    });
  }

  if (ipAddress) {
    const claimsFromIp = await countTrialClaimsByIp(ipAddress);
    if (claimsFromIp >= TRIAL_IP_LIMIT) {
      throw Object.assign(new Error('Muitas tentativas de teste gratis para esta conexao. Use um plano pago para continuar.'), {
        status: 429,
        code: 'trial_ip_limit_reached'
      });
    }
  }
}

async function recordTrialClaim({ userId, email, ipAddress, userAgent, trialStartedAt = null, trialEndsAt = null }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const { data: existing, error: selectError } = await supabase
    .from('trial_claims')
    .select('id')
    .eq('email_normalized', normalizedEmail)
    .limit(1);

  if (selectError) throw selectError;
  if (existing?.length) return;

  const { error } = await supabase.from('trial_claims').insert({
    user_id: userId,
    email_normalized: normalizedEmail,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt
  });

  if (error) throw error;
}

async function ensureBillingCustomer(user) {
  const existing = await getBillingCustomerByUserId(user.id);
  if (existing?.external_customer_id) return existing.external_customer_id;

  const payload = new URLSearchParams();
  payload.set('email', user.email);
  payload.set('name', user.name || user.email);
  payload.set('metadata[userId]', user.id);

  const customer = await stripeRequest('/v1/customers', payload);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('billing_customers')
    .upsert({
      user_id: user.id,
      provider: 'stripe',
      external_customer_id: customer.id,
      metadata: { email: user.email },
      updated_at: now
    }, { onConflict: 'user_id,provider' });

  if (error) throw error;
  return customer.id;
}

async function upsertCheckoutSessionRecord(userId, payload) {
  const now = new Date().toISOString();
  const selectedPlan = PLAN_CATALOG[payload.targetPlan];

  const { error } = await supabase.from('billing_checkout_sessions').upsert({
    user_id: userId,
    provider: 'stripe',
    target_plan: payload.targetPlan,
    external_session_id: payload.externalSessionId,
    external_customer_id: payload.externalCustomerId || null,
    external_subscription_id: payload.externalSubscriptionId || null,
    status: payload.status,
    checkout_url: payload.checkoutUrl || null,
    amount_total: selectedPlan?.price ?? null,
    currency: 'BRL',
    created_at: payload.createdAt || now,
    updated_at: now
  }, { onConflict: 'provider,external_session_id' });

  if (error) throw error;
}

async function getSubscriptionByExternalId(externalSubscriptionId) {
  if (!externalSubscriptionId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('provider', 'stripe')
    .eq('external_subscription_id', externalSubscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getStripeSubscriptionRecordByUserId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findUserFromStripePayload({
  stripeCustomerId,
  stripeSubscriptionId,
  metadataUserId
}) {
  if (metadataUserId) return metadataUserId;

  if (stripeSubscriptionId) {
    const subscription = await getSubscriptionByExternalId(stripeSubscriptionId);
    if (subscription?.user_id) return subscription.user_id;
  }

  if (stripeCustomerId) {
    const customer = await getBillingCustomerByExternalId(stripeCustomerId);
    if (customer?.user_id) return customer.user_id;
  }

  return null;
}

function inferPlanFromStripeObject(object) {
  const metadataPlan = parsePlanId(object?.metadata?.targetPlan);
  if (metadataPlan) return metadataPlan;

  const priceId = object?.items?.data?.[0]?.price?.id
    || object?.display_items?.[0]?.price?.id
    || object?.lines?.data?.[0]?.price?.id;

  return getPlanIdFromStripePriceId(priceId);
}

function mapSubscriptionStatus(stripeStatus, eventType) {
  if (eventType === 'invoice.payment_failed') return 'past_due';
  if (eventType === 'customer.subscription.deleted') return 'canceled';
  if (['active', 'trialing', 'past_due', 'incomplete'].includes(stripeStatus)) return stripeStatus;
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'canceled';
  return 'inactive';
}

async function recordRecurringPayment(userId, payload) {
  const now = new Date().toISOString();
  const { data: existing, error: selectError } = await supabase
    .from('recurring_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .eq('external_subscription_id', payload.externalSubscriptionId || '')
    .maybeSingle();

  if (selectError) throw selectError;

  const row = {
    user_id: userId,
    student_id: null,
    amount: payload.amount,
    status: payload.status,
    provider: 'stripe',
    external_id: payload.externalId || null,
    external_subscription_id: payload.externalSubscriptionId || null,
    next_due_date: payload.nextDueDate || null,
    updated_at: now
  };

  if (existing?.id) {
    const { error } = await supabase.from('recurring_payments').update(row).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('recurring_payments').insert({
    ...row,
    created_at: now
  });

  if (error) throw error;
}

export async function createCheckoutSessionForPlanUpgrade(user, planId, options = {}) {
  const parsedPlan = parsePlanId(planId);
  const trialRequested = Boolean(options?.trialRequested);
  const paymentMethod = normalizePaymentMethod(options?.paymentMethod);

  if (!parsedPlan || parsedPlan === 'trial') {
    throw Object.assign(new Error('Selecione um plano valido para assinatura.'), { status: 400 });
  }

  if (paymentMethod === 'pix') {
    throw Object.assign(new Error('Pix esta temporariamente indisponivel nesta conta Stripe. Use cartao recorrente por enquanto.'), {
      status: 400,
      code: 'pix_temporarily_unavailable'
    });
  }

  if (trialRequested) {
    // O teste gratis segue apenas no fluxo recorrente de cartao.
    if (paymentMethod !== 'card') {
      throw Object.assign(new Error('O teste gratis exige checkout com cartao recorrente.'), {
        status: 400,
        code: 'pix_trial_not_supported'
      });
    }
  }

  const existingStripeSubscription = await getStripeSubscriptionRecordByUserId(user.id);
  if (
    paymentMethod === 'pix'
    && existingStripeSubscription?.external_subscription_id
    && ['active', 'trialing', 'past_due', 'incomplete'].includes(String(existingStripeSubscription.status || '').toLowerCase())
  ) {
    throw Object.assign(new Error('Voce ja possui uma assinatura recorrente no cartao. Cancele a recorrencia antes de migrar para Pix mensal.'), {
      status: 409,
      code: 'active_card_subscription_exists'
    });
  }

  const priceId = paymentMethod === 'card' ? ensureStripeConfigured(parsedPlan) : null;
  const customerId = await ensureBillingCustomer(user);
  if (trialRequested) {
    await assertTrialEligibility({
      user,
      ipAddress: options?.ipAddress || null
    });
  }
  const payload = new URLSearchParams();
  const { successUrl, cancelUrl } = getStripeCheckoutRedirectUrls();

  payload.set('mode', paymentMethod === 'pix' ? 'payment' : 'subscription');
  payload.set('customer', customerId);
  payload.set('success_url', paymentMethod === 'pix' ? `${successUrl}?method=pix` : `${successUrl}?method=card`);
  payload.set('cancel_url', cancelUrl);
  payload.set('metadata[userId]', user.id);
  payload.set('metadata[targetPlan]', parsedPlan);
  payload.set('metadata[checkoutType]', paymentMethod === 'pix' ? 'pix' : (trialRequested ? 'trial' : 'paid'));
  payload.set('metadata[email]', normalizeEmail(user.email));
  payload.set('metadata[paymentMethod]', paymentMethod);
  payload.set('metadata[accessDays]', String(PIX_ACCESS_DAYS));
  payload.set('allow_promotion_codes', 'true');

  if (paymentMethod === 'pix') {
    payload.set('payment_method_types[0]', 'pix');
    payload.set('line_items[0][price_data][currency]', 'brl');
    payload.set('line_items[0][price_data][unit_amount]', String(toPlanAmountInCents(parsedPlan)));
    payload.set('line_items[0][price_data][product_data][name]', `TrainFlow ${PLAN_CATALOG[parsedPlan]?.name || parsedPlan}`);
    payload.set('line_items[0][price_data][product_data][description]', `Acesso mensal por ${PIX_ACCESS_DAYS} dias ao plano ${PLAN_CATALOG[parsedPlan]?.name || parsedPlan}.`);
    payload.set('line_items[0][quantity]', '1');
    payload.set('payment_intent_data[metadata][userId]', user.id);
    payload.set('payment_intent_data[metadata][targetPlan]', parsedPlan);
    payload.set('payment_intent_data[metadata][paymentMethod]', 'pix');
    payload.set('payment_intent_data[metadata][accessDays]', String(PIX_ACCESS_DAYS));
    payload.set('payment_intent_data[metadata][email]', normalizeEmail(user.email));
    payload.set('payment_method_collection', 'always');
  } else {
    payload.set('line_items[0][price]', priceId);
    payload.set('line_items[0][quantity]', '1');
    payload.set('subscription_data[metadata][userId]', user.id);
    payload.set('subscription_data[metadata][targetPlan]', parsedPlan);
    payload.set('subscription_data[metadata][checkoutType]', trialRequested ? 'trial' : 'paid');
    payload.set('subscription_data[metadata][email]', normalizeEmail(user.email));
    payload.set('subscription_data[metadata][paymentMethod]', 'card');
    payload.set('payment_method_collection', 'always');
  }

  if (trialRequested) {
    payload.set('subscription_data[trial_period_days]', String(TRIAL_PERIOD_DAYS));
    if (options?.ipAddress) payload.set('metadata[trialIpAddress]', options.ipAddress);
    if (options?.userAgent) payload.set('metadata[trialUserAgent]', String(options.userAgent).slice(0, 500));
  }

  const session = await stripeRequest('/v1/checkout/sessions', payload);

  await upsertCheckoutSessionRecord(user.id, {
    targetPlan: parsedPlan,
    externalSessionId: session.id,
    externalCustomerId: customerId,
    externalSubscriptionId: session.subscription || null,
    status: paymentMethod === 'pix'
      ? 'pix_checkout_open'
      : (trialRequested ? 'trial_checkout_open' : (session.status || 'open')),
    checkoutUrl: session.url,
    createdAt: new Date().toISOString()
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    provider: 'stripe',
    targetPlan: parsedPlan,
    trialRequested,
    paymentMethod
  };
}

export function verifyStripeWebhookSignature(rawBody, signatureHeader) {
  if (!env.stripeWebhookSecret) {
    throw Object.assign(new Error('Webhook indisponivel. Configure STRIPE_WEBHOOK_SECRET.'), { status: 503 });
  }

  const parts = String(signatureHeader || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const timestamp = parts.find((item) => item.startsWith('t='))?.slice(2);
  const signature = parts.find((item) => item.startsWith('v1='))?.slice(3);

  if (!timestamp || !signature) {
    throw Object.assign(new Error('Assinatura do webhook invalida.'), { status: 400 });
  }

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', env.stripeWebhookSecret).update(payload).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw Object.assign(new Error('Assinatura do webhook invalida.'), { status: 400 });
  }
}

export async function syncUserPlanFromSubscription(userId, payload) {
  const targetPlan = parsePlanId(payload?.targetPlan);
  if (!targetPlan) {
    throw Object.assign(new Error('Plano alvo invalido para sincronizacao.'), { status: 400 });
  }

  const status = normalizeStoredStatus(payload?.status || 'active');
  const now = new Date().toISOString();
  const existing = payload?.existingId
    ? { id: payload.existingId }
    : await getSubscriptionByExternalId(payload?.externalSubscriptionId);

  const subscriptionPayload = {
    user_id: userId,
    plan: targetPlan,
    status,
    provider: payload?.provider || 'stripe',
    payment_method: payload?.paymentMethod || null,
    trial_started_at: payload?.trialStartedAt || null,
    trial_ends_at: payload?.trialEndsAt || null,
    external_subscription_id: payload?.externalSubscriptionId || null,
    external_customer_id: payload?.externalCustomerId || null,
    external_checkout_session_id: payload?.externalCheckoutSessionId || null,
    expires_at: payload?.expiresAt || null,
    current_period_end: payload?.currentPeriodEnd || null,
    cancel_at_period_end: Boolean(payload?.cancelAtPeriodEnd),
    updated_at: now
  };

  if (!existing?.id) {
    subscriptionPayload.created_at = now;
    subscriptionPayload.started_at = payload?.startedAt || now;
  }

  await upsertSubscriptionRecord(subscriptionPayload);

  const userUpdate = {
    plan: targetPlan,
    plan_status: status,
    trial_started_at: payload?.trialStartedAt || null,
    trial_ends_at: payload?.trialEndsAt || null,
    provider: payload?.provider || 'stripe',
    updated_at: now
  };

  await updateAccessTable('users', userId, userUpdate);
  await updateAccessTable('coaches', userId, userUpdate);
}

async function markCheckoutCompleted(object) {
  await supabase
    .from('billing_checkout_sessions')
    .update({
      status: object.payment_status === 'paid' ? 'paid' : (object.status || 'complete'),
      external_customer_id: object.customer || null,
      external_subscription_id: object.subscription || null,
      updated_at: new Date().toISOString()
    })
    .eq('provider', 'stripe')
    .eq('external_session_id', object.id);
}

async function handleCheckoutCompleted(object) {
  const userId = await findUserFromStripePayload({
    stripeCustomerId: object?.customer,
    stripeSubscriptionId: object?.subscription,
    metadataUserId: object?.metadata?.userId
  });
  const targetPlan = parsePlanId(object?.metadata?.targetPlan) || inferPlanFromStripeObject(object);
  const checkoutType = String(object?.metadata?.checkoutType || '').trim().toLowerCase();
  const paymentMethod = normalizePaymentMethod(object?.metadata?.paymentMethod);

  if (!userId || !targetPlan) return { ignored: true, reason: 'metadata_missing' };

  await markCheckoutCompleted(object);

  if (paymentMethod === 'pix' || checkoutType === 'pix') {
    if (String(object?.payment_status || '').toLowerCase() !== 'paid') {
      return { ignored: true, reason: 'pix_payment_pending', type: 'checkout.session.completed' };
    }

    const startedAt = new Date().toISOString();
    const expiresAt = addDaysIso(Number(object?.metadata?.accessDays || PIX_ACCESS_DAYS));

    await syncUserPlanFromSubscription(userId, {
      targetPlan,
      status: 'active',
      provider: 'stripe',
      paymentMethod: 'pix',
      externalSubscriptionId: null,
      externalCustomerId: object.customer || null,
      externalCheckoutSessionId: object.id,
      startedAt,
      expiresAt,
      currentPeriodEnd: expiresAt,
      cancelAtPeriodEnd: false
    });

    await recordRecurringPayment(userId, {
      amount: Number(object?.amount_total || 0) / 100,
      status: 'paid',
      externalId: object?.payment_intent || object?.id || null,
      externalSubscriptionId: null,
      nextDueDate: toDateOnlyOrNull(expiresAt)
    });

    await sendPaymentConfirmedEmail({
      userId,
      payment: {
        id: object?.payment_intent || object?.id,
        amount: Number(object?.amount_total || 0) / 100,
        paymentMethod: 'pix',
        paid_at: startedAt,
        description: PLAN_CATALOG[targetPlan]?.name || targetPlan,
        plan: targetPlan
      },
      source: 'stripe_pix'
    }).catch(() => {});

    return { applied: true, type: 'checkout.session.completed', paymentMethod: 'pix' };
  }

  const stripeSubscription = object?.subscription ? await getStripeSubscription(object.subscription) : null;
  const nextStatus = checkoutType === 'trial'
    ? mapSubscriptionStatus(stripeSubscription?.status || 'trialing', 'checkout.session.completed')
    : 'active';

  await syncUserPlanFromSubscription(userId, {
    targetPlan,
    status: nextStatus,
    provider: 'stripe',
    paymentMethod: 'card',
    externalSubscriptionId: object.subscription || null,
    externalCustomerId: object.customer || null,
    externalCheckoutSessionId: object.id,
    startedAt: toIsoDateOrNull(stripeSubscription?.start_date) || new Date().toISOString(),
    trialStartedAt: toIsoDateOrNull(stripeSubscription?.trial_start),
    trialEndsAt: toIsoDateOrNull(stripeSubscription?.trial_end),
    currentPeriodEnd: toIsoDateOrNull(stripeSubscription?.current_period_end),
    cancelAtPeriodEnd: Boolean(stripeSubscription?.cancel_at_period_end)
  });

  if (checkoutType === 'trial') {
    const trialStartedAt = toIsoDateOrNull(stripeSubscription?.trial_start);
    const trialEndsAt = toIsoDateOrNull(stripeSubscription?.trial_end);
    await recordTrialClaim({
      userId,
      email: object?.customer_details?.email || object?.customer_email || object?.metadata?.email || null,
      ipAddress: object?.metadata?.trialIpAddress || null,
      userAgent: object?.metadata?.trialUserAgent || null,
      trialStartedAt,
      trialEndsAt
    });
  }

  return { applied: true, type: 'checkout.session.completed' };
}

async function handleCheckoutAsyncPaymentSucceeded(object) {
  const paymentMethod = normalizePaymentMethod(object?.metadata?.paymentMethod);
  if (paymentMethod !== 'pix') {
    return { ignored: true, reason: 'non_pix_async_event' };
  }

  return handleCheckoutCompleted({
    ...object,
    payment_status: 'paid'
  });
}

async function handleCheckoutAsyncPaymentFailed(object) {
  await supabase
    .from('billing_checkout_sessions')
    .update({
      status: 'payment_failed',
      updated_at: new Date().toISOString()
    })
    .eq('provider', 'stripe')
    .eq('external_session_id', object.id);

  return { applied: true, type: 'checkout.session.async_payment_failed' };
}

async function handleInvoicePaid(object) {
  const userId = await findUserFromStripePayload({
    stripeCustomerId: object?.customer,
    stripeSubscriptionId: object?.subscription
  });
  const existingSubscription = await getSubscriptionByExternalId(object?.subscription);
  const targetPlan = parsePlanId(existingSubscription?.plan)
    || inferPlanFromStripeObject(object)
    || DEFAULT_PLAN;

  if (!userId || !object?.subscription) return { ignored: true, reason: 'subscription_missing' };

  await syncUserPlanFromSubscription(userId, {
    targetPlan,
    status: 'active',
    provider: 'stripe',
    paymentMethod: existingSubscription?.payment_method || 'card',
    externalSubscriptionId: object.subscription,
    externalCustomerId: object.customer || null,
    externalCheckoutSessionId: existingSubscription?.external_checkout_session_id || null,
    expiresAt: existingSubscription?.expires_at || null,
    currentPeriodEnd: object?.lines?.data?.[0]?.period?.end || existingSubscription?.current_period_end,
    cancelAtPeriodEnd: Boolean(existingSubscription?.cancel_at_period_end)
  });

  await recordRecurringPayment(userId, {
    amount: Number(object?.amount_paid || 0) / 100,
    status: 'paid',
    externalId: object?.payment_intent || object?.id || null,
    externalSubscriptionId: object?.subscription,
    nextDueDate: toDateOnlyOrNull(object?.lines?.data?.[0]?.period?.end || existingSubscription?.current_period_end)
  });

  await sendPaymentConfirmedEmail({
    userId,
    payment: {
      id: object?.payment_intent || object?.id,
      amount: Number(object?.amount_paid || 0) / 100,
      paymentMethod: existingSubscription?.payment_method || 'card',
      paid_at: new Date().toISOString(),
      description: PLAN_CATALOG[targetPlan]?.name || targetPlan,
      plan: targetPlan
    },
    source: 'stripe_invoice'
  }).catch(() => {});

  return { applied: true, type: 'invoice.paid' };
}

async function handleInvoicePaymentFailed(object) {
  const userId = await findUserFromStripePayload({
    stripeCustomerId: object?.customer,
    stripeSubscriptionId: object?.subscription
  });
  const existingSubscription = await getSubscriptionByExternalId(object?.subscription);
  const targetPlan = parsePlanId(existingSubscription?.plan)
    || inferPlanFromStripeObject(object)
    || DEFAULT_PLAN;

  if (!userId || !object?.subscription) return { ignored: true, reason: 'subscription_missing' };

  await syncUserPlanFromSubscription(userId, {
    targetPlan,
    status: mapSubscriptionStatus(existingSubscription?.status, 'invoice.payment_failed'),
    provider: 'stripe',
    paymentMethod: existingSubscription?.payment_method || 'card',
    externalSubscriptionId: object.subscription,
    externalCustomerId: object.customer || null,
    externalCheckoutSessionId: existingSubscription?.external_checkout_session_id || null,
    expiresAt: existingSubscription?.expires_at || null,
    currentPeriodEnd: existingSubscription?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(existingSubscription?.cancel_at_period_end)
  });

  await recordRecurringPayment(userId, {
    amount: Number(object?.amount_due || 0) / 100,
    status: 'pending',
    externalId: object?.payment_intent || object?.id || null,
    externalSubscriptionId: object?.subscription,
    nextDueDate: toDateOnlyOrNull(object?.lines?.data?.[0]?.period?.end || existingSubscription?.current_period_end)
  });

  return { applied: true, type: 'invoice.payment_failed' };
}

async function handleSubscriptionStateChange(type, object) {
  const userId = await findUserFromStripePayload({
    stripeCustomerId: object?.customer,
    stripeSubscriptionId: object?.id,
    metadataUserId: object?.metadata?.userId
  });
  const targetPlan = type === 'customer.subscription.deleted'
    ? DEFAULT_PLAN
    : inferPlanFromStripeObject(object) || DEFAULT_PLAN;

  if (!userId) return { ignored: true, reason: 'customer_not_found' };

  await syncUserPlanFromSubscription(userId, {
    targetPlan,
    status: mapSubscriptionStatus(object?.status, type),
    provider: 'stripe',
    paymentMethod: object?.metadata?.paymentMethod || 'card',
    externalSubscriptionId: object?.id || null,
    externalCustomerId: object?.customer || null,
    trialStartedAt: toIsoDateOrNull(object?.trial_start),
    trialEndsAt: toIsoDateOrNull(object?.trial_end),
    expiresAt: null,
    currentPeriodEnd: toIsoDateOrNull(object?.current_period_end),
    cancelAtPeriodEnd: Boolean(object?.cancel_at_period_end)
  });

  if (object?.status === 'trialing') {
    await recordTrialClaim({
      userId,
      email: object?.metadata?.email || null,
      ipAddress: object?.metadata?.trialIpAddress || null,
      userAgent: object?.metadata?.trialUserAgent || null,
      trialStartedAt: toIsoDateOrNull(object?.trial_start),
      trialEndsAt: toIsoDateOrNull(object?.trial_end)
    });
  }

  await recordRecurringPayment(userId, {
    amount: Number(object?.items?.data?.[0]?.price?.unit_amount || 0) / 100,
    status: type === 'customer.subscription.deleted' ? 'canceled' : mapSubscriptionStatus(object?.status, type),
    externalId: object?.latest_invoice || object?.id || null,
    externalSubscriptionId: object?.id || null,
    nextDueDate: toDateOnlyOrNull(object?.current_period_end)
  });

  return { applied: true, type };
}

export async function handleStripeWebhookEvent(event) {
  const type = String(event?.type || '');
  const object = event?.data?.object;

  if (type === 'checkout.session.completed') {
    return handleCheckoutCompleted(object);
  }

  if (type === 'checkout.session.async_payment_succeeded') {
    return handleCheckoutAsyncPaymentSucceeded(object);
  }

  if (type === 'checkout.session.async_payment_failed') {
    return handleCheckoutAsyncPaymentFailed(object);
  }

  if (type === 'invoice.paid') {
    return handleInvoicePaid(object);
  }

  if (type === 'invoice.payment_failed') {
    return handleInvoicePaymentFailed(object);
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    return handleSubscriptionStateChange(type, object);
  }

  return { ignored: true, reason: 'unsupported_event', type };
}

export async function cancelUserSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (error) throw error;
  if (!data?.external_subscription_id) {
    throw Object.assign(new Error('Nenhuma assinatura Stripe ativa encontrada.'), { status: 404 });
  }

  const payload = new URLSearchParams();
  payload.set('cancel_at_period_end', 'true');
  await stripeRequest(`/v1/subscriptions/${data.external_subscription_id}`, payload);

  await syncUserPlanFromSubscription(userId, {
    targetPlan: data.plan,
    status: data.status,
    provider: 'stripe',
    externalSubscriptionId: data.external_subscription_id,
    externalCustomerId: data.external_customer_id,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: true
  });

  await recordRecurringPayment(userId, {
    amount: Number(PLAN_CATALOG[data.plan]?.price || 0),
    status: 'cancel_at_period_end',
    externalId: data.external_subscription_id,
    externalSubscriptionId: data.external_subscription_id,
    nextDueDate: toDateOnlyOrNull(data.current_period_end)
  });

  return { message: 'Cancelamento agendado para o fim do periodo atual.' };
}
