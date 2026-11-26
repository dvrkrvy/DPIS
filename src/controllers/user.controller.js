const Assessment = require('../models/Assessment');
const Report = require('../models/Report');
const Resource = require('../models/Resource');
const { evaluateAssessment } = require('../utils/scoring');
const { generateAssessmentReport } = require('../config/ai');

const getCurrentMonthKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const submitAssessment = async (req, res) => {
    try {
        const { phq9Answers, gad7Answers, pss10Answers, month } = req.body;

        if (!req.user.orgId) {
            return res.status(400).json({ message: 'User must belong to an organization to submit an assessment' });
        }

        const result = evaluateAssessment({ phq9Answers, gad7Answers, pss10Answers });
        if (result.error) {
            return res.status(400).json({ message: result.error });
        }

        const assessment = await Assessment.create({
            anonymousId: req.user.anonymousId,
            orgId: req.user.orgId,
            month: month || getCurrentMonthKey(),
            scores: result.scores,
            severityTier: result.severityTier,
            doctorStatus: 'UNREVIEWED',
        });

        const resources = await Resource.find();

        const aiResult = await generateAssessmentReport({
            scores: result.scores,
            severityTier: result.severityTier,
            crisisFlag: result.crisisFlag,
            resources,
        });

        const report = await Report.create({
            assessmentId: assessment._id,
            anonymousId: req.user.anonymousId,
            orgId: req.user.orgId,
            aiSummary: aiResult.aiSummary,
            recommendedResourceIds: aiResult.recommendedResourceIds,
            actionableSteps: aiResult.actionableSteps,
        });

        const populatedReport = await Report.findById(report._id).populate('recommendedResourceIds');

        return res.status(201).json({
            message: 'Assessment submitted and report generated',
            crisisAlert: result.crisisFlag,
            assessment,
            report: populatedReport,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to submit assessment', error: err.message });
    }
};

const getMyReports = async (req, res) => {
    try {
        const assessments = await Assessment.find({ anonymousId: req.user.anonymousId }).sort({
            createdAt: -1,
        });

        const reports = await Report.find({ anonymousId: req.user.anonymousId })
            .populate('recommendedResourceIds')
            .sort({ createdAt: -1 });

        return res.json({
            anonymousId: req.user.anonymousId,
            assessments,
            reports,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch reports', error: err.message });
    }
};

module.exports = { submitAssessment, getMyReports };