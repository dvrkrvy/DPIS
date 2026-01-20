const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  anonymousId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['general', 'depression', 'anxiety', 'stress', 'wellness', 'support'],
    default: 'general'
  },
  replies: [{
    anonymousId: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    anonymousId: String,
    type: { type: String, enum: ['like', 'dislike', 'support', 'helpful'] }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  riskFlagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ category: 1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);
