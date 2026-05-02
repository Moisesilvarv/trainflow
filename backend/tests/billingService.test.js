import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import {
  cancelUserSubscription,
  createCheckoutSessionForPlanUpgrade,
  getPlanIdFromStripePriceId,
  getStripeCheckoutRedirectUrls,
  getStripePriceIdForPlan,
  handleStripeWebhookEvent
} from '../src/services/billingService.js';
import { supabase } from '../src/services/supabase.js';

const originalFetch = global.fetch;
const originalFrom = supabase.from.bind(supabase);
const originalEnv = {
  stripeSecretKey: env.stripeSecretKey,
  stripeWebhookSecret: env.stripeWebhookSecret,
  stripeBasicPriceId: env.stripeBasicPriceId,
  stripeProPriceId: env.stripeProPriceId,
  stripePremiumPriceId: env.stripePremiumPriceId,
  frontendUrl: env.frontendUrl,
  checkoutSuccessPath: env.checkoutSuccessPath,
  checkoutCancelPath: env.checkoutCancelPath
};

function setStripeEnv() {
  env.stripeSecretKey = 'sk_test_real_like';
  env.stripeWebhookSecret = 'whsec_test_real_like';
  env.stripeBasicPriceId = 'price_basic_real';
  env.stripeProPriceId = 'price_pro_real';
  env.stripePremiumPriceId = 'price_premium_real';
  env.frontendUrl = 'http://localhost:5173';
  env.checkoutSuccessPath = '/billing/success';
  env.checkoutCancelPath = '/billing/cancel';
}

function restoreTestState() {
  env.stripeSecretKey = originalEnv.stripeSecretKey;
  env.stripeWebhookSecret = originalEnv.stripeWebhookSecret;
  env.stripeBasicPriceId = originalEnv.stripeBasicPriceId;
  env.stripeProPriceId = originalEnv.stripeProPriceId;
  env.stripePremiumPriceId = originalEnv.stripePremiumPriceId;
  env.frontendUrl = originalEnv.frontendUrl;
  env.checkoutSuccessPath = originalEnv.checkoutSuccessPath;
  env.checkoutCancelPath = originalEnv.checkoutCancelPath;
  supabase.from = originalFrom;
  global.fetch = originalFetch;
}

test.afterEach(() => {
  restoreTestState();
});

test('mapeia plans e urls de checkout a partir do env', () => {
  setStripeEnv();

  assert.equal(getStripePriceIdForPlan('basic'), 'price_basic_real');
  assert.equal(getStripePriceIdForPlan('pro'), 'price_pro_real');
  assert.equal(getStripePriceIdForPlan('premium'), 'price_premium_real');
  assert.equal(getPlanIdFromStripePriceId('price_pro_real'), 'pro');

  const urls = getStripeCheckoutRedirectUrls();
  assert.deepEqual(urls, {
    successUrl: 'http://localhost:5173/billing/success',
    cancelUrl: 'http://localhost:5173/billing/cancel'
  });
});

