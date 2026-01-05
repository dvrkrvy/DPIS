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

module.exports = router;
