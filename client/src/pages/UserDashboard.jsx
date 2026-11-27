import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

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
  LOW: 'bg-secondary-container text-on-secondary-container',
  MODERATE: 'bg-primary-fixed text-on-primary-fixed-variant',
  HIGH: 'bg-tertiary-container text-on-tertiary',
  CRITICAL: 'bg-error-container text-on-error-container',
};

export default function UserDashboard() {
  const { user } = useAuth();

  // Three separate tests with answers
  const [phq9, setPhq9] = useState(() => Array(9).fill(null));
  const [gad7, setGad7] = useState(() => Array(7).fill(null));
  const [pss10, setPss10] = useState(() => Array(10).fill(null));

  // Current active navigation: which test (0, 1, 2) and which question in that test (0..N-1)
  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [reportsData, setReportsData] = useState({ assessments: [], reports: [] });
  const [latestResult, setLatestResult] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

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
  const totalQuestions = 26; // 9 + 7 + 10
  const progressPercent = Math.round((totalAnswered / totalQuestions) * 100);
  const allCompleted = totalAnswered === totalQuestions;

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

  useEffect(() => {
    loadReports();
  }, []);

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
      // Transition to next test
      setActiveTestIndex((prev) => prev + 1);
      setActiveQuestionIndex(0);
    } else {
      // On the very last question of the final test, open review
      setShowReviewModal(true);
    }
  };

  const handlePrev = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex((prev) => prev - 1);
    } else if (activeTestIndex > 0) {
      // Transition back to previous test's last question
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

      // Reset form to fresh state
      setPhq9(Array(9).fill(null));
      setGad7(Array(7).fill(null));
      setPss10(Array(10).fill(null));
      setActiveTestIndex(0);
      setActiveQuestionIndex(0);

      await loadReports();
    } catch (err) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-lg">
      {/* Privacy-First Welcome Banner without exposing raw anonymousId */}
      <div className="rounded-xl bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
              Member Portal · Confidential Screening
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-xs font-semibold text-primary dark:text-primary-fixed-dim flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>100% Confidential</span>
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs">
            Welcome, {user?.fullName}
          </h1>

          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs max-w-2xl">
            Your check-in responses are cryptographically isolated and completely anonymized. Institutional administrators only ever view aggregated cohort statistics—never your identity, email, or individual responses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-sm shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high dark:bg-surface-container border border-outline-variant/60">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
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
              No organization linked. Register with an organization email to submit check-ins.
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

      {/* Immediate Support Alert for Critical Scores */}
      {(latestResult?.crisisAlert || latestResult?.assessment?.severityTier === 'CRITICAL') && (
        <div className="rounded-xl bg-error-container text-on-error-container p-space-lg shadow-sm border border-error/30">
          <div className="flex items-center gap-space-sm font-headline-sm text-headline-sm">
            <span className="material-symbols-outlined text-[24px]">emergency</span>
            <span>Immediate Support Is Available</span>
          </div>
          <p className="font-body-md text-body-md mt-space-xs">
            Your responses indicate elevated clinical distress. Confidential support is here for you. Please reach out to your institution&apos;s assigned clinicians or connect with the 988 Suicide &amp; Crisis Lifeline (call/text 988 in US &amp; Canada) or local emergency support.
          </p>
        </div>
      )}

      {/* Main Grid: Screening Engine (Left) + Reports History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Column: 3 Separated Tests with Navigator & One Question at a Time */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
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
                  className={`py-2.5 px-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-container-lowest dark:bg-surface-container shadow-sm border border-primary/50 text-on-surface dark:text-inverse-on-surface'
                      : 'text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-label-sm text-xs font-bold px-1.5 py-0.5 rounded ${
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

                  <span className="font-label-sm text-xs font-medium mt-1 truncate max-w-full">
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
            {/* Question Header & Navigator */}
            <div className="flex flex-col gap-space-sm pb-space-sm border-b border-outline-variant/40">
              <div className="flex flex-wrap items-center justify-between gap-space-xs">
                <div>
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary dark:text-primary-fixed-dim font-bold">
                    {currentTest.tag} · Question {activeQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                    {currentTest.timeframe}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-xs font-semibold text-on-surface-variant dark:text-tertiary-fixed-dim">
                    Overall: {totalAnswered}/26 ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Question Navigator Dots / Numbers Bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider mr-1">
                  Jump to:
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

              {/* Global Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden mt-1">
                <div
                  className="h-full bg-primary dark:bg-primary-fixed-dim transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Active Question Prompt Display */}
            <div className="py-space-xs">
              <div className="flex items-start gap-space-sm">
                <span className="w-7 h-7 rounded-full bg-primary-fixed dark:bg-primary-container text-on-primary-fixed-variant dark:text-on-primary-container font-label-sm text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  Q{activeQuestionIndex + 1}
                </span>
                <h2 className="font-headline-sm text-title-md sm:text-headline-sm text-on-surface dark:text-inverse-on-surface font-semibold leading-snug">
                  {currentQuestions[activeQuestionIndex]}
                </h2>
              </div>
            </div>

            {/* Interactive Options Stack (One question at a time) */}
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

            {/* Navigation Buttons: Previous | Next */}
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

        {/* Right Column: Screening Reports History */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-fixed dark:bg-primary-container text-primary dark:text-primary-fixed-dim flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                </span>
                <h2 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
                  My Screening Reports
                </h2>
              </div>
              <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                {reportsData.reports.length} {reportsData.reports.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {loadingReports ? (
              <div className="p-space-lg text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin text-[24px]">
                  progress_activity
                </span>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Retrieving your confidential check-in history...
                </p>
              </div>
            ) : reportsData.reports.length === 0 ? (
              <div className="p-space-lg text-center flex flex-col items-center gap-space-xs border border-dashed border-outline-variant rounded-xl">
                <span className="material-symbols-outlined text-outline text-[32px]">assignment_add</span>
                <p className="font-body-md text-sm font-medium text-on-surface dark:text-inverse-on-surface">
                  No check-ins submitted yet
                </p>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim max-w-xs">
                  Complete the 3 quick screening instruments to receive personalized AI psychoeducational summaries and curated wellness resources.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-space-md max-h-[640px] overflow-y-auto pr-1">
                {reportsData.reports.map((rep) => {
                  const matchingAssessment = reportsData.assessments.find(
                    (a) => a._id === rep.assessmentId
                  );

                  return (
                    <div
                      key={rep._id}
                      className="rounded-xl bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 p-space-md flex flex-col gap-space-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-space-sm">
                        <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                          {matchingAssessment?.month || new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                        {matchingAssessment && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                              SEVERITY_BADGE[matchingAssessment.severityTier] || ''
                            }`}
                          >
                            {matchingAssessment.severityTier} RISK
                          </span>
                        )}
                      </div>

                      {matchingAssessment?.scores && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant dark:text-tertiary-fixed-dim py-1 border-y border-outline-variant/30">
                          <span>PHQ: {matchingAssessment.scores.phq9}/27</span>
                          <span>•</span>
                          <span>GAD: {matchingAssessment.scores.gad7}/21</span>
                          <span>•</span>
                          <span>PSS: {matchingAssessment.scores.pss10}/40</span>
                        </div>
                      )}

                      <p className="font-body-sm text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed mt-1">
                        {rep.aiSummary}
                      </p>

                      {rep.actionableSteps?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-outline-variant/30">
                          <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-primary dark:text-primary-fixed-dim block mb-1">
                            Actionable Steps
                          </span>
                          <ul className="list-disc pl-4 font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim space-y-1">
                            {rep.actionableSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rep.recommendedResourceIds?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {rep.recommendedResourceIds.map((res) => (
                            <a
                              key={res._id}
                              className="px-2 py-0.5 rounded-md bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container font-label-sm text-[11px] hover:underline flex items-center gap-1"
                              href={res.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              <span>{res.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Final Submission Modal */}
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