test('checkout cria sessao Stripe recorrente e grava billing_checkout_sessions', async () => {
  setStripeEnv();
  const fetchCalls = [];
  const records = {
    customerUpsert: null,
    checkoutSessionUpsert: null
  };

  global.fetch = async (url, options) => {
    fetchCalls.push({ url, body: options.body });

    if (url.endsWith('/v1/customers')) {
      return {
        ok: true,
        async json() {
          return { id: 'cus_123' };
        }
      };
    }

    if (url.endsWith('/v1/checkout/sessions')) {
      return {
        ok: true,
        async json() {
          return {
            id: 'cs_123',
            url: 'https://checkout.stripe.com/c/pay/cs_123',
            status: 'open'
          };
        }
      };
    }

    throw new Error(`Unexpected Stripe request: ${url}`);
  };

  supabase.from = (table) => {
    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null })
      };
    }

    if (table === 'billing_customers') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async (payload) => {
          records.customerUpsert = payload;
          return { error: null };
        }
      };
    }

    if (table === 'billing_checkout_sessions') {
      return {
        upsert: async (payload) => {
          records.checkoutSessionUpsert = payload;
          return { error: null };
        }
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await createCheckoutSessionForPlanUpgrade({
    id: 'user_1',
    email: 'coach@trainflow.com',
    name: 'Coach One'
  }, 'pro');

  assert.equal(result.provider, 'stripe');
  assert.equal(result.targetPlan, 'pro');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_123');
  assert.equal(records.customerUpsert.external_customer_id, 'cus_123');
  assert.equal(records.checkoutSessionUpsert.target_plan, 'pro');
  assert.equal(records.checkoutSessionUpsert.external_customer_id, 'cus_123');
  assert.match(fetchCalls[1].body, /line_items%5B0%5D%5Bprice%5D=price_pro_real/);
  assert.match(fetchCalls[1].body, /success_url=http%3A%2F%2Flocalhost%3A5173%2Fbilling%2Fsuccess%3Fmethod%3Dcard/);
});

test('checkout trial consulta trial_claims por email_normalized', async () => {
  setStripeEnv();
  const trialClaimFilters = [];

  global.fetch = async (url) => {
    if (url.endsWith('/v1/customers')) {
      return {
        ok: true,
        async json() {
          return { id: 'cus_trial_123' };
        }
      };
    }

    if (url.endsWith('/v1/checkout/sessions')) {
      return {
        ok: true,
        async json() {
          return {
            id: 'cs_trial_123',
            url: 'https://checkout.stripe.com/c/pay/cs_trial_123',
            status: 'open'
          };
        }
      };
    }

    throw new Error(`Unexpected Stripe request: ${url}`);
  };

  supabase.from = (table) => {
    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null })
      };
    }

    if (table === 'billing_customers') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async () => ({ error: null })
      };
    }

    if (table === 'trial_claims') {
      const query = {
        select() { return query; },
        eq(column, value) {
          trialClaimFilters.push({ column, value });
          return query;
        },
        limit: async () => ({ data: [], error: null }),
        then(resolve, reject) {
          return Promise.resolve({ count: 0, error: null }).then(resolve, reject);
        }
      };
      return query;
    }

    if (table === 'billing_checkout_sessions') {
      return {
        upsert: async () => ({ error: null })
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await createCheckoutSessionForPlanUpgrade({
    id: 'user_trial_1',
    email: 'trial@trainflow.com',
    name: 'Trial Coach'
  }, 'pro', {
    trialRequested: true,
    ipAddress: '127.0.0.1'
  });

  assert.equal(result.trialRequested, true);
  assert.deepEqual(trialClaimFilters, [
    { column: 'email_normalized', value: 'trial@trainflow.com' },
    { column: 'ip_address', value: '127.0.0.1' }
  ]);
});

