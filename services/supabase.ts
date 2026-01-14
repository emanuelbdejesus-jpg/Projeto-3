
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jevfmuftvmdcsjdwdlti.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v10ePRQkeyMniGIDjuq54w_cEvI5DVz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
