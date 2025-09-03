// testAuth.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } =
  process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing one or more Supabase env variables.');
  process.exit(1);
}

const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const email = 'testuser@example.com';
  const password = 'TestPass123!';

  console.log('🔎 Using Supabase URL:', SUPABASE_URL);

  // Step 1: Try registering (ignore error if already exists)
  console.log('➡️  Signing up user...');
  const { data: signupData, error: signupError } = await sbAnon.auth.signUp({
    email,
    password,
  });

  if (signupError) {
    console.warn(
      '⚠️ Sign-up error (might already exist):',
      signupError.message,
    );
  } else {
    console.log('✅ Sign-up response:', signupData);
  }

  // Step 2: Try logging in
  console.log('➡️  Logging in user...');
  const { data: loginData, error: loginError } =
    await sbAnon.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    console.error('❌ Login error:', loginError.message);
  } else {
    console.log('✅ Login succeeded. Got session token:');
    console.log(loginData.session?.access_token?.slice(0, 30) + '...');
  }

  // Step 3: Check your custom "users" table via admin client
  console.log('➡️  Checking users table...');
  const { data: users, error: tableError } = await sbAdmin
    .from('users')
    .select('*');

  if (tableError) {
    console.error('❌ Error reading users table:', tableError.message);
  } else {
    console.log(`✅ Found ${users.length} user rows in "users" table.`);
  }
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err);
});
