const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const UserIdentity = require('../models/UserIdentity');
const Assessment = require('../models/Assessment');
const {
    isGoogleOAuthConfigured,
    getValidDoctorGoogleAuth,
    createGoogleMeetSession,
    normalizeGoogleMeetUrl,
    buildHostJoinUrl,
} = require('../services/googleMeet.service');

const COUNSELING_SLOTS = [
    { id: 'slot-1', slot: '17:00-17:25', start: '17:00', end: '17:25', label: '05:00 PM – 05:25 PM' },
    { id: 'slot-2', slot: '17:30-17:55', start: '17:30', end: '17:55', label: '05:30 PM – 05:55 PM' },
    { id: 'slot-3', slot: '18:00-18:25', start: '18:00', end: '18:25', label: '06:00 PM – 06:25 PM' },
    { id: 'slot-4', slot: '18:30-18:55', start: '18:30', end: '18:55', label: '06:30 PM – 06:55 PM' },
    { id: 'slot-5', slot: '19:00-19:25', start: '19:00', end: '19:25', label: '07:00 PM – 07:25 PM' },
    { id: 'slot-6', slot: '19:30-19:55', start: '19:30', end: '19:55', label: '07:30 PM – 07:55 PM' },
];

const getSlotAvailability = async (req, res) => {
    try {
        const { date, doctorId } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date parameter (YYYY-MM-DD) is required' });
        }

        // Active appointments in scheduled/rescheduled status
        const activeStatuses = ['SCHEDULED', 'RESCHEDULED'];

        if (doctorId) {
            // Check availability for this specific doctor only
            const bookedAppts = await Appointment.find({
                doctorId,
                date,
                status: { $in: activeStatuses },
            }).select('slot');

            const bookedSlotSet = new Set(bookedAppts.map((a) => a.slot));

            // Strictly return ONLY available/not available, no other info
            const slots = COUNSELING_SLOTS.map((s) => ({
                id: s.id,
                slot: s.slot,
                start: s.start,
                end: s.end,
                label: s.label,
                isAvailable: !bookedSlotSet.has(s.slot),
            }));

            return res.json({
                date,
                doctorId,
                slots,
            });
        }

        // General availability: check if ANY clinician is available
        const allDoctors = await UserIdentity.find({ role: 'DOCTOR' }).select('_id');
        const totalDoctors = allDoctors.length;

        if (totalDoctors === 0) {
            const slots = COUNSELING_SLOTS.map((s) => ({
                id: s.id,
                slot: s.slot,
                start: s.start,
                end: s.end,
                label: s.label,
                isAvailable: false,
            }));
            return res.json({ date, slots });
        }

        const bookedAppts = await Appointment.find({
            date,
            status: { $in: activeStatuses },
        }).select('slot doctorId');

        const slotBookedCounts = {};
        for (const a of bookedAppts) {
            slotBookedCounts[a.slot] = (slotBookedCounts[a.slot] || 0) + 1;
        }

        // Strictly return ONLY available/not available
        const slots = COUNSELING_SLOTS.map((s) => {
            const count = slotBookedCounts[s.slot] || 0;
            return {
                id: s.id,
                slot: s.slot,
                start: s.start,
                end: s.end,
                label: s.label,
                isAvailable: count < totalDoctors,
            };
        });

        return res.json({
            date,
            slots,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to check slot availability', error: err.message });
    }
};

const bookAppointment = async (req, res) => {
    try {
        const { date, slot, reason, notes, doctorId } = req.body;

        if (!date || !slot) {
            return res.status(400).json({ message: 'Date and slot are required' });
        }

        const slotInfo = COUNSELING_SLOTS.find((s) => s.slot === slot);
        if (!slotInfo) {
            return res.status(400).json({ message: 'Invalid slot selected' });
        }

        const student = await UserIdentity.findById(req.user.userId);
        if (!student || !student.orgId) {
            return res.status(400).json({ message: 'You must belong to an organization to book counseling' });
        }

        const studentConflict = await Appointment.exists({
            studentId: student._id,
            date,
            slot,
            status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
        });
        if (studentConflict) {
            return res.status(400).json({
                message: 'You already have an appointment scheduled in this time slot.',
            });
        }

        // Find all doctors
        const allDoctors = await UserIdentity.find({ role: 'DOCTOR' }).select('_id fullName');
        if (allDoctors.length === 0) {
            return res.status(400).json({ message: 'No clinicians are currently active in the platform' });
        }

        // Find doctors already booked in this slot
        const booked = await Appointment.find({
            date,
            slot,
            status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
        }).select('doctorId');

        const bookedDoctorIds = new Set(booked.map((b) => String(b.doctorId)));
        let selectedDoctor = null;

        if (doctorId) {
            if (!mongoose.Types.ObjectId.isValid(doctorId)) {
                return res.status(400).json({ message: 'Invalid doctor identifier' });
            }

            const hasPriorSession = await Appointment.exists({
                studentId: student._id,
                doctorId,
                status: { $ne: 'CANCELLED' },
            });
            if (!hasPriorSession) {
                return res.status(403).json({
                    message:
                        'You can only book directly with a doctor you have previously had a session with. Use the Counseling Calendar to match with a new available doctor.',
                });
            }

            selectedDoctor = allDoctors.find((d) => String(d._id) === String(doctorId));
            if (!selectedDoctor) {
                return res.status(404).json({ message: 'Selected clinician not found' });
            }

            if (bookedDoctorIds.has(String(selectedDoctor._id))) {
                return res.status(400).json({
                    message: 'This doctor is already booked in the selected time slot. Please choose another slot or date.',
                });
            }
        } else {
            const freeDoctors = allDoctors.filter((d) => !bookedDoctorIds.has(String(d._id)));
            if (freeDoctors.length === 0) {
                return res.status(400).json({ message: 'Selected slot is fully booked. Please choose another time slot.' });
            }

            const priorDoctorIds = await Appointment.find({
                studentId: student._id,
                status: { $ne: 'CANCELLED' },
            }).distinct('doctorId');
            const priorSet = new Set(priorDoctorIds.map((id) => String(id)));

            // Prefer matching with a random new doctor if any free doctor hasn't seen this student yet
            const newFreeDoctors = freeDoctors.filter((d) => !priorSet.has(String(d._id)));
            const candidatePool = newFreeDoctors.length > 0 ? newFreeDoctors : freeDoctors;
            selectedDoctor = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        }

        const appt = await Appointment.create({
            studentId: student._id,
            anonymousId: student.anonymousId,
            orgId: student.orgId,
            doctorId: selectedDoctor._id,
            date,
            slot,
            slotStart: slotInfo.start,
            slotEnd: slotInfo.end,
            initiatedBy: 'STUDENT',
            reason: reason || 'Confidential Student Counseling',
            notes: notes || '',
        });

        return res.status(201).json({
            message: doctorId
                ? `Session booked with Dr. ${selectedDoctor.fullName}`
                : 'Counseling appointment booked with an available clinician',
            appointment: appt,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to book appointment', error: err.message });
    }
};

const doctorBookAppointment = async (req, res) => {
    try {
        const { anonymousId, date, slot, reason, notes } = req.body;

        if (!anonymousId || !date || !slot) {
            return res.status(400).json({ message: 'anonymousId, date, and slot are required' });
        }

        const slotInfo = COUNSELING_SLOTS.find((s) => s.slot === slot);
        if (!slotInfo) {
            return res.status(400).json({ message: 'Invalid slot selected' });
        }

        const student = await UserIdentity.findOne({ anonymousId });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        // Check if doctor is already booked in this slot
        const existing = await Appointment.findOne({
            doctorId: req.user.userId,
            date,
            slot,
            status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
        });

        if (existing) {
            return res.status(400).json({ message: 'You already have an appointment scheduled in this slot' });
        }

        const appt = await Appointment.create({
            studentId: student._id,
            anonymousId: student.anonymousId,
            orgId: student.orgId,
            doctorId: req.user.userId,
            date,
            slot,
            slotStart: slotInfo.start,
            slotEnd: slotInfo.end,
            initiatedBy: 'DOCTOR',
            reason: reason || 'Clinical Triage Intervention',
            notes: notes || '',
        });

        return res.status(201).json({
            message: 'Clinical session scheduled successfully for patient',
            appointment: appt,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to schedule clinical appointment', error: err.message });
    }
};

const rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, slot } = req.body;

        if (!date || !slot) {
            return res.status(400).json({ message: 'New date and slot are required' });
        }

        const slotInfo = COUNSELING_SLOTS.find((s) => s.slot === slot);
        if (!slotInfo) {
            return res.status(400).json({ message: 'Invalid slot selected' });
        }

        const appt = await Appointment.findById(id);
        if (!appt) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const isStudent = req.user.role === 'USER';
        const isDoctor = req.user.role === 'DOCTOR';

        if (isStudent && String(appt.studentId) !== String(req.user.userId) && appt.anonymousId !== req.user.anonymousId) {
            return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
        }

        // If student is rescheduling a doctor-initiated session, they must reschedule with THAT assigned doctor
        const targetDoctorId = appt.doctorId;

        // Verify target doctor is free on the new date + slot
        const conflicting = await Appointment.findOne({
            _id: { $ne: appt._id },
            doctorId: targetDoctorId,
            date,
            slot,
            status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
        });

        if (conflicting) {
            return res.status(400).json({
                message: 'The assigned clinician is not available in this slot. Please select another slot.',
            });
        }

        appt.rescheduleHistory.push({
            previousDate: appt.date,
            previousSlot: appt.slot,
            rescheduledAt: new Date(),
            rescheduledBy: req.user.role,
        });

        appt.date = date;
        appt.slot = slot;
        appt.slotStart = slotInfo.start;
        appt.slotEnd = slotInfo.end;
        appt.status = 'RESCHEDULED';

        await appt.save();

        return res.json({
            message: 'Appointment rescheduled successfully',
            appointment: appt,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to reschedule appointment', error: err.message });
    }
};

const getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({
            $or: [{ studentId: req.user.userId }, { anonymousId: req.user.anonymousId }],
        })
            .populate('orgId', 'name type')
            .sort({ date: 1, slotStart: 1 })
            .lean();

        return res.json({ appointments });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load appointments', error: err.message });
    }
};

const getDoctorAppointments = async (req, res) => {
    try {
        const { date } = req.query;
        const query = { doctorId: req.user.userId };

        if (date) {
            query.date = date;
        }

        const doctor = await UserIdentity.findById(req.user.userId).select('googleAuth.email').lean();

        const appointments = await Appointment.find(query)
            .select('+meetingHostEmail')
            .populate('orgId', 'name type')
            .sort({ date: 1, slotStart: 1 })
            .lean();

        // Check which patients have CRITICAL assessments to reveal personal info
        const anonIds = [...new Set(appointments.map((a) => a.anonymousId))];
        const criticalAssessments = await Assessment.find({
            anonymousId: { $in: anonIds },
            severityTier: 'CRITICAL',
        }).select('anonymousId');

        const criticalAnonSet = new Set(criticalAssessments.map((a) => a.anonymousId));

        const identities = criticalAnonSet.size > 0
            ? await UserIdentity.find({ anonymousId: { $in: Array.from(criticalAnonSet) } })
                  .select('anonymousId fullName email')
                  .lean()
            : [];

        const identityMap = {};
        for (const idDoc of identities) {
            identityMap[idDoc.anonymousId] = {
                fullName: idDoc.fullName,
                email: idDoc.email,
                isCritical: true,
            };
        }

        const result = appointments.map((a) => {
            const { meetingHostEmail, ...rest } = a;
            return {
                ...rest,
                hostJoinLink: a.meetingLink
                    ? buildHostJoinUrl(a.meetingLink, meetingHostEmail || doctor?.googleAuth?.email || '')
                    : '',
                patient: criticalAnonSet.has(a.anonymousId) ? identityMap[a.anonymousId] || null : null,
                isCritical: criticalAnonSet.has(a.anonymousId),
            };
        });

        return res.json({ appointments: result });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load doctor appointments', error: err.message });
    }
};

const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['COMPLETED', 'CANCELLED', 'SCHEDULED', 'RESCHEDULED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const appt = await Appointment.findById(id);
        if (!appt) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (String(appt.doctorId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        appt.status = status;
        if ((status === 'COMPLETED' || status === 'CANCELLED') && appt.meetingStatus === 'LIVE') {
            appt.meetingStatus = 'ENDED';
            appt.meetingEndedAt = new Date();
        }
        await appt.save();

        return res.json({
            message: `Appointment marked as ${status}`,
            appointment: appt,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update appointment status', error: err.message });
    }
};

const startAppointmentMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { meetingLink: rawLink } = req.body || {};

        const appt = await Appointment.findById(id).select('+meetingHostEmail +googleEventId');
        if (!appt) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (String(appt.doctorId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Only the assigned doctor can host this meeting' });
        }

        if (appt.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot start a meeting for a cancelled appointment' });
        }

        const doctorDoc = await UserIdentity.findById(req.user.userId).select('googleAuth.email').lean();
        const fallbackHostEmail = doctorDoc?.googleAuth?.email || '';

        // Path A: Doctor attached a newly launched instant Google Meet link (or replaced an existing one)
        if (rawLink && String(rawLink).trim()) {
            const normalized = normalizeGoogleMeetUrl(String(rawLink));
            if (!normalized) {
                return res.status(400).json({
                    message: 'Please provide a valid Google Meet URL (https://meet.google.com/xxx-yyyy-zzz) or meeting code.',
                });
            }

            appt.meetingProvider = 'GOOGLE_MEET';
            appt.meetingLink = normalized.meetingLink;
            appt.meetingCode = normalized.meetingCode;
            appt.meetingStatus = 'LIVE';
            appt.meetingStartedAt = appt.meetingStartedAt || new Date();
            appt.meetingEndedAt = null;
            if (!appt.meetingHostEmail && fallbackHostEmail) {
                appt.meetingHostEmail = fallbackHostEmail;
            }
            await appt.save();

            const hostJoinLink = buildHostJoinUrl(appt.meetingLink, appt.meetingHostEmail || fallbackHostEmail);
            return res.json({
                message: 'Google Meet session is now LIVE and shared with the student.',
                mode: 'HOST_ATTACHED',
                hostJoinLink,
                appointment: {
                    ...appt.toObject(),
                    meetingHostEmail: undefined,
                    googleEventId: undefined,
                    hostJoinLink,
                },
            });
        }

        // Path B: Appointment already has a Meet link — resume/join as host
        if (appt.meetingLink) {
            appt.meetingStatus = 'LIVE';
            appt.meetingStartedAt = appt.meetingStartedAt || new Date();
            appt.meetingEndedAt = null;
            await appt.save();

            const hostJoinLink = buildHostJoinUrl(appt.meetingLink, appt.meetingHostEmail || fallbackHostEmail);
            return res.json({
                message: 'Google Meet session resumed. Joining as Host/Admin.',
                mode: 'EXISTING_MEET',
                hostJoinLink,
                appointment: {
                    ...appt.toObject(),
                    meetingHostEmail: undefined,
                    googleEventId: undefined,
                    hostJoinLink,
                },
            });
        }

        // Path C: Auto-create a real Google Meet via Doctor's connected Google OAuth Calendar API
        const googleOAuthConfigured = isGoogleOAuthConfigured();
        const doctorGoogleAuth = googleOAuthConfigured ? await getValidDoctorGoogleAuth(req.user.userId) : null;

        if (!doctorGoogleAuth) {
            return res.status(400).json({
                code: 'GOOGLE_NOT_CONNECTED',
                googleOAuthConfigured,
                message: googleOAuthConfigured
                    ? 'Connect your Google account for 1-click auto-creation, or launch Google Meet as Host and attach the room link.'
                    : 'Launch Google Meet as Host and paste the room link once to share with the student (or configure Google OAuth in .env for 1-click auto-creation).',
            });
        }

        const created = await createGoogleMeetSession({
            accessToken: doctorGoogleAuth.accessToken,
            appointment: appt,
        });

        appt.meetingProvider = 'GOOGLE_MEET';
        appt.meetingLink = created.meetingLink;
        appt.meetingCode = created.meetingCode;
        appt.googleEventId = created.googleEventId;
        appt.meetingHostEmail = doctorGoogleAuth.email || fallbackHostEmail;
        appt.meetingStatus = 'LIVE';
        appt.meetingStartedAt = new Date();
        appt.meetingEndedAt = null;
        await appt.save();

        const hostJoinLink = buildHostJoinUrl(appt.meetingLink, appt.meetingHostEmail);
        return res.json({
            message: 'Google Meet session created and LIVE! You are the Host/Admin.',
            mode: 'GOOGLE_OAUTH_AUTO',
            hostJoinLink,
            appointment: {
                ...appt.toObject(),
                meetingHostEmail: undefined,
                googleEventId: undefined,
                hostJoinLink,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Failed to start Google Meet session' });
    }
};

const endAppointmentMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const appt = await Appointment.findById(id);
        if (!appt) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (String(appt.doctorId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Only the assigned doctor can end this meeting' });
        }

        appt.meetingStatus = 'ENDED';
        appt.meetingEndedAt = new Date();
        await appt.save();

        return res.json({
            message: 'Google Meet session ended',
            appointment: appt,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to end Google Meet session', error: err.message });
    }
};

module.exports = {
    COUNSELING_SLOTS,
    getSlotAvailability,
    bookAppointment,
    doctorBookAppointment,
    rescheduleAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    startAppointmentMeeting,
    endAppointmentMeeting,
};
