
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iaugpxypjwkndboivbfv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wquTiLwBfbnO6AiJJuG9hA_Y7sbw0b3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
