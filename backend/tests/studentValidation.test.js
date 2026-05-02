import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudentPayload } from '../src/controllers/studentController.js';

test('normalizeStudentPayload rejeita letras em peso e altura', () => {
  assert.throws(
    () => normalizeStudentPayload({ name: 'Aluno Teste', weight: 'S' }, { requireName: true }),
    /Peso deve ser numerico/
  );

  assert.throws(
    () => normalizeStudentPayload({ name: 'Aluno Teste', height: 'R' }, { requireName: true }),
    /Altura deve ser numerico/
  );
});

test('normalizeStudentPayload rejeita letras em telefone e email invalido', () => {
  assert.throws(
    () => normalizeStudentPayload({ name: 'Aluno Teste', phone: 'abc999' }, { requireName: true }),
    /Telefone deve conter apenas numeros/
  );

  assert.throws(
    () => normalizeStudentPayload({ name: 'Aluno Teste', email: 'F' }, { requireName: true }),
    /Email invalido/
  );
});

test('normalizeStudentPayload aceita numeros decimais e telefone formatado', () => {
  const payload = normalizeStudentPayload({
    name: 'aluno teste',
    weight: '75,5',
    height: '175',
    phone: '(11) 99999-9999',
    email: 'aluno@teste.com',
    avatar_url: 'data:image/png;base64,abc'
  }, { requireName: true });

  assert.equal(payload.name, 'Aluno Teste');
  assert.equal(payload.weight, 75.5);
  assert.equal(payload.height, 175);
  assert.equal(payload.phone, '(11) 99999-9999');
  assert.equal(payload.email, 'aluno@teste.com');
  assert.equal(payload.avatar_url, 'data:image/png;base64,abc');
});
