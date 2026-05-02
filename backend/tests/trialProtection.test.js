import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmailForTrial,
  normalizeFingerprint,
  resolveTrialAccessDecision
} from '../src/services/trialProtection.js';

test('normalizeEmailForTrial normaliza email para comparacao consistente', () => {
  assert.equal(normalizeEmailForTrial('  Teste+1@Email.com '), 'teste+1@email.com');
});

test('normalizeFingerprint limita tamanho e remove valores vazios', () => {
  assert.equal(normalizeFingerprint(''), null);
  assert.equal(normalizeFingerprint(' abc '), 'abc');
  assert.equal(normalizeFingerprint('x'.repeat(300)).length, 255);
});

test('resolveTrialAccessDecision libera trial para usuario elegivel', () => {
  const result = resolveTrialAccessDecision({
    trialRequested: true,
    existingEmailClaim: false,
    existingFingerprintClaim: false,
    recentIpClaimCount: 1
  });

  assert.equal(result.grantTrial, true);
  assert.equal(result.planId, 'pro');
  assert.equal(result.profileStatus, 'trialing');
  assert.equal(result.subscriptionStatus, 'trialing');
  assert.equal(result.blockedReason, null);
});

test('resolveTrialAccessDecision bloqueia novo trial para email ja usado', () => {
  const result = resolveTrialAccessDecision({
    trialRequested: true,
    existingEmailClaim: true
  });

  assert.equal(result.grantTrial, false);
  assert.equal(result.planId, 'pro');
  assert.equal(result.profileStatus, 'expired');
  assert.equal(result.subscriptionStatus, 'expired');
  assert.equal(result.blockedReason, 'email_already_claimed');
});

test('resolveTrialAccessDecision bloqueia novo trial para fingerprint ja usado', () => {
  const result = resolveTrialAccessDecision({
    trialRequested: true,
    existingFingerprintClaim: true
  });

  assert.equal(result.grantTrial, false);
  assert.equal(result.blockedReason, 'fingerprint_already_claimed');
});

test('resolveTrialAccessDecision bloqueia abuso por muitos trials no mesmo IP', () => {
  const result = resolveTrialAccessDecision({
    trialRequested: true,
    recentIpClaimCount: 3
  });

  assert.equal(result.grantTrial, false);
  assert.equal(result.blockedReason, 'ip_rate_limited');
});
