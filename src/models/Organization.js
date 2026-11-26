const crypto = require('crypto');
const mongoose = require('mongoose');

const generateInviteCode = () => `ORG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['COMPANY', 'UNIVERSITY'],
            required: true,
        },
        emailDomain: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserIdentity',
            unique: true,
            sparse: true,
        },
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true,
            default: generateInviteCode,
        },
        assignedDoctors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'UserIdentity',
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
