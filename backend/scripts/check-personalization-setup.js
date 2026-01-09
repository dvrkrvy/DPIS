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

async function checkPersonalizationSetup() {
  try {
    console.log('🔍 Checking personalization setup...\n');
    
    // 1. Check if columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
    `);
    
    const hasColumns = columnCheck.rows.length === 3;
    console.log(`1. Columns check: ${hasColumns ? '✅ EXISTS' : '❌ MISSING'}`);
    if (hasColumns) {
      console.log(`   Found: ${columnCheck.rows.map(r => r.column_name).join(', ')}\n`);
    } else {
      console.log(`   Missing columns. Run migration first.\n`);
      await pool.end();
      return;
    }
    
    // 2. Check total resources
    const totalCheck = await pool.query(`
      SELECT COUNT(*) as count FROM resources WHERE is_active = true
    `);
    console.log(`2. Total active resources: ${totalCheck.rows[0].count}\n`);
    
    // 3. Check personalized resources
    const personalizedCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM resources 
      WHERE is_active = true 
      AND test_types IS NOT NULL 
      AND array_length(test_types, 1) > 0
    `);
    const personalizedCount = parseInt(personalizedCheck.rows[0].count);
    console.log(`3. Personalized resources: ${personalizedCount}`);
    
    if (personalizedCount === 0) {
      console.log('   ⚠️  No personalized resources found!');
      console.log('   Run: node scripts/seed-personalized-resources.js\n');
    } else {
      // Show sample
      const sample = await pool.query(`
        SELECT title, test_types, severity_levels, priority
        FROM resources 
        WHERE is_active = true 
        AND test_types IS NOT NULL 
        AND array_length(test_types, 1) > 0
        LIMIT 5
      `);
      console.log(`   Sample resources:`);
      sample.rows.forEach(r => {
        console.log(`   - "${r.title}"`);
        console.log(`     test_types: [${r.test_types.join(', ')}]`);
        console.log(`     severity_levels: [${r.severity_levels.join(', ')}]`);
        console.log(`     priority: ${r.priority}`);
      });
      console.log('');
    }
    
    // 4. Check test results
    const testCheck = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as users,
             COUNT(*) as total,
             test_type,
             severity,
             COUNT(*) as count
      FROM screening_results
      GROUP BY test_type, severity
      ORDER BY test_type, severity
    `);
    console.log(`4. Test results in database:`);
    if (testCheck.rows.length === 0) {
      console.log('   ⚠️  No test results found!');
      console.log('   Users need to take screening tests first.\n');
    } else {
      const usersWithTests = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM screening_results
      `);
      console.log(`   Users with tests: ${usersWithTests.rows[0].count}`);
      console.log(`   Total test results: ${testCheck.rows.reduce((sum, r) => sum + parseInt(r.count), 0)}`);
      console.log(`   Breakdown:`);
      testCheck.rows.forEach(r => {
        console.log(`   - ${r.test_type}: ${r.severity} (${r.count} results)`);
      });
      console.log('');
    }
    
    // 5. Check if resources match test results
    if (testCheck.rows.length > 0 && personalizedCount > 0) {
      console.log(`5. Matching test results to resources:`);
      const uniqueTests = [...new Set(testCheck.rows.map(r => `${r.test_type}:${r.severity}`))];
      
      for (const testStr of uniqueTests.slice(0, 3)) {
        const [testType, severity] = testStr.split(':');
        const matchCheck = await pool.query(`
          SELECT COUNT(*) as count
          FROM resources
          WHERE is_active = true
          AND $1::text = ANY(test_types)
          AND $2::text = ANY(severity_levels)
        `, [testType, severity]);
        console.log(`   ${testStr}: ${matchCheck.rows[0].count} matching resources`);
      }
      console.log('');
    }
    
    // 6. Summary
    console.log('📊 Summary:');
    console.log(`   ✅ Columns exist: ${hasColumns}`);
    console.log(`   ${personalizedCount > 0 ? '✅' : '❌'} Personalized resources: ${personalizedCount}`);
    console.log(`   ${testCheck.rows.length > 0 ? '✅' : '❌'} Test results exist: ${testCheck.rows.length > 0}`);
    console.log(`   ${hasColumns && personalizedCount > 0 && testCheck.rows.length > 0 ? '✅ READY' : '❌ NOT READY'}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkPersonalizationSetup();
