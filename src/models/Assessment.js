const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
    {
        anonymousId: {
            type: String,
            required: true,
            index: true,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        month: {
            type: String,
            required: true,
        },
        scores: {
            phq9: { type: Number, required: true, min: 0, max: 27 },
            gad7: { type: Number, required: true, min: 0, max: 21 },
            pss10: { type: Number, required: true, min: 0, max: 40 },
        },
        severityTier: {
            type: String,
            enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
            required: true,
        },
        doctorStatus: {
            type: String,
            enum: ['UNREVIEWED', 'CONTACTED', 'IN_CARE', 'RESOLVED'],
            default: 'UNREVIEWED',
        },
        doctorNotes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Assessment', assessmentSchema);