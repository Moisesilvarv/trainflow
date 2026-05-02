import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let sentryEnabled = false;

export function initMonitoring() {
  if (!env.sentryDsn) {
    logger.warn('Sentry desabilitado: SENTRY_DSN nao configurado.');
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    tracesSampleRate: env.sentryTracesSampleRate
  });

  sentryEnabled = true;
  logger.info('Sentry inicializado.', {
    sentryEnvironment: env.sentryEnvironment
  });
}

export function captureException(error, context = {}) {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}

export function registerProcessHandlers() {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection.', {
      reason: reason instanceof Error ? reason.message : String(reason)
    });
    captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      source: 'unhandledRejection'
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception.', {
      errorName: error.name,
      errorMessage: error.message
    });
    captureException(error, { source: 'uncaughtException' });
  });
}
