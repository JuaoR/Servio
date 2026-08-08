import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jnkqqehpegqvzlsjrsqk.supabase.co', 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo');
async function test() {
  const res = await supabase.rpc('execute_sql', { sql: 'CREATE TABLE IF NOT EXISTS test_table (id uuid)' });
  console.log(res);
}
test();
