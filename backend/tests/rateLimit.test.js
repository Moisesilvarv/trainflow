import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

function createMockReq() {
  return { ip: '127.0.0.1', path: '/api/auth/login' };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('createRateLimiter limita acima do maximo', async () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  const req = createMockReq();
  const res = createMockRes();

  let nextCalls = 0;
  const next = () => {
    nextCalls += 1;
  };

  await limiter(req, res, next);
  await limiter(req, res, next);
  await limiter(req, res, next);

  assert.equal(nextCalls, 2);
  assert.equal(res.statusCode, 429);
  assert.ok(res.body?.message);
});
