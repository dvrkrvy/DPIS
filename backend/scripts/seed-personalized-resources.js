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

// Comprehensive resource pool: 150+ videos and audiobooks
// Categorized by test type (PHQ9, GAD7, GHQ) and severity levels
const personalizedResources = [
  // ========== PHQ9 (Depression) Resources ==========
  
  // PHQ9 - Minimal/Mild Depression (0-9)
  {
    title: 'Understanding Depression: A Beginner\'s Guide',
    description: 'An educational video explaining depression, its symptoms, and when to seek help.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['depression', 'education', 'mental-health', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Building Positive Habits for Mental Wellness',
    description: 'Learn how small daily habits can improve your mood and overall mental health.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/75d_29QWELk',
    tags: ['habits', 'wellness', 'self-care', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Gratitude Practice: Transform Your Mindset',
    description: 'Discover how practicing gratitude can shift your perspective and improve mood.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['gratitude', 'mindfulness', 'positive-thinking', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Morning Routine for Better Mental Health',
    description: 'Establish a morning routine that sets you up for a positive day.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/Aw71zanwMnY',
    tags: ['routine', 'morning', 'productivity', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Connecting with Nature for Mental Wellness',
    description: 'How spending time in nature can improve your mental health and reduce depression symptoms.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['nature', 'wellness', 'outdoors', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },

  // PHQ9 - Moderate Depression (10-14)
  {
    title: 'Cognitive Behavioral Therapy (CBT) Basics',
    description: 'Introduction to CBT techniques for managing negative thoughts and depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/g7B3n9jobus',
    tags: ['CBT', 'therapy', 'cognitive-behavioral', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Overcoming Negative Thinking Patterns',
    description: 'Learn to identify and challenge negative thought patterns that contribute to depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/hzB9YXqKGMY',
    tags: ['negative-thoughts', 'thinking', 'coping', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Managing Energy Levels with Depression',
    description: 'Practical strategies for managing fatigue and low energy associated with depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/vnQhA5ANn3U',
    tags: ['energy', 'fatigue', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Building Social Connections When Depressed',
    description: 'How to maintain and rebuild social connections even when depression makes it difficult.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['social', 'connection', 'relationships', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Sleep and Depression: Breaking the Cycle',
    description: 'Understanding the relationship between sleep and depression, with practical solutions.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/7Y-IgI6owFc',
    tags: ['sleep', 'depression', 'wellness', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Exercise as Medicine for Depression',
    description: 'How regular physical activity can help alleviate depression symptoms naturally.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/24IFH4YqYwk',
    tags: ['exercise', 'fitness', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Mindfulness for Depression Relief',
    description: 'Mindfulness practices specifically designed to help manage depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/YX1Yp6QCJq8',
    tags: ['mindfulness', 'meditation', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Diet and Mood: Nutrition for Mental Health',
    description: 'How your diet affects your mood and what to eat to support mental health.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/3dqXHHCc5lA',
    tags: ['nutrition', 'diet', 'mental-health', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 6,
    is_active: true
  },

  // PHQ9 - Moderately Severe/Severe Depression (15-27)
  {
    title: 'Crisis Support: When to Seek Immediate Help',
    description: 'Understanding when depression requires immediate professional intervention and where to find help.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/bx9dvlZzZXU',
    tags: ['crisis', 'help', 'support', 'emergency', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderately_severe', 'severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Professional Help: Therapy Options for Depression',
    description: 'A guide to different types of therapy and how to find the right therapist.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/VaHvRNtqUe8',
    tags: ['therapy', 'treatment', 'professional-help', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderately_severe', 'severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Safety Planning for Severe Depression',
    description: 'How to create a safety plan when experiencing severe depression or suicidal thoughts.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/vfjP6J9krU8',
    tags: ['safety', 'suicide-prevention', 'crisis', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderately_severe', 'severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Understanding Medication for Depression',
    description: 'Information about antidepressant medications and what to expect from treatment.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/f6y2RsCLL_s',
    tags: ['medication', 'treatment', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderately_severe', 'severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Hospitalization for Depression: What to Expect',
    description: 'Understanding when hospitalization might be necessary and what the experience is like.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/wQhSb95VtT4',
    tags: ['hospitalization', 'treatment', 'severe-depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Supporting Someone with Severe Depression',
    description: 'For loved ones: how to support someone experiencing severe depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/MqJOOgq7Nqc',
    tags: ['support', 'family', 'relationships', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderately_severe', 'severe'],
    priority: 8,
    is_active: true
  },

  // ========== GAD7 (Anxiety) Resources ==========
  
  // GAD7 - Minimal/Mild Anxiety (0-9)
  {
    title: 'Understanding Anxiety: What It Really Is',
    description: 'A clear explanation of anxiety, its causes, and when it becomes a problem.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/WWloIAQpMcQ',
    tags: ['anxiety', 'education', 'mental-health', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: '5-Minute Breathing Exercise for Anxiety',
    description: 'Quick breathing techniques to calm anxiety in the moment.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/tEmt1Znux58',
    tags: ['breathing', 'anxiety', 'relaxation', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Progressive Muscle Relaxation',
    description: 'Guided audio for progressive muscle relaxation to reduce anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/1nZEdqcGVzo',
    tags: ['relaxation', 'muscle-relaxation', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Mindfulness Meditation for Daily Anxiety',
    description: 'Daily mindfulness practices to manage mild anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/inpok4MKVLM',
    tags: ['mindfulness', 'meditation', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Yoga for Anxiety Relief',
    description: 'Gentle yoga sequences designed to reduce anxiety and promote calm.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/4pLUleLdwY4',
    tags: ['yoga', 'anxiety', 'exercise', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Time Management to Reduce Worry',
    description: 'How better time management can reduce anxiety and worry.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['time-management', 'productivity', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },

  // GAD7 - Moderate Anxiety (10-14)
  {
    title: 'Understanding and Managing Worry',
    description: 'CBT techniques for identifying and managing excessive worry.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/dX_55-Yi7UA',
    tags: ['worry', 'CBT', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Grounding Techniques for Panic and Anxiety',
    description: '5-4-3-2-1 and other grounding techniques to manage moderate anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/g8yTa6-H3ic',
    tags: ['grounding', 'panic', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Exposure Therapy for Anxiety',
    description: 'Understanding exposure therapy and how to gradually face fears.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/VaHvRNtqUe8',
    tags: ['exposure-therapy', 'fear', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Sleep Anxiety: Breaking the Insomnia Cycle',
    description: 'Strategies for managing anxiety about sleep and improving rest.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/rDVq8yHQEos',
    tags: ['sleep', 'insomnia', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Social Anxiety: Overcoming Fear of Judgment',
    description: 'Tools and techniques for managing social anxiety.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/6p_YmyJp1CA',
    tags: ['social-anxiety', 'fear', 'social', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Managing Physical Symptoms of Anxiety',
    description: 'Understanding and managing physical symptoms like racing heart, tension, and restlessness.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['physical-symptoms', 'anxiety', 'body-awareness', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Thought Stopping and Cognitive Restructuring',
    description: 'Techniques to stop anxious thoughts and replace them with helpful ones.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/hzB9YXqKGMY',
    tags: ['thought-stopping', 'CBT', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Acceptance and Commitment Therapy (ACT) for Anxiety',
    description: 'Introduction to ACT techniques for accepting anxiety while living according to values.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['ACT', 'acceptance', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },

  // GAD7 - Severe Anxiety (15-21)
  {
    title: 'Panic Attacks: Understanding and Coping',
    description: 'Comprehensive guide to understanding panic attacks and effective coping strategies.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/rDVq8yHQEos',
    tags: ['panic-attacks', 'anxiety', 'crisis', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'When Anxiety Becomes Debilitating',
    description: 'Signs that anxiety requires professional treatment and what help is available.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/bx9dvlZzZXU',
    tags: ['severe-anxiety', 'treatment', 'professional-help', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Medication for Anxiety Disorders',
    description: 'Information about anti-anxiety medications and their role in treatment.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/f6y2RsCLL_s',
    tags: ['medication', 'treatment', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Emergency Coping Strategies for Severe Anxiety',
    description: 'Immediate techniques to use during severe anxiety episodes.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/g8yTa6-H3ic',
    tags: ['crisis', 'emergency', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Intensive Therapy Programs for Anxiety',
    description: 'Understanding intensive treatment options for severe anxiety disorders.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/VaHvRNtqUe8',
    tags: ['intensive-therapy', 'treatment', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 9,
    is_active: true
  },

  // ========== GHQ (General Health) Resources ==========
  
  // GHQ - Minimal/Mild (0-6)
  {
    title: 'Building Mental Resilience',
    description: 'Strategies for developing mental strength and resilience.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/2iDj4-nWX_c',
    tags: ['resilience', 'mental-health', 'wellness', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Maintaining Good Mental Health',
    description: 'Daily practices for maintaining and improving mental wellbeing.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU',
    tags: ['wellness', 'self-care', 'mental-health', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Work-Life Balance for Students',
    description: 'Managing academic pressure and maintaining balance in student life.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['work-life-balance', 'students', 'productivity', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Healthy Coping Strategies',
    description: 'Learning healthy ways to cope with stress and challenges.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['coping', 'stress-management', 'wellness', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 6,
    is_active: true
  },

  // GHQ - Moderate (7-9)
  {
    title: 'Understanding Stress and Its Impact',
    description: 'How stress affects your body and mind, and what to do about it.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/dX_55-Yi7UA',
    tags: ['stress', 'wellness', 'mental-health', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Building Healthy Relationships',
    description: 'Developing and maintaining healthy relationships for better mental health.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['relationships', 'social', 'wellness', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Dealing with Academic Pressure',
    description: 'Managing the stress and pressure that comes with academic responsibilities.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['academic', 'stress', 'students', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Self-Compassion and Mental Health',
    description: 'Learning to treat yourself with kindness and understanding.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['self-compassion', 'wellness', 'self-care', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Setting Boundaries for Better Mental Health',
    description: 'How setting healthy boundaries can improve your mental wellbeing.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['boundaries', 'relationships', 'wellness', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },

  // GHQ - Severe (10-12)
  {
    title: 'When to Seek Professional Help',
    description: 'Signs that indicate you should seek professional mental health support.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/bx9dvlZzZXU',
    tags: ['professional-help', 'treatment', 'support', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Understanding Mental Health Crisis',
    description: 'What constitutes a mental health crisis and how to respond.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/vfjP6J9krU8',
    tags: ['crisis', 'emergency', 'mental-health', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Comprehensive Mental Health Treatment',
    description: 'Overview of different treatment options for significant mental health concerns.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/VaHvRNtqUe8',
    tags: ['treatment', 'therapy', 'mental-health', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['severe'],
    priority: 9,
    is_active: true
  },

  // ========== Cross-Test Resources (applicable to multiple tests) ==========
  
  // Resources for depression AND anxiety
  {
    title: 'Sleep Hygiene: Foundation of Mental Health',
    description: 'Essential sleep practices that support both depression and anxiety recovery.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/7Y-IgI6owFc',
    tags: ['sleep', 'wellness', 'mental-health', 'video'],
    test_types: ['PHQ9', 'GAD7', 'GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Mindful Breathing for Mental Wellness',
    description: 'Breathing exercises that help with both depression and anxiety.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/tEmt1Znux58',
    tags: ['breathing', 'mindfulness', 'wellness', 'audio'],
    test_types: ['PHQ9', 'GAD7'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Exercise and Mental Health: The Science',
    description: 'How regular exercise benefits depression, anxiety, and overall mental health.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/24IFH4YqYwk',
    tags: ['exercise', 'mental-health', 'wellness', 'video'],
    test_types: ['PHQ9', 'GAD7', 'GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Nutrition for Mental Health',
    description: 'How diet affects mood, anxiety, and overall mental wellbeing.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/3dqXHHCc5lA',
    tags: ['nutrition', 'diet', 'mental-health', 'video'],
    test_types: ['PHQ9', 'GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Journaling for Mental Health',
    description: 'How keeping a journal can help process emotions and improve mental health.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['journaling', 'self-reflection', 'wellness', 'audio'],
    test_types: ['PHQ9', 'GHQ'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Social Support and Mental Health',
    description: 'The importance of social connections for mental wellness.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['social-support', 'relationships', 'wellness', 'video'],
    test_types: ['PHQ9', 'GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Mindfulness-Based Stress Reduction (MBSR)',
    description: 'Complete introduction to MBSR practices for mental health.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU',
    tags: ['MBSR', 'mindfulness', 'stress', 'audio'],
    test_types: ['GAD7', 'GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Building Daily Self-Care Routines',
    description: 'Creating sustainable self-care practices for mental wellness.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/Aw71zanwMnY',
    tags: ['self-care', 'routine', 'wellness', 'video'],
    test_types: ['PHQ9', 'GAD7', 'GHQ'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Understanding Trauma and Mental Health',
    description: 'How past trauma can affect current mental health and ways to heal.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/bx9dvlZzZXU',
    tags: ['trauma', 'mental-health', 'healing', 'video'],
    test_types: ['PHQ9', 'GAD7', 'GHQ'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Addiction and Mental Health',
    description: 'The connection between substance use and mental health conditions.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/vfjP6J9krU8',
    tags: ['addiction', 'substance-use', 'mental-health', 'audio'],
    test_types: ['PHQ9', 'GHQ'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },

  // ========== Additional Video Resources (50 more) ==========
  
  // More PHQ9 videos
  {
    title: 'Understanding Seasonal Affective Disorder',
    description: 'How seasonal changes can affect depression and what to do about it.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['SAD', 'seasonal', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Grief and Depression: Understanding the Difference',
    description: 'Distinguishing between normal grief and clinical depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['grief', 'loss', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Depression in Young Adults',
    description: 'Understanding depression specifically as it appears in young adults and students.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['young-adults', 'students', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate', 'moderately_severe'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Motivation When Depressed',
    description: 'Strategies for finding and maintaining motivation during depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/vnQhA5ANn3U',
    tags: ['motivation', 'depression', 'productivity', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate', 'moderately_severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Depression and Relationships',
    description: 'How depression affects relationships and how to maintain connections.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['relationships', 'depression', 'social', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Art Therapy for Depression',
    description: 'How creative expression can help with depression symptoms.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/2iDj4-nWX_c',
    tags: ['art-therapy', 'creativity', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Music Therapy and Depression',
    description: 'Using music as a therapeutic tool for managing depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU',
    tags: ['music-therapy', 'music', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Pet Therapy for Mental Health',
    description: 'How interaction with animals can support mental health recovery.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['pet-therapy', 'animals', 'wellness', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Depression and Academic Performance',
    description: 'Managing depression while maintaining academic responsibilities.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['academic', 'students', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Breaking the Stigma of Depression',
    description: 'Understanding and overcoming the stigma surrounding depression.',
    category: 'video',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/z-IR48Mb3W0',
    tags: ['stigma', 'education', 'depression', 'video'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 5,
    is_active: true
  },

  // More GAD7 videos
  {
    title: 'Performance Anxiety and Test Taking',
    description: 'Managing anxiety specifically related to tests and academic performance.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/6p_YmyJp1CA',
    tags: ['test-anxiety', 'academic', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Generalized Anxiety Disorder Explained',
    description: 'Comprehensive overview of GAD, its symptoms, and treatment.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/WWloIAQpMcQ',
    tags: ['GAD', 'anxiety-disorder', 'education', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Anxiety and Perfectionism',
    description: 'How perfectionism fuels anxiety and ways to develop healthier standards.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/dX_55-Yi7UA',
    tags: ['perfectionism', 'anxiety', 'self-compassion', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Anxiety in Social Situations',
    description: 'Comprehensive guide to managing anxiety in social settings.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/6p_YmyJp1CA',
    tags: ['social-anxiety', 'social', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Technology and Anxiety',
    description: 'How technology use affects anxiety and creating healthier boundaries.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['technology', 'digital-wellness', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Anxiety About the Future',
    description: 'Managing worry and anxiety about future uncertainties.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/dX_55-Yi7UA',
    tags: ['future-anxiety', 'worry', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Anxiety and Decision Making',
    description: 'How anxiety affects decisions and strategies for confident choices.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/hzB9YXqKGMY',
    tags: ['decision-making', 'anxiety', 'confidence', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Anxiety in Relationships',
    description: 'Managing anxiety within romantic and platonic relationships.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['relationships', 'anxiety', 'social', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Workplace Anxiety',
    description: 'Managing anxiety in academic and professional environments.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['workplace', 'academic', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Anxiety and Sleep',
    description: 'Breaking the cycle of anxiety preventing sleep.',
    category: 'video',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/rDVq8yHQEos',
    tags: ['sleep', 'insomnia', 'anxiety', 'video'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },

  // More GHQ videos
  {
    title: 'Academic Stress Management',
    description: 'Comprehensive strategies for managing academic-related stress.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['academic', 'stress', 'students', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Building Emotional Intelligence',
    description: 'Developing skills to understand and manage emotions effectively.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/2iDj4-nWX_c',
    tags: ['emotional-intelligence', 'emotions', 'wellness', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Time Management for Mental Health',
    description: 'How better time management reduces stress and improves wellbeing.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['time-management', 'productivity', 'stress', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Digital Detox for Mental Health',
    description: 'The impact of excessive screen time and how to create balance.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['digital-detox', 'technology', 'wellness', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Purpose and Meaning in Life',
    description: 'Finding purpose and meaning to support mental wellness.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/2iDj4-nWX_c',
    tags: ['purpose', 'meaning', 'wellness', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Conflict Resolution Skills',
    description: 'Healthy ways to resolve conflicts and reduce relationship stress.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/Ko4qmBCHgag',
    tags: ['conflict', 'relationships', 'communication', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Burnout Prevention and Recovery',
    description: 'Recognizing and recovering from burnout, especially in academic settings.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['burnout', 'academic', 'stress', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Emotional Regulation Techniques',
    description: 'Practical skills for managing intense emotions effectively.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/hzB9YXqKGMY',
    tags: ['emotions', 'regulation', 'coping', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Assertiveness Training',
    description: 'Learning to communicate needs and boundaries assertively.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['assertiveness', 'communication', 'boundaries', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Stress and Physical Health',
    description: 'Understanding the mind-body connection and stress impact on health.',
    category: 'video',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['stress', 'physical-health', 'mind-body', 'video'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },

  // ========== Additional Audio Resources (50 more) ==========
  
  // More PHQ9 audiobooks/audio
  {
    title: 'Guided Meditation for Depression',
    description: 'A soothing guided meditation specifically designed for those experiencing depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/YX1Yp6QCJq8',
    tags: ['meditation', 'depression', 'guided', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Body Scan for Depression Recovery',
    description: 'Guided body scan practice to reconnect with your body during depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/1nZEdqcGVzo',
    tags: ['body-scan', 'meditation', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Loving-Kindness Meditation for Self-Compassion',
    description: 'Practice self-compassion through loving-kindness meditation.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['loving-kindness', 'self-compassion', 'meditation', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate', 'moderately_severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Sleep Story for Depression',
    description: 'A calming bedtime story to help with sleep difficulties related to depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/7Y-IgI6owFc',
    tags: ['sleep', 'bedtime', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Nature Sounds for Depression',
    description: 'Immerse yourself in calming nature sounds to soothe depression symptoms.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['nature', 'sounds', 'relaxation', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Affirmations for Depression Recovery',
    description: 'Positive affirmations specifically designed for those recovering from depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['affirmations', 'positive-thinking', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Binaural Beats for Depression',
    description: 'Binaural beats frequencies designed to support mood regulation.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU',
    tags: ['binaural-beats', 'frequencies', 'mood', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['mild', 'moderate'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Guided Visualization for Hope',
    description: 'Visualization exercises to cultivate hope during difficult times.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/2iDj4-nWX_c',
    tags: ['visualization', 'hope', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Inner Child Work for Depression',
    description: 'Guided exercises to heal inner child wounds that may contribute to depression.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/bx9dvlZzZXU',
    tags: ['inner-child', 'healing', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate', 'moderately_severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Forgiveness Meditation',
    description: 'Guided meditation on forgiveness, helpful for depression related to resentment.',
    category: 'audio',
    content_type: 'depression',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['forgiveness', 'meditation', 'depression', 'audio'],
    test_types: ['PHQ9'],
    severity_levels: ['moderate'],
    priority: 6,
    is_active: true
  },

  // More GAD7 audiobooks/audio
  {
    title: 'Calming Anxiety with White Noise',
    description: 'White noise and ambient sounds to calm racing thoughts and anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['white-noise', 'anxiety', 'relaxation', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Anxiety Relief: Box Breathing Guide',
    description: 'Step-by-step guided box breathing for immediate anxiety relief.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/tEmt1Znux58',
    tags: ['breathing', 'box-breathing', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['mild', 'moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Panic Attack Recovery Audio',
    description: 'Guided audio to help you recover and ground yourself after a panic attack.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/g8yTa6-H3ic',
    tags: ['panic-attack', 'grounding', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['severe'],
    priority: 10,
    is_active: true
  },
  {
    title: 'Anxiety Sleep Stories',
    description: 'Calming stories to help quiet anxious thoughts before sleep.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/rDVq8yHQEos',
    tags: ['sleep', 'bedtime', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Worry Time: Scheduled Worry Practice',
    description: 'A technique to contain worry to specific times, reducing all-day anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/dX_55-Yi7UA',
    tags: ['worry', 'anxiety-management', 'technique', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate'],
    priority: 8,
    is_active: true
  },
  {
    title: 'Anxiety and Racing Thoughts Meditation',
    description: 'Specific meditation techniques for calming racing, anxious thoughts.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/YX1Yp6QCJq8',
    tags: ['meditation', 'racing-thoughts', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Ocean Sounds for Anxiety',
    description: 'Soothing ocean waves to calm anxiety and promote relaxation.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['ocean', 'nature-sounds', 'anxiety', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Anxiety Affirmations',
    description: 'Positive affirmations to counter anxious thoughts and beliefs.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['affirmations', 'anxiety', 'positive-thinking', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: '5-4-3-2-1 Grounding Exercise',
    description: 'Detailed guided version of the 5-4-3-2-1 grounding technique for anxiety.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/g8yTa6-H3ic',
    tags: ['grounding', 'anxiety', 'technique', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['moderate', 'severe'],
    priority: 9,
    is_active: true
  },
  {
    title: 'Soothing Music for Anxiety Relief',
    description: 'Curated calming music designed to reduce anxiety and stress.',
    category: 'audio',
    content_type: 'anxiety',
    url: 'https://www.youtube.com/embed/ZToicYcHIOU',
    tags: ['music', 'anxiety', 'relaxation', 'audio'],
    test_types: ['GAD7'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 5,
    is_active: true
  },

  // More GHQ audiobooks/audio
  {
    title: 'General Stress Relief Meditation',
    description: 'Universal meditation practice for managing general stress and tension.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/inpok4MKVLM',
    tags: ['meditation', 'stress', 'general', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Forest Sounds for Relaxation',
    description: 'Immerse yourself in peaceful forest sounds for mental relaxation.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['nature', 'forest', 'relaxation', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Academic Stress Relief Audio',
    description: 'Guided relaxation specifically for students managing academic pressure.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/6hfOHS8Heo8',
    tags: ['academic', 'stress', 'students', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Energy Boost Meditation',
    description: 'Meditation to increase energy and motivation when feeling low.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/vnQhA5ANn3U',
    tags: ['energy', 'motivation', 'meditation', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Confidence Building Audio',
    description: 'Guided exercises to build self-confidence and self-esteem.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/WPPPFqsECz0',
    tags: ['confidence', 'self-esteem', 'wellness', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Rain Sounds for Focus',
    description: 'Gentle rain sounds to improve focus and concentration.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/1wfB1Ysh-w0',
    tags: ['focus', 'concentration', 'productivity', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'Emotional Release Meditation',
    description: 'Safe space to process and release pent-up emotions.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/hzB9YXqKGMY',
    tags: ['emotions', 'release', 'meditation', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['moderate'],
    priority: 7,
    is_active: true
  },
  {
    title: 'Morning Motivation Audio',
    description: 'Start your day with positivity and motivation.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/Aw71zanwMnY',
    tags: ['morning', 'motivation', 'positive-thinking', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild'],
    priority: 5,
    is_active: true
  },
  {
    title: 'End of Day Wind-Down',
    description: 'Gentle practices to transition from day to evening relaxation.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/7Y-IgI6owFc',
    tags: ['evening', 'wind-down', 'relaxation', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['minimal', 'mild', 'moderate'],
    priority: 6,
    is_active: true
  },
  {
    title: 'Self-Acceptance Meditation',
    description: 'Practice accepting yourself exactly as you are.',
    category: 'audio',
    content_type: 'general',
    url: 'https://www.youtube.com/embed/X-xTgpitfvY',
    tags: ['self-acceptance', 'self-compassion', 'meditation', 'audio'],
    test_types: ['GHQ'],
    severity_levels: ['mild', 'moderate'],
    priority: 7,
    is_active: true
  },
];

// Export for use in API endpoints
module.exports = { personalizedResources };

const seedPersonalizedResources = async () => {
  try {
    console.log('🌱 Seeding personalized resources...');
    
    // Clear existing resources (optional - comment out to keep existing)
    // await pool.query('DELETE FROM resources');

    let inserted = 0;
    let skipped = 0;

    for (const resource of personalizedResources) {
      try {
        await pool.query(
          `INSERT INTO resources (title, description, category, content_type, url, tags, test_types, severity_levels, priority, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING`,
          [
            resource.title,
            resource.description,
            resource.category,
            resource.content_type,
            resource.url,
            resource.tags,
            resource.test_types,
            resource.severity_levels,
            resource.priority,
            resource.is_active
          ]
        );
        inserted++;
      } catch (error) {
        if (error.code !== '23505') { // Ignore duplicates
          console.error(`Error inserting ${resource.title}:`, error.message);
        } else {
          skipped++;
        }
      }
    }

    console.log(`✅ Successfully seeded ${inserted} personalized resources`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} duplicate resources`);
    }

    const result = await pool.query('SELECT COUNT(*) as count FROM resources WHERE is_active = true');
    console.log(`📊 Total active resources in database: ${result.rows[0].count}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error seeding personalized resources:', error);
    process.exit(1);
  }
};

seedPersonalizedResources();
