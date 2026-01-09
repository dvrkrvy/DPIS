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

const diagnose = async () => {
  try {
    console.log('🔍 Diagnosing Personalized Resources Setup...\n');

    // 1. Check if columns exist
    console.log('1️⃣ Checking database columns...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
    `);
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    console.log(`   Found columns: ${existingColumns.join(', ') || 'NONE'}`);
    
    if (existingColumns.length < 3) {
      console.log('   ❌ Missing columns! Run: node backend/scripts/migrate-resources-personalization.js');
    } else {
      console.log('   ✅ All columns exist');
    }

    // 2. Check personalized resources count
    console.log('\n2️⃣ Checking personalized resources...');
    const resourceCheck = await pool.query(`
      SELECT COUNT(*) as count FROM resources 
      WHERE is_active = true 
      AND test_types IS NOT NULL 
      AND array_length(test_types, 1) > 0
    `);
    const personalizedCount = parseInt(resourceCheck.rows[0].count);
    console.log(`   Personalized resources: ${personalizedCount}`);
    
    if (personalizedCount === 0) {
      console.log('   ❌ No personalized resources found! Run: node backend/scripts/seed-personalized-resources.js');
    } else {
      console.log('   ✅ Personalized resources exist');
    }

    // 3. Check test results
    console.log('\n3️⃣ Checking test results...');
    const testResultsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM screening_results
    `);
    console.log(`   Total test results: ${testResultsCheck.rows[0].count}`);
    
    // Get sample test results
    const sampleTests = await pool.query(`
      SELECT test_type, severity, COUNT(*) as count
      FROM screening_results
      GROUP BY test_type, severity
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (sampleTests.rows.length > 0) {
      console.log('   Sample test result combinations:');
      sampleTests.rows.forEach(row => {
        console.log(`     - ${row.test_type}: ${row.severity} (${row.count} results)`);
      });
    }

    // 4. Check resource test_types and severity_levels
    console.log('\n4️⃣ Checking resource test_types and severity_levels...');
    const resourceTypes = await pool.query(`
      SELECT DISTINCT 
        unnest(test_types) as test_type,
        unnest(severity_levels) as severity_level
      FROM resources
      WHERE is_active = true 
      AND test_types IS NOT NULL 
      AND array_length(test_types, 1) > 0
      LIMIT 20
    `);
    
    if (resourceTypes.rows.length > 0) {
      console.log('   Resource combinations in database:');
      const combinations = {};
      resourceTypes.rows.forEach(row => {
        const key = `${row.test_type}:${row.severity_level}`;
        if (!combinations[key]) {
          combinations[key] = true;
          console.log(`     - ${row.test_type}: ${row.severity_level}`);
        }
      });
    } else {
      console.log('   ⚠️ No resource combinations found');
    }

    // 5. Test matching for a specific user (if provided)
    if (process.argv[2]) {
      const userId = process.argv[2];
      console.log(`\n5️⃣ Testing matching for user: ${userId}`);
      
      const userTests = await pool.query(`
        SELECT test_type, severity 
        FROM screening_results 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 3
      `, [userId]);
      
      if (userTests.rows.length > 0) {
        console.log('   User test results:');
        userTests.rows.forEach(row => {
          console.log(`     - ${row.test_type}: ${row.severity}`);
        });
        
        // Try to find matching resources
        const conditions = [];
        const params = [];
        let paramCount = 0;
        
        userTests.rows.forEach((result) => {
          const testTypeParam = paramCount + 1;
          const severityParam = paramCount + 2;
          conditions.push(
            `($${testTypeParam}::text = ANY(test_types) AND $${severityParam}::text = ANY(severity_levels))`
          );
          params.push(result.test_type);
          params.push(result.severity);
          paramCount += 2;
        });
        
        const matchQuery = `
          SELECT COUNT(*) as count 
          FROM resources 
          WHERE is_active = true 
          AND (${conditions.join(' OR ')})
        `;
        
        const matches = await pool.query(matchQuery, params);
        console.log(`   Matching resources: ${matches.rows[0].count}`);
        
        if (parseInt(matches.rows[0].count) === 0) {
          console.log('   ❌ No matching resources found!');
          console.log('   This could mean:');
          console.log('     - Severity levels don\'t match exactly');
          console.log('     - Test types don\'t match exactly');
          console.log('     - Resources need to be seeded');
        } else {
          console.log('   ✅ Matching resources found!');
        }
      } else {
        console.log('   ⚠️ User has no test results');
      }
    }

    console.log('\n✅ Diagnosis complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

diagnose();
