import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('seu-projeto') || supabaseUrl.includes('placeholder')) {
  throw new Error('Supabase URL configuration is missing or invalid. Please check VITE_SUPABASE_URL in your environment variables.');
}

if (!supabaseAnonKey || supabaseAnonKey.includes('sua-chave') || supabaseAnonKey.includes('placeholder')) {
  throw new Error('Supabase Anon Key configuration is missing or invalid. Please check VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const isMockSupabase = false;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
