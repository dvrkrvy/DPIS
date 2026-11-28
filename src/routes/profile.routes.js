const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    getMyProfile,
    updateMyProfile,
    getProfileById,
} = require('../controllers/profile.controller');

router.use(verifyToken);

router.get('/me', requireRole('USER', 'DOCTOR'), getMyProfile);
router.put('/me', requireRole('USER', 'DOCTOR'), updateMyProfile);
router.get('/:targetId', getProfileById);

module.exports = router;
