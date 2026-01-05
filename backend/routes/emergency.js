const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get emergency contacts and resources
router.get('/contacts', authenticate, async (req, res) => {
  res.json({
    contacts: {
      hotline: process.env.EMERGENCY_HOTLINE || '988',
      crisisTextLine: 'Text HOME to 741741',
      institutionEmail: process.env.INSTITUTION_EMAIL || 'support@institution.edu',
      institutionPhone: process.env.INSTITUTION_PHONE || '+1-800-HELP'
    },
    message: 'If you are in immediate danger, please call 911 or your local emergency services.'
  });
});

// Report emergency (self-report)
router.post('/report', authenticate, async (req, res) => {
  try {
    const { context } = req.body;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'self_report', 'critical', context || 'User self-reported emergency']
    );

    res.json({
      message: 'Your report has been received. Help is available.',
      contacts: {
        hotline: process.env.EMERGENCY_HOTLINE || '988',
        crisisTextLine: 'Text HOME to 741741',
        institutionEmail: process.env.INSTITUTION_EMAIL || 'support@institution.edu'
      }
    });
  } catch (error) {
    console.error('Emergency report error:', error);
    res.status(500).json({ message: 'Failed to submit emergency report' });
  }
});

module.exports = router;
