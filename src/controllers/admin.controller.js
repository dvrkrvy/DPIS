const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const Organization = require('../models/Organization');
const UserIdentity = require('../models/UserIdentity');
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

        const payload = {
            name: name.trim(),
            type,
            emailDomain: normalizedDomain,
            createdBy: adminUser._id,
            assignedDoctors: Array.isArray(assignedDoctors) ? assignedDoctors : [],
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
            .select('anonymousId month scores severityTier doctorStatus createdAt')
            .sort({ createdAt: -1 });

        return res.json({
            count: profiles.length,
            profiles,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch profiles', error: err.message });
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
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to generate analytics', error: err.message });
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
    getAnalytics,
    getAiAnalyticsSummary,
};
