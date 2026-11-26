const Organization = require('../models/Organization');
const Assessment = require('../models/Assessment');
const UserIdentity = require('../models/UserIdentity');

const SEVERITY_RANK = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    LOW: 1,
};

const getAssignedOrgs = async (req, res) => {
    try {
        const orgs = await Organization.find({ assignedDoctors: req.user.userId });

        const result = await Promise.all(
            orgs.map(async (org) => {
                const highOrCriticalCount = await Assessment.countDocuments({
                    orgId: org._id,
                    severityTier: { $in: ['HIGH', 'CRITICAL'] },
                });

                return {
                    _id: org._id,
                    name: org.name,
                    type: org.type,
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

        const org = await Organization.findOne({ _id: orgId, assignedDoctors: req.user.userId });
        if (!org) {
            return res.status(403).json({ message: 'You are not assigned to this organization' });
        }

        const assessments = await Assessment.find({ orgId }).lean();

        // Sort highest severity first, then oldest unreviewed first
        assessments.sort((a, b) => {
            const rankDiff = (SEVERITY_RANK[b.severityTier] || 0) - (SEVERITY_RANK[a.severityTier] || 0);
            if (rankDiff !== 0) return rankDiff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // Join identity only for this doctor's assigned org
        const anonIds = [...new Set(assessments.map((a) => a.anonymousId))];
        const identities = await UserIdentity.find({ anonymousId: { $in: anonIds } })
            .select('anonymousId fullName email')
            .lean();

        const identityMap = {};
        for (const idDoc of identities) {
            identityMap[idDoc.anonymousId] = {
                fullName: idDoc.fullName,
                email: idDoc.email,
            };
        }

        const queue = assessments.map((item) => ({
            ...item,
            patient: identityMap[item.anonymousId] || null,
        }));

        return res.json({
            organization: { _id: org._id, name: org.name },
            count: queue.length,
            queue,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load triage queue', error: err.message });
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

        const org = await Organization.findOne({
            _id: assessment.orgId,
            assignedDoctors: req.user.userId,
        });
        if (!org) {
            return res.status(403).json({ message: 'Not authorized for this organization case' });
        }

        if (doctorStatus) {
            assessment.doctorStatus = doctorStatus;
        }
        if (typeof doctorNotes === 'string') {
            assessment.doctorNotes = doctorNotes;
        }

        await assessment.save();

        return res.json({
            message: 'Case updated',
            assessment,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update case', error: err.message });
    }
};

module.exports = { getAssignedOrgs, getOrgQueue, updateCaseStatus };