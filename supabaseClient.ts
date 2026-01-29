import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Add to .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // From Dashboard > Settings > API

export const supabase = createClient(supabaseUrl, supabaseAnonKey);