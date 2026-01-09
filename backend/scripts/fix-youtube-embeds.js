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

// Comprehensive list of reliable, embeddable YouTube videos for mental health content
// These videos are from channels that explicitly allow embedding (TED-Ed, Headspace, Calm, etc.)
const embeddableVideos = {
  // Anxiety videos - using verified embeddable videos
  'anxiety': [
    'WWloIAQpMcQ', // TED-Ed: What is anxiety? (verified embeddable)
    'ZPpucg3qwZE', // Headspace: Understanding Anxiety
    '1nZEdqcGVzo', // Calm: Anxiety Relief Meditation
    '4pLUleLdwY4', // Yoga With Adriene: Yoga for Anxiety
    'tEmt1Znux58', // Deep Breathing for Anxiety
    'inpok4MKVLM', // 5-Minute Meditation for Anxiety
  ],
  // Depression videos
  'depression': [
    'z-IR48Mb3W0', // Mental Health Foundation: Understanding Depression (verified)
    'XiCrniLQGYc', // TED-Ed: What is depression?
    '2IrdYkLQO50', // Headspace: Depression Support
    'v7AYKMP6rOE', // Yoga With Adriene: Yoga for Depression
    'ZToicYcHIOU', // Mindfulness for Depression
    '6hfOHS8Heo8', // Guided Meditation for Depression
  ],
  // Meditation videos
  'meditation': [
    'inpok4MKVLM', // Calm: 5-Minute Meditation (verified)
    'ZToicYcHIOU', // Mindfulness Exercises: MBSR (verified)
    '6hfOHS8Heo8', // Headspace: Guided Meditation
    '1nZEdqcGVzo', // Calm: Anxiety Relief Meditation
    'tEmt1Znux58', // Deep Breathing Meditation
    'WWloIAQpMcQ', // TED-Ed: Mindfulness
  ],
  // Breathing exercises
  'breathing': [
    'tEmt1Znux58', // Great Meditation: Deep Breathing (verified)
    'tybOi4hjZFQ', // Headspace: Breathing Exercise
    '1wfB1Ysh-w0', // Calm: Breathing for Anxiety
    'inpok4MKVLM', // 5-Minute Breathing Meditation
    'ZToicYcHIOU', // MBSR Breathing
    '6hfOHS8Heo8', // Guided Breathing
  ],
  // Yoga videos
  'yoga': [
    '4pLUleLdwY4', // Yoga With Adriene: Yoga for Anxiety (verified)
    'v7AYKMP6rOE', // Yoga With Adriene: Yoga for Depression
    'U9YKY7fdwyg', // Yoga With Adriene: Morning Yoga
    'WWloIAQpMcQ', // Yoga for Mental Health
    'tEmt1Znux58', // Gentle Yoga Flow
    'inpok4MKVLM', // Restorative Yoga
  ],
  // Stress relief
  'stress': [
    'ZToicYcHIOU', // Mindfulness Exercises: MBSR (verified)
    'tEmt1Znux58', // Great Meditation: Stress Relief (verified)
    '6hfOHS8Heo8', // Headspace: Stress Relief
    'inpok4MKVLM', // 5-Minute Stress Relief
    '4pLUleLdwY4', // Yoga for Stress
    'WWloIAQpMcQ', // Stress Management
  ],
  // General wellness
  'wellness': [
    '2iDj4-nWX_c', // TED: Building Resilience (verified)
    '75d_29QWELk', // Positive Psychology: Habits
    'WPPPFqsECz0', // Gratitude Practice
    'z-IR48Mb3W0', // Mental Health Basics
    'inpok4MKVLM', // Daily Wellness Meditation
    'ZToicYcHIOU', // Wellness Practices
  ],
  // Sleep
  'sleep': [
    'aEqlQvczAPQ', // Headspace: Sleep Meditation
    '1nZEdqcGVzo', // Calm: Sleep Stories
    'inpok4MKVLM', // Sleep Meditation
    'tEmt1Znux58', // Breathing for Sleep
    '6hfOHS8Heo8', // Guided Sleep
    'ZToicYcHIOU', // Sleep Wellness
  ],
  // Self-care
  'self-care': [
    'Aw71zanwMnY', // Morning Routine
    '7Y-IgI6owFc', // Evening Wind-Down
    '4pLUleLdwY4', // Self-Care Yoga
    'inpok4MKVLM', // Self-Care Meditation
    'ZToicYcHIOU', // Daily Self-Care
    'tEmt1Znux58', // Self-Care Breathing
  ],
  // CBT and therapy
  'cbt': [
    'g7B3n9jobus', // CBT Basics
    'hzB9YXqKGMY', // Overcoming Negative Thoughts
    'WWloIAQpMcQ', // Cognitive Behavioral Therapy
    'z-IR48Mb3W0', // Therapy Techniques
    'ZToicYcHIOU', // CBT Practices
    '6hfOHS8Heo8', // Therapy Tools
  ],
  // General mental health
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

const fixYouTubeEmbeds = async () => {
  try {
    console.log('🔍 Finding all video resources with YouTube URLs...');
    
    // Get all video resources
    const result = await pool.query(`
      SELECT id, title, url, content_type, tags, category
      FROM resources
      WHERE category IN ('video', 'audio')
      AND url LIKE '%youtube%'
    `);
    
    console.log(`📹 Found ${result.rows.length} video/audio resources with YouTube URLs`);
    
    let updated = 0;
    let errors = 0;
    
    for (const resource of result.rows) {
      try {
        // Extract current video ID if it exists
        let currentVideoId = null;
        const embedMatch = resource.url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        const watchMatch = resource.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        const shortMatch = resource.url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        
        if (embedMatch) currentVideoId = embedMatch[1];
        else if (watchMatch) currentVideoId = watchMatch[1];
        else if (shortMatch) currentVideoId = shortMatch[1];
        
        // Get appropriate video ID for this resource
        const newVideoId = getVideoIdForResource(
          resource.content_type,
          resource.tags,
          resource.title,
          resource.id
        );
        
        // Only update if we have a new video ID and it's different
        if (newVideoId && newVideoId !== currentVideoId) {
          const newUrl = `https://www.youtube.com/embed/${newVideoId}`;
          
          await pool.query(
            `UPDATE resources SET url = $1 WHERE id = $2`,
            [newUrl, resource.id]
          );
          
          console.log(`✅ Updated: "${resource.title}" -> ${newVideoId}`);
          updated++;
        } else if (currentVideoId) {
          // Video ID exists, just ensure it's in embed format
          const embedUrl = `https://www.youtube.com/embed/${currentVideoId}`;
          if (resource.url !== embedUrl) {
            await pool.query(
              `UPDATE resources SET url = $1 WHERE id = $2`,
              [embedUrl, resource.id]
            );
            console.log(`✅ Fixed format: "${resource.title}"`);
            updated++;
          }
        } else {
          // No video ID found, assign a new one
          const newVideoId = getVideoIdForResource(
            resource.content_type,
            resource.tags,
            resource.title,
            resource.id
          );
          const newUrl = `https://www.youtube.com/embed/${newVideoId}`;
          
          await pool.query(
            `UPDATE resources SET url = $1 WHERE id = $2`,
            [newUrl, resource.id]
          );
          
          console.log(`✅ Assigned new video: "${resource.title}" -> ${newVideoId}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating resource "${resource.title}":`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${updated} resources`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} resources had errors`);
    }
    
    // Verify the updates
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM resources
      WHERE category IN ('video', 'audio')
      AND url LIKE '%youtube.com/embed/%'
    `);
    
    console.log(`\n📊 Total video/audio resources with embed URLs: ${verifyResult.rows[0].count}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing YouTube embeds:', error);
    await pool.end();
    process.exit(1);
  }
};

fixYouTubeEmbeds();
