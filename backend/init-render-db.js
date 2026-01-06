/**
 * Initialize Render PostgreSQL Database
 * 
 * Run this script from your local machine to initialize the Render database.
 * 
 * Usage:
 *   1. Set DATABASE_URL environment variable:
 *      Windows PowerShell:
 *        $env:DATABASE_URL="postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a/dpis_db"
 *        node init-render-db.js
 * 
 *      Windows CMD:
 *        set DATABASE_URL=postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a/dpis_db
 *        node init-render-db.js
 * 
 *      Or create a .env file in the root directory with:
 *        DATABASE_URL=postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a/dpis_db
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a.oregon-postgres.render.com/dpis_db';

async function initializeDatabase() {
  console.log('🔌 Connecting to Render PostgreSQL database...');
  console.log(`📍 Using: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Render Postgres
    },
    connectionTimeoutMillis: 10000, // 10 second timeout
  });

  try {
    // Test connection
    console.log('📊 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Read init.sql (script is in backend folder)
    const initSqlPath = path.join(__dirname, 'config', 'init.sql');
    if (!fs.existsSync(initSqlPath)) {
      throw new Error(`Cannot find init.sql at ${initSqlPath}`);
    }

    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    console.log('📝 Reading database initialization script...\n');

    // Split SQL into individual statements
    // Execute the entire SQL file as one transaction-like block
    // This ensures foreign keys and dependencies are created in correct order
    console.log('📝 Executing database initialization script...\n');
    
    // Remove comments and clean up
    let cleanSql = initSql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .trim();
    
    // Split by semicolon, but keep multi-line statements together
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0) continue;

      try {
        await pool.query(statement);
        successCount++;
        // Show progress for important statements
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('INSERT INTO')) {
          const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i) || 
                            statement.match(/INSERT INTO (\w+)/i);
          if (tableMatch) {
            console.log(`✅ ${tableMatch[1]}`);
          }
        }
      } catch (err) {
        // Ignore "already exists" errors (42P07 = table, 42710 = object)
        if (err.code === '42P07' || err.code === '42710' || err.message.includes('already exists')) {
          skipCount++;
          // Still show what was skipped
          const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i) || 
                            statement.match(/INSERT INTO (\w+)/i);
          if (tableMatch) {
            console.log(`⏭️  ${tableMatch[1]} (already exists)`);
          }
        } else {
          errorCount++;
          console.error(`❌ Error executing statement ${i + 1}:`, err.message);
          // Don't stop on errors, continue with other statements
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully executed: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }

    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n📋 Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check admin account
    try {
      const adminResult = await pool.query('SELECT COUNT(*) as count FROM admins');
      console.log(`\n👤 Admin accounts: ${adminResult.rows[0].count}`);
      if (adminResult.rows[0].count > 0) {
        const adminInfo = await pool.query('SELECT email, name FROM admins LIMIT 1');
        console.log(`   Default admin: ${adminInfo.rows[0].email} (${adminInfo.rows[0].name})`);
        console.log(`   ⚠️  Default password: admin123 - CHANGE THIS IN PRODUCTION!`);
      }
    } catch (err) {
      console.log(`\n⚠️  Could not check admin accounts: ${err.message}`);
    }

    console.log('\n✅ Database initialization completed successfully!');
    console.log('🚀 Your backend should now work properly.\n');

  } catch (error) {
    console.error('\n❌ Database initialization failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. Database might be paused (Render free tier pauses after inactivity)');
      console.error('   2. Go to Render Dashboard → Your Database → Resume');
      console.error('   3. Wait a minute for it to start, then try again');
    } else if (error.code === 'ENOTFOUND' || error.message.includes('could not translate host name')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. Database hostname might be incorrect');
      console.error('   2. Check your DATABASE_URL in Render Dashboard');
      console.error('   3. Make sure database is not paused');
    } else if (error.code === '28P01' || error.message.includes('password authentication failed')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. Database password might be incorrect');
      console.error('   2. Check your DATABASE_URL in Render Dashboard');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
