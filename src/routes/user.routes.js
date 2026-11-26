const express = require('express');
const { submitAssessment, getMyReports } = require('../controllers/user.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('USER'));

router.post('/assessments', submitAssessment);
router.get('/reports', getMyReports);

module.exports = router;