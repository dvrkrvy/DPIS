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
        profile: {
            avatarUrl: { type: String, default: '' },
            age: { type: Number, min: 13, max: 120, default: null },
            gender: { type: String, trim: true, maxlength: 40, default: '' },
            bio: { type: String, trim: true, maxlength: 800, default: '' },
            // Limited student profile field
            yearOrDepartment: { type: String, trim: true, maxlength: 100, default: '' },
            // Extended doctor profile fields
            specialization: { type: String, trim: true, maxlength: 150, default: '' },
            education: { type: String, trim: true, maxlength: 400, default: '' },
            yearsOfExperience: { type: Number, min: 0, max: 80, default: null },
            licenseNumber: { type: String, trim: true, maxlength: 80, default: '' },
            languages: { type: [String], default: [] },
            areasOfExpertise: { type: [String], default: [] },
            consultationHours: { type: String, trim: true, maxlength: 120, default: '' },
        },
        googleAuth: {
            email: { type: String, default: null },
            accessToken: { type: String, default: null, select: false },
            refreshToken: { type: String, default: null, select: false },
            tokenExpiry: { type: Date, default: null, select: false },
        },
    },
    {timestamps: true}
);

module.exports = mongoose.model('UserIdentity', userIdentitySchema);