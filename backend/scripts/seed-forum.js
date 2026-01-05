const mongoose = require('mongoose');
const ForumPost = require('../models/ForumPost');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dpis_forum';

const dummyPosts = [
  {
    anonymousId: 'anon_dummy1',
    title: 'Feeling overwhelmed with exams',
    content: 'Has anyone else been feeling really stressed about upcoming exams? Looking for some support and tips on how to manage anxiety during this time.',
    category: 'anxiety',
    replies: [
      {
        anonymousId: 'anon_dummy2',
        content: 'I completely understand. Try breaking your study sessions into smaller chunks and take regular breaks. You got this!',
        createdAt: new Date()
      },
      {
        anonymousId: 'anon_dummy3',
        content: 'Remember to breathe and take care of yourself. Studies are important but so is your mental health.',
        createdAt: new Date()
      }
    ],
    reactions: [
      { anonymousId: 'anon_dummy4', type: 'support' },
      { anonymousId: 'anon_dummy5', type: 'like' }
    ]
  },
  {
    anonymousId: 'anon_dummy2',
    title: 'Mindfulness exercises that help',
    content: 'I\'ve been practicing mindfulness meditation for a few weeks now and it\'s really helped with my stress levels. Would love to share resources and hear what works for others.',
    category: 'wellness',
    replies: [
      {
        anonymousId: 'anon_dummy1',
        content: 'That\'s great! Could you share some beginner-friendly exercises?',
        createdAt: new Date()
      }
    ],
    reactions: [
      { anonymousId: 'anon_dummy3', type: 'helpful' }
    ]
  },
  {
    anonymousId: 'anon_dummy3',
    title: 'Tips for better sleep',
    content: 'Sleep has been really affecting my mood lately. Any tips for establishing a better sleep routine?',
    category: 'wellness',
    replies: [],
    reactions: [
      { anonymousId: 'anon_dummy1', type: 'support' },
      { anonymousId: 'anon_dummy2', type: 'like' }
    ]
  },
  {
    anonymousId: 'anon_dummy4',
    title: 'Support group for managing stress',
    content: 'Looking to connect with others who are dealing with academic stress. Sometimes it helps just to know you\'re not alone.',
    category: 'support',
    replies: [
      {
        anonymousId: 'anon_dummy5',
        content: 'You\'re definitely not alone. This platform has been really helpful for me.',
        createdAt: new Date()
      }
    ],
    reactions: [
      { anonymousId: 'anon_dummy1', type: 'support' },
      { anonymousId: 'anon_dummy2', type: 'support' }
    ]
  },
  {
    anonymousId: 'anon_dummy5',
    title: 'Gratitude practice',
    content: 'I started keeping a gratitude journal and it\'s made such a difference in my perspective. Anyone else tried this?',
    category: 'wellness',
    replies: [],
    reactions: [
      { anonymousId: 'anon_dummy3', type: 'like' }
    ]
  }
];

const seedForum = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // Clear existing dummy posts
    await ForumPost.deleteMany({ anonymousId: { $regex: /^anon_dummy/ } });
    console.log('Cleared existing dummy posts');

    // Insert dummy posts
    const posts = await ForumPost.insertMany(dummyPosts);
    console.log(`✅ Created ${posts.length} dummy forum posts`);

    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding forum:', error.message);
    console.error('Note: Make sure MongoDB is running (mongod)');
    console.error('The forum will work once MongoDB is started');
    process.exit(1);
  }
};

seedForum();
