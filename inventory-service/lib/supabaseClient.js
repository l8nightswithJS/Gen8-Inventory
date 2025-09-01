// inventory-service/lib/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// these env‑vars must be set in Render (or your env):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (or SUPABASE_ANON_KEY if you're OK with anon access)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
module.exports = supabase;
