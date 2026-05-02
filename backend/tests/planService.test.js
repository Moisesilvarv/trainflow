import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlanAccessState } from '../src/services/planService.js';

test('resolvePlanAccessState libera acesso durante trial Pro valido', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'pro',
      status: 'trialing',
      provider: 'system',
      trial_started_at: '2026-04-20T10:00:00.000Z',
      trial_ends_at: '2026-05-02T10:00:00.000Z'
    },
    now: new Date('2026-04-29T10:00:00.000Z')
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.planStatus, 'trialing');
  assert.equal(result.appAccess, true);
  assert.equal(result.accessReason, 'trial_active');
  assert.equal(result.trialDaysRemaining, 3);
});

test('resolvePlanAccessState bloqueia acesso quando o trial Pro expirou', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'pro',
      status: 'trialing',
      provider: 'system',
      trial_started_at: '2026-04-20T10:00:00.000Z',
      trial_ends_at: '2026-04-28T09:00:00.000Z'
    },
    now: new Date('2026-04-29T10:00:00.000Z')
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.planStatus, 'expired');
  assert.equal(result.appAccess, false);
  assert.equal(result.accessReason, 'trial_expired');
});

test('resolvePlanAccessState prioriza assinatura paga ativa sobre trial antigo', () => {
  const result = resolvePlanAccessState({
    userProfile: {
      plan: 'pro',
      plan_status: 'trialing',
      provider: 'system',
      trial_started_at: '2026-04-20T10:00:00.000Z',
      trial_ends_at: '2026-05-02T10:00:00.000Z'
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      provider: 'stripe'
    },
    now: new Date('2026-04-29T10:00:00.000Z')
  });

  assert.equal(result.plan, 'premium');
  assert.equal(result.planStatus, 'active');
  assert.equal(result.appAccess, true);
  assert.equal(result.accessReason, 'active_subscription');
});

test('resolvePlanAccessState libera perfil legado ativo sem assinatura para evitar sessao presa', () => {
  const result = resolvePlanAccessState({
    userProfile: {
      plan: 'premium',
      plan_status: 'active',
      provider: 'stripe'
    },
    now: new Date('2026-04-29T10:00:00.000Z')
  });

  assert.equal(result.plan, 'premium');
  assert.equal(result.planStatus, 'active');
  assert.equal(result.appAccess, true);
  assert.equal(result.accessReason, 'active_profile');
});

test('resolvePlanAccessState libera trial valido no perfil sem subscription persistida', () => {
  const result = resolvePlanAccessState({
    userProfile: {
      plan: 'pro',
      plan_status: 'trialing',
      provider: 'system',
      trial_started_at: '2026-04-20T10:00:00.000Z',
      trial_ends_at: '2026-05-02T10:00:00.000Z'
    },
    now: new Date('2026-04-29T10:00:00.000Z')
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.planStatus, 'trialing');
  assert.equal(result.appAccess, true);
  assert.equal(result.accessReason, 'trial_active');
});

test('resolvePlanAccessState libera basic_free para recursos basicos', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'basic_free',
      status: 'free',
      provider: 'system'
    },
    now: new Date('2026-05-01T10:00:00.000Z')
  });

  assert.equal(result.plan, 'basic_free');
  assert.equal(result.planStatus, 'active');
  assert.equal(result.appAccess, true);
  assert.equal(result.accessReason, 'basic_free');
});

test('resolvePlanAccessState mantem trial expirado bloqueado sem fallback gratuito', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'pro',
      status: 'trialing',
      provider: 'system',
      trial_started_at: '2026-04-20T10:00:00.000Z',
      trial_ends_at: '2026-04-28T09:00:00.000Z'
    },
    now: new Date('2026-05-01T10:00:00.000Z')
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.planStatus, 'expired');
  assert.equal(result.appAccess, false);
  assert.equal(result.accessReason, 'trial_expired');
});

test('resolvePlanAccessState trata pending_email com datas nulas sem expirar trial', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'pro',
      status: 'pending_email',
      subscription_status: 'pending_email',
      provider: 'system',
      trial_started_at: null,
      trial_ends_at: null
    },
    now: new Date('2026-05-01T10:00:00.000Z')
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.planStatus, 'pending_email');
  assert.equal(result.appAccess, false);
  assert.equal(result.accessReason, 'email_pending');
  assert.equal(result.trialEndsAt, null);
});

test('resolvePlanAccessState nao considera trialing com trial_ends_at nulo como expirado', () => {
  const result = resolvePlanAccessState({
    subscription: {
      plan: 'pro',
      status: 'trialing',
      provider: 'system',
      trial_started_at: null,
      trial_ends_at: null
    },
    now: new Date('2026-05-01T10:00:00.000Z')
  });

  assert.notEqual(result.planStatus, 'expired');
  assert.notEqual(result.accessReason, 'trial_expired');
});
