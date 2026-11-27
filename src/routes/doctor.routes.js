const express = require('express');
const {
    getAssignedOrgs,
    getOrgQueue,
    getPatientHistory,
    updateCaseStatus,
} = require('../controllers/doctor.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('DOCTOR'));

router.get('/orgs', getAssignedOrgs);
router.get('/queue/:orgId', getOrgQueue);
router.get('/patient/:anonymousId/history', getPatientHistory);
router.patch('/cases/:assessmentId', updateCaseStatus);

module.exports = router;
