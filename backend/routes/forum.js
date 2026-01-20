const express = require('express');
const ForumPost = require('../models/ForumPost');
const ForumMessage = require('../models/ForumMessage');
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Risk keywords for forum moderation
const RISK_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
  'self harm', 'cutting', 'hurting myself'
];

const detectRiskKeywords = (text) => {
  const lowerText = text.toLowerCase();
  return RISK_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Get all forum posts
router.get('/posts', authenticate, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const posts = await ForumPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-replies.anonymousId -reactions.anonymousId'); // Anonymize

    const total = await ForumPost.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get forum posts error:', error);
    if (error.name === 'MongooseError' || error.message.includes('Mongo') || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        message: 'Forum service temporarily unavailable. MongoDB connection required.',
        error: 'MongoDB not connected'
      });
    }
    res.status(500).json({ message: 'Failed to fetch forum posts' });
  }
});

// Get single post with replies
router.get('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .select('-replies.anonymousId -reactions.anonymousId');

    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get forum post error:', error);
    if (error.name === 'MongooseError' || error.message.includes('Mongo') || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        message: 'Forum service temporarily unavailable. MongoDB connection required.',
        error: 'MongoDB not connected'
      });
    }
    res.status(500).json({ message: 'Failed to fetch forum post' });
  }
});

// Create new forum post
router.post('/posts', authenticate, requireStudent, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const anonymousId = req.user.anonymousId;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Check for risk keywords
    const hasRiskKeywords = detectRiskKeywords(content);

    if (hasRiskKeywords) {
      // Create emergency flag
      await pool.query(
        `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          'forum_risk',
          'high',
          `Risk keywords detected in forum post: ${content.substring(0, 200)}`
        ]
      );
    }

    const post = new ForumPost({
      anonymousId,
      title,
      content,
      category: category || 'general',
      riskFlagged: hasRiskKeywords
    });

    await post.save();

    // Track activity
    await pool.query(
      `INSERT INTO progress_tracking (user_id, activity_type, notes)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'forum_post', `Created forum post: ${title}`]
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('new-post', { postId: post._id, category: post.category });
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        _id: post._id,
        title: post.title,
        content: post.content,
        category: post.category,
        createdAt: post.createdAt
      }
    });
  } catch (error) {
    console.error('Create forum post error:', error);
    if (error.name === 'MongooseError' || error.message.includes('Mongo') || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        message: 'Forum service temporarily unavailable. MongoDB connection required.',
        error: 'MongoDB not connected'
      });
    }
    res.status(500).json({ 
      message: error.message || 'Failed to create forum post'
    });
  }
});

// Add reply to post
router.post('/posts/:id/replies', authenticate, requireStudent, async (req, res) => {
  try {
    const { content } = req.body;
    const anonymousId = req.user.anonymousId;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = await ForumPost.findById(req.params.id);
    if (!post || !post.isActive || post.isLocked) {
      return res.status(404).json({ message: 'Post not found or locked' });
    }

    // Check for risk keywords
    const hasRiskKeywords = detectRiskKeywords(content);
    if (hasRiskKeywords) {
      await pool.query(
        `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          'forum_risk',
          'medium',
          `Risk keywords detected in forum reply: ${content.substring(0, 200)}`
        ]
      );
    }

    post.replies.push({
      anonymousId,
      content,
      createdAt: new Date()
    });

    await post.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`forum-${req.params.id}`).emit('new-reply', {
        postId: post._id,
        reply: { content, createdAt: new Date() }
      });
    }

    res.status(201).json({ message: 'Reply added successfully' });
  } catch (error) {
    console.error('Add reply error:', error);
    if (error.name === 'MongooseError' || error.message.includes('Mongo') || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        message: 'Forum service temporarily unavailable. MongoDB connection required.',
        error: 'MongoDB not connected'
      });
    }
    res.status(500).json({ message: 'Failed to add reply' });
  }
});

// Add reaction to post
router.post('/posts/:id/reactions', authenticate, requireStudent, async (req, res) => {
  try {
    const { type } = req.body;
    const anonymousId = req.user.anonymousId;

    if (!['like', 'dislike', 'support', 'helpful'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const post = await ForumPost.findById(req.params.id);
    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove existing reaction from this user
    post.reactions = post.reactions.filter(r => r.anonymousId !== anonymousId);
    
    // Add new reaction
    post.reactions.push({ anonymousId, type });
    await post.save();

    res.json({ message: 'Reaction added successfully' });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
});

// Get forum categories
router.get('/categories', authenticate, async (req, res) => {
  res.json({
    categories: [
      { value: 'general', label: 'General Discussion' },
      { value: 'depression', label: 'Depression Support' },
      { value: 'anxiety', label: 'Anxiety Support' },
      { value: 'stress', label: 'Stress Management' },
      { value: 'wellness', label: 'Wellness & Self-Care' },
      { value: 'support', label: 'Peer Support' }
    ]
  });
});

module.exports = router;
