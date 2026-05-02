import { env } from '../config/env.js';

function parseCookieHeader(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const separatorIndex = item.indexOf('=');
      if (separatorIndex <= 0) return acc;
      const key = item.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(item.slice(separatorIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

export function getCookie(req, key) {
  return parseCookieHeader(req?.headers?.cookie || '')[key] || '';
}

function buildCookieOptions(overrides = {}) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.authCookieSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(env.authCookieDomain ? { domain: env.authCookieDomain } : {}),
    ...overrides
  };
}

export function setAuthCookie(res, token) {
  res.cookie(env.authCookieName, token, buildCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(env.authCookieName, buildCookieOptions({ maxAge: 0 }));
}
