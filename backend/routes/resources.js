const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all resources (with optional filtering)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, contentType, search } = req.query;
    
    let query = 'SELECT * FROM resources WHERE is_active = true';
    const params = [];
    let paramCount = 0;

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

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ resources: result.rows });
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
