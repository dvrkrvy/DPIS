import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doctorApi } from '../services/api';

const STATUS_OPTIONS = ['UNREVIEWED', 'CONTACTED', 'IN_CARE', 'RESOLVED'];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [statusDraft, setStatusDraft] = useState({});
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    doctorApi
      .getAssignedOrgs()
      .then((res) => {
        const list = res.organizations || [];
        setOrgs(list);
        if (list.length > 0) {
          setSelectedOrgId(list[0]._id);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load assigned organizations'));
  }, []);

  const loadQueue = async (orgId) => {
    if (!orgId) return;
    setError('');
    try {
      const res = await doctorApi.getOrgQueue(orgId);
      setQueueData(res);
      const nextNotes = {};
      const nextStatus = {};
      for (const item of res.queue || []) {
        nextNotes[item._id] = item.doctorNotes || '';
        nextStatus[item._id] = item.doctorStatus || 'UNREVIEWED';
      }
      setNotesDraft(nextNotes);
      setStatusDraft(nextStatus);
    } catch (err) {
      setError(err.message || 'Failed to load triage queue');
    }
  };

  useEffect(() => {
    if (selectedOrgId) loadQueue(selectedOrgId);
  }, [selectedOrgId]);

  const handleSaveCase = async (assessmentId) => {
    setSavingId(assessmentId);
    setError('');
    try {
      await doctorApi.updateCaseStatus(assessmentId, {
        doctorStatus: statusDraft[assessmentId],
        doctorNotes: notesDraft[assessmentId],
      });
      await loadQueue(selectedOrgId);
    } catch (err) {
      setError(err.message || 'Failed to update case');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-xl">
      <div className="rounded-xl bg-surface-container-low dark:bg-tertiary p-space-lg">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
          Assigned Clinician Portal · Priority Triage
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs">
          Dr. {user?.fullName} — Care Queue
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs">
          Cases are ordered by clinical severity first, then wait time. Contact details are authorized only for your assigned organizations.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {error}
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
          No organizations are currently assigned to your clinician account.
        </div>
      ) : (
        <div className="flex flex-col gap-space-lg">
          <div className="flex flex-wrap gap-space-sm">
            {orgs.map((org) => (
              <button
                key={org._id}
                className={`px-space-md py-space-sm rounded-lg font-label-lg text-label-lg transition-colors ${
                  selectedOrgId === org._id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high dark:bg-tertiary text-on-surface dark:text-inverse-on-surface'
                }`}
                onClick={() => setSelectedOrgId(org._id)}
                type="button"
              >
                {org.name} ({org.highOrCriticalCount} High/Critical)
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-space-md">
            {(queueData?.queue || []).map((item) => (
              <div
                key={item._id}
                className="rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm flex flex-col gap-space-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface">
                      {item.patient?.fullName || item.anonymousId}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                      {item.patient?.email || 'No email'} · ID: {item.anonymousId} · Month: {item.month}
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <span className="px-3 py-1 rounded-full bg-surface-container-high dark:bg-on-primary-fixed font-label-sm text-label-sm">
                      PHQ-9: {item.scores.phq9} · GAD-7: {item.scores.gad7} · PSS-10: {item.scores.pss10}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">
                      {item.severityTier}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-start">
                  <select
                    className="md:col-span-3 rounded-lg border border-outline-variant dark:border-outline bg-surface dark:bg-on-primary-fixed px-3 py-2 font-body-sm text-body-sm"
                    onChange={(e) =>
                      setStatusDraft((prev) => ({ ...prev, [item._id]: e.target.value }))
                    }
                    value={statusDraft[item._id] || 'UNREVIEWED'}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <input
                    className="md:col-span-7 rounded-lg border border-outline-variant dark:border-outline bg-surface dark:bg-on-primary-fixed px-3 py-2 font-body-sm text-body-sm"
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [item._id]: e.target.value }))
                    }
                    placeholder="Structured clinical notes..."
                    type="text"
                    value={notesDraft[item._id] ?? ''}
                  />

                  <button
                    className="md:col-span-2 py-2 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60 font-label-lg text-label-lg"
                    disabled={savingId === item._id}
                    onClick={() => handleSaveCase(item._id)}
                    type="button"
                  >
                    {savingId === item._id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