test('webhook checkout.session.completed ativa o plano correto', async () => {
  setStripeEnv();
  const records = {
    checkoutUpdate: null,
    subscriptionUpsert: null,
    usersUpdate: null,
    coachesUpdate: null
  };

  global.fetch = async (url) => {
    if (url.endsWith('/v1/subscriptions/sub_live_1')) {
      return {
        ok: true,
        async json() {
          return {
            id: 'sub_live_1',
            status: 'active',
            start_date: 1761972000,
            current_period_end: 1764564000,
            cancel_at_period_end: false
          };
        }
      };
    }

    throw new Error(`Unexpected Stripe request: ${url}`);
  };

  supabase.from = (table) => {
    if (table === 'billing_checkout_sessions') {
      return {
        update(payload) {
          records.checkoutUpdate = payload;
          return {
            eq() {
              return {
                eq: async () => ({ error: null })
              };
            }
          };
        }
      };
    }

    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async (payload) => {
          records.subscriptionUpsert = payload;
          return { error: null };
        }
      };
    }

    if (table === 'users' || table === 'coaches') {
      return {
        update(payload) {
          if (table === 'users') records.usersUpdate = payload;
          if (table === 'coaches') records.coachesUpdate = payload;
          return {
            eq: async () => ({ error: null })
          };
        }
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await handleStripeWebhookEvent({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_live_1',
        customer: 'cus_live_1',
        subscription: 'sub_live_1',
        status: 'complete',
        metadata: {
          userId: 'user_1',
          targetPlan: 'premium'
        }
      }
    }
  });

  assert.equal(result.applied, true);
  assert.equal(records.subscriptionUpsert.plan, 'premium');
  assert.equal(records.subscriptionUpsert.status, 'active');
  assert.equal(records.subscriptionUpsert.external_subscription_id, 'sub_live_1');
  assert.equal(records.checkoutUpdate.external_customer_id, 'cus_live_1');
  assert.equal(records.usersUpdate.plan, 'premium');
  assert.equal(records.coachesUpdate.plan, 'premium');
});

test('webhook trial registra trial_claims com email_normalized', async () => {
  setStripeEnv();
  const records = {
    checkoutUpdate: null,
    subscriptionUpsert: null,
    trialClaimInsert: null,
    usersUpdate: null,
    coachesUpdate: null
  };

  global.fetch = async (url) => {
    if (url.endsWith('/v1/subscriptions/sub_trial_1')) {
      return {
        ok: true,
        async json() {
          return {
            id: 'sub_trial_1',
            status: 'trialing',
            start_date: 1761972000,
            trial_start: 1761972000,
            trial_end: 1762576800,
            current_period_end: 1762576800,
            cancel_at_period_end: false
          };
        }
      };
    }

    throw new Error(`Unexpected Stripe request: ${url}`);
  };

  supabase.from = (table) => {
    if (table === 'billing_checkout_sessions') {
      return {
        update(payload) {
          records.checkoutUpdate = payload;
          return {
            eq() {
              return {
                eq: async () => ({ error: null })
              };
            }
          };
        }
      };
    }

    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async (payload) => {
          records.subscriptionUpsert = payload;
          return { error: null };
        }
      };
    }

    if (table === 'users' || table === 'coaches') {
      return {
        update(payload) {
          if (table === 'users') records.usersUpdate = payload;
          if (table === 'coaches') records.coachesUpdate = payload;
          return {
            eq: async () => ({ error: null })
          };
        }
      };
    }

    if (table === 'trial_claims') {
      const query = {
        select() { return query; },
        eq() { return query; },
        limit: async () => ({ data: [], error: null }),
        then(resolve, reject) {
          return Promise.resolve({ count: 0, error: null }).then(resolve, reject);
        },
        insert: async (payload) => {
          records.trialClaimInsert = payload;
          return { error: null };
        }
      };
      return query;
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await handleStripeWebhookEvent({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_trial_live_1',
        customer: 'cus_trial_live_1',
        subscription: 'sub_trial_1',
        status: 'complete',
        customer_email: 'trial@trainflow.com',
        metadata: {
          userId: 'user_trial_1',
          targetPlan: 'pro',
          checkoutType: 'trial',
          email: 'trial@trainflow.com',
          paymentMethod: 'card',
          trialIpAddress: '127.0.0.1',
          trialUserAgent: 'test-agent'
        }
      }
    }
  });

  assert.equal(result.applied, true);
  assert.equal(records.subscriptionUpsert.status, 'trialing');
  assert.equal(records.trialClaimInsert.email_normalized, 'trial@trainflow.com');
  assert.equal(records.trialClaimInsert.ip_address, '127.0.0.1');
  assert.equal(records.trialClaimInsert.user_agent, 'test-agent');
  assert.ok(records.trialClaimInsert.trial_started_at);
  assert.ok(records.trialClaimInsert.trial_ends_at);
});

