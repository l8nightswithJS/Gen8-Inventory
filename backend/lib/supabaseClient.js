import { createClient } from '@supabase/supabase-js';

// These environment variables should be defined in your front‑end .env:
// REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);