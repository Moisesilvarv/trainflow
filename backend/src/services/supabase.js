import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  logger.warn('Supabase credentials ausentes. Configure backend/.env para funcionamento completo.');
}

export const supabase = createClient(env.supabaseUrl || '', env.supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseAuth = createClient(env.supabaseUrl || '', env.supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
