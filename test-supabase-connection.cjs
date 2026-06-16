// Test Supabase connection and session
// Run: node test-supabase-connection.cjs

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hqszihvjqscrwdzrwbyg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  
  // Check session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  console.log('Session Status:');
  if (sessionError) {
    console.log('❌ Error getting session:', sessionError.message);
  } else if (sessionData.session) {
    console.log('✅ Session found');
    console.log('   User:', sessionData.session.user.email);
    console.log('   Token:', sessionData.session.access_token.substring(0, 20) + '...');
    console.log('   Expires:', new Date(sessionData.session.expires_at * 1000).toLocaleString());
    
    // Test user creation
    console.log('\n🧪 Testing create-user edge function...');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123',
          full_name: 'Test User',
          role: 'retail'
        }),
      });
      
      const result = await response.json();
      console.log('   Response:', response.status, response.statusText);
      console.log('   Result:', result);
    } catch (e) {
      console.log('   Error:', e.message);
    }
  } else {
    console.log('❌ No active session - user is not logged in');
  }
  
  // Check user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log('\nUser Status:');
  if (userError) {
    console.log('❌ Error:', userError.message);
  } else if (userData.user) {
    console.log('✅ User authenticated:', userData.user.email);
  } else {
    console.log('❌ No authenticated user');
  }
}

testConnection();
