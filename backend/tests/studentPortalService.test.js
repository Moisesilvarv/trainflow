import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePortalAccessState } from '../src/services/studentPortalService.js';

test('portal access marca expirado quando a data passou', () => {
  const state = evaluatePortalAccessState({
    isActive: true,
    revokedAt: null,
    expiresAt: '2026-01-01T00:00:00.000Z'
  }, new Date('2026-02-01T00:00:00.000Z'));

  assert.equal(state, 'expired');
});

test('portal access marca revogado antes de qualquer outro estado', () => {
  const state = evaluatePortalAccessState({
    isActive: true,
    revokedAt: '2026-02-10T10:00:00.000Z',
    expiresAt: '2026-03-01T00:00:00.000Z'
  }, new Date('2026-02-11T00:00:00.000Z'));

  assert.equal(state, 'revoked');
});

test('portal access ativo permanece ativo dentro da validade', () => {
  const state = evaluatePortalAccessState({
    isActive: true,
    revokedAt: null,
    expiresAt: '2026-12-01T00:00:00.000Z'
  }, new Date('2026-05-01T00:00:00.000Z'));

  assert.equal(state, 'active');
});
