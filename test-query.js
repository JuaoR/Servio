import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jnkqqehpegqvzlsjrsqk.supabase.co', 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo');

async function test() {
  const { data, error } = await supabase.from('restaurants').select('*');
  console.log(data, error);
}
test();
