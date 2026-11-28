import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import SeverityDonutChart from '../components/charts/SeverityDonutChart';
import ClinicalRadialGauge from '../components/charts/ClinicalRadialGauge';
import MonthlyTrendsChart from '../components/charts/MonthlyTrendsChart';
import TriageFunnelChart from '../components/charts/TriageFunnelChart';
import ComorbidityScatterPlot from '../components/charts/ComorbidityScatterPlot';

const SEVERITY_BADGE_MAP = {
  CRITICAL: 'bg-error-container text-on-error-container',
  HIGH: 'bg-tertiary-container text-white',
  MODERATE: 'bg-primary-fixed text-on-primary-fixed-variant dark:text-on-primary-container',
  LOW: 'bg-secondary-container text-on-secondary-container',
};

const DOCTOR_STATUS_BADGE_MAP = {
  IN_CARE: 'bg-primary-fixed text-on-primary-fixed dark:text-on-primary-container',
  RESOLVED: 'bg-primary-fixed text-on-primary-fixed dark:text-on-primary-container',
  CONTACTED: 'bg-secondary-container text-on-secondary-container',
  UNREVIEWED: 'bg-surface-container-high dark:bg-on-primary-fixed text-on-surface-variant dark:text-tertiary-fixed-dim',
};

const getPhq9Band = (score) => {
  if (score >= 20) return 'Severe';
  if (score >= 15) return 'Mod. Severe';
  if (score >= 10) return 'Moderate';
  if (score >= 5) return 'Mild';
  return 'Minimal';
};

const getGad7Band = (score) => {
  if (score >= 15) return 'Severe';
  if (score >= 10) return 'Moderate';
  if (score >= 5) return 'Mild';
  return 'Minimal';
};

const getPss10Band = (score) => {
  if (score >= 27) return 'High';
  if (score >= 14) return 'Moderate';
  return 'Low';
};

const getRecentMonths = () => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    list.push(ym);
  }
  return list;
};

