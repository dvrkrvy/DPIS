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

const setupPersonalizedResources = async () => {
  try {
    console.log('🔧 Setting up personalized resources...\n');

    // Step 1: Check and add columns
    console.log('📋 Step 1: Checking database columns...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
    `);
    
    const hasColumns = columnCheck.rows.length === 3;
    
    if (!hasColumns) {
      console.log('⚠️ Personalization columns missing. Adding them...');
      await pool.query(`
        ALTER TABLE resources 
        ADD COLUMN IF NOT EXISTS test_types TEXT[],
        ADD COLUMN IF NOT EXISTS severity_levels TEXT[],
        ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_resources_test_types 
        ON resources USING GIN(test_types);
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_resources_severity_levels 
        ON resources USING GIN(severity_levels);
      `);
      
      console.log('✅ Columns added successfully\n');
    } else {
      console.log('✅ Personalization columns already exist\n');
    }

    // Step 2: Check if resources have personalization data
    console.log('📋 Step 2: Checking for personalized resources...');
    const resourceCheck = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN test_types IS NOT NULL AND array_length(test_types, 1) > 0 THEN 1 END) as personalized
      FROM resources 
      WHERE is_active = true
    `);
    
    const total = parseInt(resourceCheck.rows[0].total);
    const personalized = parseInt(resourceCheck.rows[0].personalized);
    
    console.log(`📊 Total active resources: ${total}`);
    console.log(`📊 Resources with personalization: ${personalized}`);
    
    if (personalized === 0) {
      console.log('\n⚠️ No personalized resources found!');
      console.log('📝 To add personalized resources, run:');
      console.log('   node scripts/seed-personalized-resources.js\n');
    } else {
      console.log('✅ Personalized resources found\n');
    }

    // Step 3: Check test results
    console.log('📋 Step 3: Checking test results...');
    const testCheck = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as users_with_tests,
             COUNT(*) as total_tests
      FROM screening_results
    `);
    
    console.log(`📊 Users with test results: ${testCheck.rows[0].users_with_tests}`);
    console.log(`📊 Total test results: ${testCheck.rows[0].total_tests}\n`);

    // Step 4: Sample matching check
    if (personalized > 0) {
      console.log('📋 Step 4: Testing resource matching...');
      const sampleTest = await pool.query(`
        SELECT test_type, severity, COUNT(*) as count
        FROM screening_results
        GROUP BY test_type, severity
        ORDER BY count DESC
        LIMIT 3
      `);
      
      if (sampleTest.rows.length > 0) {
        console.log('📊 Sample test results:');
        sampleTest.rows.forEach(row => {
          console.log(`   - ${row.test_type}: ${row.severity} (${row.count} results)`);
        });
        
        // Check if resources match
        const matchCheck = await pool.query(`
          SELECT COUNT(*) as count
          FROM resources
          WHERE is_active = true
          AND test_types IS NOT NULL
          AND array_length(test_types, 1) > 0
          AND ($1 = ANY(test_types) AND $2 = ANY(severity_levels))
        `, [sampleTest.rows[0].test_type, sampleTest.rows[0].severity]);
        
        console.log(`\n📊 Matching resources for ${sampleTest.rows[0].test_type}:${sampleTest.rows[0].severity}: ${matchCheck.rows[0].count}`);
      }
    }

    console.log('\n✅ Setup check complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
};

setupPersonalizedResources();
