const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const Organization = require('../models/Organization');
const UserIdentity = require('../models/UserIdentity');
const Report = require('../models/Report');
const Appointment = require('../models/Appointment');
const { generateAdminAnalyticsSummary } = require('../config/ai');
const { normalizeEmailDomain } = require('../utils/domain');

const resolveAdminContext = async (reqUser) => {
    const adminUser = await UserIdentity.findById(reqUser.userId);
    if (!adminUser) return { adminUser: null, org: null };

    let org = null;
    if (adminUser.orgId) {
        org = await Organization.findById(adminUser.orgId);
    }
    if (!org) {
        org = await Organization.findOne({ createdBy: adminUser._id });
    }
    if (!org && adminUser.email) {
        const domain = normalizeEmailDomain(adminUser.email);
        if (domain) {
            org = await Organization.findOne({ emailDomain: domain });
        }
    }

    if (org) {
        let dirtyUser = false;
        if (!adminUser.orgId || String(adminUser.orgId) !== String(org._id)) {
            adminUser.orgId = org._id;
            dirtyUser = true;
        }
        if (dirtyUser) {
            await adminUser.save();
        }

        let dirtyOrg = false;
        if (!org.createdBy) {
            org.createdBy = adminUser._id;
            dirtyOrg = true;
        }
        if (!org.emailDomain && adminUser.email) {
            const domain = normalizeEmailDomain(adminUser.email);
            if (domain) {
                org.emailDomain = domain;
                dirtyOrg = true;
            }
        }
        if (dirtyOrg) {
            await org.save();
        }
    }

    return { adminUser, org };
};

const resolveAdminOrgId = async (reqUser) => {
    const { org } = await resolveAdminContext(reqUser);
    return org ? org._id : null;
};

