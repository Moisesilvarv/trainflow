import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';

const requestBuckets = new Map();

const redis = env.upstashRedisRestUrl && env.upstashRedisRestToken
  ? new Redis({
      url: env.upstashRedisRestUrl,
      token: env.upstashRedisRestToken
    })
  : null;

function getLimiterKey(req) {
  const identity = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  return `${env.rateLimitPrefix}:${req.path}:${identity}`;
}

async function consumeSharedToken(key, windowMs) {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }

  return current;
}

function consumeMemoryToken(key, windowMs) {
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || now > current.resetAt) {
    requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }

  current.count += 1;
  requestBuckets.set(key, current);
  return current.count;
}

export function createRateLimiter({
  windowMs = env.rateLimitWindowMs,
  max = env.rateLimitMax,
  message = 'Muitas tentativas. Tente novamente em instantes.'
} = {}) {
  return async (req, res, next) => {
    try {
      const key = getLimiterKey(req);
      const attempts = redis
        ? await consumeSharedToken(key, windowMs)
        : consumeMemoryToken(key, windowMs);

      if (attempts > max) {
        return res.status(429).json({ message });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
