import { createClient } from '@supabase/supabase-js';
import { getSupabaseRuntimeConfig } from '../config/runtimeEnv';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseRuntimeConfig();

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
