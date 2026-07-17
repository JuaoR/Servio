import { createClient } from '@supabase/supabase-js';

let rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnkqqehpegqvzlsjrsqk.supabase.co';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo';

// Override if the environment variables are placeholders
if (!rawSupabaseUrl || rawSupabaseUrl.includes('seu-projeto') || rawSupabaseUrl.includes('placeholder')) {
  rawSupabaseUrl = 'https://jnkqqehpegqvzlsjrsqk.supabase.co';
}
if (!supabaseAnonKey || supabaseAnonKey.includes('sua-chave') || supabaseAnonKey.includes('placeholder')) {
  supabaseAnonKey = 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo';
}

// Exporting a dummy isMockSupabase as false to not break imports
export const isMockSupabase = false;

// Em desenvolvimento, usamos um proxy do Vite para contornar erros de CORS (Failed to fetch)
// que ocorrem porque a URL do Google AI Studio não está na lista de permitidos do Supabase do usuário.
const supabaseUrl = rawSupabaseUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