const getMyOrganization = async (req, res) => {
    try {
        const { adminUser, org } = await resolveAdminContext(req.user);
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin user not found' });
        }

        if (!org) {
            return res.json({ organization: null });
        }

        const token = jwt.sign(
            {
                userId: adminUser._id,
                anonymousId: adminUser.anonymousId,
                orgId: org._id,
                role: adminUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            organization: org,
            token,
            user: {
                id: adminUser._id,
                email: adminUser.email,
                fullName: adminUser.fullName,
                role: adminUser.role,
                orgId: org._id,
                anonymousId: adminUser.anonymousId,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to check organization', error: err.message });
    }
};

const createOrganization = async (req, res) => {
    try {
        const { name, type, companyEmail, emailDomain, inviteCode, assignedDoctors } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'name and type (COMPANY or UNIVERSITY) are required' });
        }

        const { adminUser, org: existingOrg } = await resolveAdminContext(req.user);
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin user not found' });
        }

        if (existingOrg || adminUser.orgId) {
            return res.status(409).json({
                message: 'You already belong to an organization and cannot create or change to another one.',
            });
        }

        const existingAdminOrg = await Organization.findOne({ createdBy: adminUser._id });
        if (existingAdminOrg) {
            adminUser.orgId = existingAdminOrg._id;
            await adminUser.save();
            return res.status(409).json({
                message: 'One admin can create only one organization.',
            });
        }

        const normalizedDomain = normalizeEmailDomain(companyEmail || emailDomain || adminUser.email);
        if (!normalizedDomain) {
            return res.status(400).json({
                message: 'A valid company/institution email or domain is required (e.g. hr@company.com or university.edu).',
            });
        }

        const existingDomainOrg = await Organization.findOne({ emailDomain: normalizedDomain });
        if (existingDomainOrg) {
            const adminDomain = normalizeEmailDomain(adminUser.email);
            if (adminDomain === normalizedDomain) {
                adminUser.orgId = existingDomainOrg._id;
                if (!existingDomainOrg.createdBy) {
                    existingDomainOrg.createdBy = adminUser._id;
                    await existingDomainOrg.save();
                }
                await adminUser.save();
                return res.status(409).json({
                    message: `An organization for @${normalizedDomain} is already registered and has been linked to your account. You cannot create another organization.`,
                });
            }
            return res.status(409).json({
                message: `An organization for @${normalizedDomain} is already registered.`,
            });
        }

        const allDoctors = await UserIdentity.find({ role: 'DOCTOR' }).select('_id');
        const doctorIds = allDoctors.map((d) => d._id);

        const payload = {
            name: name.trim(),
            type,
            emailDomain: normalizedDomain,
            createdBy: adminUser._id,
            assignedDoctors: doctorIds,
        };

        if (inviteCode && String(inviteCode).trim()) {
            payload.inviteCode = String(inviteCode).toUpperCase().trim();
        }

        const createdOrg = await Organization.create(payload);

        adminUser.orgId = createdOrg._id;
        await adminUser.save();

        const token = jwt.sign(
            {
                userId: adminUser._id,
                anonymousId: adminUser.anonymousId,
                orgId: adminUser.orgId,
                role: adminUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            message: 'Organization created and permanently linked to your admin account',
            organization: createdOrg,
            token,
            user: {
                id: adminUser._id,
                email: adminUser.email,
                fullName: adminUser.fullName,
                role: adminUser.role,
                orgId: adminUser.orgId,
                anonymousId: adminUser.anonymousId,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create organization', error: err.message });
    }
};

const getAnonymousProfiles = async (req, res) => {
    try {
        const orgId = await resolveAdminOrgId(req.user);
        if (!orgId) {
            return res.status(400).json({ message: 'Admin is not linked to an organization' });
        }

        const filter = { orgId };
        if (req.query.severity) {
            filter.severityTier = String(req.query.severity).toUpperCase();
        }
        if (req.query.month) {
            filter.month = String(req.query.month);
        }

        // Explicitly select only anonymized fields; never touch UserIdentity
        const profiles = await Assessment.find(filter)
            .select('anonymousId month scores severityTier doctorStatus doctorNotes createdAt')
            .sort({ createdAt: -1 });

        return res.json({
            count: profiles.length,
            profiles,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch profiles', error: err.message });
    }
};

const getAnonymousPatientHistory = async (req, res) => {
    try {
        const orgId = await resolveAdminOrgId(req.user);
        if (!orgId) {
            return res.status(400).json({ message: 'Admin is not linked to an organization' });
        }

        const { anonymousId } = req.params;
        const assessments = await Assessment.find({ orgId, anonymousId })
            .select('anonymousId month scores severityTier doctorStatus doctorNotes createdAt')
            .sort({ createdAt: -1 })
            .lean();

        if (!assessments.length) {
            return res.status(404).json({ message: 'No records found for this anonymous profile' });
        }

        const assessmentIds = assessments.map((a) => a._id);
        const reports = await Report.find({ assessmentId: { $in: assessmentIds } })
            .select('assessmentId aiSummary actionableSteps createdAt')
            .lean();

        const reportMap = {};
        for (const r of reports) {
            reportMap[String(r.assessmentId)] = r;
        }

        const history = assessments.map((a) => ({
            ...a,
            report: reportMap[String(a._id)] || null,
        }));

        return res.json({
            anonymousId,
            totalAssessments: assessments.length,
            history,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load patient history', error: err.message });
    }
};

const generateInstantAnalyticsSummary = ({ orgName, totalAssessments, severityCounts, averageScores, month }) => {
    if (totalAssessments === 0) {
        return [
            `No screening submissions recorded yet for ${month || 'all-time'}.`,
            'Encourage students and employees to participate using their organization email domain.',
            'Assigned clinicians will monitor the triage queue as submissions are completed.',
            'Aggregated clinical metrics will reflect here automatically in real time.',
        ];
    }

    const elevatedCount = (severityCounts.HIGH || 0) + (severityCounts.CRITICAL || 0);
    const elevatedPct = Math.round((elevatedCount / totalAssessments) * 100);
    const lowModPct = Math.round((((severityCounts.LOW || 0) + (severityCounts.MODERATE || 0)) / totalAssessments) * 100);

    return [
        `Cohort Participation: A total of ${totalAssessments} anonymized screenings recorded for ${month || 'all-time'}.`,
        `Severity Profile: ${lowModPct}% of the cohort falls in Low/Moderate range, while ${elevatedPct}% (${elevatedCount} cases) indicate elevated clinical monitoring needs.`,
        `Clinical Instrument Baselines: Average PHQ-9 depression score is ${averageScores.phq9}/27, GAD-7 anxiety average is ${averageScores.gad7}/21, and PSS-10 perceived stress registers at ${averageScores.pss10}/40.`,
        elevatedCount > 0
            ? `Triage Priority: ${elevatedCount} elevated cases have been routed to assigned institutional clinicians for confidential care outreach.`
            : 'Preventative Wellness: Low clinical escalation volume observed; recommend continuing general stress-management psychoeducation.',
        'Institutional Guidance: Maintain privacy-first zero-PII protocols and schedule seasonal decompression workshops during high-stress academic or quarterly cycles.',
    ];
};

const buildCounselingAndTreatmentRecords = async (orgObjectId) => {
    const appointments = await Appointment.find({ orgId: orgObjectId })
        .populate('doctorId', 'fullName email')
        .sort({ date: -1, slotStart: -1 })
        .lean();

    const totalBooked = appointments.length;
    let completedCount = 0;
    let scheduledCount = 0;
    let cancelledCount = 0;
    let doctorInitiatedCount = 0;
    let studentInitiatedCount = 0;

    const doctorMap = {};
    const studentMap = {};

    for (const appt of appointments) {
        if (appt.status === 'COMPLETED') completedCount++;
        else if (appt.status === 'CANCELLED') cancelledCount++;
        else scheduledCount++;

        if (appt.initiatedBy === 'DOCTOR') doctorInitiatedCount++;
        else studentInitiatedCount++;

        // Doctors aggregation
        if (appt.doctorId) {
            const docId = String(appt.doctorId._id || appt.doctorId);
            if (!doctorMap[docId]) {
                doctorMap[docId] = {
                    doctorId: docId,
                    fullName: appt.doctorId.fullName || 'Assigned Clinician',
                    email: appt.doctorId.email || '',
                    completedSessions: 0,
                    scheduledSessions: 0,
                    cancelledSessions: 0,
                    totalSessions: 0,
                    uniqueStudents: new Set(),
                    lastSessionDate: appt.date,
                    lastSlot: appt.slot,
                };
            }
            const dEntry = doctorMap[docId];
            dEntry.totalSessions++;
            if (appt.status === 'COMPLETED') dEntry.completedSessions++;
            else if (appt.status === 'CANCELLED') dEntry.cancelledSessions++;
            else dEntry.scheduledSessions++;

            if (appt.anonymousId) dEntry.uniqueStudents.add(appt.anonymousId);
            if (appt.date > dEntry.lastSessionDate) {
                dEntry.lastSessionDate = appt.date;
                dEntry.lastSlot = appt.slot;
            }
        }

        // Students aggregation
        const anonId = appt.anonymousId;
        if (anonId) {
            if (!studentMap[anonId]) {
                studentMap[anonId] = {
                    anonymousId: anonId,
                    totalSessions: 0,
                    completedSessions: 0,
                    scheduledSessions: 0,
                    cancelledSessions: 0,
                    doctorsInvolved: new Set(),
                    lastSessionDate: appt.date,
                    lastSlot: appt.slot,
                };
            }
            const sEntry = studentMap[anonId];
            sEntry.totalSessions++;
            if (appt.status === 'COMPLETED') sEntry.completedSessions++;
            else if (appt.status === 'CANCELLED') sEntry.cancelledSessions++;
            else sEntry.scheduledSessions++;

            if (appt.doctorId && appt.doctorId.fullName) {
                sEntry.doctorsInvolved.add(appt.doctorId.fullName);
            }
            if (appt.date > sEntry.lastSessionDate) {
                sEntry.lastSessionDate = appt.date;
                sEntry.lastSlot = appt.slot;
            }
        }
    }

    // Match students with their latest assessment severity tier & check critical status
    const studentAnonIds = Object.keys(studentMap);
    const assessments = studentAnonIds.length > 0
        ? await Assessment.find({ orgId: orgObjectId, anonymousId: { $in: studentAnonIds } })
            .select('anonymousId severityTier doctorStatus createdAt')
            .sort({ createdAt: -1 })
            .lean()
        : [];

    const anonSeverityMap = {};
    const anonStatusMap = {};
    for (const ass of assessments) {
        if (!anonSeverityMap[ass.anonymousId]) {
            anonSeverityMap[ass.anonymousId] = ass.severityTier;
            anonStatusMap[ass.anonymousId] = ass.doctorStatus || 'UNREVIEWED';
        }
    }

    // Doctors who have treated at least 1 student (or have appointments)
    const treatedDoctors = Object.values(doctorMap)
        .map((d) => ({
            doctorId: d.doctorId,
            fullName: d.fullName,
            email: d.email,
            completedSessions: d.completedSessions,
            scheduledSessions: d.scheduledSessions,
            cancelledSessions: d.cancelledSessions,
            totalSessions: d.totalSessions,
            uniqueStudentsCount: d.uniqueStudents.size,
            uniqueStudents: Array.from(d.uniqueStudents),
            lastSessionDate: d.lastSessionDate,
            lastSlot: d.lastSlot,
        }))
        .filter((d) => d.totalSessions > 0)
        .sort((a, b) => b.completedSessions - a.completedSessions || b.totalSessions - a.totalSessions);

    // Students who have received treatment / counseling
    const treatedStudents = Object.values(studentMap)
        .map((s) => ({
            anonymousId: s.anonymousId,
            totalSessions: s.totalSessions,
            completedSessions: s.completedSessions,
            scheduledSessions: s.scheduledSessions,
            cancelledSessions: s.cancelledSessions,
            doctorsInvolved: Array.from(s.doctorsInvolved),
            lastSessionDate: s.lastSessionDate,
            lastSlot: s.lastSlot,
            severityTier: anonSeverityMap[s.anonymousId] || 'MODERATE',
            doctorStatus: anonStatusMap[s.anonymousId] || 'IN_CARE',
        }))
        .filter((s) => s.totalSessions > 0)
        .sort((a, b) => b.completedSessions - a.completedSessions || b.totalSessions - a.totalSessions);

    const completionRate = totalBooked > 0 ? Math.round((completedCount / totalBooked) * 100) : 0;

    const counselingAnalytics = {
        totalBooked,
        completedCount,
        scheduledCount,
        cancelledCount,
        doctorInitiatedCount,
        studentInitiatedCount,
        completionRate,
        uniqueStudentsTreated: treatedStudents.length,
        uniqueDoctorsActive: treatedDoctors.length,
    };

    return {
        counselingAnalytics,
        treatedDoctors,
        treatedStudents,
    };
};

const getAnalytics = async (req, res) => {
    try {
        const orgId = await resolveAdminOrgId(req.user);
        if (!orgId) {
            return res.status(400).json({ message: 'Admin is not linked to an organization' });
        }

        const orgObjectId = new mongoose.Types.ObjectId(orgId);
        const matchStage = { orgId: orgObjectId };
        if (req.query.month) {
            matchStage.month = String(req.query.month);
        }

        const stats = await Assessment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAssessments: { $sum: 1 },
                    avgPhq9: { $avg: '$scores.phq9' },
                    avgGad7: { $avg: '$scores.gad7' },
                    avgPss10: { $avg: '$scores.pss10' },
                    lowCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'LOW'] }, 1, 0] } },
                    moderateCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'MODERATE'] }, 1, 0] } },
                    highCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'HIGH'] }, 1, 0] } },
                    criticalCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'CRITICAL'] }, 1, 0] } },
                },
            },
        ]);

        const org = await Organization.findById(orgId);
        const row = stats[0] || {
            totalAssessments: 0,
            avgPhq9: 0,
            avgGad7: 0,
            avgPss10: 0,
            lowCount: 0,
            moderateCount: 0,
            highCount: 0,
            criticalCount: 0,
        };

        const averageScores = {
            phq9: Number((row.avgPhq9 || 0).toFixed(2)),
            gad7: Number((row.avgGad7 || 0).toFixed(2)),
            pss10: Number((row.avgPss10 || 0).toFixed(2)),
        };

        const severityCounts = {
            LOW: row.lowCount,
            MODERATE: row.moderateCount,
            HIGH: row.highCount,
            CRITICAL: row.criticalCount,
        };

        // Instant deterministic summary: 0ms latency, never blocks graphs on slow external AI
        let aiBulletPoints = generateInstantAnalyticsSummary({
            orgName: org ? org.name : 'Organization',
            month: req.query.month || 'all-time',
            totalAssessments: row.totalAssessments,
            severityCounts,
            averageScores,
        });

        // Only call external LLM if explicitly requested via query param
        if (req.query.generateAi === 'true' && row.totalAssessments > 0) {
            try {
                aiBulletPoints = await generateAdminAnalyticsSummary({
                    orgName: org ? org.name : 'Organization',
                    month: req.query.month || 'all-time',
                    totalAssessments: row.totalAssessments,
                    severityCounts,
                    averageScores,
                });
            } catch (aiErr) {
                console.warn('AI summary generation failed, using instant summary:', aiErr.message);
            }
        }

        const { counselingAnalytics, treatedDoctors, treatedStudents } = await buildCounselingAndTreatmentRecords(orgObjectId);

        return res.json({
            month: req.query.month || 'all-time',
            organization: org
                ? {
                      _id: org._id,
                      name: org.name,
                      type: org.type,
                      emailDomain: org.emailDomain,
                      inviteCode: org.inviteCode,
                  }
                : null,
            totalAssessments: row.totalAssessments,
            severityCounts,
            averageScores,
            aiBulletPoints,
            counselingAnalytics,
            treatedDoctors,
            treatedStudents,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to generate analytics', error: err.message });
    }
};

