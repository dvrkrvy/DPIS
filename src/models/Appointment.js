const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
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
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserIdentity',
            required: true,
            index: true,
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true,
            index: true,
        },
        slot: {
            type: String, // '17:00-17:25'
            required: true,
        },
        slotStart: {
            type: String, // '17:00'
            required: true,
        },
        slotEnd: {
            type: String, // '17:25'
            required: true,
        },
        status: {
            type: String,
            enum: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'],
            default: 'SCHEDULED',
            index: true,
        },
        initiatedBy: {
            type: String,
            enum: ['STUDENT', 'DOCTOR'],
            default: 'STUDENT',
        },
        reason: {
            type: String,
            default: 'General Counseling & Psychological Support',
        },
        notes: {
            type: String,
            default: '',
        },
        rescheduleHistory: [
            {
                previousDate: String,
                previousSlot: String,
                rescheduledAt: {
                    type: Date,
                    default: Date.now,
                },
                rescheduledBy: String,
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