export default function AdminDashboard() {
  const { user, updateSession } = useAuth();

  const [checkingOrg, setCheckingOrg] = useState(true);
  const [organization, setOrganization] = useState(null);

  const [analytics, setAnalytics] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [headerMonth, setHeaderMonth] = useState('ALL');
  const [tableSeverity, setTableSeverity] = useState('ALL');
  const [tableMonth, setTableMonth] = useState('ALL');

  // Search & Profile History Inspection
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminScreeningView, setAdminScreeningView] = useState('profiles'); // 'profiles' | 'all'
  const [activeAdminPatientModal, setActiveAdminPatientModal] = useState(null);
  const [adminPatientHistoryData, setAdminPatientHistoryData] = useState(null);
  const [loadingAdminHistory, setLoadingAdminHistory] = useState(false);
  const [adminHistoryError, setAdminHistoryError] = useState('');

  // Clinical Counseling & Treatment Records State
  const [treatmentView, setTreatmentView] = useState('doctors'); // 'doctors' | 'students'
  const [treatmentSearch, setTreatmentSearch] = useState('');

  const defaultDomain = user?.email?.includes('@') ? user.email.split('@')[1] : '';
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('UNIVERSITY');
  const [companyEmail, setCompanyEmail] = useState(defaultDomain);
  const [orgInviteCode, setOrgInviteCode] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [error, setError] = useState('');
  const [orgMessage, setOrgMessage] = useState('');

  const checkAdminOrg = () => {
    setCheckingOrg(true);
    setError('');

    adminApi
      .getMyOrganization()
      .then((res) => {
        if (res?.organization) {
          setOrganization(res.organization);
          if (res.token || res.user) {
            updateSession({ token: res.token, user: res.user });
          }
        } else {
          setOrganization(null);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to verify organization status');
      })
      .finally(() => {
        setCheckingOrg(false);
      });
  };

  useEffect(() => {
    checkAdminOrg();
  }, []);

  const loadAnalyticsAndProfiles = async () => {
    if (!organization?._id) return;
    setLoadingData(true);
    setError('');
    try {
      const [analyticsRes, profilesRes] = await Promise.all([
        adminApi.getAnalytics({
          month: headerMonth === 'ALL' ? undefined : headerMonth,
        }),
        adminApi.getProfiles({
          severity: tableSeverity === 'ALL' ? undefined : tableSeverity,
          month: tableMonth === 'ALL' ? undefined : tableMonth,
        }),
      ]);
      setAnalytics(analyticsRes);
      setProfiles(profilesRes.profiles || []);
      if (analyticsRes?.organization) {
        setOrganization((prev) => ({ ...prev, ...analyticsRes.organization }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load organizational analytics');
    } finally {
      setLoadingData(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!organization?._id || generatingAi) return;
    setGeneratingAi(true);
    try {
      const res = await adminApi.getAiAnalyticsSummary({
        month: headerMonth === 'ALL' ? undefined : headerMonth,
      });
      if (res?.aiBulletPoints && res.aiBulletPoints.length > 0) {
        setAnalytics((prev) => ({ ...prev, aiBulletPoints: res.aiBulletPoints }));
      }
    } catch (err) {
      console.warn('AI summary request failed:', err.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const loadAdminPatientHistory = async (anonId) => {
    setActiveAdminPatientModal(anonId);
    setLoadingAdminHistory(true);
    setAdminHistoryError('');
    try {
      const res = await adminApi.getPatientHistory(anonId);
      setAdminPatientHistoryData(res);
    } catch (err) {
      setAdminHistoryError(err.message || 'Failed to load patient history');
    } finally {
      setLoadingAdminHistory(false);
    }
  };

  useEffect(() => {
    if (organization?._id) {
      loadAnalyticsAndProfiles();
    }
  }, [organization?._id, headerMonth, tableSeverity, tableMonth]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setError('');
    setOrgMessage('');
    setCreatingOrg(true);

    try {
      const res = await adminApi.createOrganization({
        name: orgName,
        type: orgType,
        companyEmail: companyEmail.trim(),
        inviteCode: orgInviteCode.trim() || undefined,
      });

      if (res.token || res.user) {
        updateSession({ token: res.token, user: res.user });
      }
      setOrganization(res.organization);
      setOrgMessage(
        `Organization "${res.organization.name}" created and permanently linked to your administrator account.`
      );
      setOrgName('');
      setOrgInviteCode('');
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
    }
  };

  const monthOptions = useMemo(() => {
    const set = new Set(getRecentMonths());
    for (const p of profiles) {
      if (p.month) set.add(p.month);
    }
    return Array.from(set).sort().reverse();
  }, [profiles]);

  const monthlyMetrics = useMemo(() => {
    const map = {};
    profiles.forEach((p) => {
      const m = p.month || 'Unknown';
      if (!map[m]) {
        map[m] = {
          month: m,
          total: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          sumPhq: 0,
          sumGad: 0,
          sumPss: 0,
        };
      }
      map[m].total += 1;
      const tier = String(p.severityTier || '').toUpperCase();
      if (tier === 'LOW') map[m].low += 1;
      else if (tier === 'MODERATE') map[m].moderate += 1;
      else if (tier === 'HIGH') map[m].high += 1;
      else if (tier === 'CRITICAL') map[m].critical += 1;

      if (p.scores) {
        map[m].sumPhq += Number(p.scores.phq9 || 0);
        map[m].sumGad += Number(p.scores.gad7 || 0);
        map[m].sumPss += Number(p.scores.pss10 || 0);
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgPhq: item.total ? Number((item.sumPhq / item.total).toFixed(1)) : 0,
        avgGad: item.total ? Number((item.sumGad / item.total).toFixed(1)) : 0,
        avgPss: item.total ? Number((item.sumPss / item.total).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [profiles]);

  const triageFunnel = useMemo(() => {
    let unreviewed = 0;
    let contacted = 0;
    let inCare = 0;
    let resolved = 0;

    profiles.forEach((p) => {
      const status = String(p.doctorStatus || 'UNREVIEWED').toUpperCase();
      if (status === 'IN_CARE') inCare += 1;
      else if (status === 'RESOLVED') resolved += 1;
      else if (status === 'CONTACTED') contacted += 1;
      else unreviewed += 1;
    });

    const total = profiles.length;
    const flagged = profiles.filter((p) =>
      ['HIGH', 'CRITICAL', 'MODERATE'].includes(String(p.severityTier || '').toUpperCase())
    ).length;
    const actionTaken = contacted + inCare + resolved;

    return {
      total,
      unreviewed,
      contacted,
      inCare,
      resolved,
      flagged,
      actionTaken,
      actionRate: flagged > 0 ? Math.round((actionTaken / flagged) * 100) : 100,
    };
  }, [profiles]);

  // Counseling & Treatment Metrics
  const counselingAnalytics = analytics?.counselingAnalytics || {
    totalBooked: 0,
    completedCount: 0,
    scheduledCount: 0,
    cancelledCount: 0,
    doctorInitiatedCount: 0,
    studentInitiatedCount: 0,
    completionRate: 0,
    uniqueStudentsTreated: 0,
    uniqueDoctorsActive: 0,
  };

  const treatedDoctors = analytics?.treatedDoctors || [];
  const treatedStudents = analytics?.treatedStudents || [];

  const filteredTreatedDoctors = useMemo(() => {
    if (!treatmentSearch.trim()) return treatedDoctors;
    const q = treatmentSearch.toLowerCase().trim();
    return treatedDoctors.filter(
      (d) => d.fullName?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q)
    );
  }, [treatedDoctors, treatmentSearch]);

  const filteredTreatedStudents = useMemo(() => {
    if (!treatmentSearch.trim()) return treatedStudents;
    const q = treatmentSearch.toLowerCase().trim();
    return treatedStudents.filter(
      (s) =>
        s.anonymousId?.toLowerCase().includes(q) ||
        (s.doctorsInvolved || []).some((doc) => doc.toLowerCase().includes(q))
    );
  }, [treatedStudents, treatmentSearch]);

  // Group assessments by student member (anonymousId)
  const distinctAdminProfiles = useMemo(() => {
    const map = new Map();
    for (const p of profiles) {
      const id = p.anonymousId;
      if (!map.has(id)) {
        map.set(id, {
          anonymousId: id,
          assessments: [],
          latestAssessment: p,
        });
      }
      const prof = map.get(id);
      prof.assessments.push(p);
    }
    return Array.from(map.values());
  }, [profiles]);

  const filteredAdminProfiles = useMemo(() => {
    let list = distinctAdminProfiles;
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.toLowerCase().trim();
      list = list.filter((prof) => {
        const idMatch = prof.anonymousId?.toLowerCase().includes(q);
        const notesMatch = prof.assessments.some((a) => (a.doctorNotes || '').toLowerCase().includes(q));
        const tierMatch = prof.assessments.some((a) => (a.severityTier || '').toLowerCase().includes(q));
        const statusMatch = prof.assessments.some((a) => (a.doctorStatus || '').toLowerCase().includes(q));
        return idMatch || notesMatch || tierMatch || statusMatch;
      });
    }
    return list;
  }, [distinctAdminProfiles, adminSearchQuery]);

  const filteredRawProfiles = useMemo(() => {
    let list = profiles;
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const idMatch = p.anonymousId?.toLowerCase().includes(q);
        const monthMatch = p.month?.toLowerCase().includes(q);
        const tierMatch = p.severityTier?.toLowerCase().includes(q);
        const statusMatch = p.doctorStatus?.toLowerCase().includes(q);
        const notesMatch = (p.doctorNotes || '').toLowerCase().includes(q);
        return idMatch || monthMatch || tierMatch || statusMatch || notesMatch;
      });
    }
    return list;
  }, [profiles, adminSearchQuery]);

  if (checkingOrg) {
    return (
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-space-xl">
        <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-xl shadow-sm flex items-center gap-space-md">
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin">
            progress_activity
          </span>
          <div>
            <p className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface">
              Checking your organization status...
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
              Verifying your permanent administrator assignment with the backend.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-space-xl">
        <div className="max-w-xl w-full mx-auto bg-surface-container-lowest dark:bg-tertiary rounded-xl shadow-md p-space-xl flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm text-error">
            <span className="material-symbols-outlined text-[28px]">error</span>
            <h2 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface">
              Unable to load organization
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            {error}
          </p>
          <button
            className="px-space-md py-space-sm rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white font-label-lg transition-colors w-fit"
            onClick={checkAdminOrg}
            type="button"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Only show the one-time organization setup when the backend confirms NO organization exists
  if (!organization) {
    return (
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-space-xl flex flex-col gap-space-lg">
        <div className="max-w-xl w-full mx-auto bg-surface-container-lowest dark:bg-tertiary rounded-xl shadow-md p-space-xl flex flex-col gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
              One-Time Permanent Setup
            </span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface">
              Create Your Organization
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
              One admin can create only one organization and remains permanently linked to it. Students and employees registering with your company or university email domain will join automatically.
            </p>
          </div>

          <form className="flex flex-col gap-space-md" onSubmit={handleCreateOrg}>
            <div className="flex flex-col gap-space-xs">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="org-name"
              >
                Organization Name
              </label>
              <input
                className="bg-surface-container-low dark:bg-on-primary-fixed rounded-lg px-space-md py-space-sm font-body-md text-body-md text-on-surface dark:text-inverse-on-surface focus:outline-none"
                id="org-name"
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Northwood University"
                required
                type="text"
                value={orgName}
              />
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="org-type"
              >
                Organization Type
              </label>
              <select
                className="bg-surface-container-low dark:bg-on-primary-fixed rounded-lg px-space-md py-space-sm font-body-md text-body-md text-on-surface dark:text-inverse-on-surface focus:outline-none"
                id="org-type"
                onChange={(e) => setOrgType(e.target.value)}
                value={orgType}
              >
                <option value="UNIVERSITY">UNIVERSITY</option>
                <option value="COMPANY">COMPANY</option>
              </select>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="company-email"
              >
                Company / Institution Email or Domain
              </label>
              <input
                className="bg-surface-container-low dark:bg-on-primary-fixed rounded-lg px-space-md py-space-sm font-body-md text-body-md text-on-surface dark:text-inverse-on-surface focus:outline-none"
                id="company-email"
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="e.g. wellness@university.edu or university.edu"
                required
                type="text"
                value={companyEmail}
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Only users with this email domain can enroll under your organization.
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="invite-code"
              >
                Invite Code <span className="text-outline font-normal">(Optional)</span>
              </label>
              <input
                className="bg-surface-container-low dark:bg-on-primary-fixed rounded-lg px-space-md py-space-sm font-body-md text-body-md text-on-surface dark:text-inverse-on-surface uppercase focus:outline-none"
                id="invite-code"
                onChange={(e) => setOrgInviteCode(e.target.value)}
                placeholder="e.g. NWU-2026 (auto-generated if omitted)"
                type="text"
                value={orgInviteCode}
              />
            </div>

            <button
              className="mt-space-sm bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] disabled:opacity-60 text-white font-label-lg text-label-lg px-space-lg py-3 rounded-lg transition-colors shadow-sm cursor-pointer"
              disabled={creatingOrg}
              type="submit"
            >
              {creatingOrg ? 'Creating Organization...' : 'Create Organization'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalAssessments = analytics?.totalAssessments ?? 0;
  const severityCounts = analytics?.severityCounts || {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  const avgScores = analytics?.averageScores || { phq9: 0, gad7: 0, pss10: 0 };
  const pct = (count) => (totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0);

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-space-xl flex flex-col gap-space-xl">
        {/* Privacy-First Banner */}
        <section
          id="overview"
          className="w-full bg-surface-container-low dark:bg-tertiary rounded-xl p-space-md lg:px-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md shadow-sm transition-colors"
        >
          <div className="flex items-start sm:items-center gap-space-md">
            <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface">
                Privacy-First Organizational View
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Administrators only view anonymized screening records (
                <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim bg-primary-fixed/60 dark:bg-on-primary-fixed px-space-xs py-0.5 rounded">
                  anonymousId
                </span>
                ) and aggregated organization metrics—never individual names, emails, or personal identifiers.
              </p>
            </div>
          </div>
          <span className="font-label-sm text-label-sm text-on-secondary-container bg-secondary-container px-space-md py-space-xs rounded-full shrink-0">
            Zero-PII Enforced
          </span>
        </section>

        {error && (
          <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
            {error}
          </div>
        )}

        {orgMessage && (
          <div className="rounded-lg bg-secondary-container text-on-secondary-container px-space-md py-space-sm font-body-sm text-body-sm">
            {orgMessage}
          </div>
        )}

        {/* Organization Header & Controls */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim">
                Organization Dashboard
              </span>
              <span className="text-outline-variant">•</span>
              <span className="font-label-sm text-label-sm text-primary dark:text-on-primary-container bg-primary-fixed px-space-sm py-0.5 rounded">
                {organization.type}
              </span>
              {organization.emailDomain && (
                <span className="font-label-sm text-label-sm text-on-secondary-container bg-secondary-container px-space-sm py-0.5 rounded">
                  @{organization.emailDomain}
                </span>
              )}
              {organization.inviteCode && (
                <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim bg-surface-container-high dark:bg-tertiary px-space-sm py-0.5 rounded">
                  Code: {organization.inviteCode}
                </span>
              )}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface">
              {organization.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-sm bg-surface-container-lowest dark:bg-tertiary rounded-lg px-space-md py-space-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                calendar_month
              </span>
              <label className="sr-only" htmlFor="header-month-filter">
                Filter by Month
              </label>
              <select
                className="bg-transparent font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface focus:outline-none cursor-pointer"
                id="header-month-filter"
                onChange={(e) => setHeaderMonth(e.target.value)}
                value={headerMonth}
              >
                <option value="ALL">All Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-surface-container-low dark:bg-tertiary text-on-surface-variant dark:text-tertiary-fixed-dim font-label-sm text-label-sm px-space-md py-space-sm rounded-lg flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary dark:text-primary-fixed-dim">
                lock
              </span>
              <span>Permanent Organization</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COUNSELING & CLINICAL CARE ANALYTICS (Treated Doctors & Students)         */}
        {/* ========================================================================= */}
        <section
          id="counseling-treatment"
          className="bg-surface-container-lowest dark:bg-tertiary rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg"
        >
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/40">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  medical_services
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
                  Clinical Counseling &amp; Treatment Analytics
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Tracking 25-minute institutional consultations between 5:00 PM and 8:00 PM across active students and clinicians.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:text-primary-fixed-dim border border-primary/20">
                Institutional Care Pipeline
              </span>
            </div>
          </div>

          {/* Pictorial Counseling Intelligence & KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Total Booked
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.totalBooked}
                </span>
                <span className="text-xs text-on-surface-variant">Sessions</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">All counseling requests</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Completed Care
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {counselingAnalytics.completedCount}
                </span>
                <span className="text-xs text-on-surface-variant font-bold">
                  ({counselingAnalytics.completionRate}%)
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Consultations finalized</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Students Treated
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-primary dark:text-primary-fixed-dim">
                  {counselingAnalytics.uniqueStudentsTreated}
                </span>
                <span className="text-xs text-on-surface-variant">Cohorts</span>
              </div>
              <span className="text-[10px] text-primary dark:text-primary-fixed-dim mt-1">Received counseling</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Treating Doctors
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.uniqueDoctorsActive}
                </span>
                <span className="text-xs text-on-surface-variant">Active</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">Treated ≥ 1 student</span>
            </div>
          </div>

          {/* Pictorial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Status Breakdown Pictorial Progress */}
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex flex-col justify-between gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">donut_small</span>
                  <span>Session Outcome &amp; Status Funnel</span>
                </span>
                <span className="text-xs font-mono font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.totalBooked} Total
                </span>
              </div>

              {/* Multi-segment pictorial bar */}
              <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex my-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.completedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Completed: ${counselingAnalytics.completedCount}`}
                />
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.scheduledCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Scheduled: ${counselingAnalytics.scheduledCount}`}
                />
                <div
                  className="h-full bg-neutral-400 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.cancelledCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Cancelled: ${counselingAnalytics.cancelledCount}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Completed</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{counselingAnalytics.completedCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Scheduled</span>
                  <strong className="text-blue-600 dark:text-blue-400">{counselingAnalytics.scheduledCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Cancelled</span>
                  <strong className="text-neutral-500">{counselingAnalytics.cancelledCount}</strong>
                </div>
              </div>
            </div>

            {/* Care Initiation Architecture Pictorial Comparison */}
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex flex-col justify-between gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-rose-500">crisis_alert</span>
                  <span>Session Initiation Architecture</span>
                </span>
                <span className="text-xs text-on-surface-variant">Triage Balance</span>
              </div>

              {/* Progress comparison */}
              <div className="flex flex-col gap-2 my-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">emergency</span>
                      <span>Doctor-Initiated (Mandatory Triage)</span>
                    </span>
                    <strong className="font-mono">{counselingAnalytics.doctorInitiatedCount}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{
                        width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.doctorInitiatedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-primary dark:text-primary-fixed-dim font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      <span>Student Self-Service Requested</span>
                    </span>
                    <strong className="font-mono">{counselingAnalytics.studentInitiatedCount}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.studentInitiatedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-on-surface-variant">
                {counselingAnalytics.doctorInitiatedCount > 0
                  ? `${counselingAnalytics.doctorInitiatedCount} critical de-escalation appointments enforced by assigned doctors.`
                  : 'Proactive student uptake with no emergency mandates currently required.'}
              </span>
            </div>
          </div>

          {/* Tab Switcher & Search Bar for Lists */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md pt-space-xs border-t border-outline-variant/40">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-outline-variant p-0.5 bg-surface-container-low dark:bg-surface-container shrink-0">
              <button
                type="button"
                onClick={() => setTreatmentView('doctors')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  treatmentView === 'doctors'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                <span>Active Clinicians (Treated ≥ 1 Student) ({treatedDoctors.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTreatmentView('students')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  treatmentView === 'students'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">groups_2</span>
                <span>Treated Students Cohort ({treatedStudents.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                placeholder={
                  treatmentView === 'doctors'
                    ? 'Search by Doctor Name or Email...'
                    : 'Search by Student ID or Doctor...'
                }
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
              />
              {treatmentSearch && (
                <button
                  type="button"
                  onClick={() => setTreatmentSearch('')}
                  className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* List 1: Doctors who have treated at least 1 student */}
          {treatmentView === 'doctors' ? (
            <div className="overflow-x-auto">
              {filteredTreatedDoctors.length === 0 ? (
                <div className="p-space-lg text-center border border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-outline text-[32px]">medical_services</span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface dark:text-inverse-on-surface">
                    No doctors currently meet the &quot;treated ≥ 1 student&quot; threshold
                  </span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    As assigned clinicians complete 25-minute consultation slots, their caseload records and metrics will populate here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Clinician Name &amp; Contact</th>
                      <th className="py-2.5 px-3">Unique Students Treated</th>
                      <th className="py-2.5 px-3">Completed Sessions</th>
                      <th className="py-2.5 px-3">Scheduled Ahead</th>
                      <th className="py-2.5 px-3">Last Active Consultation</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Caseload Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                    {filteredTreatedDoctors.map((doc) => (
                      <tr key={doc.doctorId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim flex items-center justify-center font-bold text-[11px]">
                              Dr
                            </span>
                            <span>{doc.fullName}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant pl-7 block">
                            {doc.email}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                            {doc.uniqueStudentsCount}
                          </span>
                          <span className="text-[11px] text-on-surface-variant ml-1">
                            {doc.uniqueStudentsCount === 1 ? 'student' : 'students'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                            {doc.completedSessions} Completed
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {doc.scheduledSessions} upcoming
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          <div>{doc.lastSessionDate || '—'}</div>
                          {doc.lastSlot && (
                            <span className="text-[10px] font-mono text-primary dark:text-primary-fixed-dim">
                              {doc.lastSlot}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-primary-fixed text-on-primary-fixed dark:text-on-primary-container">
                            Active Caregiver
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* List 2: Students who have received treatment / counseling */
            <div className="overflow-x-auto">
              {filteredTreatedStudents.length === 0 ? (
                <div className="p-space-lg text-center border border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-outline text-[32px]">group_off</span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface dark:text-inverse-on-surface">
                    No student counseling records found
                  </span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Students will appear in this cohort once they have attended or scheduled counseling with assigned doctors.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Student Profile (Zero-PII)</th>
                      <th className="py-2.5 px-3">Severity Tier</th>
                      <th className="py-2.5 px-3">Completed Sessions</th>
                      <th className="py-2.5 px-3">Total Booked</th>
                      <th className="py-2.5 px-3">Treating Clinicians</th>
                      <th className="py-2.5 px-3">Last Session Date</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                    {filteredTreatedStudents.map((s) => (
                      <tr key={s.anonymousId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-primary dark:text-primary-fixed-dim block">
                            {s.anonymousId}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            Anonymized Student Profile
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-label-sm text-[11px] px-2.5 py-0.5 rounded font-semibold ${
                              SEVERITY_BADGE_MAP[s.severityTier] || ''
                            }`}
                          >
                            {s.severityTier}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                            {s.completedSessions} Completed
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {s.totalSessions} Total
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {s.doctorsInvolved.length > 0 ? (
                              s.doctorsInvolved.map((docName, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-surface-container-high dark:bg-surface-container text-[11px] font-medium"
                                >
                                  Dr. {docName}
                                </span>
                              ))
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          <div>{s.lastSessionDate || '—'}</div>
                          {s.lastSlot && (
                            <span className="text-[10px] font-mono text-primary dark:text-primary-fixed-dim">
                              {s.lastSlot}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => loadAdminPatientHistory(s.anonymousId)}
                            className="px-2.5 py-1 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold cursor-pointer"
                          >
                            Inspect History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* Pictorial Analytics & Visual Intelligence Section */}
        <section id="well-being" className="flex flex-col gap-space-lg">
          {/* Top Row: Severity Donut & Care Velocity Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Severity Donut Card */}
            <div className="lg:col-span-7 bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
                <div className="flex items-center gap-space-xs">
                  <span className="w-8 h-8 rounded-lg bg-surface-container-low dark:bg-surface-container text-primary dark:text-primary-fixed-dim flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">donut_large</span>
                  </span>
                  <div>
                    <h2 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
                      Severity Distribution & Cohort Spectrum
                    </h2>
                    <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                      Interactive breakdown for {analytics?.month || 'all-time'}
                    </span>
                  </div>
                </div>
                <span className="font-label-sm text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-container text-on-surface dark:text-inverse-on-surface">
                  {totalAssessments} Screened
                </span>
              </div>

              <SeverityDonutChart
                severityCounts={severityCounts}
                totalAssessments={totalAssessments}
              />
            </div>

            {/* Care Delivery Funnel Card */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <TriageFunnelChart funnel={triageFunnel} />
            </div>
          </div>

          {/* Tri-Instrument Clinical Gauges Row */}
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-primary dark:bg-primary-fixed-dim" />
                <h3 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
                  Clinical Screening Instruments
                </h3>
              </div>
              <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                Average scores benchmarked to clinical thresholds
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <ClinicalRadialGauge
                instrument="PHQ-9"
                title="Depression Scale"
                score={avgScores.phq9}
                maxScore={27}
                band={getPhq9Band(avgScores.phq9)}
                description="Clinical threshold ≥ 10 indicates moderate depressive symptom elevation."
                zones={[
                  { label: 'Minimal', range: '0-4', color: '#8fa986' },
                  { label: 'Mild', range: '5-9', color: '#a3be8c' },
                  { label: 'Moderate', range: '10-14', color: '#d4af37' },
                  { label: 'Severe', range: '15+', color: '#e07a5f' },
                ]}
              />
              <ClinicalRadialGauge
                instrument="GAD-7"
                title="Generalized Anxiety"
                score={avgScores.gad7}
                maxScore={21}
                band={getGad7Band(avgScores.gad7)}
                description="Clinical threshold ≥ 10 warrants assigned clinical outreach."
                zones={[
                  { label: 'Minimal', range: '0-4', color: '#8fa986' },
                  { label: 'Mild', range: '5-9', color: '#a3be8c' },
                  { label: 'Moderate', range: '10-14', color: '#d4af37' },
                  { label: 'Severe', range: '15+', color: '#e07a5f' },
                ]}
              />
              <ClinicalRadialGauge
                instrument="PSS-10"
                title="Perceived Stress"
                score={avgScores.pss10}
                maxScore={40}
                band={getPss10Band(avgScores.pss10)}
                description="Scores ≥ 27 indicate high institutional stress requiring decompression interventions."
                zones={[
                  { label: 'Low', range: '0-13', color: '#8fa986' },
                  { label: 'Moderate', range: '14-26', color: '#d4af37' },
                  { label: 'High', range: '27+', color: '#e07a5f' },
                  { label: 'Severe', range: '35+', color: '#e63946' },
                ]}
              />
            </div>
          </div>

          {/* Advanced Longitudinal & Matrix Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Monthly Trends Chart */}
            <div className="lg:col-span-7 bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 rounded-xl p-space-lg shadow-sm">
              <MonthlyTrendsChart monthlyData={monthlyMetrics} />
            </div>

            {/* Co-Morbidity Matrix */}
            <div className="lg:col-span-5 bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 rounded-xl p-space-lg shadow-sm">
              <ComorbidityScatterPlot profiles={profiles} />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COUNSELING & CLINICAL CARE ANALYTICS (Treated Doctors & Students)         */}
        {/* ========================================================================= */}
        <section
          id="counseling-treatment"
          className="bg-surface-container-lowest dark:bg-tertiary rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg"
        >
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/40">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  medical_services
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
                  Clinical Counseling &amp; Treatment Analytics
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Tracking 25-minute institutional consultations between 5:00 PM and 8:00 PM across active students and clinicians.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:text-primary-fixed-dim border border-primary/20">
                Institutional Care Pipeline
              </span>
            </div>
          </div>

          {/* Pictorial Counseling Intelligence & KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Total Booked
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.totalBooked}
                </span>
                <span className="text-xs text-on-surface-variant">Sessions</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">All counseling requests</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Completed Care
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {counselingAnalytics.completedCount}
                </span>
                <span className="text-xs text-on-surface-variant font-bold">
                  ({counselingAnalytics.completionRate}%)
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Consultations finalized</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Students Treated
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-primary dark:text-primary-fixed-dim">
                  {counselingAnalytics.uniqueStudentsTreated}
                </span>
                <span className="text-xs text-on-surface-variant">Cohorts</span>
              </div>
              <span className="text-[10px] text-primary dark:text-primary-fixed-dim mt-1">Received counseling</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim uppercase tracking-wider">
                Treating Doctors
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.uniqueDoctorsActive}
                </span>
                <span className="text-xs text-on-surface-variant">Active</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">Treated ≥ 1 student</span>
            </div>
          </div>

          {/* Pictorial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Status Breakdown Pictorial Progress */}
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex flex-col justify-between gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">donut_small</span>
                  <span>Session Outcome &amp; Status Funnel</span>
                </span>
                <span className="text-xs font-mono font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingAnalytics.totalBooked} Total
                </span>
              </div>

              {/* Multi-segment pictorial bar */}
              <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex my-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.completedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Completed: ${counselingAnalytics.completedCount}`}
                />
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.scheduledCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Scheduled: ${counselingAnalytics.scheduledCount}`}
                />
                <div
                  className="h-full bg-neutral-400 transition-all duration-300"
                  style={{
                    width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.cancelledCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                  }}
                  title={`Cancelled: ${counselingAnalytics.cancelledCount}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Completed</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{counselingAnalytics.completedCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Scheduled</span>
                  <strong className="text-blue-600 dark:text-blue-400">{counselingAnalytics.scheduledCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary">
                  <span className="text-[10px] text-on-surface-variant block">Cancelled</span>
                  <strong className="text-neutral-500">{counselingAnalytics.cancelledCount}</strong>
                </div>
              </div>
            </div>

            {/* Care Initiation Architecture Pictorial Comparison */}
            <div className="p-space-md rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 flex flex-col justify-between gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-rose-500">crisis_alert</span>
                  <span>Session Initiation Architecture</span>
                </span>
                <span className="text-xs text-on-surface-variant">Triage Balance</span>
              </div>

              {/* Progress comparison */}
              <div className="flex flex-col gap-2 my-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">emergency</span>
                      <span>Doctor-Initiated (Mandatory Triage)</span>
                    </span>
                    <strong className="font-mono">{counselingAnalytics.doctorInitiatedCount}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{
                        width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.doctorInitiatedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-primary dark:text-primary-fixed-dim font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      <span>Student Self-Service Requested</span>
                    </span>
                    <strong className="font-mono">{counselingAnalytics.studentInitiatedCount}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${counselingAnalytics.totalBooked > 0 ? (counselingAnalytics.studentInitiatedCount / counselingAnalytics.totalBooked) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-on-surface-variant">
                {counselingAnalytics.doctorInitiatedCount > 0
                  ? `${counselingAnalytics.doctorInitiatedCount} critical de-escalation appointments enforced by assigned doctors.`
                  : 'Proactive student uptake with no emergency mandates currently required.'}
              </span>
            </div>
          </div>

          {/* Tab Switcher & Search Bar for Lists */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md pt-space-xs border-t border-outline-variant/40">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-outline-variant p-0.5 bg-surface-container-low dark:bg-surface-container shrink-0">
              <button
                type="button"
                onClick={() => setTreatmentView('doctors')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  treatmentView === 'doctors'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                <span>Active Clinicians (Treated ≥ 1 Student) ({treatedDoctors.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTreatmentView('students')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  treatmentView === 'students'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">groups_2</span>
                <span>Treated Students Cohort ({treatedStudents.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                placeholder={
                  treatmentView === 'doctors'
                    ? 'Search by Doctor Name or Email...'
                    : 'Search by Student ID or Doctor...'
                }
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
              />
              {treatmentSearch && (
                <button
                  type="button"
                  onClick={() => setTreatmentSearch('')}
                  className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* List 1: Doctors who have treated at least 1 student */}
          {treatmentView === 'doctors' ? (
            <div className="overflow-x-auto">
              {filteredTreatedDoctors.length === 0 ? (
                <div className="p-space-lg text-center border border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-outline text-[32px]">medical_services</span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface dark:text-inverse-on-surface">
                    No doctors currently meet the &quot;treated ≥ 1 student&quot; threshold
                  </span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    As assigned clinicians complete 25-minute consultation slots, their caseload records and metrics will populate here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Clinician Name &amp; Contact</th>
                      <th className="py-2.5 px-3">Unique Students Treated</th>
                      <th className="py-2.5 px-3">Completed Sessions</th>
                      <th className="py-2.5 px-3">Scheduled Ahead</th>
                      <th className="py-2.5 px-3">Last Active Consultation</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Caseload Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                    {filteredTreatedDoctors.map((doc) => (
                      <tr key={doc.doctorId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim flex items-center justify-center font-bold text-[11px]">
                              Dr
                            </span>
                            <span>{doc.fullName}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant pl-7 block">
                            {doc.email}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                            {doc.uniqueStudentsCount}
                          </span>
                          <span className="text-[11px] text-on-surface-variant ml-1">
                            {doc.uniqueStudentsCount === 1 ? 'student' : 'students'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                            {doc.completedSessions} Completed
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {doc.scheduledSessions} upcoming
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          <div>{doc.lastSessionDate || '—'}</div>
                          {doc.lastSlot && (
                            <span className="text-[10px] font-mono text-primary dark:text-primary-fixed-dim">
                              {doc.lastSlot}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-primary-fixed text-on-primary-fixed dark:text-on-primary-container">
                            Active Caregiver
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* List 2: Students who have received treatment / counseling */
            <div className="overflow-x-auto">
              {filteredTreatedStudents.length === 0 ? (
                <div className="p-space-lg text-center border border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-outline text-[32px]">group_off</span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface dark:text-inverse-on-surface">
                    No student counseling records found
                  </span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Students will appear in this cohort once they have attended or scheduled counseling with assigned doctors.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Student Profile (Zero-PII)</th>
                      <th className="py-2.5 px-3">Severity Tier</th>
                      <th className="py-2.5 px-3">Completed Sessions</th>
                      <th className="py-2.5 px-3">Total Booked</th>
                      <th className="py-2.5 px-3">Treating Clinicians</th>
                      <th className="py-2.5 px-3">Last Session Date</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                    {filteredTreatedStudents.map((s) => (
                      <tr key={s.anonymousId} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-primary dark:text-primary-fixed-dim block">
                            {s.anonymousId}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            Anonymized Student Profile
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-label-sm text-[11px] px-2.5 py-0.5 rounded font-semibold ${
                              SEVERITY_BADGE_MAP[s.severityTier] || ''
                            }`}
                          >
                            {s.severityTier}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                            {s.completedSessions} Completed
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {s.totalSessions} Total
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {s.doctorsInvolved.length > 0 ? (
                              s.doctorsInvolved.map((docName, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-surface-container-high dark:bg-surface-container text-[11px] font-medium"
                                >
                                  Dr. {docName}
                                </span>
                              ))
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          <div>{s.lastSessionDate || '—'}</div>
                          {s.lastSlot && (
                            <span className="text-[10px] font-mono text-primary dark:text-primary-fixed-dim">
                              {s.lastSlot}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => loadAdminPatientHistory(s.anonymousId)}
                            className="px-2.5 py-1 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold cursor-pointer"
                          >
                            Inspect History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* AI Executive Summary */}
        <section
          id="reports"
          className="bg-surface-container-low dark:bg-tertiary rounded-xl p-space-lg lg:p-space-xl shadow-sm flex flex-col gap-space-lg transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="w-8 h-8 rounded-lg bg-[#33452f] dark:bg-[#3f573a] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
                Executive Health Insights
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                {analytics?.month || 'all-time'} • Aggregated Cohort
              </span>
              <button
                type="button"
                onClick={handleGenerateAiSummary}
                disabled={generatingAi || totalAssessments === 0}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest dark:hover:bg-surface-container-high text-primary dark:text-primary-fixed-dim border border-outline-variant/60 font-label-sm text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                title="Generate deep qualitative insights using Gemini AI on demand"
              >
                <span className={`material-symbols-outlined text-[15px] ${generatingAi ? 'animate-spin' : ''}`}>
                  {generatingAi ? 'progress_activity' : 'psychology'}
                </span>
                <span>{generatingAi ? 'Analyzing Cohort...' : 'Generate AI Summary'}</span>
              </button>
            </div>
          </div>

          {loadingData && !analytics ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
              Generating aggregated executive insights...
            </p>
          ) : (analytics?.aiBulletPoints || []).length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
              No screening submissions recorded yet for this period.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {analytics.aiBulletPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="bg-surface-container-lowest dark:bg-on-primary-fixed rounded-lg p-space-md flex items-start gap-space-md"
                >
                  <span className="font-label-sm text-label-sm text-primary dark:text-on-primary-container bg-primary-fixed px-space-sm py-0.5 rounded shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="font-body-md text-body-md text-on-surface dark:text-inverse-on-surface">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Anonymized Profiles & Screening Management */}
        <section
          id="screenings"
          className="bg-surface-container-lowest dark:bg-tertiary rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg"
        >
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
                  folder_shared
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
                  Anonymized Student Profiles &amp; History
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Strict Zero-PII Enforced: View individual student profiles and their longitudinal check-in trajectory anonymously.
              </p>
            </div>

            {/* View Mode Toggle: Profiles vs All Events */}
            <div className="flex items-center rounded-lg border border-outline-variant p-0.5 bg-surface-container-low dark:bg-surface-container shrink-0">
              <button
                type="button"
                onClick={() => setAdminScreeningView('profiles')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  adminScreeningView === 'profiles'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">groups</span>
                <span>Student Profiles ({distinctAdminProfiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminScreeningView('all')}
                className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  adminScreeningView === 'all'
                    ? 'bg-surface-container-lowest dark:bg-tertiary text-stone-900 dark:text-white font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>All Screenings ({profiles.length})</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Dropdown Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md pt-space-xs border-t border-outline-variant/40">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
                search
              </span>
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Search by Anonymous ID (USR_...), Severity, or Notes..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
              />
              {adminSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAdminSearchQuery('')}
                  className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              <select
                className="bg-surface-container-low dark:bg-on-primary-fixed font-label-sm text-xs text-on-surface dark:text-inverse-on-surface px-3 py-2 rounded-lg border border-outline-variant focus:outline-none cursor-pointer"
                onChange={(e) => setTableSeverity(e.target.value)}
                value={tableSeverity}
              >
                <option value="ALL">All Severities</option>
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <select
                className="bg-surface-container-low dark:bg-on-primary-fixed font-label-sm text-xs text-on-surface dark:text-inverse-on-surface px-3 py-2 rounded-lg border border-outline-variant focus:outline-none cursor-pointer"
                onChange={(e) => setTableMonth(e.target.value)}
                value={tableMonth}
              >
                <option value="ALL">All Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Content */}
          {adminScreeningView === 'profiles' ? (
            /* Student Profiles Grid (Grouped by Member) */
            <div>
              {filteredAdminProfiles.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim py-space-md text-center">
                  No anonymous student profiles match the current filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {filteredAdminProfiles.map((prof) => {
                    const latest = prof.latestAssessment;

                    return (
                      <div
                        key={prof.anonymousId}
                        className="rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 p-space-md shadow-sm flex flex-col justify-between gap-space-sm hover:border-primary/50 transition-colors"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-primary dark:text-primary-fixed-dim">
                              {prof.anonymousId}
                            </span>
                            <span
                              className={`font-label-sm text-[11px] px-2 py-0.5 rounded font-semibold ${
                                SEVERITY_BADGE_MAP[latest?.severityTier] || ''
                              }`}
                            >
                              {latest?.severityTier}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim py-1 border-y border-outline-variant/30">
                            <span>Total Check-Ins: <strong>{prof.assessments.length}</strong></span>
                            <span>Latest: <strong>{latest?.month}</strong></span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px] p-1.5 rounded bg-surface-container-lowest dark:bg-tertiary">
                            <div>
                              <span className="text-[10px] text-on-surface-variant font-sans block">PHQ-9</span>
                              <span className="font-bold">{latest?.scores?.phq9 ?? 0}/27</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-on-surface-variant font-sans block">GAD-7</span>
                              <span className="font-bold">{latest?.scores?.gad7 ?? 0}/21</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-on-surface-variant font-sans block">PSS-10</span>
                              <span className="font-bold">{latest?.scores?.pss10 ?? 0}/40</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant">Clinical Review:</span>
                            <span
                              className={`font-label-sm text-[11px] px-2 py-0.5 rounded ${
                                DOCTOR_STATUS_BADGE_MAP[latest?.doctorStatus] || ''
                              }`}
                            >
                              {latest?.doctorStatus || 'UNREVIEWED'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => loadAdminPatientHistory(prof.anonymousId)}
                          className="w-full py-2 rounded-lg bg-surface-container-high dark:bg-on-primary-fixed hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">history</span>
                          <span>View Longitudinal History ({prof.assessments.length})</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* All Screening Events Table */
            <div className="w-full overflow-x-auto">
              {filteredRawProfiles.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim py-space-md">
                  No anonymized screening records match the current filters.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant dark:text-tertiary-fixed-dim">
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md rounded-l-lg">
                        anonymousId
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md">
                        Month
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md">
                        Scores (PHQ-9 / GAD-7 / PSS-10)
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md">
                        Severity Tier
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md">
                        Doctor Status
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md">
                        Created At
                      </th>
                      <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md rounded-r-lg text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface dark:text-inverse-on-surface">
                    {filteredRawProfiles.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-surface-container-low/60 dark:hover:bg-on-primary-fixed/50 transition-colors"
                      >
                        <td className="px-space-md py-space-md font-mono text-xs font-bold text-primary dark:text-primary-fixed-dim">
                          {p.anonymousId}
                        </td>
                        <td className="px-space-md py-space-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                          {p.month}
                        </td>
                        <td className="px-space-md py-space-md font-mono text-xs">
                          {p.scores?.phq9 ?? 0} / {p.scores?.gad7 ?? 0} / {p.scores?.pss10 ?? 0}
                        </td>
                        <td className="px-space-md py-space-md">
                          <span
                            className={`font-label-sm text-label-sm px-space-sm py-0.5 rounded ${
                              SEVERITY_BADGE_MAP[p.severityTier] || ''
                            }`}
                          >
                            {p.severityTier}
                          </span>
                        </td>
                        <td className="px-space-md py-space-md">
                          <span
                            className={`font-label-sm text-label-sm px-space-sm py-0.5 rounded ${
                              DOCTOR_STATUS_BADGE_MAP[p.doctorStatus] || ''
                            }`}
                          >
                            {p.doctorStatus}
                          </span>
                        </td>
                        <td className="px-space-md py-space-md text-on-surface-variant dark:text-tertiary-fixed-dim text-xs">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-space-md py-space-md text-right">
                          <button
                            type="button"
                            onClick={() => loadAdminPatientHistory(p.anonymousId)}
                            className="px-2.5 py-1 rounded-md bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold cursor-pointer"
                          >
                            History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* Anonymous Patient Longitudinal History Modal for Admin */}
        {activeAdminPatientModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-2xl w-full max-h-[85vh] bg-surface-container-lowest dark:bg-tertiary border border-outline-variant rounded-2xl p-space-xl shadow-2xl flex flex-col gap-space-md overflow-hidden">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                    history_edu
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                      Longitudinal History: {activeAdminPatientModal}
                    </h3>
                    <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                      Cryptographically isolated screening record over all enrolled cycles
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAdminPatientModal(null);
                    setAdminPatientHistoryData(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-space-sm">
                {loadingAdminHistory ? (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin text-[32px]">
                      progress_activity
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Loading confidential student history...
                    </p>
                  </div>
                ) : adminHistoryError ? (
                  <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs">
                    {adminHistoryError}
                  </div>
                ) : (
                  <div className="flex flex-col gap-space-sm">
                    {(adminPatientHistoryData?.history || []).map((h, idx) => (
                      <div
                        key={h._id || idx}
                        className="rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 p-space-md flex flex-col gap-space-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">
                            Month: {h.month} · {new Date(h.createdAt).toLocaleDateString()}
                          </span>
                          <span
                            className={`font-label-sm text-[11px] px-2 py-0.5 rounded font-semibold ${
                              SEVERITY_BADGE_MAP[h.severityTier] || ''
                            }`}
                          >
                            {h.severityTier}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant dark:text-tertiary-fixed-dim py-1 border-y border-outline-variant/30">
                          <span>PHQ-9: {h.scores?.phq9 ?? 0}/27</span>
                          <span>•</span>
                          <span>GAD-7: {h.scores?.gad7 ?? 0}/21</span>
                          <span>•</span>
                          <span>PSS-10: {h.scores?.pss10 ?? 0}/40</span>
                        </div>

                        {h.report?.aiSummary && (
                          <p className="font-body-sm text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed mt-0.5">
                            {h.report.aiSummary}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim pt-1 border-t border-outline-variant/30">
                          <span>Clinical Review: <strong>{h.doctorStatus || 'UNREVIEWED'}</strong></span>
                          {h.doctorNotes && (
                            <span className="italic max-w-xs truncate" title={h.doctorNotes}>
                              Notes: {h.doctorNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-space-xs border-t border-outline-variant/40 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAdminPatientModal(null);
                    setAdminPatientHistoryData(null);
                  }}
                  className="px-space-md py-2 rounded-lg border border-outline-variant text-on-surface dark:text-inverse-on-surface font-label-sm text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
