const { Pool } = require('pg');
require('dotenv').config();

// Use Render database if DATABASE_URL is set
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  pool = require('../config/database');
}

const migrateResources = async () => {
  try {
    console.log('🔄 Migrating resources table for personalization...');

    // Add new columns for test-based matching
    await pool.query(`
      ALTER TABLE resources 
      ADD COLUMN IF NOT EXISTS test_types TEXT[],
      ADD COLUMN IF NOT EXISTS severity_levels TEXT[],
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
    `);

    // Add index for faster filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_test_types 
      ON resources USING GIN(test_types);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_severity_levels 
      ON resources USING GIN(severity_levels);
    `);

    console.log('✅ Resources table migrated successfully');
    await pool.end();
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateResources();
