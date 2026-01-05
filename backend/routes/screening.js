const express = require('express');
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Screening test definitions
const SCREENING_TESTS = {
  PHQ9: {
    name: 'PHQ-9 (Depression)',
    questions: [
      { id: 1, text: 'Little interest or pleasure in doing things' },
      { id: 2, text: 'Feeling down, depressed, or hopeless' },
      { id: 3, text: 'Trouble falling or staying asleep, or sleeping too much' },
      { id: 4, text: 'Feeling tired or having little energy' },
      { id: 5, text: 'Poor appetite or overeating' },
      { id: 6, text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down' },
      { id: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
      { id: 8, text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual' },
      { id: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself' }
    ],
    scoring: {
      0: 0, 1: 1, 2: 2, 3: 3
    },
    severity: {
      minimal: [0, 4],
      mild: [5, 9],
      moderate: [10, 14],
      moderately_severe: [15, 19],
      severe: [20, 27]
    }
  },
  GAD7: {
    name: 'GAD-7 (Anxiety)',
    questions: [
      { id: 1, text: 'Feeling nervous, anxious, or on edge' },
      { id: 2, text: 'Not being able to stop or control worrying' },
      { id: 3, text: 'Worrying too much about different things' },
      { id: 4, text: 'Trouble relaxing' },
      { id: 5, text: 'Being so restless that it is hard to sit still' },
      { id: 6, text: 'Becoming easily annoyed or irritable' },
      { id: 7, text: 'Feeling afraid, as if something awful might happen' }
    ],
    scoring: {
      0: 0, 1: 1, 2: 2, 3: 3
    },
    severity: {
      minimal: [0, 4],
      mild: [5, 9],
      moderate: [10, 14],
      severe: [15, 21]
    }
  },
  GHQ: {
    name: 'GHQ-12 (General Health Questionnaire)',
    questions: [
      { id: 1, text: 'Been able to concentrate on whatever you\'re doing?' },
      { id: 2, text: 'Lost much sleep over worry?' },
      { id: 3, text: 'Felt that you are playing a useful part in things?' },
      { id: 4, text: 'Felt capable of making decisions about things?' },
      { id: 5, text: 'Felt constantly under strain?' },
      { id: 6, text: 'Felt you couldn\'t overcome your difficulties?' },
      { id: 7, text: 'Been able to enjoy your normal day-to-day activities?' },
      { id: 8, text: 'Been able to face up to your problems?' },
      { id: 9, text: 'Been feeling unhappy or depressed?' },
      { id: 10, text: 'Been losing confidence in yourself?' },
      { id: 11, text: 'Been thinking of yourself as a worthless person?' },
      { id: 12, text: 'Been feeling reasonably happy, all things considered?' }
    ],
    scoring: {
      0: 0, 1: 0, 2: 1, 3: 1 // GHQ uses 0-0-1-1 scoring
    },
    severity: {
      minimal: [0, 2],
      mild: [3, 6],
      moderate: [7, 9],
      severe: [10, 12]
    }
  }
};

// Get screening test questions
router.get('/tests/:testType', authenticate, (req, res) => {
  const { testType } = req.params;
  const test = SCREENING_TESTS[testType.toUpperCase()];

  if (!test) {
    return res.status(404).json({ message: 'Test not found' });
  }

  res.json({
    testType: testType.toUpperCase(),
    name: test.name,
    questions: test.questions
  });
});

// Get all available tests
router.get('/tests', authenticate, (req, res) => {
  const tests = Object.keys(SCREENING_TESTS).map(key => ({
    type: key,
    name: SCREENING_TESTS[key].name,
    questionCount: SCREENING_TESTS[key].questions.length
  }));

  res.json({ tests });
});

// Submit screening test results
router.post('/submit', authenticate, requireStudent, async (req, res) => {
  try {
    const { testType, responses } = req.body;
    const userId = req.user.id;

    const test = SCREENING_TESTS[testType.toUpperCase()];
    if (!test) {
      return res.status(400).json({ message: 'Invalid test type' });
    }

    // Validate responses
    if (!Array.isArray(responses) || responses.length !== test.questions.length) {
      return res.status(400).json({ message: 'Invalid responses format' });
    }

    // Calculate score
    let score = 0;
    responses.forEach((response, index) => {
      const questionScore = test.scoring[response] || 0;
      score += questionScore;
    });

    // Determine severity
    let severity = 'minimal';
    for (const [sev, range] of Object.entries(test.severity)) {
      if (score >= range[0] && score <= range[1]) {
        severity = sev;
        break;
      }
    }

    // Check for high risk (PHQ-9 question 9, GAD-7 high scores, GHQ high scores)
    let riskFlag = false;
    if (testType.toUpperCase() === 'PHQ9') {
      riskFlag = responses[8] >= 2 || score >= 15; // Question 9 or severe depression
    } else if (testType.toUpperCase() === 'GAD7') {
      riskFlag = score >= 15;
    } else if (testType.toUpperCase() === 'GHQ') {
      riskFlag = score >= 10;
    }

    // Save results
    const result = await pool.query(
      `INSERT INTO screening_results (user_id, test_type, score, severity, responses, risk_flag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, score, severity, risk_flag, created_at`,
      [userId, testType.toUpperCase(), score, severity, JSON.stringify(responses), riskFlag]
    );

    // Create emergency flag if high risk
    if (riskFlag) {
      await pool.query(
        `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          'screening_high_risk',
          score >= 20 ? 'critical' : score >= 15 ? 'high' : 'medium',
          `Screening test ${testType} scored ${score} (${severity})`
        ]
      );
    }

    res.status(201).json({
      message: 'Screening completed',
      result: result.rows[0],
      recommendation: riskFlag 
        ? 'Please consider speaking with a counselor. Emergency support is available.'
        : 'Your results suggest you may benefit from resources and support.'
    });
  } catch (error) {
    console.error('Screening submission error:', error);
    res.status(500).json({ message: 'Failed to submit screening' });
  }
});

// Get user's screening history
router.get('/history', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, test_type, score, severity, risk_flag, created_at
       FROM screening_results
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// Get latest screening results
router.get('/latest', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, test_type, score, severity, risk_flag, created_at
       FROM screening_results
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    );

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Get latest error:', error);
    res.status(500).json({ message: 'Failed to fetch latest results' });
  }
});

module.exports = router;
