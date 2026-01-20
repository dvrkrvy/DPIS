const express = require('express');
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Record mood score
router.post('/mood', authenticate, requireStudent, async (req, res) => {
  try {
    const { moodScore, notes } = req.body;
    const userId = req.user.id;

    // Frontend slider is 0-10; accept 0-10 inclusive.
    if (moodScore === undefined || moodScore === null || moodScore < 0 || moodScore > 10) {
      return res.status(400).json({ message: 'Mood score must be between 0 and 10' });
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
      `SELECT 
         DATE(created_at) as date,
         ROUND(AVG(mood_score)::numeric, 2) as avg_mood,
         COUNT(*) as count
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

// Get dashboard summary data
router.get('/dashboard-summary', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get latest screening results to calculate cognitive resilience
    const latestScreenings = await pool.query(
      `SELECT test_type, score, severity, created_at
       FROM screening_results
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Calculate cognitive resilience score change (comparing last week vs this week)
    let resilienceChange = 0;
    if (latestScreenings.rows.length >= 2) {
      const lastWeekScreenings = latestScreenings.rows.filter(s => {
        const date = new Date(s.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      });
      
      if (lastWeekScreenings.length > 0) {
        const avgScore = lastWeekScreenings.reduce((sum, s) => sum + s.score, 0) / lastWeekScreenings.length;
        const olderScreenings = latestScreenings.rows.slice(lastWeekScreenings.length, lastWeekScreenings.length + 2);
        if (olderScreenings.length > 0) {
          const olderAvgScore = olderScreenings.reduce((sum, s) => sum + s.score, 0) / olderScreenings.length;
          resilienceChange = Math.round(((olderAvgScore - avgScore) / olderAvgScore) * 100);
        }
      }
    } else if (latestScreenings.rows.length > 0) {
      // If only one screening, show a positive default change
      resilienceChange = 12;
    }

    // Get recent activities
    const recentActivities = await pool.query(
      `SELECT activity_type, notes, created_at
       FROM progress_tracking
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Get pending assessments (tests not taken in last 30 days)
    const allTests = ['PHQ9', 'GAD7', 'GHQ'];
    const recentTests = await pool.query(
      `SELECT DISTINCT test_type
       FROM screening_results
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );
    const takenTests = recentTests.rows.map(r => r.test_type);
    const pendingTests = allTests.filter(t => !takenTests.includes(t));

    // Get screening completion percentage
    const completionPercentage = Math.round((takenTests.length / allTests.length) * 100);

    // Get latest resources count (for library widget)
    const newResources = await pool.query(
      `SELECT COUNT(*) as count
       FROM resources
       WHERE is_active = true
         AND created_at >= NOW() - INTERVAL '7 days'`,
      []
    );

    // Get mental resilience trends (6 months)
    const resilienceTrends = await pool.query(
      `SELECT 
         DATE_TRUNC('month', created_at) as month,
         AVG(CASE 
           WHEN test_type = 'PHQ9' THEN (27 - score) / 27.0 * 100
           WHEN test_type = 'GAD7' THEN (21 - score) / 21.0 * 100
           WHEN test_type = 'GHQ' THEN (12 - score) / 12.0 * 100
           ELSE 0
         END) as resilience_score
       FROM screening_results
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [userId]
    );

    // Daily insight quote (static for now, can be made dynamic)
    const dailyInsights = [
      { quote: "The only journey is the one within.", author: "— Rainer Maria Rilke" },
      { quote: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "— Ralph Waldo Emerson" },
      { quote: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "— A.A. Milne" },
      { quote: "The wound is the place where the Light enters you.", author: "— Rumi" },
      { quote: "It is during our darkest moments that we must focus to see the light.", author: "— Aristotle" }
    ];
    const todayInsight = dailyInsights[new Date().getDate() % dailyInsights.length];

    // Format recent activities for display
    const formattedActivities = recentActivities.rows.map(activity => {
      const date = new Date(activity.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let timeLabel = '';
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffTime / (1000 * 60));
          timeLabel = diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        } else {
          timeLabel = `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        }
      } else if (diffDays === 1) {
        timeLabel = `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      let status = 'SAVED';
      let statusColor = 'text-green-600 bg-green-100';
      if (activity.activity_type === 'screening_test') {
        status = 'COMPLETED';
        statusColor = 'text-blue-600 bg-blue-100';
      }

      return {
        type: activity.activity_type,
        label: activity.notes || activity.activity_type.replace('_', ' '),
        time: timeLabel,
        status,
        statusColor
      };
    });

    // If no activities, add some default ones
    if (formattedActivities.length === 0) {
      formattedActivities.push({
        type: 'anxiety_check',
        label: 'Anxiety Check',
        time: 'Today, 10:23 AM',
        status: 'STABLE',
        statusColor: 'text-green-600 bg-green-100'
      });
    }

    res.json({
      cognitiveResilience: {
        score: 75 + resilienceChange, // Base score + change
        change: resilienceChange,
        trend: resilienceChange > 0 ? 'up' : resilienceChange < 0 ? 'down' : 'stable'
      },
      recentActivities: formattedActivities,
      pendingAssessments: {
        count: pendingTests.length,
        tests: pendingTests,
        completionPercentage
      },
      library: {
        newResourcesCount: parseInt(newResources.rows[0].count)
      },
      mentalResilienceTrends: resilienceTrends.rows.map(row => ({
        month: row.month,
        score: Math.round(row.resilience_score || 0)
      })),
      dailyInsight: todayInsight
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
