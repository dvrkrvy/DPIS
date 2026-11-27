const Organization = require('../models/Organization');
const Assessment = require('../models/Assessment');
const UserIdentity = require('../models/UserIdentity');
const Report = require('../models/Report');

const SEVERITY_RANK = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    LOW: 1,
};

const getAssignedOrgs = async (req, res) => {
    try {
        // All organizations are accessible to doctors
        const orgs = await Organization.find({}).sort({ name: 1 }).lean();

        // Background auto-sync: ensure doctor ID is in assignedDoctors list
        Organization.updateMany(
            { assignedDoctors: { $ne: req.user.userId } },
            { $addToSet: { assignedDoctors: req.user.userId } }
        ).exec().catch(() => {});

        const result = await Promise.all(
            orgs.map(async (org) => {
                const highOrCriticalCount = await Assessment.countDocuments({
                    orgId: org._id,
                    severityTier: { $in: ['HIGH', 'CRITICAL'] },
                });
                const totalCount = await Assessment.countDocuments({ orgId: org._id });

                return {
                    _id: org._id,
                    name: org.name,
                    type: org.type,
                    emailDomain: org.emailDomain,
                    totalCount,
                    highOrCriticalCount,
                };
            })
        );

        return res.json({ organizations: result });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load assigned organizations', error: err.message });
    }
};

const getOrgQueue = async (req, res) => {
    try {
        const { orgId } = req.params;

        let query = {};
        let orgName = 'All Organizations';

        if (orgId && orgId !== 'ALL' && orgId !== 'all') {
            const org = await Organization.findById(orgId);
            if (!org) {
                return res.status(404).json({ message: 'Organization not found' });
            }
            query.orgId = org._id;
            orgName = org.name;
        }

        const assessments = await Assessment.find(query)
            .populate('orgId', 'name type emailDomain')
            .lean();

        // Sort highest severity first, then oldest unreviewed first
        assessments.sort((a, b) => {
            const rankDiff = (SEVERITY_RANK[b.severityTier] || 0) - (SEVERITY_RANK[a.severityTier] || 0);
            if (rankDiff !== 0) return rankDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // ONLY send critical patients' personal details (name, email).
        // Non-critical patients stay strictly anonymous (anonymousId only), as seen by admin.
        const criticalAnonIds = [
            ...new Set(assessments.filter((a) => a.severityTier === 'CRITICAL').map((a) => a.anonymousId)),
        ];

        const identities = criticalAnonIds.length > 0
            ? await UserIdentity.find({ anonymousId: { $in: criticalAnonIds } })
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

        const queue = assessments.map((item) => ({
            ...item,
            orgName: item.orgId?.name || orgName,
            // Personal info only sent for CRITICAL risk patients
            patient: item.severityTier === 'CRITICAL' ? identityMap[item.anonymousId] || null : null,
        }));

        return res.json({
            organization: { _id: orgId, name: orgName },
            count: queue.length,
            queue,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load triage queue', error: err.message });
    }
};

const getPatientHistory = async (req, res) => {
    try {
        const { anonymousId } = req.params;

        const assessments = await Assessment.find({ anonymousId })
            .populate('orgId', 'name type emailDomain')
            .sort({ createdAt: -1 })
            .lean();

        if (!assessments.length) {
            return res.status(404).json({ message: 'No records found for this patient' });
        }

        // Only reveal personal details if ANY assessment has CRITICAL severity
        const hasCritical = assessments.some((a) => a.severityTier === 'CRITICAL');
        let patient = null;
        if (hasCritical) {
            const identity = await UserIdentity.findOne({ anonymousId })
                .select('fullName email')
                .lean();
            if (identity) {
                patient = { fullName: identity.fullName, email: identity.email, isCritical: true };
            }
        }

        const assessmentIds = assessments.map((a) => a._id);
        const reports = await Report.find({ assessmentId: { $in: assessmentIds } }).lean();
        const reportMap = {};
        for (const r of reports) {
            reportMap[String(r.assessmentId)] = r;
        }

        const history = assessments.map((a) => ({
            ...a,
            orgName: a.orgId?.name || 'Organization',
            report: reportMap[String(a._id)] || null,
        }));

        return res.json({
            anonymousId,
            patient,
            isCritical: hasCritical,
            totalAssessments: assessments.length,
            history,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load patient history', error: err.message });
    }
};

const updateCaseStatus = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { doctorStatus, doctorNotes } = req.body;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (doctorStatus) {
            assessment.doctorStatus = doctorStatus;
        }
        if (typeof doctorNotes === 'string') {
            assessment.doctorNotes = doctorNotes;
        }

        await assessment.save();

        return res.json({
            message: 'Case status updated successfully',
            assessment,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update case', error: err.message });
    }
};

module.exports = {
    getAssignedOrgs,
    getOrgQueue,
    getPatientHistory,
    updateCaseStatus,
};
