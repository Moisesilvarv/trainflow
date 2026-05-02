import { supabase } from './supabase.js';

export async function checkDatabaseHealth() {
  const startedAt = Date.now();

  if (!supabase) {
    return {
      ok: false,
      latencyMs: 0,
      error: 'Cliente Supabase indisponivel.'
    };
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        skipped: true
      };
    }

    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error.message
    };
  }
}
