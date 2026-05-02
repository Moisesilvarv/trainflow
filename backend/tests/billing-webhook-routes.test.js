import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { env } from '../src/config/env.js';

process.env.NODE_ENV = 'test';

const { app } = await import('../src/server.js');

let server;
let baseUrl;
let originalWebhookSecret;

test.before(async () => {
  originalWebhookSecret = env.stripeWebhookSecret;
  env.stripeWebhookSecret = 'whsec_test_route_alias';

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  env.stripeWebhookSecret = originalWebhookSecret;

  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function signStripePayload(rawBody) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', env.stripeWebhookSecret).update(payload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('rotas plural e singular do webhook Stripe usam o mesmo handler', async () => {
  const rawBody = JSON.stringify({
    type: 'trainflow.webhook.alias.smoke',
    data: { object: { id: 'evt_test_alias' } }
  });
  const signature = signStripePayload(rawBody);
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature
    },
    body: rawBody
  };

  const [officialResponse, aliasResponse] = await Promise.all([
    fetch(`${baseUrl}/api/billing/webhooks/stripe`, requestOptions),
    fetch(`${baseUrl}/api/billing/webhook/stripe`, requestOptions)
  ]);

  const officialData = await officialResponse.json();
  const aliasData = await aliasResponse.json();

  assert.equal(officialResponse.status, 200);
  assert.equal(aliasResponse.status, 200);
  assert.deepEqual(aliasData, officialData);
  assert.deepEqual(officialData, {
    received: true,
    ignored: true,
    reason: 'unsupported_event',
    type: 'trainflow.webhook.alias.smoke'
  });
});
