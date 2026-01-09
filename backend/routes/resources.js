const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all resources (with optional filtering and personalization)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, contentType, search, personalized } = req.query;
    const userId = req.user.id;
    
    console.log(`📥 Resources request - User: ${userId}, Role: ${req.user.role}, Personalized param: ${personalized}`);
    console.log(`📥 Query params:`, { category, contentType, search, personalized });
    
    // First check if personalized columns exist in the database
    // Default to false if check fails - will use backward-compatible queries
    let hasPersonalizationColumns = false;
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'resources' 
        AND column_name IN ('test_types', 'severity_levels', 'priority')
      `);
      hasPersonalizationColumns = columnCheck.rows.length === 3;
      console.log(`📊 Personalization columns check: ${hasPersonalizationColumns ? '✅ EXISTS' : '❌ MISSING'}`);
      if (hasPersonalizationColumns) {
        console.log(`   Found columns: ${columnCheck.rows.map(r => r.column_name).join(', ')}`);
      }
    } catch (colError) {
      // If we can't check columns, assume they don't exist (safe default)
      console.warn('Could not check for personalization columns, using backward-compatible mode:', colError.message);
      hasPersonalizationColumns = false;
    }
    
    console.log(`🔍 Personalization check: personalized=${personalized}, role=${req.user.role}, hasColumns=${hasPersonalizationColumns}`);
    
    let query = 'SELECT * FROM resources WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    // If personalized is true and columns exist, filter based on user's last 3 test results
    if (personalized === 'true' && req.user.role === 'student' && hasPersonalizationColumns) {
      // Get user's last 3 test results
      const testResults = await pool.query(
        `SELECT test_type, severity 
         FROM screening_results 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [userId]
      );

      console.log(`🔍 Personalization check - User ${userId}, Test results: ${testResults.rows.length}`);

      if (testResults.rows.length > 0) {
        console.log(`📊 Test results found:`, testResults.rows.map(r => `${r.test_type}:${r.severity}`));
        
        // First, check if any personalized resources exist in the database
        const personalizedResourcesCheck = await pool.query(`
          SELECT COUNT(*) as count 
          FROM resources 
          WHERE is_active = true 
          AND test_types IS NOT NULL 
          AND array_length(test_types, 1) > 0
        `);
        const personalizedCount = parseInt(personalizedResourcesCheck.rows[0].count);
        console.log(`📚 Total personalized resources in DB: ${personalizedCount}`);
        
        // Build conditions to match resources to test results
        // Match if resource's test_type and severity match any of user's test results
        const conditions = [];
        
        testResults.rows.forEach((result) => {
          // Get parameter indices before incrementing
          const testTypeParam = paramCount + 1;
          const severityParam = paramCount + 2;
          
          conditions.push(
            `($${testTypeParam}::text = ANY(test_types) AND $${severityParam}::text = ANY(severity_levels))`
          );
          params.push(result.test_type);
          params.push(result.severity);
          paramCount += 2; // Increment by 2 since we added 2 parameters
        });

        if (conditions.length > 0) {
          query += ` AND (${conditions.join(' OR ')})`;
          console.log(`✅ Added personalization filter for ${conditions.length} test result(s)`);
          console.log(`🔍 Query params:`, params);
          console.log(`🔍 Full query: ${query}`);
          
          // Check if any resources match before executing (use the same conditions)
          const matchCheckQuery = `SELECT COUNT(*) as count FROM resources WHERE is_active = true AND (${conditions.join(' OR ')})`;
          const matchCheck = await pool.query(matchCheckQuery, params);
          console.log(`🎯 Matching resources found: ${matchCheck.rows[0].count}`);
          
          // If no exact matches, try matching by test type only (fallback)
          if (parseInt(matchCheck.rows[0].count) === 0 && personalizedCount > 0) {
            console.log(`⚠️ No exact matches found, trying fallback: match by test type only`);
            const fallbackConditions = [];
            const fallbackParams = [];
            let fallbackParamCount = 0;
            
            // Get unique test types
            const uniqueTestTypes = [...new Set(testResults.rows.map(r => r.test_type))];
            uniqueTestTypes.forEach((testType) => {
              fallbackParamCount++;
              fallbackConditions.push(`$${fallbackParamCount}::text = ANY(test_types)`);
              fallbackParams.push(testType);
            });
            
            query = 'SELECT * FROM resources WHERE is_active = true';
            query += ` AND (${fallbackConditions.join(' OR ')})`;
            params.length = 0;
            params.push(...fallbackParams);
            paramCount = fallbackParams.length;
            console.log(`🔄 Using fallback query: ${query}`);
            console.log(`🔄 Fallback params:`, params);
          }
        }

        // Order by priority if column exists, otherwise just by created date
        if (hasPersonalizationColumns) {
          query += ' ORDER BY COALESCE(priority, 0) DESC, created_at DESC LIMIT 50';
        } else {
          query += ' ORDER BY created_at DESC LIMIT 50';
        }
      } else {
        // No test results yet - return general resources (those without test-specific targeting)
        console.log(`⚠️ No test results found for user ${userId}, returning general resources`);
        if (hasPersonalizationColumns) {
          query += ' AND (test_types IS NULL OR array_length(test_types, 1) IS NULL)';
          query += ' ORDER BY COALESCE(priority, 0) DESC, created_at DESC';
        } else {
          // If columns don't exist, just return all active resources
          query += ' ORDER BY created_at DESC';
        }
      }
    } else {
      // Regular filtering without personalization (or if columns don't exist)
      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (contentType) {
        paramCount++;
        query += ` AND content_type = $${paramCount}`;
        params.push(contentType);
      }

      if (search) {
        paramCount++;
        query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR $${paramCount} = ANY(tags))`;
        params.push(`%${search}%`);
      }

      // Only use priority if column exists
      if (hasPersonalizationColumns) {
        query += ' ORDER BY COALESCE(priority, 0) DESC, created_at DESC';
      } else {
        query += ' ORDER BY created_at DESC';
      }
    }

    const result = await pool.query(query, params);
    
    console.log(`📦 Found ${result.rows.length} resources for user ${userId} (personalized: ${personalized === 'true' && hasPersonalizationColumns})`);
    if (result.rows.length > 0 && personalized === 'true' && hasPersonalizationColumns) {
      console.log(`📋 Sample resource test_types:`, result.rows[0].test_types);
      console.log(`📋 Sample resource severity_levels:`, result.rows[0].severity_levels);
    }
    
    // Get test results count for personalized responses
    let testResultsCount = null;
    if (personalized === 'true' && req.user.role === 'student') {
      try {
        const countResult = await pool.query(
          'SELECT COUNT(*) as count FROM screening_results WHERE user_id = $1', 
          [userId]
        );
        testResultsCount = parseInt(countResult.rows[0].count);
      } catch (countError) {
        console.warn('Could not get test results count:', countError.message);
      }
    }
    
    // If personalized but no resources found, check if resources exist with personalization data
    if (personalized === 'true' && hasPersonalizationColumns && result.rows.length === 0) {
      const testResults = await pool.query(
        `SELECT test_type, severity 
         FROM screening_results 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [userId]
      );
      
      if (testResults.rows.length > 0) {
        // Check if any resources exist for these test types/severities
        const checkQuery = await pool.query(
          `SELECT COUNT(*) as count FROM resources 
           WHERE is_active = true 
           AND test_types IS NOT NULL 
           AND array_length(test_types, 1) > 0`,
          []
        );
        
        if (parseInt(checkQuery.rows[0].count) === 0) {
          console.warn('⚠️ No personalized resources found in database. Run seed script to add resources.');
        } else {
          console.warn(`⚠️ No matching resources found for test results: ${testResults.rows.map(r => `${r.test_type}:${r.severity}`).join(', ')}`);
        }
      }
    }
    
    res.json({ 
      resources: result.rows,
      personalized: personalized === 'true' && hasPersonalizationColumns,
      testResultsCount: testResultsCount
    });
  } catch (error) {
    console.error('Get resources error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      message: 'Failed to fetch resources',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get resource by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM resources WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Track resource view
    await pool.query(
      `INSERT INTO progress_tracking (user_id, activity_type, notes)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'resource_view', `Viewed resource: ${result.rows[0].title}`]
    );

    res.json({ resource: result.rows[0] });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({ message: 'Failed to fetch resource' });
  }
});

// Get resource categories
router.get('/meta/categories', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM resources WHERE is_active = true AND category IS NOT NULL`
    );
    res.json({ categories: result.rows.map(r => r.category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Get content types
router.get('/meta/content-types', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT content_type FROM resources WHERE is_active = true AND content_type IS NOT NULL`
    );
    res.json({ contentTypes: result.rows.map(r => r.content_type) });
  } catch (error) {
    console.error('Get content types error:', error);
    res.status(500).json({ message: 'Failed to fetch content types' });
  }
});

module.exports = router;
