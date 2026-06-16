// Run this to check your Supabase connection health
// Usage: node check-supabase-health.cjs

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hqszihvjqscrwdzrwbyg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
  console.log('🔍 Checking Supabase connection health...\n');
  
  const tests = [
    { name: 'Products', table: 'products', select: 'id, name', limit: 1 },
    { name: 'Orders', table: 'orders', select: 'id, total_amount', limit: 1 },
    { name: 'Profiles', table: 'profiles', select: 'id, email', limit: 1 },
    { name: 'Notifications', table: 'notifications', select: 'id, title', limit: 1 },
    { name: 'Chat Messages', table: 'chat_messages', select: 'id, message', limit: 1 },
  ];

  for (const test of tests) {
    const start = Date.now();
    try {
      const { data, error } = await supabase
        .from(test.table)
        .select(test.select)
        .limit(test.limit);
      
      const duration = Date.now() - start;
      
      if (error) {
        console.log(`❌ ${test.name}: ERROR (${duration}ms)`);
        console.log(`   ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: OK (${duration}ms) - ${data.length} rows`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: FAILED - ${err.message}`);
    }
  }
  
  console.log('\n💡 If any table shows ERROR, check:');
  console.log('   1. Have you run the SQL optimization scripts?');
  console.log('   2. Is your anon key correct?');
  console.log('   3. Check Supabase Dashboard → Database → Logs for errors');
}

checkHealth();
