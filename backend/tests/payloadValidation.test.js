import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAllowedKeys,
  ensureObjectPayload,
  toDateString,
  toDateTimeString,
  toEnum,
  toNullableNumber,
  toRequiredNumber,
  toTrimmedString,
  toUrl
} from '../src/utils/payloadValidation.js';

test('ensureObjectPayload valida payload nao objeto', () => {
  assert.throws(() => ensureObjectPayload(null));
  assert.throws(() => ensureObjectPayload([]));
  assert.doesNotThrow(() => ensureObjectPayload({ ok: true }));
});

test('assertAllowedKeys bloqueia campos desconhecidos', () => {
  assert.doesNotThrow(() => assertAllowedKeys({ a: 1 }, ['a']));
  assert.throws(() => assertAllowedKeys({ a: 1, b: 2 }, ['a']));
});

test('toTrimmedString aplica required e maxLength', () => {
  assert.equal(toTrimmedString('  valor  ', { required: true }), 'valor');
  assert.equal(toTrimmedString('', { required: false, emptyAsNull: true }), null);
  assert.throws(() => toTrimmedString('', { required: true, fieldLabel: 'Nome' }));
});

test('validadores numericos e enum', () => {
  assert.equal(toNullableNumber('10,5', { min: 0, max: 20 }), 10.5);
  assert.equal(toRequiredNumber('1', { min: 0 }), 1);
  assert.equal(toEnum('ACTIVE', ['active', 'inactive']), 'active');
  assert.throws(() => toRequiredNumber('', { fieldLabel: 'Valor' }));
  assert.throws(() => toEnum('x', ['a', 'b'], { fieldLabel: 'Status' }));
});

test('validadores de data e url', () => {
  assert.equal(toDateString('2026-04-27', { required: true }), '2026-04-27');
  assert.match(toDateTimeString('2026-04-27T10:30:00.000Z'), /2026-04-27T10:30:00/);
  assert.equal(toUrl('https://example.com/video.mp4'), 'https://example.com/video.mp4');
  assert.throws(() => toDateString('27/04/2026', { required: true }));
  assert.throws(() => toUrl('ftp://example.com'));
});
