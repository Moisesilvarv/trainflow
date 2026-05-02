import { env } from '../config/env.js';

function sanitizeMeta(meta = {}) {
  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined));
}

function write(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: env.nodeEnv,
    ...sanitizeMeta(meta)
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  }
};
