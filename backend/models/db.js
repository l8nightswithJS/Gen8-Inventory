// models/db.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Use the service role key on the server side so you bypass any RLS
const SUPABASE_URL           = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Disable session persistence on the backend
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

module.exports = supabase
