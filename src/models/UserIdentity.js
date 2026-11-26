const crypto = require("crypto");
const mongoose = require("mongoose");

const userIdentitySchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ['USER', 'ADMIN', 'DOCTOR'],
            default: 'USER',
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            default: null,
        },
        anonymousId: {
            type: String, 
            unique: true, 
            default: () => `USR_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        },
    },
    {timestamps: true}
);

module.exports = mongoose.model('UserIdentity', userIdentitySchema);