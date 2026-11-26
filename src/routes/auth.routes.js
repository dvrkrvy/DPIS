const express = require('express');
const {
    register,
    login,
    verifyInviteCode,
    checkEmailDomain,
    getOrganizations,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/invite/:code', verifyInviteCode);
router.get('/check-domain', checkEmailDomain);
router.get('/organizations', getOrganizations);

module.exports = router;
