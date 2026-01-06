/**
 * Check Database Connection
 * 
 * This script helps verify your Render database connection string format.
 * Run this to test different connection string formats.
 */

const { Pool } = require('pg');

// Try different connection string formats
const connectionStrings = [
  // Original format (might be incomplete)
  'postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a/dpis_db',
  
  // With common Render domain suffixes (try these if original doesn't work)
  'postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a.oregon-postgres.render.com/dpis_db',
  'postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a.render.com/dpis_db',
];

async function testConnection(url, index) {
  console.log(`\n🔍 Testing connection ${index + 1}:`);
  console.log(`   ${url.replace(/:[^:@]+@/, ':****@')}`);
  
  const pool = new Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query('SELECT NOW(), version()');
    console.log(`   ✅ SUCCESS! Connected to database`);
    console.log(`   📅 Server time: ${result.rows[0].now}`);
    console.log(`   🗄️  PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    await pool.end();
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🔌 Testing Render PostgreSQL connection strings...\n');
  console.log('💡 If all fail, check Render Dashboard:');
  console.log('   1. Go to your PostgreSQL database');
  console.log('   2. Click "Connect" or "Info" tab');
  console.log('   3. Copy the "Internal Database URL" or "External Connection String"');
  console.log('   4. Make sure database is not paused (click "Resume" if paused)\n');

  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(connectionStrings[i], i);
    if (success) {
      console.log(`\n✅ Working connection string found!`);
      console.log(`\nUse this in your DATABASE_URL:`);
      console.log(connectionStrings[i]);
      return;
    }
  }

  console.log('\n❌ None of the connection strings worked.');
  console.log('\n📋 Next steps:');
  console.log('   1. Go to Render Dashboard → Your PostgreSQL Database');
  console.log('   2. Check if database status shows "Paused" - if so, click "Resume"');
  console.log('   3. Click "Connect" or "Info" tab');
  console.log('   4. Copy the full connection string (should include .render.com domain)');
  console.log('   5. Update DATABASE_URL in Render environment variables');
  console.log('   6. Update the connection string in backend/init-render-db.js');
}

main().catch(console.error);
