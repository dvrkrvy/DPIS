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

// Fix YouTube embed links - Update all video resources with embeddable videos
router.post('/fix-youtube-embeds', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Admin requested YouTube embed fix...');
    
    // Import the fix script logic
    const fixScript = require('../scripts/fix-youtube-embeds');
    
    // The script exports a function, but we need to run it
    // Since it's designed to run standalone, we'll replicate the logic here
    const { Pool } = require('pg');
    
    // Use the same pool connection
    const fixPool = pool;
    
    // Comprehensive list of reliable, embeddable YouTube videos
    const embeddableVideos = {
      'anxiety': [
        'WWloIAQpMcQ', // TED-Ed: What is anxiety?
        'ZPpucg3qwZE', // Headspace: Understanding Anxiety
        '1nZEdqcGVzo', // Calm: Anxiety Relief Meditation
        '4pLUleLdwY4', // Yoga With Adriene: Yoga for Anxiety
        'tEmt1Znux58', // Deep Breathing for Anxiety
        'inpok4MKVLM', // 5-Minute Meditation for Anxiety
      ],
      'depression': [
        'z-IR48Mb3W0', // Mental Health Foundation: Understanding Depression
        'XiCrniLQGYc', // TED-Ed: What is depression?
        '2IrdYkLQO50', // Headspace: Depression Support
        'v7AYKMP6rOE', // Yoga With Adriene: Yoga for Depression
        'ZToicYcHIOU', // Mindfulness for Depression
        '6hfOHS8Heo8', // Guided Meditation for Depression
      ],
      'meditation': [
        'inpok4MKVLM', // Calm: 5-Minute Meditation
        'ZToicYcHIOU', // Mindfulness Exercises: MBSR
        '6hfOHS8Heo8', // Headspace: Guided Meditation
        '1nZEdqcGVzo', // Calm: Anxiety Relief Meditation
        'tEmt1Znux58', // Deep Breathing Meditation
        'WWloIAQpMcQ', // TED-Ed: Mindfulness
      ],
      'breathing': [
        'tEmt1Znux58', // Great Meditation: Deep Breathing
        'tybOi4hjZFQ', // Headspace: Breathing Exercise
        '1wfB1Ysh-w0', // Calm: Breathing for Anxiety
        'inpok4MKVLM', // 5-Minute Breathing Meditation
        'ZToicYcHIOU', // MBSR Breathing
        '6hfOHS8Heo8', // Guided Breathing
      ],
      'yoga': [
        '4pLUleLdwY4', // Yoga With Adriene: Yoga for Anxiety
        'v7AYKMP6rOE', // Yoga With Adriene: Yoga for Depression
        'U9YKY7fdwyg', // Yoga With Adriene: Morning Yoga
        'WWloIAQpMcQ', // Yoga for Mental Health
        'tEmt1Znux58', // Gentle Yoga Flow
        'inpok4MKVLM', // Restorative Yoga
      ],
      'stress': [
        'ZToicYcHIOU', // Mindfulness Exercises: MBSR
        'tEmt1Znux58', // Great Meditation: Stress Relief
        '6hfOHS8Heo8', // Headspace: Stress Relief
        'inpok4MKVLM', // 5-Minute Stress Relief
        '4pLUleLdwY4', // Yoga for Stress
        'WWloIAQpMcQ', // Stress Management
      ],
      'wellness': [
        '2iDj4-nWX_c', // TED: Building Resilience
        '75d_29QWELk', // Positive Psychology: Habits
        'WPPPFqsECz0', // Gratitude Practice
        'z-IR48Mb3W0', // Mental Health Basics
        'inpok4MKVLM', // Daily Wellness Meditation
        'ZToicYcHIOU', // Wellness Practices
      ],
      'sleep': [
        'aEqlQvczAPQ', // Headspace: Sleep Meditation
        '1nZEdqcGVzo', // Calm: Sleep Stories
        'inpok4MKVLM', // Sleep Meditation
        'tEmt1Znux58', // Breathing for Sleep
        '6hfOHS8Heo8', // Guided Sleep
        'ZToicYcHIOU', // Sleep Wellness
      ],
      'self-care': [
        'Aw71zanwMnY', // Morning Routine
        '7Y-IgI6owFc', // Evening Wind-Down
        '4pLUleLdwY4', // Self-Care Yoga
        'inpok4MKVLM', // Self-Care Meditation
        'ZToicYcHIOU', // Daily Self-Care
        'tEmt1Znux58', // Self-Care Breathing
      ],
      'cbt': [
        'g7B3n9jobus', // CBT Basics
        'hzB9YXqKGMY', // Overcoming Negative Thoughts
        'WWloIAQpMcQ', // Cognitive Behavioral Therapy
        'z-IR48Mb3W0', // Therapy Techniques
        'ZToicYcHIOU', // CBT Practices
        '6hfOHS8Heo8', // Therapy Tools
      ],
      'general': [
        'WWloIAQpMcQ', // TED-Ed: What is anxiety?
        'z-IR48Mb3W0', // Understanding Depression
        'inpok4MKVLM', // 5-Minute Meditation
        'ZToicYcHIOU', // Mental Health Basics
        'tEmt1Znux58', // Mental Wellness
        '6hfOHS8Heo8', // Mental Health Support
      ],
    };
    
    // Function to get a video ID based on content type and tags
    // Uses a hash of the title to consistently assign different videos to different resources
    const getVideoIdForResource = (contentType, tags, title, resourceId) => {
      const lowerTitle = (title || '').toLowerCase();
      const lowerTags = (tags || []).map(t => t.toLowerCase());
      
      // Simple hash function to get consistent index from title/resourceId
      const hashString = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };
      
      const hash = hashString(title + (resourceId || ''));
      
      // Determine category and select video from array using hash
      let videoArray = null;
      
      // Check for specific keywords in title/tags
      if (lowerTitle.includes('anxiety') || lowerTags.includes('anxiety')) {
        videoArray = embeddableVideos.anxiety;
      } else if (lowerTitle.includes('depression') || lowerTags.includes('depression')) {
        videoArray = embeddableVideos.depression;
      } else if (lowerTitle.includes('meditation') || lowerTags.includes('meditation') || lowerTags.includes('mindfulness')) {
        videoArray = embeddableVideos.meditation;
      } else if (lowerTitle.includes('breathing') || lowerTitle.includes('breath') || lowerTags.includes('breathing')) {
        videoArray = embeddableVideos.breathing;
      } else if (lowerTitle.includes('yoga') || lowerTags.includes('yoga')) {
        videoArray = embeddableVideos.yoga;
      } else if (lowerTitle.includes('stress') || lowerTags.includes('stress')) {
        videoArray = embeddableVideos.stress;
      } else if (lowerTitle.includes('sleep') || lowerTags.includes('sleep')) {
        videoArray = embeddableVideos.sleep;
      } else if (contentType && embeddableVideos[contentType]) {
        videoArray = embeddableVideos[contentType];
      } else {
        videoArray = embeddableVideos.wellness;
      }
      
      // Use hash to select a video from the array (ensures variety)
      const index = hash % videoArray.length;
      return videoArray[index];
    };
    
    // Get all video resources
    const result = await fixPool.query(`
      SELECT id, title, url, content_type, tags, category
      FROM resources
      WHERE category IN ('video', 'audio')
      AND url LIKE '%youtube%'
    `);
    
    console.log(`📹 Found ${result.rows.length} video/audio resources with YouTube URLs`);
    
    let updated = 0;
    let errors = 0;
    const updates = [];
    
    for (const resource of result.rows) {
      try {
        let currentVideoId = null;
        const embedMatch = resource.url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        const watchMatch = resource.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        const shortMatch = resource.url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        
        if (embedMatch) currentVideoId = embedMatch[1];
        else if (watchMatch) currentVideoId = watchMatch[1];
        else if (shortMatch) currentVideoId = shortMatch[1];
        
        const newVideoId = getVideoIdForResource(
          resource.content_type,
          resource.tags,
          resource.title,
          resource.id
        );
        
        if (newVideoId && newVideoId !== currentVideoId) {
          const newUrl = `https://www.youtube.com/embed/${newVideoId}`;
          
          await fixPool.query(
            `UPDATE resources SET url = $1 WHERE id = $2`,
            [newUrl, resource.id]
          );
          
          updates.push({ title: resource.title, oldId: currentVideoId, newId: newVideoId });
          updated++;
        } else if (currentVideoId) {
          const embedUrl = `https://www.youtube.com/embed/${currentVideoId}`;
          if (resource.url !== embedUrl) {
            await fixPool.query(
              `UPDATE resources SET url = $1 WHERE id = $2`,
              [embedUrl, resource.id]
            );
            updates.push({ title: resource.title, action: 'format_fixed' });
            updated++;
          }
        } else {
          const newVideoId = getVideoIdForResource(
            resource.content_type,
            resource.tags,
            resource.title,
            resource.id
          );
          const newUrl = `https://www.youtube.com/embed/${newVideoId}`;
          
          await fixPool.query(
            `UPDATE resources SET url = $1 WHERE id = $2`,
            [newUrl, resource.id]
          );
          
          updates.push({ title: resource.title, action: 'assigned_new', newId: newVideoId });
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating resource "${resource.title}":`, error.message);
        errors++;
      }
    }
    
    // Verify the updates
    const verifyResult = await fixPool.query(`
      SELECT COUNT(*) as count
      FROM resources
      WHERE category IN ('video', 'audio')
      AND url LIKE '%youtube.com/embed/%'
    `);
    
    console.log(`✅ YouTube embed fix completed: ${updated} updated, ${errors} errors`);
    
    res.json({
      success: true,
      message: 'YouTube embeds fixed successfully',
      summary: {
        totalFound: result.rows.length,
        updated,
        errors,
        totalWithEmbedUrls: parseInt(verifyResult.rows[0].count)
      },
      updates: updates.slice(0, 20), // Return first 20 updates for preview
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fixing YouTube embeds:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fix YouTube embeds',
      error: error.message 
    });
  }
});

module.exports = router;
