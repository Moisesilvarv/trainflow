import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

const { app } = await import('../src/server.js');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('health responde ok', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.status, 'ok');
});

test('rota antiga de troca direta de plano nao existe mais', async () => {
  const response = await fetch(`${baseUrl}/api/auth/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'premium' })
  });

  assert.equal(response.status, 404);
});

test('verify-email exige token e responde 400 sem 404', async () => {
  const response = await fetch(`${baseUrl}/api/auth/verify-email`);
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(String(data.message || ''), /token/i);
});

test('resend-verification exige autenticacao', async () => {
  const response = await fetch(`${baseUrl}/api/auth/resend-verification`, {
    method: 'POST'
  });

  assert.equal(response.status, 401);
});
