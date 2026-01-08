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

const checkResourcesSetup = async () => {
  try {
    console.log('🔍 Checking resources table setup...\n');

    // Check if resources table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'resources'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Resources table does not exist!');
      console.log('💡 Run the database initialization script first.');
      await pool.end();
      return;
    }
    console.log('✅ Resources table exists');

    // Check for personalization columns
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
      ORDER BY column_name
    `);

    const existingColumns = columnCheck.rows.map(r => r.column_name);
    const requiredColumns = ['test_types', 'severity_levels', 'priority'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing personalization columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n💡 Run the migration script:');
      console.log('   node backend/scripts/migrate-resources-personalization.js');
    } else {
      console.log('✅ All personalization columns exist');
    }

    // Check resource count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM resources WHERE is_active = true');
    const resourceCount = parseInt(countResult.rows[0].count);
    
    console.log(`\n📊 Active resources in database: ${resourceCount}`);
    
    if (resourceCount < 10) {
      console.log('\n⚠️  Low resource count detected.');
      console.log('💡 Run the seed script to add resources:');
      console.log('   node backend/scripts/seed-personalized-resources.js');
    } else {
      console.log('✅ Sufficient resources available');
    }

    // Check if resources have personalization data
    if (existingColumns.length === 3) {
      const personalizedCount = await pool.query(`
        SELECT COUNT(*) as count 
        FROM resources 
        WHERE test_types IS NOT NULL 
        AND array_length(test_types, 1) > 0
      `);
      const personalizedResources = parseInt(personalizedCount.rows[0].count);
      console.log(`\n🎯 Personalized resources: ${personalizedResources}`);
      
      if (personalizedResources === 0 && resourceCount > 0) {
        console.log('\n⚠️  No personalized resources found.');
        console.log('💡 Run the seed script:');
        console.log('   node backend/scripts/seed-personalized-resources.js');
      }
    }

    console.log('\n✅ Setup check complete!\n');
    await pool.end();
  } catch (error) {
    console.error('❌ Error checking setup:', error.message);
    console.error('\nDetails:', error);
    await pool.end();
    process.exit(1);
  }
};

checkResourcesSetup();
