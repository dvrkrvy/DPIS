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
  HIGH: 'bg-tertiary-container text-on-tertiary',
  MODERATE: 'bg-primary-fixed text-on-primary-fixed-variant',
  LOW: 'bg-secondary-container text-on-secondary-container',
};

const DOCTOR_STATUS_BADGE_MAP = {
  IN_CARE: 'bg-primary-fixed text-on-primary-fixed',
  RESOLVED: 'bg-primary-fixed text-on-primary-fixed',
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
            className="px-space-md py-space-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-lg transition-colors w-fit"
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
              className="mt-space-sm bg-primary hover:bg-primary-container disabled:opacity-60 text-on-primary font-label-lg text-label-lg px-space-lg py-3 rounded-lg transition-colors shadow-sm cursor-pointer"
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
              <span className="font-label-sm text-label-sm text-primary dark:text-on-primary-fixed bg-primary-fixed px-space-sm py-0.5 rounded">
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

        {/* AI Executive Summary */}
        <section
          id="reports"
          className="bg-surface-container-low dark:bg-tertiary rounded-xl p-space-lg lg:p-space-xl shadow-sm flex flex-col gap-space-lg transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
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
                  <span className="font-label-sm text-label-sm text-primary dark:text-on-primary-fixed bg-primary-fixed px-space-sm py-0.5 rounded shrink-0 mt-0.5">
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

        {/* Anonymized Profiles Table */}
        <section
          id="screenings"
          className="bg-surface-container-lowest dark:bg-tertiary rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">
                Anonymized Screening Profiles
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Showing de-identified records only. Personal names and contact details are strictly excluded.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <select
                className="bg-surface-container-low dark:bg-on-primary-fixed font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface px-space-md py-space-sm rounded-lg focus:outline-none cursor-pointer"
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
                className="bg-surface-container-low dark:bg-on-primary-fixed font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface px-space-md py-space-sm rounded-lg focus:outline-none cursor-pointer"
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

          <div className="w-full overflow-x-auto">
            {profiles.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim py-space-md">
                No anonymized screening profiles match the current filters.
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
                    <th className="font-label-sm text-label-sm uppercase tracking-wider px-space-md py-space-md rounded-r-lg">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface dark:text-inverse-on-surface">
                  {profiles.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-surface-container-low/60 dark:hover:bg-on-primary-fixed/50 transition-colors"
                    >
                      <td className="px-space-md py-space-md font-label-lg text-label-lg text-primary dark:text-primary-fixed-dim">
                        {p.anonymousId}
                      </td>
                      <td className="px-space-md py-space-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                        {p.month}
                      </td>
                      <td className="px-space-md py-space-md font-label-lg text-label-lg">
                        {p.scores?.phq9 ?? 0} / {p.scores?.gad7 ?? 0} / {p.scores?.pss10 ?? 0}
                      </td>
                      <td className="px-space-md py-space-md">
                        <span
                          className={`font-label-sm text-label-sm px-space-sm py-0.5 rounded ${SEVERITY_BADGE_MAP[p.severityTier] || ''
                            }`}
                        >
                          {p.severityTier}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        <span
                          className={`font-label-sm text-label-sm px-space-sm py-0.5 rounded ${DOCTOR_STATUS_BADGE_MAP[p.doctorStatus] || ''
                            }`}
                        >
                          {p.doctorStatus}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString([], {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
