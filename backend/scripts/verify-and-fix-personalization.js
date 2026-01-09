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

const verifyAndFix = async () => {
  try {
    console.log('🔍 Checking personalization setup...');

    // Check if columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    console.log('📊 Existing columns:', existingColumns);

    if (existingColumns.length < 3) {
      console.log('⚠️ Missing columns detected. Running migration...');
      
      // Add missing columns
      await pool.query(`
        ALTER TABLE resources 
        ADD COLUMN IF NOT EXISTS test_types TEXT[],
        ADD COLUMN IF NOT EXISTS severity_levels TEXT[],
        ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
      `);

      // Add indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_resources_test_types 
        ON resources USING GIN(test_types);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_resources_severity_levels 
        ON resources USING GIN(severity_levels);
      `);

      console.log('✅ Migration completed');
    } else {
      console.log('✅ All personalization columns exist');
    }

    // Check if resources have personalization data
    const resourceCheck = await pool.query(`
      SELECT COUNT(*) as count FROM resources 
      WHERE test_types IS NOT NULL 
      AND array_length(test_types, 1) > 0
    `);
    
    const personalizedCount = parseInt(resourceCheck.rows[0].count);
    console.log(`📚 Personalized resources in database: ${personalizedCount}`);

    if (personalizedCount === 0) {
      console.log('⚠️ No personalized resources found. Run seed script:');
      console.log('   node backend/scripts/seed-personalized-resources.js');
    }

    // Check test results
    const testResultsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM screening_results
    `);
    console.log(`🧪 Total test results in database: ${testResultsCheck.rows[0].count}`);

    await pool.end();
    console.log('✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyAndFix();
