const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  let pool;

  // Create connection pool
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  } else {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'dpis_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });
  }

  try {
    console.log('📊 Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Read and execute init.sql
    const initSqlPath = path.join(__dirname, '../config/init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    console.log('📝 Executing database initialization script...');
    
    // Split by semicolon and execute each statement
    const statements = initSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.code !== '42P07' && err.code !== '42710') {
            console.warn(`⚠️  Warning executing statement: ${err.message}`);
          }
        }
      }
    }

    console.log('✅ Database initialization completed');
    
    // Verify tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check if admin exists
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
    console.log(`\n👤 Admins in database: ${adminCheck.rows[0].count}`);

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Error details:', error);
    // Only exit if run directly, not when imported
    if (require.main === module) {
      process.exit(1);
    } else {
      // Re-throw so caller can handle it
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// If run directly via `node scripts/init-database.js`
if (require.main === module) {
  initializeDatabase().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

// Export for programmatic use (e.g. from server.js)
module.exports = initializeDatabase;
