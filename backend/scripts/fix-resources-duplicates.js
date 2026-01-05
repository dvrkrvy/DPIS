const pool = require('../config/database');
require('dotenv').config();

// Unique resources with reliable video IDs
const uniqueResources = [
  {
    title: 'Understanding Anxiety - Educational Video',
    description: 'A comprehensive video explaining anxiety, its symptoms, and healthy coping mechanisms.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/WWloIAQpMcQ',
    tags: ['anxiety', 'education', 'video'],
    is_active: true
  },
  {
    title: 'Depression: What You Need to Know',
    description: 'Learn about depression symptoms, causes, and evidence-based treatments.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['depression', 'education', 'video'],
    is_active: true
  },
  {
    title: '5-Minute Mindfulness Meditation',
    description: 'A quick guided meditation to help reduce stress and improve focus.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/inpok4MKVLM',
    tags: ['meditation', 'mindfulness', 'relaxation', 'video'],
    is_active: true
  },
  {
    title: 'Deep Breathing Exercises for Stress Relief',
    description: 'Learn breathing techniques that can help you manage stress and anxiety in the moment.',
    category: 'video',
    content_type: 'stress',
    url: 'https://www.youtube.com/embed/tEmt1Znux58',
    tags: ['breathing', 'stress', 'anxiety', 'video'],
    is_active: true
  },
  {
    title: 'Yoga for Anxiety Relief',
    description: 'Gentle yoga routine specifically designed to help reduce anxiety and promote relaxation.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/4pLUleLdwY4',
    tags: ['yoga', 'anxiety', 'exercise', 'video'],
    is_active: true
  },
  {
    title: 'Sleep Hygiene: Tips for Better Sleep',
    description: 'Practical advice for improving your sleep quality and establishing healthy sleep routines.',
    category: 'article',
    content_type: 'wellness',
    url: 'https://www.sleepfoundation.org/sleep-hygiene',
    tags: ['sleep', 'wellness', 'health', 'article'],
    is_active: true
  },
  {
    title: 'Coping with Academic Stress',
    description: 'A guide to managing stress related to studies, exams, and academic pressure.',
    category: 'guide',
    content_type: 'stress',
    url: null,
    tags: ['stress', 'academic', 'coping', 'guide'],
    is_active: true
  },
  {
    title: 'Social Connection and Mental Health',
    description: 'Understanding the importance of social connections for mental wellbeing.',
    category: 'article',
    content_type: 'general',
    url: 'https://www.mentalhealth.org.uk/explore-mental-health/publications/social-relationships-and-mental-health',
    tags: ['social', 'mental-health', 'wellness', 'article'],
    is_active: true
  }
];

const fixResources = async () => {
  try {
    // Delete all existing resources
    await pool.query('DELETE FROM resources');
    console.log('Cleared all existing resources');

    // Insert unique resources
    for (const resource of uniqueResources) {
      await pool.query(
        `INSERT INTO resources (title, description, category, content_type, url, tags, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          resource.title,
          resource.description,
          resource.category,
          resource.content_type,
          resource.url,
          resource.tags,
          resource.is_active
        ]
      );
    }

    console.log(`✅ Created ${uniqueResources.length} unique resources (no duplicates)`);
    
    const result = await pool.query('SELECT COUNT(*) as count FROM resources');
    console.log(`Total resources in database: ${result.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error fixing resources:', error);
    process.exit(1);
  }
};

fixResources();
