const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Assessment = require('../models/Assessment');
const Message = require('../models/Message');
const UserIdentity = require('../models/UserIdentity');

const getCriticalStudentIds = async (studentIds) => {
    if (!studentIds.length) return new Set();
    const ids = await Assessment.find({
        userId: { $in: studentIds },
        severityTier: 'CRITICAL',
    }).distinct('userId');
    return new Set(ids.map((id) => String(id)));
};

const verifySessionRelationship = async (studentId, doctorId) => {
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(doctorId)) {
        return null;
    }
    return Appointment.findOne({
        studentId,
        doctorId,
        status: { $ne: 'CANCELLED' },
    }).sort({ date: -1, slotStart: -1 });
};

/**
 * GET /api/messages/threads
 * Lists active student-doctor conversation threads based on scheduled/past counseling sessions.
 * Preserves Zero-PII: doctors only see fullName/email for CRITICAL-severity students.
 */
const getThreads = async (req, res) => {
    try {
        const { userId, role } = req.user;

        if (role === 'USER') {
            const appointments = await Appointment.find({
                studentId: userId,
                status: { $ne: 'CANCELLED' },
            })
                .populate('doctorId', 'fullName role')
                .populate('orgId', 'name code')
                .sort({ date: -1, slotStart: -1 });

            const doctorMap = new Map();
            for (const appt of appointments) {
                const doc = appt.doctorId;
                if (!doc) continue;
                const key = String(doc._id);
                if (!doctorMap.has(key)) {
                    doctorMap.set(key, {
                        partnerId: key,
                        partnerRole: 'DOCTOR',
                        doctor: {
                            id: key,
                            fullName: doc.fullName,
                        },
                        orgName: appt.orgId?.name || 'Organization',
                        sessionCount: 0,
                        lastSessionDate: appt.date,
                        lastSessionSlot: appt.slot,
                        hasUpcomingSession: false,
                    });
                }
                const entry = doctorMap.get(key);
                entry.sessionCount += 1;
                if (appt.status === 'SCHEDULED' || appt.status === 'RESCHEDULED') {
                    entry.hasUpcomingSession = true;
                }
            }

            const partnerIds = Array.from(doctorMap.keys());
            const allMessages = partnerIds.length
                ? await Message.find({
                      studentId: userId,
                      doctorId: { $in: partnerIds },
                  }).sort({ createdAt: 1 })
                : [];

            const lastMsgMap = new Map();
            const unreadMap = new Map();
            for (const msg of allMessages) {
                const key = String(msg.doctorId);
                lastMsgMap.set(key, {
                    content: msg.content,
                    senderRole: msg.senderRole,
                    createdAt: msg.createdAt,
                });
                if (msg.senderRole === 'DOCTOR' && !msg.readByStudent) {
                    unreadMap.set(key, (unreadMap.get(key) || 0) + 1);
                }
            }

            const threads = Array.from(doctorMap.values())
                .map((entry) => ({
                    ...entry,
                    lastMessage: lastMsgMap.get(entry.partnerId) || null,
                    unreadCount: unreadMap.get(entry.partnerId) || 0,
                }))
                .sort((a, b) => {
                    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    if (bTime !== aTime) return bTime - aTime;
                    return b.lastSessionDate.localeCompare(a.lastSessionDate);
                });

            const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
            return res.json({ threads, totalUnread });
        }

        if (role === 'DOCTOR') {
            const appointments = await Appointment.find({
                doctorId: userId,
                status: { $ne: 'CANCELLED' },
            })
                .populate('orgId', 'name code')
                .sort({ date: -1, slotStart: -1 });

            const studentMap = new Map();
            for (const appt of appointments) {
                const key = String(appt.studentId);
                if (!studentMap.has(key)) {
                    studentMap.set(key, {
                        partnerId: key,
                        partnerRole: 'USER',
                        anonymousId: appt.anonymousId,
                        orgName: appt.orgId?.name || 'Organization',
                        orgCode: appt.orgId?.code || '',
                        sessionCount: 0,
                        lastSessionDate: appt.date,
                        lastSessionSlot: appt.slot,
                        hasUpcomingSession: false,
                    });
                }
                const entry = studentMap.get(key);
                entry.sessionCount += 1;
                if (appt.status === 'SCHEDULED' || appt.status === 'RESCHEDULED') {
                    entry.hasUpcomingSession = true;
                }
            }

            const studentIds = Array.from(studentMap.keys());
            const criticalSet = await getCriticalStudentIds(studentIds);
            const criticalIdentities = criticalSet.size
                ? await UserIdentity.find({ _id: { $in: Array.from(criticalSet) } }).select('fullName email')
                : [];
            const criticalIdentityMap = new Map(
                criticalIdentities.map((u) => [String(u._id), { fullName: u.fullName, email: u.email }])
            );

            const allMessages = studentIds.length
                ? await Message.find({
                      doctorId: userId,
                      studentId: { $in: studentIds },
                  }).sort({ createdAt: 1 })
                : [];

            const lastMsgMap = new Map();
            const unreadMap = new Map();
            for (const msg of allMessages) {
                const key = String(msg.studentId);
                lastMsgMap.set(key, {
                    content: msg.content,
                    senderRole: msg.senderRole,
                    createdAt: msg.createdAt,
                });
                if (msg.senderRole === 'USER' && !msg.readByDoctor) {
                    unreadMap.set(key, (unreadMap.get(key) || 0) + 1);
                }
            }

            const threads = Array.from(studentMap.values())
                .map((entry) => {
                    const isCritical = criticalSet.has(entry.partnerId);
                    return {
                        ...entry,
                        isCritical,
                        patient: isCritical ? criticalIdentityMap.get(entry.partnerId) || null : null,
                        lastMessage: lastMsgMap.get(entry.partnerId) || null,
                        unreadCount: unreadMap.get(entry.partnerId) || 0,
                    };
                })
                .sort((a, b) => {
                    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    if (bTime !== aTime) return bTime - aTime;
                    return b.lastSessionDate.localeCompare(a.lastSessionDate);
                });

            const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
            return res.json({ threads, totalUnread });
        }

        return res.status(403).json({ message: 'Messaging is only available for students and doctors' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load message threads', error: err.message });
    }
};

/**
 * GET /api/messages/threads/:partnerId
 * Returns chronological message history for an established student-doctor pair and marks incoming messages read.
 */
const getThreadMessages = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { userId, role } = req.user;

        const studentId = role === 'USER' ? userId : partnerId;
        const doctorId = role === 'DOCTOR' ? userId : partnerId;

        const relationship = await verifySessionRelationship(studentId, doctorId);
        if (!relationship) {
            return res.status(403).json({
                message: 'Messaging is only unlocked once you share an active or completed counseling session.',
            });
        }

        if (role === 'USER') {
            await Message.updateMany(
                { studentId, doctorId, senderRole: 'DOCTOR', readByStudent: false },
                { $set: { readByStudent: true } }
            );
        } else {
            await Message.updateMany(
                { studentId, doctorId, senderRole: 'USER', readByDoctor: false },
                { $set: { readByDoctor: true } }
            );
        }

        const messages = await Message.find({ studentId, doctorId })
            .sort({ createdAt: 1 })
            .limit(300);

        return res.json({
            messages: messages.map((m) => ({
                id: m._id,
                senderRole: m.senderRole,
                content: m.content,
                createdAt: m.createdAt,
                isMine: String(m.senderId) === String(userId),
            })),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch conversation messages', error: err.message });
    }
};

/**
 * POST /api/messages/threads/:partnerId
 * Sends a message between a student and their paired doctor.
 */
const sendMessage = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { userId, role } = req.user;
        const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

        if (!content) {
            return res.status(400).json({ message: 'Message content cannot be empty' });
        }
        if (content.length > 2000) {
            return res.status(400).json({ message: 'Message content exceeds 2000 characters' });
        }

        const studentId = role === 'USER' ? userId : partnerId;
        const doctorId = role === 'DOCTOR' ? userId : partnerId;

        const relationship = await verifySessionRelationship(studentId, doctorId);
        if (!relationship) {
            return res.status(403).json({
                message: 'Messaging is only unlocked once you share an active or completed counseling session.',
            });
        }

        const msg = await Message.create({
            studentId,
            anonymousId: relationship.anonymousId,
            doctorId,
            orgId: relationship.orgId,
            senderId: userId,
            senderRole: role,
            content,
            readByStudent: role === 'USER',
            readByDoctor: role === 'DOCTOR',
        });

        return res.status(201).json({
            message: {
                id: msg._id,
                senderRole: msg.senderRole,
                content: msg.content,
                createdAt: msg.createdAt,
                isMine: true,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
};

/**
 * GET /api/messages/unread-count
 * Lightweight endpoint for Navbar unread badge polling.
 */
const getUnreadCount = async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role === 'USER') {
            const unreadCount = await Message.countDocuments({
                studentId: userId,
                senderRole: 'DOCTOR',
                readByStudent: false,
            });
            return res.json({ unreadCount });
        }
        if (role === 'DOCTOR') {
            const unreadCount = await Message.countDocuments({
                doctorId: userId,
                senderRole: 'USER',
                readByDoctor: false,
            });
            return res.json({ unreadCount });
        }
        return res.json({ unreadCount: 0 });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch unread message count', error: err.message });
    }
};

module.exports = {
    getThreads,
    getThreadMessages,
    sendMessage,
    getUnreadCount,
};
