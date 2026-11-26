const express = require('express');
const {
    getMyOrganization,
    createOrganization,
    getAnonymousProfiles,
    getAnalytics,
    getAiAnalyticsSummary,
} = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('ADMIN'));

router.get('/organization', getMyOrganization);
router.post('/organizations', createOrganization);
router.get('/profiles', getAnonymousProfiles);
router.get('/analytics', getAnalytics);
router.post('/analytics/ai-summary', getAiAnalyticsSummary);

module.exports = router;