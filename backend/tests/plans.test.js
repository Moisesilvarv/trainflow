import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiMonthlyLimitByPlan, getStudentLimitByPlan, hasPlanFeature, normalizePlanId, parsePlanId } from '../src/constants/plans.js';

test('parse/normalize de planos legados', () => {
  assert.equal(parsePlanId('free'), 'basic');
  assert.equal(parsePlanId('professional'), 'pro');
  assert.equal(parsePlanId('advanced'), 'premium');
  assert.equal(normalizePlanId('invalid-plan'), 'basic');
});

test('limites de alunos por plano', () => {
  assert.equal(getStudentLimitByPlan('basic'), 20);
  assert.equal(getStudentLimitByPlan('pro'), 80);
  assert.equal(getStudentLimitByPlan('premium'), null);
  assert.equal(getAiMonthlyLimitByPlan('pro'), 30);
});

test('travas de features por plano', () => {
  assert.equal(hasPlanFeature('basic', 'pdf_export'), false);
  assert.equal(hasPlanFeature('pro', 'pdf_export'), true);
  assert.equal(hasPlanFeature('premium', 'smart_dashboard'), true);
  assert.equal(hasPlanFeature('pro', 'smart_dashboard'), false);
  assert.equal(hasPlanFeature('basic', 'ai_workout_suggestions'), false);
  assert.equal(hasPlanFeature('pro', 'ai_workout_suggestions'), true);
});
