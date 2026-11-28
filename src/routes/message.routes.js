const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    getThreads,
    getThreadMessages,
    sendMessage,
    getUnreadCount,
} = require('../controllers/message.controller');

router.use(verifyToken, requireRole('USER', 'DOCTOR'));

router.get('/unread-count', getUnreadCount);
router.get('/threads', getThreads);
router.get('/threads/:partnerId', getThreadMessages);
router.post('/threads/:partnerId', sendMessage);

module.exports = router;
