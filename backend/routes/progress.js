const express = require('express');
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Record mood score
router.post('/mood', authenticate, requireStudent, async (req, res) => {
  try {
    const { moodScore, notes } = req.body;
    const userId = req.user.id;

    if (!moodScore || moodScore < 1 || moodScore > 10) {
      return res.status(400).json({ message: 'Mood score must be between 1 and 10' });
    }

    const result = await pool.query(
      `INSERT INTO progress_tracking (user_id, mood_score, notes, activity_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, mood_score, notes, created_at`,
      [userId, moodScore, notes || null, 'mood_tracking']
    );

    res.status(201).json({
      message: 'Mood recorded successfully',
      entry: result.rows[0]
    });
  } catch (error) {
    console.error('Record mood error:', error);
    res.status(500).json({ message: 'Failed to record mood' });
  }
});

// Get progress tracking data
router.get('/', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30 } = req.query;

    // Get mood tracking
    const moodResult = await pool.query(
      `SELECT mood_score, notes, created_at
       FROM progress_tracking
       WHERE user_id = $1 AND activity_type = 'mood_tracking'
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    // Get screening history
    const screeningResult = await pool.query(
      `SELECT test_type, score, severity, created_at
       FROM screening_results
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get activity summary
    const activityResult = await pool.query(
      `SELECT activity_type, COUNT(*) as count, MAX(created_at) as last_activity
       FROM progress_tracking
       WHERE user_id = $1
       GROUP BY activity_type`,
      [userId]
    );

    res.json({
      moodHistory: moodResult.rows,
      screeningHistory: screeningResult.rows,
      activities: activityResult.rows
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Failed to fetch progress data' });
  }
});

// Get mood trends (for charts)
router.get('/mood-trends', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT DATE(created_at) as date, AVG(mood_score) as avg_mood, COUNT(*) as count
       FROM progress_tracking
       WHERE user_id = $1 
         AND activity_type = 'mood_tracking'
         AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId]
    );

    res.json({ trends: result.rows });
  } catch (error) {
    console.error('Get mood trends error:', error);
    res.status(500).json({ message: 'Failed to fetch mood trends' });
  }
});

module.exports = router;
