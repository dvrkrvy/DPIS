const express = require('express');
const {
    getMyOrganization,
    createOrganization,
    getAnonymousProfiles,
    getAnonymousPatientHistory,
    getAnalytics,
    getAiAnalyticsSummary,
    getClinicalTreatmentRecords,
} = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('ADMIN'));

router.get('/organization', getMyOrganization);
router.post('/organizations', createOrganization);
router.get('/profiles', getAnonymousProfiles);
router.get('/patient/:anonymousId/history', getAnonymousPatientHistory);
router.get('/analytics', getAnalytics);
router.post('/analytics/ai-summary', getAiAnalyticsSummary);
router.get('/treatment-records', getClinicalTreatmentRecords);

module.exports = router;
