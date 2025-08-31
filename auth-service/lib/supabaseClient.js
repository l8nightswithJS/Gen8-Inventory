// auth-service/lib/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Z2xod2ppZ2h4Y2Zvdnp4d2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDA2MDksImV4cCI6MjA2ODE3NjYwOX0.8LRdWhklWo8sdGqKJ3bPnVK1_Nlb52zhJS8aVHxE0Ac'; // <- NEW
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

// Use anon client strictly for user auth flows
const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Use admin client strictly for privileged DB ops (bypasses RLS)
const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = { sbAuth, sbAdmin };
