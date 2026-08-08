import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jnkqqehpegqvzlsjrsqk.supabase.co', 'sb_publishable_niHK0sdVAOe_BjKmwvrkkw_VCUnbrWo');

async function test() {
  const { data: restaurants } = await supabase.from('restaurants').select('*');
  console.log('Restaurants:', restaurants);
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles);
}
test();
