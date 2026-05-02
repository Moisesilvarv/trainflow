import { env } from '../config/env.js';

export function cronSecretRequired(req, res, next) {
  const header = String(req.headers.authorization || '').trim();
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!env.cronSecret) {
    return res.status(503).json({
      error: 'cron_not_configured',
      message: 'CRON_SECRET nao configurado.'
    });
  }

  if (!token || token !== env.cronSecret) {
    return res.status(401).json({
      error: 'invalid_cron_secret',
      message: 'Autorizacao do cron invalida.'
    });
  }

  return next();
}
