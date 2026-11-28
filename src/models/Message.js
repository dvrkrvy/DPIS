const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserIdentity',
        required: true,
        index: true,
    },
    anonymousId: {
        type: String,
        required: true,
        index: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserIdentity',
        required: true,
        index: true,
    },
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserIdentity',
        required: true,
    },
    senderRole: {
        type: String,
        enum: ['USER', 'DOCTOR'],
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    readByStudent: {
        type: Boolean,
        default: false,
    },
    readByDoctor: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

messageSchema.index({ studentId: 1, doctorId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
