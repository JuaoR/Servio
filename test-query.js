import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jnkqqehpegqvzlsjrsqk.supabase.co', 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo');

async function test() {
  const { data: ins, error: errIns } = await supabase.from('waiters').insert([{
    name: 'Teste Waiter'
  }]).select();
  console.log('Insert waiter minimal:', ins, errIns);
}
test();
