const express = require('express');
const { getAssignedOrgs, getOrgQueue, updateCaseStatus } = require('../controllers/doctor.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('DOCTOR'));

router.get('/orgs', getAssignedOrgs);
router.get('/queue/:orgId', getOrgQueue);
router.patch('/cases/:assessmentId', updateCaseStatus);

module.exports = router;