const getClinicalTreatmentRecords = async (req, res) => {
    try {
        const orgId = await resolveAdminOrgId(req.user);
        if (!orgId) {
            return res.status(400).json({ message: 'Admin is not linked to an organization' });
        }
        const orgObjectId = new mongoose.Types.ObjectId(orgId);
        const data = await buildCounselingAndTreatmentRecords(orgObjectId);
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch treatment records', error: err.message });
    }
};

const getAiAnalyticsSummary = async (req, res) => {
    try {
        const orgId = await resolveAdminOrgId(req.user);
        if (!orgId) {
            return res.status(400).json({ message: 'Admin is not linked to an organization' });
        }

        const orgObjectId = new mongoose.Types.ObjectId(orgId);
        const matchStage = { orgId: orgObjectId };
        if (req.body.month && req.body.month !== 'ALL' && req.body.month !== 'all-time') {
            matchStage.month = String(req.body.month);
        }

        const stats = await Assessment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAssessments: { $sum: 1 },
                    avgPhq9: { $avg: '$scores.phq9' },
                    avgGad7: { $avg: '$scores.gad7' },
                    avgPss10: { $avg: '$scores.pss10' },
                    lowCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'LOW'] }, 1, 0] } },
                    moderateCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'MODERATE'] }, 1, 0] } },
                    highCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'HIGH'] }, 1, 0] } },
                    criticalCount: { $sum: { $cond: [{ $eq: ['$severityTier', 'CRITICAL'] }, 1, 0] } },
                },
            },
        ]);

        const org = await Organization.findById(orgId);
        const row = stats[0] || {
            totalAssessments: 0,
            avgPhq9: 0,
            avgGad7: 0,
            avgPss10: 0,
            lowCount: 0,
            moderateCount: 0,
            highCount: 0,
            criticalCount: 0,
        };

        const aiBulletPoints = await generateAdminAnalyticsSummary({
            orgName: org ? org.name : 'Organization',
            month: req.body.month || 'all-time',
            totalAssessments: row.totalAssessments,
            severityCounts: {
                LOW: row.lowCount,
                MODERATE: row.moderateCount,
                HIGH: row.highCount,
                CRITICAL: row.criticalCount,
            },
            averageScores: {
                phq9: Number((row.avgPhq9 || 0).toFixed(2)),
                gad7: Number((row.avgGad7 || 0).toFixed(2)),
                pss10: Number((row.avgPss10 || 0).toFixed(2)),
            },
        });

        return res.json({ aiBulletPoints });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to generate AI summary', error: err.message });
    }
};

module.exports = {
    getMyOrganization,
    createOrganization,
    getAnonymousProfiles,
    getAnonymousPatientHistory,
    getAnalytics,
    getAiAnalyticsSummary,
    getClinicalTreatmentRecords,
};
