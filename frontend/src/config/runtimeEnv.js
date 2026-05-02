function readEnv(key) {
  return String(import.meta.env[key] || '').trim();
}

function requiredEnv(key, message) {
  const value = readEnv(key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function normalizeApiBaseUrl(url) {
  const trimmedUrl = String(url || '').trim().replace(/\/+$/, '');
  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
}

export function getApiBaseUrl() {
  const configuredApiUrl = readEnv('VITE_API_URL');

  if (configuredApiUrl) {
    return normalizeApiBaseUrl(configuredApiUrl);
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_API_URL nao configurada. Defina a URL publica do backend antes do deploy.');
  }

  return normalizeApiBaseUrl('http://localhost:4002');
}

export function getSupabaseRuntimeConfig() {
  return {
    url: requiredEnv(
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_URL nao configurada. Defina a URL do projeto Supabase para o frontend.'
    ),
    anonKey: requiredEnv(
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_ANON_KEY nao configurada. Defina a chave anon do Supabase para o frontend.'
    )
  };
}
