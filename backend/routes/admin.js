const express = require('express');
const pool = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get dashboard overview (anonymized aggregated data)
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = \'student\'');
    
    // Active users (last 30 days)
    const activeUsers = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM screening_results WHERE created_at >= NOW() - INTERVAL \'30 days\''
    );

    // Total screenings
    const totalScreenings = await pool.query('SELECT COUNT(*) as count FROM screening_results');
    
    // Screening distribution by type
    const screeningByType = await pool.query(
      `SELECT test_type, COUNT(*) as count 
       FROM screening_results 
       GROUP BY test_type`
    );

    // Severity distribution
    const severityDistribution = await pool.query(
      `SELECT severity, COUNT(*) as count 
       FROM screening_results 
       GROUP BY severity`
    );

    // High risk flags
    const highRiskCount = await pool.query(
      `SELECT COUNT(*) as count FROM emergency_flags WHERE resolved = false AND severity IN ('high', 'critical')`
    );

    // Bookings statistics
    const bookingsStats = await pool.query(
      `SELECT status, COUNT(*) as count FROM bookings GROUP BY status`
    );

    // Resource usage
    const resourceViews = await pool.query(
      `SELECT COUNT(*) as count FROM progress_tracking WHERE activity_type = 'resource_view'`
    );

    // Time-based trends (last 30 days)
    const dailyScreenings = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM screening_results
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      overview: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        totalScreenings: parseInt(totalScreenings.rows[0].count),
        highRiskFlags: parseInt(highRiskCount.rows[0].count),
        resourceViews: parseInt(resourceViews.rows[0].count)
      },
      screeningByType: screeningByType.rows,
      severityDistribution: severityDistribution.rows,
      bookingsStats: bookingsStats.rows,
      dailyTrends: dailyScreenings.rows
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Get emergency flags
router.get('/emergency-flags', authenticate, requireAdmin, async (req, res) => {
  try {
    const { resolved = false } = req.query;

    const result = await pool.query(
      `SELECT id, flag_type, severity, context, flagged_at, resolved
       FROM emergency_flags
       WHERE resolved = $1
       ORDER BY flagged_at DESC
       LIMIT 100`,
      [resolved === 'true']
    );

    res.json({ flags: result.rows });
  } catch (error) {
    console.error('Get emergency flags error:', error);
    res.status(500).json({ message: 'Failed to fetch emergency flags' });
  }
});

// Resolve emergency flag
router.patch('/emergency-flags/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE emergency_flags 
       SET resolved = true, admin_notified = true
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Flag not found' });
    }

    res.json({ message: 'Flag resolved successfully' });
  } catch (error) {
    console.error('Resolve flag error:', error);
    res.status(500).json({ message: 'Failed to resolve flag' });
  }
});

// Get screening score distributions
router.get('/analytics/screening-scores', authenticate, requireAdmin, async (req, res) => {
  try {
    const { testType } = req.query;

    let query = `
      SELECT 
        test_type,
        MIN(score) as min_score,
        MAX(score) as max_score,
        AVG(score) as avg_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score,
        COUNT(*) as count
      FROM screening_results
    `;

    const params = [];
    if (testType) {
      query += ' WHERE test_type = $1';
      params.push(testType);
    }

    query += ' GROUP BY test_type';

    const result = await pool.query(query, params);
    res.json({ distributions: result.rows });
  } catch (error) {
    console.error('Get screening scores error:', error);
    res.status(500).json({ message: 'Failed to fetch screening scores' });
  }
});

// Get peak distress times
router.get('/analytics/peak-times', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM created_at) as hour,
         COUNT(*) as count
       FROM screening_results
       WHERE created_at >= NOW() - INTERVAL '90 days'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour ASC`
    );

    res.json({ peakTimes: result.rows });
  } catch (error) {
    console.error('Get peak times error:', error);
    res.status(500).json({ message: 'Failed to fetch peak times' });
  }
});

// Export report (CSV format data)
router.get('/export/report', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as date,
        test_type,
        severity,
        COUNT(*) as count
      FROM screening_results
      WHERE 1=1
    `;

    const params = [];
    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ' GROUP BY DATE(created_at), test_type, severity ORDER BY date ASC';

    const result = await pool.query(query, params);

    res.json({
      report: result.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Failed to export report' });
  }
});

