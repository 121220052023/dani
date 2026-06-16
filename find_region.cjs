const { Client } = require('pg');

const regions = [
  'us-east-1', 'us-west-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'eu-west-3', 'ap-southeast-1', 'ap-northeast-1', 'ap-southeast-2',
  'ap-northeast-2', 'ap-south-1', 'sa-east-1', 'ca-central-1'
];

async function findRegion() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Trying ${host}...`);
    const client = new Client({
      connectionString: `postgresql://postgres.hqszihvjqscrwdzrwbyg:pcIvyksJ4KHVLxav@${host}:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    });
    try {
      // Connect timeout
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`SUCCESS! Region is ${region}`);
      const res = await client.query('SELECT 1 as val');
      console.log('Query result:', res.rows);
      await client.end();
      return region;
    } catch (err) {
      console.log(`Failed for ${region}:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }
}

findRegion();
