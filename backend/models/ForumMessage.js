const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
    required: true,
    index: true
  },
  anonymousId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  riskFlagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
