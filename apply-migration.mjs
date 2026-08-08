// Script para aplicar a migration do audit_fixes diretamente via API REST do Supabase
// Execute: node apply-migration.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://jnkqqehpegqvzlsjrsqk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo';

// Para aplicar migrations via DDL precisamos do service role key
// Mas podemos testar conectividade com anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnectivity() {
  console.log('Testando conectividade com Supabase...');
  const { data, error } = await supabase.from('restaurants').select('count').limit(1);
  if (error) {
    console.error('Erro ao conectar:', error.message);
  } else {
    console.log('Conectado com sucesso ao Supabase!');
  }
}

testConnectivity();
