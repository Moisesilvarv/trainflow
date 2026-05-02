import axios from 'axios';
import { getApiBaseUrl } from '../config/runtimeEnv';
import { supabaseClient } from './supabaseClient';

let inMemoryToken = '';

function notifySubscriptionRequired(payload = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('trainflow:subscription-required', {
    detail: {
      featureKey: payload.feature || 'subscription_required',
      message: payload.message || 'Seu plano expirou. Faca upgrade para continuar.'
    }
  }));
}

const publicPathPrefixes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/plans',
  '/terms',
  '/privacy',
  '/contact',
  '/athlete'
];

function isPublicPath(pathname = '') {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return publicPathPrefixes.some((prefix) => prefix !== '/' && pathname.startsWith(prefix));
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true
});

export function setApiToken(token = '') {
  inMemoryToken = token;
}

const publicApiPathPrefixes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-email',
  '/student-portal/session'
];

function isPublicApiRequest(url = '') {
  const path = String(url || '');
  return publicApiPathPrefixes.some((prefix) => path.startsWith(prefix));
}

async function resolveAccessToken() {
  if (inMemoryToken) return inMemoryToken;

  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token || '';
  if (token) {
    inMemoryToken = token;
  }
  return token;
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const pathname = window.location.pathname || '/';
  if (!isPublicPath(pathname) && pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.request.use(async (config) => {
  if (isPublicApiRequest(config.url)) return config;

  const token = await resolveAccessToken();
  if (!token) {
    redirectToLogin();
    return Promise.reject(new axios.CanceledError('Sessao ausente.'));
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403 && error?.response?.data?.error === 'subscription_required') {
      notifySubscriptionRequired(error.response.data);
    }

    if (error?.response?.status === 401) {
      inMemoryToken = '';
      supabaseClient.auth.signOut().catch(() => {});
      const requestUrl = String(error?.config?.url || '');
      const pathname = window.location.pathname || '/';
      const isSessionCheck = requestUrl.includes('/auth/me');

      if (!isSessionCheck && !isPublicPath(pathname) && pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
