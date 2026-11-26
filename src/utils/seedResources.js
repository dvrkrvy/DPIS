require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('../models/Resource');

const sampleResources = [
  {
    title: '5-Minute Box Breathing for Acute Stress & Anxiety',
    type: 'VIDEO',
    url: 'https://www.youtube.com/watch?v=tEmt1Znux58',
    tags: ['anxiety', 'stress', 'breathing', 'panic'],
  },
  {
    title: 'Understanding Burnout and How to Recover Gradually',
    type: 'ARTICLE',
    url: 'https://www.helpguide.org/mental-health/stress/burnout-prevention-and-recovery',
    tags: ['burnout', 'stress', 'exhaustion', 'work'],
  },
  {
    title: 'Behavioral Activation: Small Steps When Mood Is Low',
    type: 'ARTICLE',
    url: 'https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral',
    tags: ['depression', 'low-mood', 'motivation', 'habits'],
  },
  {
    title: 'Sleep Hygiene Reset for Racing Thoughts at Night',
    type: 'VIDEO',
    url: 'https://www.youtube.com/watch?v=nm1TxQj9IsQ',
    tags: ['sleep', 'anxiety', 'insomnia', 'rest'],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Resource.deleteMany({});
    const inserted = await Resource.insertMany(sampleResources);
    console.log(`Seeded ${inserted.length} resources successfully`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();