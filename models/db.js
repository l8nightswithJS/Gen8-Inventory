// models/db.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Pull in your project URL + SERVICE‑ROLE key
const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing one of the required env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
}

// This client uses the secret service‑role key, so all inserts/updates/deletes
// (including Storage uploads) bypass RLS.
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
