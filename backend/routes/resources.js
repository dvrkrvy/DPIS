const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all resources (with optional filtering and personalization)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, contentType, search, personalized } = req.query;
    const userId = req.user.id;
    
    let query = 'SELECT * FROM resources WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    // If personalized is true, filter based on user's last 3 test results
    if (personalized === 'true' && req.user.role === 'student') {
      // Get user's last 3 test results
      const testResults = await pool.query(
        `SELECT test_type, severity 
         FROM screening_results 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [userId]
      );

      if (testResults.rows.length > 0) {
        // Build conditions to match resources to test results
        // Match if resource's test_type and severity match any of user's test results
        const conditions = [];
        
        testResults.rows.forEach((result) => {
          paramCount++;
          conditions.push(
            `($${paramCount}::text = ANY(test_types) AND $${paramCount + 1}::text = ANY(severity_levels))`
          );
          params.push(result.test_type);
          paramCount++;
          params.push(result.severity);
        });

        if (conditions.length > 0) {
          query += ` AND (${conditions.join(' OR ')})`;
        }

        // Order by priority (higher priority first), then by created date
        query += ' ORDER BY priority DESC, created_at DESC LIMIT 50';
      } else {
        // No test results yet - return general resources (those without test-specific targeting)
        query += ' AND (test_types IS NULL OR array_length(test_types, 1) IS NULL)';
        query += ' ORDER BY priority DESC, created_at DESC';
      }
    } else {
      // Regular filtering without personalization
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

      query += ' ORDER BY priority DESC, created_at DESC';
    }

    const result = await pool.query(query, params);
    
    // Get test results count for personalized responses
    let testResultsCount = null;
    if (personalized === 'true' && req.user.role === 'student') {
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM screening_results WHERE user_id = $1', 
        [userId]
      );
      testResultsCount = parseInt(countResult.rows[0].count);
    }
    
    res.json({ 
      resources: result.rows,
      personalized: personalized === 'true',
      testResultsCount: testResultsCount
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Failed to fetch resources' });
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
