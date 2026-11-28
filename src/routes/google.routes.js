const express = require('express');
const {
    getGoogleStatus,
    getGoogleAuthUrl,
    handleGoogleCallback,
    disconnectGoogle,
} = require('../controllers/google.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// OAuth callback from Google (authenticated via signed state JWT)
router.get('/callback', handleGoogleCallback);

// Doctor-only OAuth management endpoints
router.get('/status', verifyToken, requireRole('DOCTOR'), getGoogleStatus);
router.get('/auth-url', verifyToken, requireRole('DOCTOR'), getGoogleAuthUrl);
router.delete('/disconnect', verifyToken, requireRole('DOCTOR'), disconnectGoogle);

module.exports = router;
