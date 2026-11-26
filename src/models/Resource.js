const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['VIDEO', 'ARTICLE'],
            required: true,
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
        tags: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);