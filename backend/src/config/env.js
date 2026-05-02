import dotenv from 'dotenv';

dotenv.config();

const resolvedNodeEnv = process.env.NODE_ENV || 'development';
const isProduction = resolvedNodeEnv === 'production';
const resolvedJwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-local-jwt-secret');

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

function isLocalhostOrigin(value) {
  const origin = normalizeOrigin(value).toLowerCase();
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

const resolvedFrontendUrl = normalizeOrigin(process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173');
const rawAppUrls = process.env.APP_URLS || (isProduction ? resolvedFrontendUrl : `${resolvedFrontendUrl},http://localhost:5174`);
const resolvedAppUrls = Array.from(new Set(
  rawAppUrls
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
));

export const env = {
  port: process.env.PORT || 4002,
  nodeEnv: resolvedNodeEnv,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  jwtSecret: resolvedJwtSecret,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeBasicPriceId: process.env.STRIPE_BASIC_PRICE_ID || process.env.STRIPE_PRICE_BASIC || '',
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_PRO || '',
  stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM || '',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || '',
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  rateLimitPrefix: process.env.RATE_LIMIT_PREFIX || 'trainflow:ratelimit',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 30),
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || resolvedNodeEnv,
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  checkoutSuccessPath: process.env.CHECKOUT_SUCCESS_PATH || '/billing/success',
  checkoutCancelPath: process.env.CHECKOUT_CANCEL_PATH || '/billing/cancel',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'trainflow_token',
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || '',
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true' || isProduction,
  portalTokenTtlHours: Number(process.env.PORTAL_TOKEN_TTL_HOURS || 168),
  emailProvider: process.env.EMAIL_PROVIDER || 'disabled',
  emailFrom: process.env.EMAIL_FROM || '',
  emailFromName: process.env.EMAIL_FROM_NAME || 'TrainFlow',
  emailFromEmail: process.env.EMAIL_FROM_EMAIL || '',
  emailReplyTo: process.env.EMAIL_REPLY_TO || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',
  frontendUrl: resolvedFrontendUrl,
  appUrl: resolvedFrontendUrl,
  appUrls: resolvedAppUrls,
  passwordResetPath: process.env.PASSWORD_RESET_PATH || '/reset-password'
};

if (isProduction) {
  const missing = [];

  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (!env.jwtSecret || env.jwtSecret === 'changeme' || env.jwtSecret.length < 32) {
    missing.push('JWT_SECRET (forte, com pelo menos 32 caracteres e diferente de "changeme")');
  }
  if (!env.frontendUrl) missing.push('FRONTEND_URL');
  if (!env.appUrls.length) missing.push('APP_URLS');
  if (isLocalhostOrigin(env.frontendUrl) || env.appUrls.some(isLocalhostOrigin)) {
    missing.push('FRONTEND_URL/APP_URLS com dominios finais de producao, sem localhost');
  }
  if (!env.stripeSecretKey) missing.push('STRIPE_SECRET_KEY');
  if (!env.stripeWebhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!env.stripeBasicPriceId) missing.push('STRIPE_BASIC_PRICE_ID');
  if (!env.stripeProPriceId) missing.push('STRIPE_PRO_PRICE_ID');
  if (!env.stripePremiumPriceId) missing.push('STRIPE_PREMIUM_PRICE_ID');
  if (!env.upstashRedisRestUrl) missing.push('UPSTASH_REDIS_REST_URL');
  if (!env.upstashRedisRestToken) missing.push('UPSTASH_REDIS_REST_TOKEN');
  if (!env.cronSecret || env.cronSecret.length < 24) missing.push('CRON_SECRET (forte, com pelo menos 24 caracteres)');

  if (missing.length) {
    throw new Error(`Configuracao invalida para producao. Ajuste: ${missing.join(', ')}`);
  }
}