// Setup personalized resources - Migration
router.post('/setup/migrate-resources', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Running migration for personalized resources...');

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

    console.log('✅ Migration completed successfully');
    res.json({ 
      success: true, 
      message: 'Resources table migrated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Migration failed',
      error: error.message 
    });
  }
});

// Setup personalized resources - Seed data
router.post('/setup/seed-resources', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🌱 Seeding personalized resources...');
    
    // Import the seed data
    let personalizedResources;
    try {
      const seedScript = require('../scripts/seed-personalized-resources');
      personalizedResources = seedScript.personalizedResources || [];
    } catch (requireError) {
      console.error('Error requiring seed script:', requireError);
      return res.status(500).json({ 
        success: false,
        message: 'Could not load seed data. Check seed script file.' 
      });
    }
    
    if (!personalizedResources || personalizedResources.length === 0) {
      return res.status(500).json({ 
        success: false,
        message: 'No resources to seed. Check seed script.' 
      });
    }

    let inserted = 0;
    let skipped = 0;

    for (const resource of personalizedResources) {
      try {
        // Check if resource already exists (by title)
        const existing = await pool.query(
          'SELECT id FROM resources WHERE title = $1',
          [resource.title]
        );

        if (existing.rows.length > 0) {
          // Update existing resource
          await pool.query(
            `UPDATE resources 
             SET description = $1, category = $2, content_type = $3, url = $4, 
                 tags = $5, test_types = $6, severity_levels = $7, priority = $8, is_active = $9
             WHERE title = $10`,
            [
              resource.description,
              resource.category,
              resource.content_type,
              resource.url,
              resource.tags,
              resource.test_types,
              resource.severity_levels,
              resource.priority || 0,
              resource.is_active !== false,
              resource.title
            ]
          );
          skipped++;
        } else {
          // Insert new resource
          await pool.query(
            `INSERT INTO resources 
             (title, description, category, content_type, url, tags, test_types, severity_levels, priority, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              resource.title,
              resource.description,
              resource.category,
              resource.content_type,
              resource.url,
              resource.tags,
              resource.test_types,
              resource.severity_levels,
              resource.priority || 0,
              resource.is_active !== false
            ]
          );
          inserted++;
        }
      } catch (resourceError) {
        console.error(`Error processing resource "${resource.title}":`, resourceError.message);
        skipped++;
      }
    }

    console.log(`✅ Seeding completed: ${inserted} inserted, ${skipped} updated/skipped`);
    res.json({ 
      success: true, 
      message: 'Resources seeded successfully',
      inserted,
      updated: skipped,
      total: personalizedResources.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Seeding failed',
      error: error.message 
    });
  }
});

// Check personalized resources setup status
router.get('/setup/status', authenticate, requireAdmin, async (req, res) => {
  try {
    // Check if columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('test_types', 'severity_levels', 'priority')
    `);
    
    const hasColumns = columnCheck.rows.length === 3;
    
    // Check resource counts
    const resourceCheck = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN test_types IS NOT NULL AND array_length(test_types, 1) > 0 THEN 1 END) as personalized
      FROM resources 
      WHERE is_active = true
    `);
    
    const total = parseInt(resourceCheck.rows[0].total);
    const personalized = parseInt(resourceCheck.rows[0].personalized);
    
    // Check test results
    const testCheck = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as users_with_tests,
             COUNT(*) as total_tests
      FROM screening_results
    `);
    
    res.json({
      migration: {
        completed: hasColumns,
        columns: columnCheck.rows.map(r => r.column_name)
      },
      resources: {
        total,
        personalized,
        needsSeeding: personalized === 0 && hasColumns
      },
      testResults: {
        usersWithTests: parseInt(testCheck.rows[0].users_with_tests),
        totalTests: parseInt(testCheck.rows[0].total_tests)
      },
      ready: hasColumns && personalized > 0
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Status check failed',
      error: error.message 
    });
  }
});

module.exports = router;
