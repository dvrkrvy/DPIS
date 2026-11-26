const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
    {
        assessmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assessment',
            required: true,
            unique: true,
        },
        anonymousId: {
            type: String,
            required: true,
            index: true,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        aiSummary: {
            type: String,
            required: true,
        },
        recommendedResourceIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Resource',
            },
        ],
        actionableSteps: [
            {
                type: String,
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);