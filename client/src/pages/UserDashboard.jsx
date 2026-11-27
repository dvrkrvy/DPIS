import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, appointmentApi } from '../services/api';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or studying',
  'Moving or speaking so slowly that other people could have noticed, or being fidgety/restless',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

const PSS10_QUESTIONS = [
  'Been upset because of something that happened unexpectedly',
  'Felt unable to control the important things in your life',
  'Felt nervous and stressed',
  'Felt confident about your ability to handle personal problems',
  'Felt that things were going your way',
  'Found that you could not cope with all the things you had to do',
  'Been able to control irritations in your life',
  'Felt that you were on top of things',
  'Been angered because of things outside of your control',
  'Felt difficulties were piling up so high that you could not overcome them',
];

const SCALE_0_TO_3 = [
  { value: 0, label: 'Not at all', subtitle: '0 days in the past 2 weeks' },
  { value: 1, label: 'Several days', subtitle: '1-6 days in the past 2 weeks' },
  { value: 2, label: 'More than half the days', subtitle: '7-11 days in the past 2 weeks' },
  { value: 3, label: 'Nearly every day', subtitle: '12-14 days in the past 2 weeks' },
];

const SCALE_0_TO_4 = [
  { value: 0, label: 'Never', subtitle: '0 times in the past month' },
  { value: 1, label: 'Almost never', subtitle: 'Rarely experienced' },
  { value: 2, label: 'Sometimes', subtitle: 'Occasionally experienced' },
  { value: 3, label: 'Fairly often', subtitle: 'Frequently experienced' },
  { value: 4, label: 'Very often', subtitle: 'Regular daily experience' },
];

const TESTS = [
  {
    id: 'phq9',
    tag: 'PHQ-9',
    title: 'Mood & Energy',
    clinicalName: 'Patient Health Questionnaire',
    timeframe: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    questions: PHQ9_QUESTIONS,
    scale: SCALE_0_TO_3,
    icon: 'sentiment_neutral',
    color: '#8fa986',
    maxScore: 27,
  },
  {
    id: 'gad7',
    tag: 'GAD-7',
    title: 'Anxiety & Tension',
    clinicalName: 'Generalized Anxiety Disorder Scale',
    timeframe: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    questions: GAD7_QUESTIONS,
    scale: SCALE_0_TO_3,
    icon: 'psychology',
    color: '#d4af37',
    maxScore: 21,
  },
  {
    id: 'pss10',
    tag: 'PSS-10',
    title: 'Perceived Stress',
    clinicalName: 'Perceived Stress Scale',
    timeframe: 'In the past month, how often have you felt or thought the following?',
    questions: PSS10_QUESTIONS,
    scale: SCALE_0_TO_4,
    icon: 'self_improvement',
    color: '#e07a5f',
    maxScore: 40,
  },
];

const SEVERITY_BADGE = {
  LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  MODERATE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30',
  CRITICAL: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
};

const STATIC_RESOURCES = [
  {
    id: 'res-1',
    category: 'MINDFULNESS',
    title: 'Box Breathing Guide for Acute Autonomic Regulation',
    readTime: '4 min exercise',
    format: 'Guided Breathing',
    icon: 'air',
    summary:
      'A clinically validated autonomic down-regulation method using equal 4-second counts to balance parasympathetic tone.',
    tags: ['Nervous System', 'Immediate Relief', 'Heart Rate Variability'],
    url: 'https://www.health.harvard.edu/mind-and-mood/breath-sound-body-meditation',
  },
  {
    id: 'res-2',
    category: 'ANXIETY',
    title: '5-4-3-2-1 Sensory Grounding for Dissociation & Panic',
    readTime: '5 min exercise',
    format: 'Grounding Technique',
    icon: 'touch_app',
    summary:
      'Engage visual, auditory, tactile, olfactory, and gustatory pathways to orient attention away from spiraling intrusive worries.',
    tags: ['Grounding', 'Panic De-escalation', 'Sensory Orientation'],
    url: 'https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/5-4-3-2-1-countdown-to-make-anxiety-blast-off',
  },
  {
    id: 'res-3',
    category: 'ACADEMIC',
    title: 'Navigating Academic Burnout & The Yerkes-Dodson Curve',
    readTime: '7 min read',
    format: 'Clinical Article',
    icon: 'school',
    summary:
      'Understanding optimal cognitive arousal versus chronic burnout. Strategies for chunking study cycles and preventing emotional exhaustion.',
    tags: ['Burnout', 'Study Fatigue', 'Time Architecture'],
    url: 'https://www.apa.org/topics/stress/student-burnout',
  },
  {
    id: 'res-4',
    category: 'SLEEP',
    title: 'Sleep Hygiene Protocols & Circadian Phase Alignment',
    readTime: '6 min read',
    format: 'Behavioral Protocol',
    icon: 'bedtime',
    summary:
      'Evidence-based non-pharmacological interventions for sleep-onset insomnia, screen luminescence mitigation, and cortisol timing.',
    tags: ['Sleep Architecture', 'Circadian Rhythm', 'Adenosine Regulation'],
    url: 'https://www.sleepfoundation.org/sleep-hygiene',
  },
  {
    id: 'res-5',
    category: 'DEPRESSION',
    title: 'Behavioral Activation & Breaking Anhedonic Inertia',
    readTime: '8 min guide',
    format: 'CBT Protocol',
    icon: 'nature_people',
    summary:
      'Graded activity scheduling and mastery/pleasure tracking to re-engage dopamine reward pathways during depressive slumps.',
    tags: ['CBT Framework', 'Mood Elevation', 'Micro-Goals'],
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3181883/',
  },
  {
    id: 'res-6',
    category: 'MINDFULNESS',
    title: 'Progressive Muscle Relaxation (PMR) Script',
    readTime: '10 min audio',
    format: 'Audio Relaxation',
    icon: 'spa',
    summary:
      'Systematically tensioning and releasing major muscle groups to dismantle somatic stress reservoirs in the shoulders, neck, and jaw.',
    tags: ['Somatic Release', 'Physical Tension', 'Stress Relief'],
    url: 'https://www.uclahealth.org/programs/mindful/free-guided-meditations',
  },
];