test('webhook invoice.payment_failed marca assinatura em atraso e cobranca pendente', async () => {
  setStripeEnv();
  const records = {
    subscriptionUpsert: null,
    recurringInsert: null,
    usersUpdate: null,
    coachesUpdate: null
  };
  const existingSubscription = {
    user_id: 'user_2',
    plan: 'pro',
    status: 'active',
    external_subscription_id: 'sub_due_1',
    current_period_end: '2026-05-30T00:00:00.000Z',
    cancel_at_period_end: false
  };

  supabase.from = (table) => {
    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: existingSubscription, error: null }),
        upsert: async (payload) => {
          records.subscriptionUpsert = payload;
          return { error: null };
        }
      };
    }

    if (table === 'users' || table === 'coaches') {
      return {
        update(payload) {
          if (table === 'users') records.usersUpdate = payload;
          if (table === 'coaches') records.coachesUpdate = payload;
          return {
            eq: async () => ({ error: null })
          };
        }
      };
    }

    if (table === 'recurring_payments') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        insert: async (payload) => {
          records.recurringInsert = payload;
          return { error: null };
        }
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await handleStripeWebhookEvent({
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_due_1',
        customer: 'cus_due_1',
        subscription: 'sub_due_1',
        amount_due: 3990,
        payment_intent: 'pi_due_1'
      }
    }
  });

  assert.equal(result.applied, true);
  assert.equal(records.subscriptionUpsert.plan, 'pro');
  assert.equal(records.subscriptionUpsert.status, 'past_due');
  assert.equal(records.usersUpdate.plan_status, 'past_due');
  assert.equal(records.coachesUpdate.plan_status, 'past_due');
  assert.equal(records.recurringInsert.status, 'pending');
  assert.equal(records.recurringInsert.amount, 39.9);
  assert.equal(records.recurringInsert.external_subscription_id, 'sub_due_1');
});

test('cancelamento agenda cancel_at_period_end e impede troca manual oculta', async () => {
  setStripeEnv();
  const records = {
    subscriptionUpsert: null,
    recurringInsert: null,
    usersUpdate: null,
    coachesUpdate: null
  };
  const existingSubscription = {
    user_id: 'user_3',
    plan: 'premium',
    status: 'active',
    provider: 'stripe',
    external_subscription_id: 'sub_cancel_1',
    external_customer_id: 'cus_cancel_1',
    current_period_end: '2026-05-31T00:00:00.000Z'
  };

  global.fetch = async (url) => {
    assert.match(url, /\/v1\/subscriptions\/sub_cancel_1$/);
    return {
      ok: true,
      async json() {
        return { id: 'sub_cancel_1' };
      }
    };
  };

  supabase.from = (table) => {
    if (table === 'subscriptions') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: existingSubscription, error: null }),
        upsert: async (payload) => {
          records.subscriptionUpsert = payload;
          return { error: null };
        }
      };
    }

    if (table === 'users' || table === 'coaches') {
      return {
        update(payload) {
          if (table === 'users') records.usersUpdate = payload;
          if (table === 'coaches') records.coachesUpdate = payload;
          return {
            eq: async () => ({ error: null })
          };
        }
      };
    }

    if (table === 'recurring_payments') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        insert: async (payload) => {
          records.recurringInsert = payload;
          return { error: null };
        }
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  };

  const result = await cancelUserSubscription('user_3');

  assert.match(result.message, /Cancelamento agendado/);
  assert.equal(records.subscriptionUpsert.cancel_at_period_end, true);
  assert.equal(records.usersUpdate.plan_status, 'active');
  assert.equal(records.coachesUpdate.plan_status, 'active');
  assert.equal(records.recurringInsert.status, 'cancel_at_period_end');
  assert.equal(records.recurringInsert.external_subscription_id, 'sub_cancel_1');
});
