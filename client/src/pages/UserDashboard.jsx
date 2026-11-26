import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things, such as reading or studying',
  'Moving or speaking so slowly that other people noticed, or being fidgety/restless',
  'Thoughts that you would be better off dead, or of hurting yourself',
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
  'Felt confident about your ability to handle personal problems (0 = very often, 4 = never)',
  'Felt that things were going your way (0 = very often, 4 = never)',
  'Found that you could not cope with all the things you had to do',
  'Been able to control irritations in your life (0 = very often, 4 = never)',
  'Felt that you were on top of things (0 = very often, 4 = never)',
  'Been angered because of things outside of your control',
  'Felt difficulties were piling up so high that you could not overcome them',
];

const SCALE_0_TO_3 = [
  { value: 0, label: '0 · Not at all' },
  { value: 1, label: '1 · Several days' },
  { value: 2, label: '2 · More than half the days' },
  { value: 3, label: '3 · Nearly every day' },
];

const SCALE_0_TO_4 = [
  { value: 0, label: '0 · Never' },
  { value: 1, label: '1 · Almost never' },
  { value: 2, label: '2 · Sometimes' },
  { value: 3, label: '3 · Fairly often' },
  { value: 4, label: '4 · Very often' },
];

const SEVERITY_BADGE = {
  LOW: 'bg-secondary-container text-on-secondary-container',
  MODERATE: 'bg-surface-container-highest text-on-surface',
  HIGH: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  CRITICAL: 'bg-error-container text-on-error-container',
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [phq9, setPhq9] = useState(Array(9).fill(0));
  const [gad7, setGad7] = useState(Array(7).fill(0));
  const [pss10, setPss10] = useState(Array(10).fill(0));
  const [reportsData, setReportsData] = useState({ assessments: [], reports: [] });
  const [latestResult, setLatestResult] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const updateAnswer = (setter, index, value) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = Number(value);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await userApi.submitAssessment({
        phq9Answers: phq9,
        gad7Answers: gad7,
        pss10Answers: pss10,
      });
      setLatestResult(res);
      await loadReports();
    } catch (err) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-xl">
      <div className="rounded-xl bg-surface-container-low dark:bg-tertiary p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
            Member Portal · Non-Diagnostic Screening
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs">
            Welcome, {user?.fullName}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs">
            Your screening submissions are stored solely under your isolated{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-container-highest dark:bg-on-primary-fixed font-semibold">
              {user?.anonymousId}
            </code>
            .
          </p>
        </div>
        {!user?.orgId && (
          <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
            No organization linked to this account. Register with an Organization ID to submit check-ins.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {error}
        </div>
      )}

      {(latestResult?.crisisAlert || latestResult?.assessment?.severityTier === 'CRITICAL') && (
        <div className="rounded-xl bg-error-container text-on-error-container p-space-lg shadow-sm">
          <div className="flex items-center gap-space-sm font-headline-sm text-headline-sm">
            <span className="material-symbols-outlined">emergency</span>
            <span>Immediate Support Available</span>
          </div>
          <p className="font-body-md text-body-md mt-space-xs">
            Your responses indicate elevated distress. Please reach out to your organization&apos;s assigned clinician or call/text 988 (US &amp; Canada) or local emergency services immediately.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <form
          className="lg:col-span-7 rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm flex flex-col gap-space-lg"
          onSubmit={handleSubmit}
        >
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
              Monthly Check-In (PHQ-9 · GAD-7 · PSS-10)
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs">
              Over the last 2 weeks (or past month for PSS-10), how often have you experienced each item?
            </p>
          </div>

          <QuestionGroup
            answers={phq9}
            onChange={(i, val) => updateAnswer(setPhq9, i, val)}
            questions={PHQ9_QUESTIONS}
            scale={SCALE_0_TO_3}
            title="PHQ-9 (Mood & Energy)"
          />
          <QuestionGroup
            answers={gad7}
            onChange={(i, val) => updateAnswer(setGad7, i, val)}
            questions={GAD7_QUESTIONS}
            scale={SCALE_0_TO_3}
            title="GAD-7 (Worry & Tension)"
          />
          <QuestionGroup
            answers={pss10}
            onChange={(i, val) => updateAnswer(setPss10, i, val)}
            questions={PSS10_QUESTIONS}
            scale={SCALE_0_TO_4}
            title="PSS-10 (Perceived Stress)"
          />

          <button
            className="w-full py-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60 font-label-lg text-label-lg transition-colors"
            disabled={submitting || !user?.orgId}
            type="submit"
          >
            {submitting ? 'Generating AI Well-Being Report...' : 'Submit Monthly Check-In'}
          </button>
        </form>

        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface mb-space-md">
              My Screening Reports
            </h2>
            {loadingReports ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Loading your reports...
              </p>
            ) : reportsData.reports.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                No check-ins submitted yet. Complete the questionnaire to receive personalized non-diagnostic guidance.
              </p>
            ) : (
              <div className="flex flex-col gap-space-md">
                {reportsData.reports.map((rep) => {
                  const matchingAssessment = reportsData.assessments.find(
                    (a) => a._id === rep.assessmentId
                  );
                  return (
                    <div
                      key={rep._id}
                      className="rounded-lg bg-surface-container-low dark:bg-on-primary-fixed p-space-md flex flex-col gap-space-sm"
                    >
                      <div className="flex items-center justify-between gap-space-sm">
                        <span className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface">
                          {matchingAssessment?.month || new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                        {matchingAssessment && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${
                              SEVERITY_BADGE[matchingAssessment.severityTier] || ''
                            }`}
                          >
                            {matchingAssessment.severityTier}
                          </span>
                        )}
                      </div>
                      {matchingAssessment && (
                        <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                          PHQ-9: {matchingAssessment.scores.phq9}/27 · GAD-7: {matchingAssessment.scores.gad7}/21 · PSS-10: {matchingAssessment.scores.pss10}/40
                        </p>
                      )}
                      <p className="font-body-sm text-body-sm text-on-surface dark:text-inverse-on-surface">
                        {rep.aiSummary}
                      </p>
                      {rep.actionableSteps?.length > 0 && (
                        <ul className="list-disc pl-5 font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim space-y-1">
                          {rep.actionableSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      )}
                      {rep.recommendedResourceIds?.length > 0 && (
                        <div className="flex flex-wrap gap-space-xs pt-space-xs">
                          {rep.recommendedResourceIds.map((res) => (
                            <a
                              key={res._id}
                              className="px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-label-sm hover:underline"
                              href={res.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {res.title} ({res.type})
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
    </div>
  );
}

function QuestionGroup({ title, questions, answers, scale, onChange }) {
  return (
    <div className="flex flex-col gap-space-sm">
      <h3 className="font-headline-sm text-headline-sm text-primary dark:text-primary-fixed-dim">
        {title}
      </h3>
      <div className="flex flex-col gap-space-sm">
        {questions.map((q, idx) => (
          <div
            key={idx}
            className="rounded-lg bg-surface-container-low dark:bg-on-primary-fixed p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm"
          >
            <span className="font-body-sm text-body-sm text-on-surface dark:text-inverse-on-surface">
              {idx + 1}. {q}
            </span>
            <select
              className="shrink-0 rounded-lg border border-outline-variant dark:border-outline bg-surface dark:bg-tertiary px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface dark:text-inverse-on-surface"
              onChange={(e) => onChange(idx, e.target.value)}
              value={answers[idx]}
            >
              {scale.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
