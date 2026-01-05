const pool = require('../config/database');
require('dotenv').config();

// Updated YouTube video IDs - using reliable, public videos
const videoResources = [
  {
    title: 'Understanding Anxiety - Educational Video',
    url: 'https://www.youtube.com/embed/WWloIAQpMcQ', // TED-Ed: What is anxiety?
    description: 'A comprehensive video explaining anxiety, its symptoms, and healthy coping mechanisms.'
  },
  {
    title: 'Depression: What You Need to Know',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0', // Mental Health Foundation
    description: 'Learn about depression symptoms, causes, and evidence-based treatments.'
  },
  {
    title: '5-Minute Mindfulness Meditation',
    url: 'https://www.youtube.com/embed/inpok4MKVLM', // Calm
    description: 'A quick guided meditation to help reduce stress and improve focus.'
  },
  {
    title: 'Deep Breathing Exercises for Stress Relief',
    url: 'https://www.youtube.com/embed/tEmt1Znux58', // Great Meditation
    description: 'Learn breathing techniques that can help you manage stress and anxiety in the moment.'
  },
  {
    title: 'Yoga for Anxiety Relief',
    url: 'https://www.youtube.com/embed/4pLUleLdwY4', // Yoga With Adriene
    description: 'Gentle yoga routine specifically designed to help reduce anxiety and promote relaxation.'
  },
  {
    title: 'Mindfulness-Based Stress Reduction',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU', // Mindfulness Exercises
    description: 'Introduction to MBSR techniques and how they can help reduce stress and improve wellbeing.'
  }
];

const updateResources = async () => {
  try {
    // Update video resources with working YouTube URLs
    for (const video of videoResources) {
      await pool.query(
        `UPDATE resources 
         SET url = $1, description = $2
         WHERE title = $3 AND category = 'video'`,
        [video.url, video.description, video.title]
      );
    }
    console.log(`✅ Updated ${videoResources.length} video resources with working YouTube URLs`);
    
    const result = await pool.query('SELECT COUNT(*) as count FROM resources WHERE category = \'video\'');
    console.log(`Total video resources in database: ${result.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error updating resources:', error);
    process.exit(1);
  }
};

updateResources();
