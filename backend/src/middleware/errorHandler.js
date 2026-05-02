import { env } from '../config/env.js';
import { captureException } from '../services/monitoring.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const requestId = req.headers['x-request-id'] || null;

  logger.error('Request failed.', {
    status,
    path: req.path,
    method: req.method,
    requestId,
    errorName: err?.name,
    errorMessage: err?.message
  });
  captureException(err, {
    path: req.path,
    method: req.method,
    status,
    requestId
  });

  if (env.nodeEnv !== 'production') {
    return res.status(status).json({
      message: err?.message || 'Erro interno no servidor.'
    });
  }

  const safeMessage = status >= 500 ? 'Erro interno no servidor.' : err?.message || 'Nao foi possivel processar a requisicao.';
  return res.status(status).json({ message: safeMessage });
}