const getNextDays = (count = 10) => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    days.push({
      dateStr,
      label,
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return days;
};

export default function UserDashboard() {
  const { user } = useAuth();

  // Test state
  const [phq9, setPhq9] = useState(() => Array(9).fill(null));
  const [gad7, setGad7] = useState(() => Array(7).fill(null));
  const [pss10, setPss10] = useState(() => Array(10).fill(null));

  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [reportsData, setReportsData] = useState({ assessments: [], reports: [] });
  const [latestResult, setLatestResult] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Dashboard Tabs & Navigation Mode
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'resources' | 'doctor'
  const [retakingTest, setRetakingTest] = useState(false);

  // Resources state
  const [resourceCategory, setResourceCategory] = useState('ALL');
  const [resourceSearch, setResourceSearch] = useState('');

  // Interactive Breathing Guide State
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  // Appointments & Calendar State
  const calendarDays = useMemo(() => getNextDays(21), []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => calendarDays[0].dateStr);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('Confidential Counseling Session');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Scroll references for date strips
  const dateScrollRef = useRef(null);
  const rescheduleDateScrollRef = useRef(null);

  const scrollDateContainer = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => calendarDays[0].dateStr);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const currentTest = TESTS[activeTestIndex];
  const currentQuestions = currentTest.questions;
  const currentAnswers = activeTestIndex === 0 ? phq9 : activeTestIndex === 1 ? gad7 : pss10;
  const setCurrentAnswers = activeTestIndex === 0 ? setPhq9 : activeTestIndex === 1 ? setGad7 : setPss10;
  const currentAnswer = currentAnswers[activeQuestionIndex];

  // Counts of answered questions
  const phqAnswered = useMemo(() => phq9.filter((v) => v !== null).length, [phq9]);
  const gadAnswered = useMemo(() => gad7.filter((v) => v !== null).length, [gad7]);
  const pssAnswered = useMemo(() => pss10.filter((v) => v !== null).length, [pss10]);

  const totalAnswered = phqAnswered + gadAnswered + pssAnswered;
  const totalQuestions = 26;
  const progressPercent = Math.round((totalAnswered / totalQuestions) * 100);
  const allCompleted = totalAnswered === totalQuestions;

  // Monthly Key e.g. "2026-11"
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await userApi.getMyReports();
      setReportsData(data);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const data = await appointmentApi.getMyAppointments();
      setMyAppointments(data.appointments || []);
    } catch (err) {
      console.warn('Failed to load appointments:', err.message);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadSlotAvailability = async (date) => {
    setLoadingSlots(true);
    try {
      const data = await appointmentApi.getAvailability({ date });
      setAvailableSlots(data.slots || []);
      setSelectedSlot('');
    } catch (err) {
      console.warn('Failed to load slots:', err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadRescheduleSlots = async (date, doctorId) => {
    setLoadingRescheduleSlots(true);
    setRescheduleError('');
    try {
      const data = await appointmentApi.getAvailability({ date, doctorId });
      setRescheduleSlots(data.slots || []);
      setRescheduleSelectedSlot('');
    } catch (err) {
      setRescheduleError(err.message || 'Failed to load doctor slots');
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  useEffect(() => {
    loadReports();
    loadAppointments();
  }, []);

  useEffect(() => {
    if (activeTab === 'doctor') {
      loadSlotAvailability(selectedCalendarDate);
      loadAppointments();
    }
  }, [activeTab, selectedCalendarDate]);

  useEffect(() => {
    if (rescheduleModalAppt) {
      loadRescheduleSlots(rescheduleDate, rescheduleModalAppt.doctorId);
    }
  }, [rescheduleModalAppt, rescheduleDate]);

  // Gating check
  const hasAppearedInPastMonth = useMemo(() => {
    if (latestResult) return true;
    if (!reportsData?.assessments || reportsData.assessments.length === 0) return false;

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    return reportsData.assessments.some((a) => {
      if (a.month === currentMonthKey) return true;
      if (a.createdAt) {
        const diff = now - new Date(a.createdAt).getTime();
        if (diff >= 0 && diff < THIRTY_DAYS_MS) return true;
      }
      return false;
    });
  }, [latestResult, reportsData, currentMonthKey]);

  // Latest assessment
  const latestAssessment = useMemo(() => {
    if (latestResult?.assessment) return latestResult.assessment;
    return reportsData.assessments?.[0] || null;
  }, [latestResult, reportsData.assessments]);

  const latestReport = useMemo(() => {
    if (latestResult?.report) return latestResult.report;
    return reportsData.reports?.[0] || null;
  }, [latestResult, reportsData.reports]);

  // Doctor-initiated mandatory appointments that are active
  const doctorInitiatedAppointments = useMemo(() => {
    return myAppointments.filter(
      (a) => a.initiatedBy === 'DOCTOR' && ['SCHEDULED', 'RESCHEDULED'].includes(a.status)
    );
  }, [myAppointments]);

  // Breathing Guide loop
  useEffect(() => {
    let timer;
    if (breathingActive) {
      timer = setInterval(() => {
        setBreathSeconds((prev) => {
          if (prev <= 1) {
            setBreathPhase((curPhase) => {
              if (curPhase === 'Inhale') return 'Hold (Top)';
              if (curPhase === 'Hold (Top)') return 'Exhale';
              if (curPhase === 'Exhale') return 'Hold (Empty)';
              return 'Inhale';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathPhase('Inhale');
      setBreathSeconds(4);
    }
    return () => clearInterval(timer);
  }, [breathingActive]);

  const selectAnswer = (value) => {
    setCurrentAnswers((prev) => {
      const next = [...prev];
      next[activeQuestionIndex] = Number(value);
      return next;
    });
  };

  const handleNext = () => {
    if (activeQuestionIndex < currentQuestions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else if (activeTestIndex < TESTS.length - 1) {
      setActiveTestIndex((prev) => prev + 1);
      setActiveQuestionIndex(0);
    } else {
      setShowReviewModal(true);
    }
  };

  const handlePrev = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex((prev) => prev - 1);
    } else if (activeTestIndex > 0) {
      const prevTest = TESTS[activeTestIndex - 1];
      setActiveTestIndex((prev) => prev - 1);
      setActiveQuestionIndex(prevTest.questions.length - 1);
    }
  };

  const jumpToQuestion = (qIdx) => {
    setActiveQuestionIndex(qIdx);
  };

  const switchTest = (testIdx) => {
    setActiveTestIndex(testIdx);
    setActiveQuestionIndex(0);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    setShowReviewModal(false);

    try {
      const res = await userApi.submitAssessment({
        phq9Answers: phq9.map((v) => (v === null ? 0 : v)),
        gad7Answers: gad7.map((v) => (v === null ? 0 : v)),
        pss10Answers: pss10.map((v) => (v === null ? 0 : v)),
      });
      setLatestResult(res);

      setPhq9(Array(9).fill(null));
      setGad7(Array(7).fill(null));
      setPss10(Array(10).fill(null));
      setActiveTestIndex(0);
      setActiveQuestionIndex(0);
      setRetakingTest(false);
      setActiveTab('overview');

      await loadReports();
    } catch (err) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  // Self-Booking Handler
  const handleBookSession = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBookingSubmitting(true);
    setBookingMessage('');
    setError('');
    try {
      await appointmentApi.bookAppointment({
        date: selectedCalendarDate,
        slot: selectedSlot,
        reason: bookingReason,
        notes: bookingNotes,
      });
      setBookingMessage('Your counseling session has been confirmed! An assigned clinician is reserved.');
      setSelectedSlot('');
      setBookingNotes('');
      await loadAppointments();
      await loadSlotAvailability(selectedCalendarDate);
    } catch (err) {
      setError(err.message || 'Failed to book slot');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Reschedule Submit Handler
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSelectedSlot || !rescheduleModalAppt) return;
    setRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      await appointmentApi.rescheduleAppointment(rescheduleModalAppt._id, {
        date: rescheduleDate,
        slot: rescheduleSelectedSlot,
      });
      setRescheduleModalAppt(null);
      await loadAppointments();
      if (activeTab === 'doctor') {
        await loadSlotAvailability(selectedCalendarDate);
      }
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Filtered resources
  const filteredResources = useMemo(() => {
    let list = STATIC_RESOURCES;
    if (resourceCategory !== 'ALL') {
      list = list.filter((r) => r.category === resourceCategory);
    }
    if (resourceSearch.trim()) {
      const q = resourceSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [resourceCategory, resourceSearch]);

  if (loadingReports && !reportsData.assessments.length && !latestResult) {
    return (
      <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col items-center justify-center min-h-[50vh] gap-space-md">
        <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin text-[36px]">
          progress_activity
        </span>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
          Verifying confidential member check-in records...
        </p>
      </div>
    );
  }

  const showOnlyTest = !hasAppearedInPastMonth || retakingTest;

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-lg">
      {/* Privacy-First Welcome Banner */}
      <div className="rounded-xl bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim font-semibold">
              Member Portal · Psychological Screening
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-xs font-semibold text-primary dark:text-primary-fixed-dim flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>100% Confidential</span>
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs font-bold">
            Welcome, {user?.fullName || 'Student'}
          </h1>

          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs max-w-2xl leading-relaxed">
            Your screening responses are cryptographically isolated. Institutional administrators only ever view cohort-level statistics—never your identity, individual scores, or clinical responses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-sm shrink-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-container border border-outline-variant/60">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
              verified_user
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                Zero-PII Isolation
              </span>
              <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                Identity disconnected from records
              </span>
            </div>
          </div>

          {!user?.orgId && (
            <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
              No organization linked. Register with an institutional email.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Immediate Crisis Support Alert */}
      {(latestAssessment?.severityTier === 'CRITICAL' || latestResult?.crisisAlert) && (
        <div className="rounded-xl bg-error-container text-on-error-container p-space-lg shadow-sm border border-error/30">
          <div className="flex items-center gap-space-sm font-headline-sm text-headline-sm">
            <span className="material-symbols-outlined text-[24px]">emergency</span>
            <span>Immediate Support Is Available</span>
          </div>
          <p className="font-body-md text-body-md mt-space-xs leading-relaxed">
            Your responses indicate elevated clinical distress. You are not alone. Please connect with your campus counselors or reach the 24/7 Suicide &amp; Crisis Lifeline (call/text <strong>988</strong> in US &amp; Canada, or <strong>14416</strong> Tele-MANAS in India).
          </p>
        </div>
      )}

      {/* CONDITIONAL RENDERING: FORCE TEST WINDOW vs FULL DASHBOARD WITH TABS */}
      {showOnlyTest ? (
        /* ========================================================================= */
        /* FORCED TEST WINDOW (Shown if not appeared this month or voluntary retake)  */
        /* ========================================================================= */
        <div className="flex flex-col gap-space-md">
          {/* Monthly Requirement Notice */}
          <div className="rounded-xl bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary-container text-primary dark:text-primary-fixed-dim flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">assignment_late</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-fixed-dim">
                    {retakingTest ? 'Voluntary Retake' : 'Monthly Check-In Required'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Cycle: {currentMonthKey}
                  </span>
                </div>
                <h2 className="font-headline-sm text-title-md sm:text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
                  {retakingTest
                    ? 'Retake Confidential Psychological Check-In'
                    : 'Complete Your Monthly Psychological Screening'}
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim max-w-2xl">
                  {retakingTest
                    ? 'Submitting a fresh screening will update your clinical trajectory and provide refreshed AI psychoeducational guidance.'
                    : 'To ensure holistic student well-being and unlock your personal wellness dashboard, complete this confidential 3-part check-in (PHQ-9, GAD-7, and PSS-10).'}
                </p>
              </div>
            </div>

            {retakingTest && (
              <button
                type="button"
                onClick={() => setRetakingTest(false)}
                className="px-space-md py-2 rounded-lg border border-outline-variant text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high dark:hover:bg-surface-container font-label-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Cancel &amp; Return to Dashboard</span>
              </button>
            )}
          </div>

          {/* Test Tabs Header: PHQ-9 | GAD-7 | PSS-10 */}
          <div className="grid grid-cols-3 gap-space-xs bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1.5 shadow-sm">
            {TESTS.map((t, idx) => {
              const isActive = activeTestIndex === idx;
              const answered = idx === 0 ? phqAnswered : idx === 1 ? gadAnswered : pssAnswered;
              const isTestDone = answered === t.questions.length;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTest(idx)}
                  className={`py-3 px-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-container-lowest dark:bg-surface-container shadow-sm border border-primary/50 text-on-surface dark:text-inverse-on-surface'
                      : 'text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-label-sm text-xs font-bold px-2 py-0.5 rounded ${
                        isActive
                          ? 'bg-primary text-on-primary dark:bg-primary-fixed-dim dark:text-on-primary-fixed'
                          : 'bg-surface-container-high dark:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {t.tag}
                    </span>
                    {isTestDone && (
                      <span className="material-symbols-outlined text-[16px] text-primary dark:text-primary-fixed-dim">
                        check_circle
                      </span>
                    )}
                  </div>

                  <span className="font-label-sm text-xs font-semibold mt-1 truncate max-w-full">
                    {t.title}
                  </span>

                  <span className="font-body-sm text-[11px] opacity-75 mt-0.5">
                    {answered} / {t.questions.length} answered
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Card Container */}
          <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
            {/* Step Navigator */}
            <div className="flex flex-col gap-space-sm pb-space-sm border-b border-outline-variant/40">
              <div className="flex flex-wrap items-center justify-between gap-space-xs">
                <div>
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary dark:text-primary-fixed-dim font-bold">
                    {currentTest.tag} ({currentTest.clinicalName}) · Question {activeQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                    {currentTest.timeframe}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-xs font-semibold text-on-surface-variant dark:text-tertiary-fixed-dim">
                    Total Progress: {totalAnswered}/26 ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Navigator Bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider mr-1">
                  Question:
                </span>
                {currentQuestions.map((_, qIdx) => {
                  const isCurrent = activeQuestionIndex === qIdx;
                  const isAnswered = currentAnswers[qIdx] !== null;

                  return (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => jumpToQuestion(qIdx)}
                      className={`w-7 h-7 rounded-lg font-label-sm text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed ring-2 ring-primary dark:ring-primary-fixed-dim ring-offset-2 dark:ring-offset-[#121318] scale-110 shadow-sm'
                          : isAnswered
                          ? 'bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container hover:scale-105'
                          : 'border border-outline-variant text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high'
                      }`}
                      title={`Question ${qIdx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden mt-1">
                <div
                  className="h-full bg-primary dark:bg-primary-fixed-dim transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Prompt */}
            <div className="py-space-xs">
              <div className="flex items-start gap-space-sm">
                <span className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-primary-container text-on-primary-fixed-variant dark:text-on-primary-container font-label-sm text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  Q{activeQuestionIndex + 1}
                </span>
                <h3 className="font-headline-sm text-title-md sm:text-headline-sm text-on-surface dark:text-inverse-on-surface font-semibold leading-snug">
                  {currentQuestions[activeQuestionIndex]}
                </h3>
              </div>
            </div>

            {/* Scale Options Stack */}
            <div className="flex flex-col gap-space-xs pt-space-xs">
              {currentTest.scale.map((opt) => {
                const isSelected = currentAnswer === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectAnswer(opt.value)}
                    className={`w-full p-space-md rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'border-primary dark:border-primary-fixed-dim bg-primary/10 dark:bg-primary-container/40 ring-1 ring-primary/40'
                        : 'border-outline-variant/60 bg-surface-container-low dark:bg-surface-container-lowest hover:bg-surface-container-high dark:hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-space-md">
                      <span
                        className={`w-7 h-7 rounded-full font-label-sm text-xs font-bold flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed'
                            : 'bg-surface-container-high dark:bg-surface-container text-on-surface-variant dark:text-tertiary-fixed-dim'
                        }`}
                      >
                        {opt.value}
                      </span>
                      <div>
                        <span className="font-label-lg text-sm sm:text-base font-semibold text-on-surface dark:text-inverse-on-surface block">
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim block">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-primary dark:border-primary-fixed-dim bg-primary dark:bg-primary-fixed-dim'
                          : 'border-outline-variant'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[14px] text-on-primary dark:text-on-primary-fixed">
                          check
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-space-sm border-t border-outline-variant/40 mt-space-xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={activeTestIndex === 0 && activeQuestionIndex === 0}
                className="px-space-md py-2.5 rounded-lg border border-outline-variant text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high dark:hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none font-label-sm text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {allCompleted && (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="px-space-md py-2.5 rounded-lg bg-surface-container-high dark:bg-surface-container text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                  >
                    Review All
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {activeQuestionIndex < currentQuestions.length - 1 ? (
                    <>
                      <span>Next Question</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  ) : activeTestIndex < TESTS.length - 1 ? (
                    <>
                      <span>Proceed to {TESTS[activeTestIndex + 1].tag}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  ) : (
                    <>
                      <span>Review &amp; Submit</span>
                      <span className="material-symbols-outlined text-[16px]">done_all</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* COMPLETED STATE: DASHBOARD WITH TABS                                      */
        /* ========================================================================= */
        <div className="flex flex-col gap-space-lg">
          {/* Monthly Status Strip & Retake Option */}
          <div className="rounded-xl bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </span>
              <div>
                <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                  Monthly Screening Completed ({currentMonthKey})
                </span>
                <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Your wellness record is up to date. You can explore curated resources, consult clinicians, or review past assessments.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRetakingTest(true);
                setActiveTestIndex(0);
                setActiveQuestionIndex(0);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim border border-outline-variant/60 font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>Retake Check-In</span>
            </button>
          </div>

          {/* Tab Navigation Header */}
          <div className="flex items-center gap-space-xs border-b border-outline-variant/60 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-space-md py-2.5 rounded-t-lg font-label-lg text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-primary dark:border-primary-fixed-dim text-primary dark:text-primary-fixed-dim bg-surface-container-low/60 dark:bg-surface-container/50'
                  : 'border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              <span>Overview &amp; Old Tests</span>
              {reportsData.assessments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-surface-container-high dark:bg-surface-container">
                  {reportsData.assessments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`px-space-md py-2.5 rounded-t-lg font-label-lg text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'resources'
                  ? 'border-primary dark:border-primary-fixed-dim text-primary dark:text-primary-fixed-dim bg-surface-container-low/60 dark:bg-surface-container/50'
                  : 'border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">library_books</span>
              <span>Elaborate Resources</span>
              <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container">
                Interactive
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('doctor')}
              className={`px-space-md py-2.5 rounded-t-lg font-label-lg text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'doctor'
                  ? 'border-primary dark:border-primary-fixed-dim text-primary dark:text-primary-fixed-dim bg-surface-container-low/60 dark:bg-surface-container/50'
                  : 'border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">medical_services</span>
              <span>Counseling Calendar &amp; Doctor</span>
              {doctorInitiatedAppointments.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold animate-pulse">
                  {doctorInitiatedAppointments.length} Required
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-primary/10 text-primary dark:text-primary-fixed-dim">
                  5-8 PM Slots
                </span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & OLD TESTS                                               */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-space-lg">
              {latestAssessment && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                  <div className="lg:col-span-6 flex flex-col gap-space-md">
                    <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
                      <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
                            speed
                          </span>
                          <h3 className="font-title-md text-title-md font-semibold text-on-surface dark:text-inverse-on-surface">
                            Latest Clinical Snapshot
                          </h3>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold ${
                            SEVERITY_BADGE[latestAssessment.severityTier] || ''
                          }`}
                        >
                          {latestAssessment.severityTier} TIER
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                        <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/50 flex flex-col justify-between gap-2">
                          <div>
                            <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase">
                              PHQ-9 (Mood)
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                                {latestAssessment.scores.phq9}
                              </span>
                              <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                                / 27
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden">
                            <div
                              className="h-full bg-[#8fa986]"
                              style={{ width: `${Math.min(100, (latestAssessment.scores.phq9 / 27) * 100)}%` }}
                            />
                          </div>
                          <span className="font-label-sm text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                            {latestAssessment.scores.phq9 <= 4
                              ? 'Minimal'
                              : latestAssessment.scores.phq9 <= 9
                              ? 'Mild'
                              : latestAssessment.scores.phq9 <= 14
                              ? 'Moderate'
                              : 'Elevated'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/50 flex flex-col justify-between gap-2">
                          <div>
                            <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase">
                              GAD-7 (Anxiety)
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                                {latestAssessment.scores.gad7}
                              </span>
                              <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                                / 21
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden">
                            <div
                              className="h-full bg-[#d4af37]"
                              style={{ width: `${Math.min(100, (latestAssessment.scores.gad7 / 21) * 100)}%` }}
                            />
                          </div>
                          <span className="font-label-sm text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                            {latestAssessment.scores.gad7 <= 4
                              ? 'Minimal'
                              : latestAssessment.scores.gad7 <= 9
                              ? 'Mild'
                              : latestAssessment.scores.gad7 <= 14
                              ? 'Moderate'
                              : 'Elevated'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/50 flex flex-col justify-between gap-2">
                          <div>
                            <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase">
                              PSS-10 (Stress)
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                                {latestAssessment.scores.pss10}
                              </span>
                              <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                                / 40
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden">
                            <div
                              className="h-full bg-[#e07a5f]"
                              style={{ width: `${Math.min(100, (latestAssessment.scores.pss10 / 40) * 100)}%` }}
                            />
                          </div>
                          <span className="font-label-sm text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                            {latestAssessment.scores.pss10 <= 13
                              ? 'Low'
                              : latestAssessment.scores.pss10 <= 26
                              ? 'Moderate'
                              : 'High'}
                          </span>
                        </div>
                      </div>

                      <div className="p-space-sm rounded-lg bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                        <span>Submitted on: {new Date(latestAssessment.createdAt).toLocaleDateString()}</span>
                        <span>Clinical Status: <strong className="text-on-surface dark:text-inverse-on-surface">{latestAssessment.doctorStatus}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex flex-col gap-space-md">
                    <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-sm">
                      <div className="flex items-center gap-2 pb-space-xs border-b border-outline-variant/40">
                        <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
                          psychology
                        </span>
                        <h3 className="font-title-md text-title-md font-semibold text-on-surface dark:text-inverse-on-surface">
                          AI Wellness &amp; Psychoeducational Insights
                        </h3>
                      </div>

                      <p className="font-body-sm text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed mt-1">
                        {latestReport?.aiSummary ||
                          'Your responses have been processed through our clinical scoring engine. Continue healthy routines, prioritize restorative sleep, and utilize the coping resources below.'}
                      </p>

                      {latestReport?.actionableSteps?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-outline-variant/30">
                          <span className="font-label-sm text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-fixed-dim block mb-1">
                            Actionable Steps
                          </span>
                          <ul className="list-disc pl-4 font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim space-y-1">
                            {latestReport.actionableSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Counseling & Clinical Care Analytics Strip */}
              <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-outline-variant/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
                      medical_information
                    </span>
                    <div>
                      <h3 className="font-title-md text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                        My Counseling &amp; Clinical Care Analytics
                      </h3>
                      <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                        Tracking 25-minute institutional consultations between 5:00 PM and 8:00 PM.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('doctor')}
                    className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed-dim border border-primary/20 font-label-sm text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>Manage Counseling</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Total Booked
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                        {myAppointments.length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Sessions</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-on-surface-variant mt-1">
                      All-time appointments
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Completed Care
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {myAppointments.filter((a) => a.status === 'COMPLETED').length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Consulted</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Attended sessions
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Upcoming Sessions
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-primary dark:text-primary-fixed-dim">
                        {myAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Active</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-primary dark:text-primary-fixed-dim mt-1">
                      Scheduled ahead
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Doctor Initiated
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {doctorInitiatedAppointments.length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Required</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                      {doctorInitiatedAppointments.length > 0 ? 'Mandatory triage session' : 'None required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Check-Ins */}
              <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
                      history
                    </span>
                    <h3 className="font-title-md text-title-md font-semibold text-on-surface dark:text-inverse-on-surface">
                      Historical Check-Ins Log
                    </h3>
                  </div>
                  <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {reportsData.assessments.length} total records
                  </span>
                </div>

                {reportsData.assessments.length === 0 ? (
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim py-4 text-center">
                    No historical screenings found.
                  </p>
                ) : (
                  <div className="flex flex-col gap-space-sm">
                    {reportsData.assessments.map((a, idx) => (
                      <div
                        key={a._id || idx}
                        className="rounded-xl bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 p-space-md flex flex-col gap-space-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-space-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-label-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">
                              Month: {a.month || 'Unspecified'}
                            </span>
                            <span className="text-outline-variant">•</span>
                            <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                              SEVERITY_BADGE[a.severityTier] || ''
                            }`}
                          >
                            {a.severityTier} TIER
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant dark:text-tertiary-fixed-dim py-1 border-y border-outline-variant/30">
                          <span>PHQ-9: {a.scores?.phq9}/27</span>
                          <span>•</span>
                          <span>GAD-7: {a.scores?.gad7}/21</span>
                          <span>•</span>
                          <span>PSS-10: {a.scores?.pss10}/40</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ELABORATE RESOURCES                                                */}
          {/* ========================================================================= */}
          {activeTab === 'resources' && (
            <div className="flex flex-col gap-space-lg">
              <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-lg">
                <div className="flex flex-col gap-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
                      self_improvement
                    </span>
                    <span className="font-label-sm text-xs uppercase tracking-wider text-primary dark:text-primary-fixed-dim font-bold">
                      Interactive Tool
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
                    4-4-4-4 Box Breathing Visualizer
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim leading-relaxed">
                    Follow the visual rhythm to down-regulate sympathetic arousal within 2 minutes.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-space-sm shrink-0">
                  <div
                    className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
                      breathingActive
                        ? breathPhase.includes('Inhale')
                          ? 'border-primary dark:border-primary-fixed-dim scale-110 bg-primary/10 shadow-lg'
                          : breathPhase.includes('Hold')
                          ? 'border-amber-500 scale-105 bg-amber-500/10'
                          : 'border-secondary-fixed-dim scale-95 bg-secondary-container/20'
                        : 'border-outline-variant bg-surface-container-low dark:bg-surface-container-lowest'
                    }`}
                  >
                    <span className="font-label-sm text-[11px] font-bold text-primary dark:text-primary-fixed-dim uppercase">
                      {breathingActive ? breathPhase : 'Ready'}
                    </span>
                    <span className="font-display-lg text-2xl font-extrabold text-on-surface dark:text-inverse-on-surface">
                      {breathingActive ? `${breathSeconds}s` : '4-4-4-4'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBreathingActive((prev) => !prev)}
                    className="px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {breathingActive ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{breathingActive ? 'Pause Exercise' : 'Start Box Breathing'}</span>
                  </button>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {filteredResources.map((res) => (
                  <div
                    key={res.id}
                    className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col justify-between gap-space-md hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-lg bg-surface-container-high dark:bg-surface-container text-primary dark:text-primary-fixed-dim flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">{res.icon}</span>
                        </span>
                        <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant dark:text-tertiary-fixed-dim">
                          {res.readTime}
                        </span>
                      </div>

                      <h4 className="font-title-md text-sm sm:text-base font-semibold text-on-surface dark:text-inverse-on-surface mt-1 leading-snug">
                        {res.title}
                      </h4>

                      <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim leading-relaxed">
                        {res.summary}
                      </p>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Explore Clinical Guide</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: COUNSELING CALENDAR & APPOINTMENTS (5-8 PM SLOTS)                   */}
          {/* ========================================================================= */}
          {activeTab === 'doctor' && (
            <div className="flex flex-col gap-space-lg">
              {/* Doctor-Initiated Mandatory Counseling Alert (If Scheduled) */}
              {doctorInitiatedAppointments.length > 0 && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-space-lg flex flex-col gap-space-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[24px]">
                        notification_important
                      </span>
                      <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                        Mandatory Clinician-Initiated Counseling Session
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400">
                      Required Attendance
                    </span>
                  </div>

                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim leading-relaxed">
                    Following your screening evaluation, an institutional clinician has scheduled a priority 25-minute counseling appointment for you. If this scheduled timing does not fit your availability, you have the option to reschedule it to another convenient slot with your assigned doctor.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
                    {doctorInitiatedAppointments.map((dAppt) => (
                      <div
                        key={dAppt._id}
                        className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-md flex flex-col justify-between gap-space-sm shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-primary dark:text-primary-fixed-dim flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                              <span>{dAppt.date}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-container-high dark:bg-surface-container text-on-surface-variant">
                              {dAppt.status}
                            </span>
                          </div>

                          <div className="font-headline-sm text-base font-bold text-on-surface dark:text-inverse-on-surface mt-1">
                            {dAppt.slot} (25 Mins)
                          </div>

                          <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-1">
                            Focus: {dAppt.reason}
                          </p>
                          {dAppt.notes && (
                            <p className="font-body-sm text-[11px] text-on-surface-variant italic mt-0.5">
                              Clinician note: &ldquo;{dAppt.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleModalAppt(dAppt);
                            setRescheduleDate(dAppt.date);
                          }}
                          className="w-full py-2 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold hover:bg-primary-container flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>Reschedule with Assigned Doctor</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Counseling & Clinical Care Analytics Strip */}
              <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-outline-variant/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
                      medical_information
                    </span>
                    <div>
                      <h3 className="font-title-md text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                        My Counseling &amp; Clinical Care Analytics
                      </h3>
                      <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                        Tracking 25-minute institutional consultations between 5:00 PM and 8:00 PM.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('doctor')}
                    className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed-dim border border-primary/20 font-label-sm text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>Manage Counseling</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Total Booked
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                        {myAppointments.length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Sessions</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-on-surface-variant mt-1">
                      All-time appointments
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Completed Care
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {myAppointments.filter((a) => a.status === 'COMPLETED').length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Consulted</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Attended sessions
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Upcoming Sessions
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-primary dark:text-primary-fixed-dim">
                        {myAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Active</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-primary dark:text-primary-fixed-dim mt-1">
                      Scheduled ahead
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 flex flex-col justify-between">
                    <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                      Doctor Initiated
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-headline-lg text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {doctorInitiatedAppointments.length}
                      </span>
                      <span className="text-xs text-on-surface-variant">Required</span>
                    </div>
                    <span className="font-label-sm text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                      {doctorInitiatedAppointments.length > 0 ? 'Mandatory triage session' : 'None required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Calendar Booking & Appointments Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                {/* Left Column: Interactive 25-Min Slot Calendar (5 to 8 PM) */}
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
                    <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
                            calendar_today
                          </span>
                          <h3 className="font-title-md text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                            Book Counseling Session
                          </h3>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                          25-minute confidential appointments between 05:00 PM and 08:00 PM (5-min buffer).
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-full font-label-sm text-[11px] font-semibold bg-primary/10 text-primary dark:text-primary-fixed-dim">
                        Self-Service Booking
                      </span>
                    </div>

                    {bookingMessage && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-body-sm text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>{bookingMessage}</span>
                      </div>
                    )}

                    {/* Horizontal Date Picker with Smooth Scroll Controls */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                          1. Select Date
                        </span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Scroll horizontally or use arrows
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => scrollDateContainer(dateScrollRef, 'left')}
                          className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
                          title="Scroll dates left"
                        >
                          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>

                        <div
                          ref={dateScrollRef}
                          onWheel={(e) => {
                            if (e.deltaY !== 0) {
                              e.currentTarget.scrollLeft += e.deltaY;
                            }
                          }}
                          className="flex items-center gap-2 overflow-x-auto scroll-smooth scrollbar-thin pb-1 px-1 flex-1"
                        >
                          {calendarDays.map((day) => {
                            const isSelected = selectedCalendarDate === day.dateStr;

                            return (
                              <button
                                key={day.dateStr}
                                type="button"
                                onClick={() => setSelectedCalendarDate(day.dateStr)}
                                className={`py-2 px-3 rounded-xl flex flex-col items-center justify-center min-w-[76px] transition-all cursor-pointer border shrink-0 ${
                                  isSelected
                                    ? 'border-primary dark:border-primary-fixed-dim bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed shadow-sm'
                                    : 'border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:bg-surface-container-high'
                                }`}
                              >
                                <span className="font-label-sm text-[10px] uppercase font-bold opacity-80">
                                  {day.weekday}
                                </span>
                                <span className="font-headline-sm text-base font-extrabold my-0.5">
                                  {day.dayNum}
                                </span>
                                <span className="font-label-sm text-[9px] opacity-90 truncate max-w-full">
                                  {day.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => scrollDateContainer(dateScrollRef, 'right')}
                          className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
                          title="Scroll dates right"
                        >
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      </div>
                    </div>

                    {/* 25-Minute Slots Grid: Zero Layout Shift Container */}
                    <div className="flex flex-col gap-1.5 pt-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                          2. Select 25-Min Time Slot (Date: {selectedCalendarDate})
                        </span>
                        <div className="flex items-center gap-2">
                          {loadingSlots && (
                            <span className="text-[11px] font-semibold text-primary dark:text-primary-fixed-dim flex items-center gap-1 animate-pulse">
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                              <span>Checking...</span>
                            </span>
                          )}
                          <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                            Availability status only
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        {loadingSlots && (
                          <div className="absolute inset-0 bg-surface/40 dark:bg-tertiary/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl transition-all">
                            <div className="px-3 py-1.5 rounded-full bg-surface-container-highest dark:bg-surface-container text-primary dark:text-primary-fixed-dim text-xs font-semibold flex items-center gap-2 shadow-md">
                              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                              <span>Checking clinician availability...</span>
                            </div>
                          </div>
                        )}

                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 transition-opacity ${loadingSlots ? 'opacity-40 pointer-events-none' : ''}`}>
                          {(availableSlots.length > 0 ? availableSlots : COUNSELING_SLOTS).map((s) => {
                            const isSelected = selectedSlot === s.slot;

                            return (
                              <button
                                key={s.id}
                                type="button"
                                disabled={!s.isAvailable || loadingSlots}
                                onClick={() => setSelectedSlot(s.slot)}
                                className={`min-h-[68px] p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                  !s.isAvailable
                                    ? 'border-outline-variant/30 bg-surface-container-high/40 dark:bg-surface-container/30 opacity-50 cursor-not-allowed'
                                    : isSelected
                                    ? 'border-primary dark:border-primary-fixed-dim bg-primary/10 dark:bg-primary-container/40 ring-1 ring-primary'
                                    : 'border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:border-primary/50'
                                }`}
                              >
                                <div>
                                  <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface block">
                                    {s.label}
                                  </span>
                                  <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim block mt-0.5">
                                    25 minutes duration
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    s.isAvailable
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                      : 'bg-surface-container-high dark:bg-surface-container text-on-surface-variant'
                                  }`}
                                >
                                  {s.isAvailable ? 'Available' : 'Not Available'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Booking Form Inputs when slot is selected */}
                    {selectedSlot && (
                      <form onSubmit={handleBookSession} className="flex flex-col gap-space-sm pt-space-xs border-t border-outline-variant/40 mt-space-xs">
                        <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container text-xs flex items-center justify-between">
                          <span>Selected Session:</span>
                          <strong className="text-primary dark:text-primary-fixed-dim">
                            {selectedCalendarDate} · {selectedSlot}
                          </strong>
                        </div>

                        <div>
                          <label className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface block mb-1">
                            Topic / Reason for Counseling
                          </label>
                          <input
                            type="text"
                            value={bookingReason}
                            onChange={(e) => setBookingReason(e.target.value)}
                            placeholder="e.g. Anxiety, Academic Burnout, Sleep Difficulties..."
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface block mb-1">
                            Confidential Message for Clinician (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            placeholder="Share any context you'd like the doctor to know prior to the call..."
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={bookingSubmitting}
                          className="w-full py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {bookingSubmitting ? (
                            <>
                              <span className="material-symbols-outlined text-[16px] animate-spin">
                                progress_activity
                              </span>
                              <span>Confirming Appointment...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>Confirm &amp; Book 25-Min Session</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Right Column: My Booked Sessions & Crisis Numbers */}
                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  {/* My Booked Sessions List */}
                  <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
                          event_available
                        </span>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                          My Counseling Sessions
                        </h3>
                      </div>
                      <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                        {myAppointments.length} total
                      </span>
                    </div>

                    {loadingAppointments ? (
                      <div className="py-6 text-center text-xs text-on-surface-variant">
                        Loading scheduled appointments...
                      </div>
                    ) : myAppointments.length === 0 ? (
                      <div className="p-space-md text-center border border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-outline text-[28px]">event_busy</span>
                        <span className="font-label-sm text-xs text-on-surface dark:text-inverse-on-surface">
                          No sessions booked yet
                        </span>
                        <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Select an available slot from the calendar on the left to schedule your session.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-space-sm max-h-[460px] overflow-y-auto pr-1">
                        {myAppointments.map((appt) => (
                          <div
                            key={appt._id}
                            className={`p-space-sm rounded-xl border flex flex-col gap-1.5 transition-all ${
                              appt.initiatedBy === 'DOCTOR'
                                ? 'border-rose-500/40 bg-rose-500/5'
                                : 'border-outline-variant/50 bg-surface-container-low dark:bg-surface-container'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                                {appt.date} · {appt.slot}
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded font-label-sm text-[10px] font-bold ${
                                  appt.status === 'COMPLETED'
                                    ? 'bg-emerald-500/15 text-emerald-700'
                                    : appt.status === 'RESCHEDULED'
                                    ? 'bg-amber-500/15 text-amber-700'
                                    : 'bg-primary/10 text-primary dark:text-primary-fixed-dim'
                                }`}
                              >
                                {appt.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                              <span>
                                {appt.initiatedBy === 'DOCTOR' ? (
                                  <strong className="text-rose-600 dark:text-rose-400">Clinician Scheduled</strong>
                                ) : (
                                  'Self-Requested'
                                )}
                              </span>
                              <span className="truncate max-w-[140px]">{appt.reason}</span>
                            </div>

                            {['SCHEDULED', 'RESCHEDULED'].includes(appt.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRescheduleModalAppt(appt);
                                  setRescheduleDate(appt.date);
                                }}
                                className="mt-1 py-1 px-2.5 rounded-lg bg-surface-container-high dark:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-[11px] font-semibold hover:bg-surface-container-lowest flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">edit_calendar</span>
                                <span>Reschedule Time</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 24/7 Crisis Helplines */}
                  <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-sm">
                    <div className="flex items-center gap-2 pb-space-xs border-b border-outline-variant/40">
                      <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[20px]">
                        emergency
                      </span>
                      <h3 className="font-title-md text-title-md font-semibold text-on-surface dark:text-inverse-on-surface">
                        24/7 Crisis Support
                      </h3>
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                        <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                          988 Suicide &amp; Crisis Lifeline
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">988</span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex items-center justify-between text-xs">
                        <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                          Tele-MANAS (India)
                        </span>
                        <span className="font-mono font-bold text-primary dark:text-primary-fixed-dim">14416</span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex items-center justify-between text-xs">
                        <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                          Crisis Text Line
                        </span>
                        <span className="font-mono font-bold text-primary dark:text-primary-fixed-dim">HOME to 741741</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESCHEDULE MODAL (Strictly checks assigned doctor availability)            */}
      {/* ========================================================================= */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-surface-container-lowest dark:bg-tertiary border border-outline-variant rounded-2xl p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  edit_calendar
                </span>
                <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                  Reschedule Counseling Session
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
              {rescheduleModalAppt.initiatedBy === 'DOCTOR'
                ? 'This session was initiated by your assigned doctor. Showing available 25-minute slots for your assigned doctor only.'
                : 'Select a new date and convenient 25-minute slot.'}
            </p>

            {rescheduleError && (
              <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-xs">
                {rescheduleError}
              </div>
            )}

            {/* Date Picker with Horizontal Scroll Controls */}
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                Select Reschedule Date:
              </span>
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => scrollDateContainer(rescheduleDateScrollRef, 'left')}
                  className="w-7 h-7 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  title="Scroll dates left"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <div
                  ref={rescheduleDateScrollRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                  }}
                  className="flex items-center gap-2 overflow-x-auto scroll-smooth scrollbar-thin pb-1 px-1 flex-1"
                >
                  {calendarDays.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setRescheduleDate(d.dateStr)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold shrink-0 cursor-pointer border ${
                        rescheduleDate === d.dateStr
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollDateContainer(rescheduleDateScrollRef, 'right')}
                  className="w-7 h-7 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  title="Scroll dates right"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Slots with Zero Layout Shift */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                Select Available Slot:
              </span>
              <div className="relative">
                {loadingRescheduleSlots && (
                  <div className="absolute inset-0 bg-surface/40 dark:bg-tertiary/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl transition-all">
                    <div className="px-3 py-1 rounded-full bg-surface-container-highest text-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      <span>Checking clinician slots...</span>
                    </div>
                  </div>
                )}
                <div className={`grid grid-cols-2 gap-2 transition-opacity ${loadingRescheduleSlots ? 'opacity-40 pointer-events-none' : ''}`}>
                  {(rescheduleSlots.length > 0 ? rescheduleSlots : COUNSELING_SLOTS).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.isAvailable || loadingRescheduleSlots}
                      onClick={() => setRescheduleSelectedSlot(s.slot)}
                      className={`min-h-[46px] p-2 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        !s.isAvailable
                          ? 'opacity-40 border-outline-variant/30 cursor-not-allowed bg-surface-container-high'
                          : rescheduleSelectedSlot === s.slot
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-outline-variant bg-surface-container-low hover:border-primary/50'
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className={s.isAvailable ? 'text-emerald-600 font-bold' : 'text-outline'}>
                        {s.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="px-space-md py-2 rounded-lg border border-outline-variant text-xs cursor-pointer hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rescheduleSelectedSlot || rescheduleSubmitting}
                onClick={handleRescheduleSubmit}
                className="px-space-lg py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container disabled:opacity-50 cursor-pointer"
              >
                {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-surface-container-lowest dark:bg-tertiary border border-outline-variant rounded-2xl p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  fact_check
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface font-semibold">
                  Review &amp; Submit Check-In
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
              Please review your screening response summary before submitting. All answers are cryptographically isolated.
            </p>

            <div className="flex flex-col gap-space-xs">
              {TESTS.map((t, idx) => {
                const count = idx === 0 ? phqAnswered : idx === 1 ? gadAnswered : pssAnswered;
                const done = count === t.questions.length;

                return (
                  <div
                    key={t.id}
                    className="p-space-sm bg-surface-container-low dark:bg-surface-container-lowest rounded-lg border border-outline-variant/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                        {t.tag} ({t.title})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-xs text-on-surface-variant">
                        {count} / {t.questions.length} answered
                      </span>
                      {done ? (
                        <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">
                          check_circle
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            switchTest(idx);
                            setShowReviewModal(false);
                          }}
                          className="font-label-sm text-xs text-primary dark:text-primary-fixed-dim underline ml-1 cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim bg-surface-container-high dark:bg-surface-container p-2.5 rounded-lg">
              <span>Total Progress:</span>
              <strong className="text-on-surface dark:text-inverse-on-surface">
                {totalAnswered} of 26 questions answered ({progressPercent}%)
              </strong>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-space-md py-2.5 rounded-lg border border-outline-variant text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high font-label-sm text-xs transition-colors cursor-pointer"
              >
                Back to Questionnaire
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !user?.orgId}
                className="px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Submitting &amp; Generating Report...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Submit Monthly Check-In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
