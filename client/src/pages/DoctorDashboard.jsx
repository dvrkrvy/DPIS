import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { doctorApi, appointmentApi } from '../services/api';

const STATUS_OPTIONS = ['UNREVIEWED', 'CONTACTED', 'IN_CARE', 'RESOLVED'];

const SEVERITY_BADGE = {
  LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  MODERATE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30',
  CRITICAL: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
};

const STATUS_BADGE = {
  UNREVIEWED: 'bg-surface-container-high dark:bg-surface-container text-on-surface-variant',
  CONTACTED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30',
  IN_CARE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
};

const APPT_STATUS_BADGE = {
  SCHEDULED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30',
  RESCHEDULED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  CANCELLED: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border border-neutral-500/30',
};

const COUNSELING_SLOTS = [
  { id: 'slot-1', slot: '17:00-17:25', start: '17:00', end: '17:25', label: '05:00 PM – 05:25 PM' },
  { id: 'slot-2', slot: '17:30-17:55', start: '17:30', end: '17:55', label: '05:30 PM – 05:55 PM' },
  { id: 'slot-3', slot: '18:00-18:25', start: '18:00', end: '18:25', label: '06:00 PM – 06:25 PM' },
  { id: 'slot-4', slot: '18:30-18:55', start: '18:30', end: '18:55', label: '06:30 PM – 06:55 PM' },
  { id: 'slot-5', slot: '19:00-19:25', start: '19:00', end: '19:25', label: '07:00 PM – 07:25 PM' },
  { id: 'slot-6', slot: '19:30-19:55', start: '19:30', end: '19:55', label: '07:30 PM – 07:55 PM' },
];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('ALL'); // 'ALL' or specific orgId
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState({});
  const [statusDraft, setStatusDraft] = useState({});
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('profiles'); // 'profiles' | 'queue' | 'calendar'

  // Patient Longitudinal History Modal
  const [activePatientModal, setActivePatientModal] = useState(null); // anonymousId
  const [patientHistoryData, setPatientHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Appointments & Counseling Calendar State
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [apptStatusFilter, setApptStatusFilter] = useState('ALL');
  const [updatingApptId, setUpdatingApptId] = useState('');

  // Doctor Direct Booking Modal State
  const [bookingModalPatient, setBookingModalPatient] = useState(null); // { anonymousId, patient, isCritical, orgName }
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('Clinical Triage & Support Intervention');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingAvailability, setBookingAvailability] = useState([]);
  const [loadingBookingAvailability, setLoadingBookingAvailability] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Scroll references for date strips
  const doctorCalendarScrollRef = useRef(null);
  const doctorBookingDateScrollRef = useRef(null);

  const scrollDateContainer = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

  // Calendar dates for next 21 days (3 weeks)
  const calendarDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 21; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      days.push({
        dateStr,
        dayName,
        monthName,
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Doctor Clinical Counseling Analytics KPIs
  const counselingStats = useMemo(() => {
    const total = doctorAppointments.length;
    const completed = doctorAppointments.filter((a) => a.status === 'COMPLETED').length;
    const scheduled = doctorAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length;
    const doctorInit = doctorAppointments.filter((a) => a.initiatedBy === 'DOCTOR').length;
    const uniquePatients = new Set(doctorAppointments.map((a) => a.anonymousId)).size;
    return { total, completed, scheduled, doctorInit, uniquePatients };
  }, [doctorAppointments]);

  useEffect(() => {
    doctorApi
      .getAssignedOrgs()
      .then((res) => {
        const list = res.organizations || [];
        setOrgs(list);
      })
      .catch((err) => setError(err.message || 'Failed to load assigned organizations'));
  }, []);

  const loadQueue = async (orgId) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(selectedOrgId);
  }, [selectedOrgId]);

  const loadDoctorAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const res = await appointmentApi.getDoctorAppointments();
      setDoctorAppointments(res.appointments || []);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadDoctorAppointments();
  }, []);

  // When booking modal opens or booking date changes, fetch doctor's availability
  useEffect(() => {
    if (!bookingModalPatient || !bookingDate) return;
    const fetchAvail = async () => {
      setLoadingBookingAvailability(true);
      try {
        const doctorId = user?.id || user?._id;
        const res = await appointmentApi.getAvailability({ date: bookingDate, doctorId });
        setBookingAvailability(res.slots || []);
      } catch (err) {
        console.error('Failed to fetch slot availability', err);
      } finally {
        setLoadingBookingAvailability(false);
      }
    };
    fetchAvail();
  }, [bookingModalPatient, bookingDate, user]);

  const handleSaveCase = async (assessmentId) => {
    setSavingId(assessmentId);
    setError('');
    try {
      await doctorApi.updateCaseStatus(assessmentId, {
        doctorStatus: statusDraft[assessmentId],
        doctorNotes: notesDraft[assessmentId],
      });
      await loadQueue(selectedOrgId);
      if (activePatientModal) {
        await loadPatientHistory(activePatientModal);
      }
    } catch (err) {
      setError(err.message || 'Failed to update case');
    } finally {
      setSavingId('');
    }
  };

  const loadPatientHistory = async (anonId) => {
    setActivePatientModal(anonId);
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await doctorApi.getPatientHistory(anonId);
      setPatientHistoryData(res);
      // Populate drafts for history items
      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const item of res.history || []) {
          next[item._id] = item.doctorNotes || '';
        }
        return next;
      });
      setStatusDraft((prev) => {
        const next = { ...prev };
        for (const item of res.history || []) {
          next[item._id] = item.doctorStatus || 'UNREVIEWED';
        }
        return next;
      });
    } catch (err) {
      setHistoryError(err.message || 'Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const openBookingModal = (patientInfo) => {
    setBookingModalPatient(patientInfo);
    setBookingSlot('');
    setBookingError('');
    setBookingSuccess('');
    setBookingReason(
      patientInfo.isCritical
        ? 'Urgent Clinical Consultation & Safety Planning'
        : 'Clinical Triage & Support Intervention'
    );
    setBookingNotes('');
  };

  const handleDoctorBook = async (e) => {
    e.preventDefault();
    if (!bookingModalPatient?.anonymousId || !bookingDate || !bookingSlot) {
      setBookingError('Please choose a date and an available 25-minute slot');
      return;
    }
    setBookingSubmitting(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      await appointmentApi.doctorBookAppointment({
        anonymousId: bookingModalPatient.anonymousId,
        date: bookingDate,
        slot: bookingSlot,
        reason: bookingReason,
        notes: bookingNotes,
      });
      setBookingSuccess('Clinical appointment scheduled successfully!');
      await loadDoctorAppointments();
      setTimeout(() => {
        setBookingModalPatient(null);
        setBookingSlot('');
        setBookingNotes('');
        setBookingSuccess('');
      }, 1200);
    } catch (err) {
      setBookingError(err.message || 'Failed to schedule clinical appointment');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleUpdateApptStatus = async (apptId, status) => {
    setUpdatingApptId(apptId);
    try {
      await appointmentApi.updateAppointmentStatus(apptId, { status });
      await loadDoctorAppointments();
    } catch (err) {
      alert(err.message || 'Failed to update appointment status');
    } finally {
      setUpdatingApptId('');
    }
  };

  // Group queue items by Patient (anonymousId)
  const patientProfiles = useMemo(() => {
    const map = new Map();
    const queue = queueData?.queue || [];

    for (const item of queue) {
      const anonId = item.anonymousId;
      if (!map.has(anonId)) {
        map.set(anonId, {
          anonymousId: anonId,
          patient: item.patient, // Only present if critical
          isCritical: item.severityTier === 'CRITICAL' || item.patient?.isCritical,
          orgName: item.orgName || item.orgId?.name || 'Organization',
          orgId: item.orgId?._id || item.orgId,
          assessments: [],
          latestAssessment: item,
        });
      }
      const prof = map.get(anonId);
      prof.assessments.push(item);
      if (item.severityTier === 'CRITICAL') {
        prof.isCritical = true;
        if (item.patient) prof.patient = item.patient;
      }
    }

    return Array.from(map.values());
  }, [queueData]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    let list = queueData?.queue || [];

    if (severityFilter !== 'ALL') {
      list = list.filter((item) => item.severityTier === severityFilter);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => (item.doctorStatus || 'UNREVIEWED') === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const anonMatch = item.anonymousId?.toLowerCase().includes(q);
        const nameMatch = item.patient?.fullName?.toLowerCase().includes(q);
        const emailMatch = item.patient?.email?.toLowerCase().includes(q);
        const orgMatch = (item.orgName || '').toLowerCase().includes(q);
        const notesMatch = (item.doctorNotes || '').toLowerCase().includes(q);
        return anonMatch || nameMatch || emailMatch || orgMatch || notesMatch;
      });
    }
    return list;
  }, [queueData, severityFilter, statusFilter, searchQuery]);

  // Filtered Patient Profiles
  const filteredProfiles = useMemo(() => {
    let list = patientProfiles;

    if (severityFilter !== 'ALL') {
      list = list.filter((prof) => prof.latestAssessment?.severityTier === severityFilter);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((prof) => (prof.latestAssessment?.doctorStatus || 'UNREVIEWED') === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((prof) => {
        const anonMatch = prof.anonymousId?.toLowerCase().includes(q);
        const nameMatch = prof.patient?.fullName?.toLowerCase().includes(q);
        const emailMatch = prof.patient?.email?.toLowerCase().includes(q);
        const orgMatch = (prof.orgName || '').toLowerCase().includes(q);
        return anonMatch || nameMatch || emailMatch || orgMatch;
      });
    }
    return list;
  }, [patientProfiles, severityFilter, statusFilter, searchQuery]);

  const totalHighCritical = useMemo(() => {
    return (queueData?.queue || []).filter(
      (a) => a.severityTier === 'CRITICAL' || a.severityTier === 'HIGH'
    ).length;
  }, [queueData]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    let list = doctorAppointments;
    if (apptStatusFilter !== 'ALL') {
      list = list.filter((a) => a.status === apptStatusFilter);
    }
    return list;
  }, [doctorAppointments, apptStatusFilter]);

  // Map of appointments on the selected calendar date by slot string
  const selectedDateAppointmentsBySlot = useMemo(() => {
    const map = {};
    for (const appt of doctorAppointments) {
      if (appt.date === selectedCalendarDate && appt.status !== 'CANCELLED') {
        map[appt.slot] = appt;
      }
    }
    return map;
  }, [doctorAppointments, selectedCalendarDate]);

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-xl">
      {/* Clinician Header Banner */}
      <div className="rounded-xl bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim font-semibold">
              Assigned Clinician Portal · Institutional Care
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>All Organizations Authorized</span>
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs font-bold">
            Dr. {user?.fullName || 'Clinician'} — Triage &amp; Clinical Management
          </h1>

          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-xs max-w-2xl leading-relaxed">
            Strict privacy enforced: Contact details (name, email) are provided <strong>only for critical-tier patients</strong> requiring urgent de-escalation. All other patient profiles are cryptographically anonymized.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[24px]">
              emergency
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                {totalHighCritical} Priority Cases
              </span>
              <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                High &amp; Critical Risk
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setViewMode('calendar');
            }}
            className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
              calendar_month
            </span>
            <div className="flex flex-col text-left">
              <span className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                {doctorAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length} Sessions
              </span>
              <span className="font-body-sm text-[11px] text-primary dark:text-primary-fixed-dim">
                5:00–8:00 PM Slots
              </span>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Organization Switcher Tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim font-bold">
            Assigned Organizations ({orgs.length})
          </span>
          <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
            Switch organization or view unified queue
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedOrgId('ALL')}
            className={`px-4 py-2.5 rounded-xl font-label-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              selectedOrgId === 'ALL'
                ? 'bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed shadow-sm'
                : 'bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain_add</span>
            <span>All Organizations (Unified)</span>
          </button>

          {orgs.map((org) => {
            const isSelected = selectedOrgId === org._id;

            return (
              <button
                key={org._id}
                type="button"
                onClick={() => setSelectedOrgId(org._id)}
                className={`px-4 py-2.5 rounded-xl font-label-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed shadow-sm'
                    : 'bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">apartment</span>
                <span>{org.name}</span>
                {org.highOrCriticalCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold">
                    {org.highOrCriticalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Bar: Search Bar & Filters & View Mode Toggle */}
      <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-md shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID (USR_...), Name, Email, Organization, or Notes..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode !== 'calendar' && (
            <>
              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MODERATE">Moderate Only</option>
                <option value="LOW">Low Only</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Review Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* View Mode Toggle: Profiles vs Flat Queue vs Counseling Calendar */}
          <div className="flex items-center rounded-lg border border-outline-variant p-0.5 bg-surface-container-low dark:bg-surface-container">
            <button
              type="button"
              onClick={() => setViewMode('profiles')}
              className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'profiles'
                  ? 'bg-surface-container-lowest dark:bg-tertiary text-primary dark:text-primary-fixed-dim shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>Patient Profiles ({filteredProfiles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('queue')}
              className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'queue'
                  ? 'bg-surface-container-lowest dark:bg-tertiary text-primary dark:text-primary-fixed-dim shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_timeline</span>
              <span>All Check-Ins ({filteredQueue.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-surface-container-lowest dark:bg-tertiary text-primary dark:text-primary-fixed-dim shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Counseling Calendar ({doctorAppointments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-xl shadow-sm text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin text-[32px]">
            progress_activity
          </span>
          <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
            Loading triage cases across assigned institutions...
          </p>
        </div>
      ) : viewMode === 'profiles' ? (
        /* ========================================================================= */
        /* VIEW 1: PATIENT PROFILES (Separate view for each patient with history)    */
        /* ========================================================================= */
        <div className="flex flex-col gap-space-md">
          {filteredProfiles.length === 0 ? (
            <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-xl shadow-sm text-center">
              <span className="material-symbols-outlined text-outline text-[36px]">person_search</span>
              <p className="font-title-md text-sm font-semibold text-on-surface dark:text-inverse-on-surface mt-2">
                No patient profiles match the selected filters
              </p>
              <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-1">
                Try adjusting the organization, severity, or search parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {filteredProfiles.map((prof) => {
                const latest = prof.latestAssessment;
                const isCritical = prof.isCritical;

                return (
                  <div
                    key={prof.anonymousId}
                    className={`rounded-xl bg-surface-container-lowest dark:bg-tertiary border p-space-lg shadow-sm flex flex-col justify-between gap-space-md transition-all ${
                      isCritical
                        ? 'border-rose-500/50 ring-1 ring-rose-500/20'
                        : 'border-outline-variant/60 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col gap-space-sm">
                      {/* Card Header: Identity & Critical Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {isCritical && prof.patient ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[18px]">
                                  emergency
                                </span>
                                <h3 className="font-headline-sm text-base font-bold text-on-surface dark:text-inverse-on-surface">
                                  {prof.patient.fullName}
                                </h3>
                              </div>
                              <span className="font-body-sm text-xs text-rose-600 dark:text-rose-400 font-medium">
                                {prof.patient.email}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono text-xs font-bold text-primary dark:text-primary-fixed-dim">
                                {prof.anonymousId}
                              </span>
                              <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim block mt-0.5">
                                Anonymized Student Profile
                              </span>
                            </div>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold shrink-0 ${
                            SEVERITY_BADGE[latest.severityTier] || ''
                          }`}
                        >
                          {latest.severityTier} RISK
                        </span>
                      </div>

                      {/* Organization & Check-In Count */}
                      <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim py-1 border-y border-outline-variant/40">
                        <span className="truncate max-w-[160px] font-medium" title={prof.orgName}>
                          {prof.orgName}
                        </span>
                        <span className="font-semibold text-on-surface dark:text-inverse-on-surface">
                          {prof.assessments.length} {prof.assessments.length === 1 ? 'Check-In' : 'Check-Ins'}
                        </span>
                      </div>

                      {/* Latest Scores Pill Box */}
                      <div className="grid grid-cols-3 gap-1.5 text-center p-2 rounded-lg bg-surface-container-low dark:bg-surface-container font-mono text-[11px]">
                        <div>
                          <span className="text-[10px] text-on-surface-variant block uppercase font-sans">
                            PHQ-9
                          </span>
                          <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                            {latest.scores?.phq9}/27
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-on-surface-variant block uppercase font-sans">
                            GAD-7
                          </span>
                          <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                            {latest.scores?.gad7}/21
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-on-surface-variant block uppercase font-sans">
                            PSS-10
                          </span>
                          <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                            {latest.scores?.pss10}/40
                          </span>
                        </div>
                      </div>

                      {/* Clinical Review Status */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Care Status:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-label-sm text-[11px] font-semibold ${
                            STATUS_BADGE[latest.doctorStatus || 'UNREVIEWED'] || ''
                          }`}
                        >
                          {latest.doctorStatus || 'UNREVIEWED'}
                        </span>
                      </div>

                      {latest.doctorNotes && (
                        <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim italic line-clamp-2 bg-surface-container-low dark:bg-surface-container p-2 rounded">
                          &ldquo;{latest.doctorNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Actions: Schedule Counseling + Inspect History */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30">
                      <button
                        type="button"
                        onClick={() => openBookingModal(prof)}
                        className={`w-full py-2 rounded-lg font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isCritical
                            ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
                            : 'bg-primary/10 text-primary dark:text-primary-fixed-dim hover:bg-primary/20 border border-primary/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        <span>{isCritical ? 'Book Mandatory Clinical Session' : 'Schedule Counseling (5-8 PM)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => loadPatientHistory(prof.anonymousId)}
                        className="w-full py-2 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">history_edu</span>
                        <span>Inspect Patient History ({prof.assessments.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'queue' ? (
        /* ========================================================================= */
        /* VIEW 2: FLAT TRIAGE QUEUE (Ordered by Clinical Severity & Wait Time)      */
        /* ========================================================================= */
        <div className="flex flex-col gap-space-md">
          {filteredQueue.length === 0 ? (
            <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-xl shadow-sm text-center">
              <span className="material-symbols-outlined text-outline text-[36px]">checklist</span>
              <p className="font-title-md text-sm font-semibold text-on-surface dark:text-inverse-on-surface mt-2">
                No screening cases match the current filter
              </p>
            </div>
          ) : (
            filteredQueue.map((item) => {
              const isCritical = item.severityTier === 'CRITICAL';

              return (
                <div
                  key={item._id}
                  className={`rounded-xl bg-surface-container-lowest dark:bg-tertiary border p-space-lg shadow-sm flex flex-col gap-space-md transition-all ${
                    isCritical
                      ? 'border-rose-500/50 ring-1 ring-rose-500/20'
                      : 'border-outline-variant/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-space-sm">
                    <div>
                      {isCritical && item.patient ? (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[22px]">
                            emergency
                          </span>
                          <div>
                            <div className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                              {item.patient.fullName}
                            </div>
                            <div className="font-body-sm text-xs text-rose-600 dark:text-rose-400 font-medium">
                              {item.patient.email} · ID: {item.anonymousId} · Org: {item.orgName}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary dark:text-primary-fixed-dim">
                              {item.anonymousId}
                            </span>
                            <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                              (Anonymized)
                            </span>
                          </div>
                          <div className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                            Org: {item.orgName} · Month: {item.month} · Submitted: {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-space-sm">
                      <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40">
                        <span>PHQ: {item.scores.phq9}/27</span>
                        <span>•</span>
                        <span>GAD: {item.scores.gad7}/21</span>
                        <span>•</span>
                        <span>PSS: {item.scores.pss10}/40</span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full font-label-sm text-xs font-semibold ${
                          SEVERITY_BADGE[item.severityTier] || ''
                        }`}
                      >
                        {item.severityTier} RISK
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          openBookingModal({
                            anonymousId: item.anonymousId,
                            patient: item.patient,
                            isCritical: isCritical,
                            orgName: item.orgName,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg font-label-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          isCritical
                            ? 'bg-rose-500 text-white hover:bg-rose-600'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed-dim border border-primary/20'
                        }`}
                        title="Book Clinical Counseling Slot"
                      >
                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                        <span>Book Session</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => loadPatientHistory(item.anonymousId)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-primary dark:text-primary-fixed-dim font-label-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="View Full History"
                      >
                        <span className="material-symbols-outlined text-[14px]">history</span>
                        <span>History</span>
                      </button>
                    </div>
                  </div>

                  {/* Doctor Notes & Case Review Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center pt-space-xs border-t border-outline-variant/40">
                    <div className="md:col-span-3">
                      <select
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-low dark:bg-surface-container px-3 py-2 font-body-sm text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
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
                    </div>

                    <div className="md:col-span-7">
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-low dark:bg-surface-container px-3 py-2 font-body-sm text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
                        onChange={(e) =>
                          setNotesDraft((prev) => ({ ...prev, [item._id]: e.target.value }))
                        }
                        placeholder="Clinical notes, consultation outcome, or care plan..."
                        type="text"
                        value={notesDraft[item._id] ?? ''}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        className="w-full py-2 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60 font-label-sm text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                        disabled={savingId === item._id}
                        onClick={() => handleSaveCase(item._id)}
                        type="button"
                      >
                        {savingId === item._id ? 'Saving...' : 'Save Case'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 3: COUNSELING CALENDAR (5:00 PM – 8:00 PM SLOTS & APPOINTMENTS)      */
        /* ========================================================================= */
        <div className="flex flex-col gap-space-xl">
          {/* Clinical Counseling Analytics KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-md">
            <div className="p-space-md rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                Total Sessions
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingStats.total}
                </span>
                <span className="text-[11px] text-on-surface-variant">handled</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">Institutional total</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                Completed
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {counselingStats.completed}
                </span>
                <span className="text-[11px] text-on-surface-variant">consulted</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Full sessions done</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                Upcoming
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-2xl font-bold text-primary dark:text-primary-fixed-dim">
                  {counselingStats.scheduled}
                </span>
                <span className="text-[11px] text-on-surface-variant">active</span>
              </div>
              <span className="text-[10px] text-primary dark:text-primary-fixed-dim mt-1">Scheduled ahead</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-xs flex flex-col justify-between">
              <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                Patients Seen
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-2xl font-bold text-on-surface dark:text-inverse-on-surface">
                  {counselingStats.uniquePatients}
                </span>
                <span className="text-[11px] text-on-surface-variant">cohort</span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1">Unique individuals</span>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                Doctor-Initiated
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {counselingStats.doctorInit}
                </span>
                <span className="text-[11px] text-on-surface-variant">triaged</span>
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">Critical outreach</span>
            </div>
          </div>

          {/* Calendar Header with Date Bar */}
          <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/40">
              <div>
                <h2 className="font-headline-sm text-title-lg font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                    calendar_today
                  </span>
                  <span>Daily Counseling Schedule (5:00 PM – 8:00 PM)</span>
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                  Institutional standard: 6 fixed 25-minute consultation slots with 5-minute sanitization/transition buffers.
                </p>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-xs text-on-surface-variant font-medium">Selected Date:</span>
                <input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Quick 21-Day Date Strip with Smooth Scroll Controls */}
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => scrollDateContainer(doctorCalendarScrollRef, 'left')}
                className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
                title="Scroll dates left"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div
                ref={doctorCalendarScrollRef}
                onWheel={(e) => {
                  if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                }}
                className="flex items-center gap-2 overflow-x-auto scroll-smooth scrollbar-thin pb-1 px-1 flex-1"
              >
                {calendarDays.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedCalendarDate(d.dateStr)}
                    className={`py-2 px-3 rounded-xl flex flex-col items-center min-w-[76px] transition-all cursor-pointer border shrink-0 ${
                      selectedCalendarDate === d.dateStr
                        ? 'border-primary bg-primary text-on-primary shadow-sm'
                        : 'border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="font-label-sm text-[10px] uppercase font-bold tracking-wider">
                      {d.isToday ? 'Today' : d.dayName}
                    </span>
                    <span className="font-headline-sm text-base font-bold my-0.5">
                      {d.dayNum}
                    </span>
                    <span className="font-label-sm text-[10px] opacity-80">
                      {d.monthName}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollDateContainer(doctorCalendarScrollRef, 'right')}
                className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
                title="Scroll dates right"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* 6 Fixed Slots Grid for Selected Date */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim font-bold">
                Time Slots for {selectedCalendarDate}
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                {Object.keys(selectedDateAppointmentsBySlot).length} of 6 slots booked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {COUNSELING_SLOTS.map((slotInfo) => {
                const appt = selectedDateAppointmentsBySlot[slotInfo.slot];
                const isBooked = Boolean(appt);
                const isCritical = appt?.isCritical;

                return (
                  <div
                    key={slotInfo.id}
                    className={`min-h-[220px] rounded-xl border p-space-md shadow-sm flex flex-col justify-between gap-space-md transition-all ${
                      isBooked
                        ? isCritical
                          ? 'bg-surface-container-lowest dark:bg-tertiary border-rose-500/50 ring-1 ring-rose-500/20'
                          : 'bg-surface-container-lowest dark:bg-tertiary border-primary/40 ring-1 ring-primary/10'
                        : 'bg-surface-container-low dark:bg-surface-container/60 border-outline-variant/40 border-dashed'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Slot Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">
                            schedule
                          </span>
                          <span className="font-label-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">
                            {slotInfo.label}
                          </span>
                        </div>

                        {isBooked ? (
                          <span
                            className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                              APPT_STATUS_BADGE[appt.status] || ''
                            }`}
                          >
                            {appt.status}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Slot Body */}
                      {isBooked ? (
                        <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/40">
                          {/* Patient Identification */}
                          {isCritical && appt.patient ? (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[16px]">
                                  emergency
                                </span>
                                <span className="font-headline-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                                  {appt.patient.fullName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded font-label-sm text-[9px] bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold ml-auto">
                                  CRITICAL
                                </span>
                              </div>
                              <span className="font-body-sm text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                                {appt.patient.email} · ID: {appt.anonymousId}
                              </span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 flex items-center justify-between">
                              <div>
                                <span className="font-mono text-xs font-bold text-primary dark:text-primary-fixed-dim block">
                                  {appt.anonymousId}
                                </span>
                                <span className="font-body-sm text-[10px] text-on-surface-variant">
                                  Cryptographically Anonymized
                                </span>
                              </div>
                              <span className="material-symbols-outlined text-outline text-[18px]">
                                lock
                              </span>
                            </div>
                          )}

                          {/* Session Meta */}
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                {appt.initiatedBy === 'DOCTOR' ? 'medical_services' : 'person'}
                              </span>
                              <span>{appt.initiatedBy === 'DOCTOR' ? 'Doctor-Initiated' : 'Student-Booked'}</span>
                            </span>
                            <span>Org: {appt.orgId?.name || 'Institution'}</span>
                          </div>

                          <div className="text-[11px] bg-surface-container-low dark:bg-surface-container p-2 rounded text-on-surface dark:text-inverse-on-surface">
                            <strong className="block text-on-surface-variant text-[10px] uppercase">Reason:</strong>
                            {appt.reason || 'Clinical Consultation'}
                          </div>

                          {appt.notes && (
                            <p className="text-[11px] italic text-on-surface-variant">
                              &ldquo;{appt.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-center flex flex-col items-center justify-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[28px] opacity-40">
                            event_available
                          </span>
                          <span className="font-body-sm text-xs font-medium">Slot is currently open</span>
                          <span className="font-label-sm text-[10px] opacity-75">
                            Ready for clinical assignment or student self-scheduling
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Slot Actions */}
                    <div className="pt-2 border-t border-outline-variant/30">
                      {isBooked ? (
                        <div className="flex items-center gap-1.5">
                          {appt.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              disabled={updatingApptId === appt._id}
                              onClick={() => handleUpdateApptStatus(appt._id, 'COMPLETED')}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-label-sm text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>Complete</span>
                            </button>
                          )}

                          {appt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              disabled={updatingApptId === appt._id}
                              onClick={() => handleUpdateApptStatus(appt._id, 'CANCELLED')}
                              className="py-1.5 px-2 rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              <span>Cancel</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => loadPatientHistory(appt.anonymousId)}
                            className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Inspect Patient History"
                          >
                            <span className="material-symbols-outlined text-[14px]">history</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            // Open booking modal with empty or first high/critical patient
                            const targetPatient = filteredProfiles.find((p) => p.isCritical) || filteredProfiles[0] || null;
                            if (targetPatient) {
                              openBookingModal(targetPatient);
                              setBookingDate(selectedCalendarDate);
                              setBookingSlot(slotInfo.slot);
                            } else {
                              alert('No patients available to schedule');
                            }
                          }}
                          className="w-full py-1.5 rounded-lg border border-dashed border-primary/50 text-primary dark:text-primary-fixed-dim hover:bg-primary/10 font-label-sm text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">add</span>
                          <span>Assign Patient to Slot</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Counseling Records Table */}
          <div className="rounded-xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/40">
              <div>
                <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                  All Counseling Records &amp; History ({doctorAppointments.length})
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Historical and scheduled clinical sessions across all organizations.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-surface-container-low dark:bg-surface-container p-1 rounded-lg border border-outline-variant">
                {['ALL', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setApptStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      apptStatusFilter === st
                        ? 'bg-surface-container-lowest dark:bg-tertiary text-primary dark:text-primary-fixed-dim shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loadingAppointments ? (
              <div className="py-8 text-center text-xs text-on-surface-variant">
                Loading appointments...
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-on-surface-variant">
                No counseling appointments match this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/50 text-on-surface-variant uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3">Date &amp; Slot</th>
                      <th className="py-2.5 px-3">Patient Profile</th>
                      <th className="py-2.5 px-3">Initiated By</th>
                      <th className="py-2.5 px-3">Institution</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {filteredAppointments.map((a) => {
                      const isCritical = a.isCritical;

                      return (
                        <tr key={a._id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-on-surface dark:text-inverse-on-surface">
                            <div>{a.date}</div>
                            <div className="text-[11px] font-mono text-primary dark:text-primary-fixed-dim">
                              {a.slot}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            {isCritical && a.patient ? (
                              <div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">emergency</span>
                                  {a.patient.fullName}
                                </span>
                                <span className="text-[10px] text-on-surface-variant block">
                                  {a.patient.email}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-mono font-bold text-on-surface dark:text-inverse-on-surface">
                                  {a.anonymousId}
                                </span>
                                <span className="text-[10px] text-on-surface-variant block">
                                  Anonymized
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-label-sm text-[10px] bg-surface-container-high">
                              {a.initiatedBy === 'DOCTOR' ? 'Clinician' : 'Student Self'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-on-surface-variant">
                            {a.orgId?.name || 'Institution'}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                                APPT_STATUS_BADGE[a.status] || ''
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 max-w-xs truncate text-on-surface-variant" title={a.reason}>
                            {a.reason || 'Counseling Session'}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {a.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateApptStatus(a._id, 'COMPLETED')}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  Complete
                                </button>
                              )}
                              {a.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateApptStatus(a._id, 'CANCELLED')}
                                  className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-high text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => loadPatientHistory(a.anonymousId)}
                                className="px-2 py-1 rounded bg-surface-container-high text-primary hover:bg-surface-container-highest text-[11px] cursor-pointer"
                                title="Patient History"
                              >
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCTOR DIRECT BOOKING MODAL (For Critical/Severe Patients & Counseling)    */}
      {/* ========================================================================= */}
      {bookingModalPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-surface-container-lowest dark:bg-tertiary border border-outline-variant rounded-2xl p-space-xl shadow-2xl flex flex-col gap-space-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  clinical_notes
                </span>
                <div>
                  <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                    Schedule Clinical Counseling Session
                  </h3>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    25-minute slots · 5:00 PM – 8:00 PM
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBookingModalPatient(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Target Patient Display */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                bookingModalPatient.isCritical
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  : 'bg-surface-container-low dark:bg-surface-container border-outline-variant/50'
              }`}
            >
              <div>
                <span className="font-label-sm text-[10px] uppercase tracking-wider block font-bold">
                  {bookingModalPatient.isCritical ? 'CRITICAL PATIENT' : 'PATIENT PROFILE'}
                </span>
                {bookingModalPatient.patient ? (
                  <div className="font-bold text-sm text-on-surface dark:text-inverse-on-surface mt-0.5">
                    {bookingModalPatient.patient.fullName} ({bookingModalPatient.patient.email})
                  </div>
                ) : (
                  <div className="font-mono font-bold text-sm text-primary dark:text-primary-fixed-dim mt-0.5">
                    {bookingModalPatient.anonymousId}
                  </div>
                )}
                <span className="text-[11px] text-on-surface-variant">
                  {bookingModalPatient.orgName || 'Institutional Care'}
                </span>
              </div>

              {bookingModalPatient.isCritical && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400">
                  CRITICAL
                </span>
              )}
            </div>

            {bookingError && (
              <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{bookingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDoctorBook} className="flex flex-col gap-space-md">
              {/* Date Selector with Smooth Scroll Controls */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                    1. Select Consultation Date:
                  </label>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    Scroll horizontally or use arrows
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => scrollDateContainer(doctorBookingDateScrollRef, 'left')}
                    className="w-7 h-7 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    title="Scroll dates left"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>

                  <div
                    ref={doctorBookingDateScrollRef}
                    onWheel={(e) => {
                      if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                    }}
                    className="flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-thin pb-1 px-1 flex-1"
                  >
                    {calendarDays.map((d) => (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => {
                          setBookingDate(d.dateStr);
                          setBookingSlot('');
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold shrink-0 cursor-pointer border ${
                          bookingDate === d.dateStr
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant bg-surface-container-low dark:bg-surface-container hover:bg-surface-container-high'
                        }`}
                      >
                        {d.isToday ? 'Today' : `${d.dayName} ${d.dayNum}`}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollDateContainer(doctorBookingDateScrollRef, 'right')}
                    className="w-7 h-7 rounded-full bg-surface-container-high dark:bg-surface-container hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    title="Scroll dates right"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* 25-minute Slot Selector with Zero Layout Shift */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                    2. Select Your Available Slot (5:00 PM – 8:00 PM):
                  </label>
                  {loadingBookingAvailability && (
                    <span className="text-[11px] text-primary dark:text-primary-fixed-dim font-semibold flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      <span>Checking availability...</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  {loadingBookingAvailability && (
                    <div className="absolute inset-0 bg-surface/40 dark:bg-tertiary/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl transition-all">
                      <div className="px-3 py-1.5 rounded-full bg-surface-container-highest dark:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1.5 shadow-md">
                        <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                        <span>Verifying your schedule...</span>
                      </div>
                    </div>
                  )}

                  <div className={`grid grid-cols-2 gap-2 transition-opacity ${loadingBookingAvailability ? 'opacity-40 pointer-events-none' : ''}`}>
                    {COUNSELING_SLOTS.map((s) => {
                      const avail = bookingAvailability.find((ba) => ba.slot === s.slot);
                      const isAvailable = avail ? avail.isAvailable : true;
                      const isSelected = bookingSlot === s.slot;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!isAvailable || loadingBookingAvailability}
                          onClick={() => setBookingSlot(s.slot)}
                          className={`min-h-[58px] p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            !isAvailable
                              ? 'opacity-40 border-outline-variant bg-surface-container-high cursor-not-allowed'
                              : isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-outline-variant hover:border-primary/50 bg-surface-container-low dark:bg-surface-container'
                          }`}
                        >
                          <span className="font-label-sm text-xs font-bold">
                            {s.label}
                          </span>
                          <span className={`text-[10px] mt-1 ${isAvailable ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-neutral-500'}`}>
                            {isAvailable ? '● Available' : '✕ Booked'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reason & Notes */}
              <div className="flex flex-col gap-2">
                <div>
                  <label className="font-label-sm text-xs font-medium text-on-surface dark:text-inverse-on-surface block mb-1">
                    Clinical Purpose / Session Reason:
                  </label>
                  <input
                    type="text"
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="e.g. Mandatory de-escalation, Clinical follow-up..."
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-xs font-medium text-on-surface dark:text-inverse-on-surface block mb-1">
                    Confidential Clinical Notes (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Pre-consultation observations, risk factors..."
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface dark:bg-surface-container text-xs text-on-surface dark:text-inverse-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setBookingModalPatient(null)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting || !bookingSlot}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {bookingSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Confirm &amp; Book Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PATIENT LONGITUDINAL HISTORY MODAL (Doctor View)                          */}
      {/* ========================================================================= */}
      {activePatientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full max-h-[85vh] bg-surface-container-lowest dark:bg-tertiary border border-outline-variant rounded-2xl p-space-xl shadow-2xl flex flex-col gap-space-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">
                  folder_shared
                </span>
                <div>
                  <h3 className="font-headline-sm text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
                    {patientHistoryData?.patient ? (
                      <span className="flex items-center gap-2">
                        <span>{patientHistoryData.patient.fullName}</span>
                        <span className="px-2 py-0.2 rounded-full font-label-sm text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-400">
                          CRITICAL RISK
                        </span>
                      </span>
                    ) : (
                      <span>Patient Profile: {activePatientModal}</span>
                    )}
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {patientHistoryData?.patient
                      ? `Emergency Contact: ${patientHistoryData.patient.email}`
                      : 'Cryptographically anonymized student screening history'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openBookingModal({
                      anonymousId: activePatientModal,
                      patient: patientHistoryData?.patient,
                      isCritical: Boolean(patientHistoryData?.patient),
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold hover:bg-primary-container flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  <span>Schedule Counseling</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePatientModal(null);
                    setPatientHistoryData(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-space-md">
              {loadingHistory ? (
                <div className="py-12 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim animate-spin text-[32px]">
                    progress_activity
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Fetching longitudinal assessment records...
                  </p>
                </div>
              ) : historyError ? (
                <div className="p-4 rounded-lg bg-error-container text-on-error-container text-xs">
                  {historyError}
                </div>
              ) : (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim bg-surface-container-low dark:bg-surface-container p-3 rounded-xl">
                    <span>
                      Total Historical Screenings: <strong>{patientHistoryData?.totalAssessments || 0}</strong>
                    </span>
                    <span>
                      Longitudinal Tracking: <strong>All Recorded Months</strong>
                    </span>
                  </div>

                  {/* History Timeline Cards */}
                  {(patientHistoryData?.history || []).map((hItem, idx) => (
                    <div
                      key={hItem._id}
                      className="rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 p-space-md flex flex-col gap-space-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-label-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">
                            Month: {hItem.month}
                          </span>
                          <span className="text-outline-variant">•</span>
                          <span className="font-body-sm text-xs text-on-surface-variant">
                            {new Date(hItem.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-outline-variant">•</span>
                          <span className="font-body-sm text-xs text-on-surface-variant">
                            {hItem.orgName}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                            SEVERITY_BADGE[hItem.severityTier] || ''
                          }`}
                        >
                          {hItem.severityTier} RISK
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono py-1 border-y border-outline-variant/30 text-on-surface-variant dark:text-tertiary-fixed-dim">
                        <span>PHQ-9: {hItem.scores?.phq9}/27</span>
                        <span>•</span>
                        <span>GAD-7: {hItem.scores?.gad7}/21</span>
                        <span>•</span>
                        <span>PSS-10: {hItem.scores?.pss10}/40</span>
                      </div>

                      {hItem.report?.aiSummary && (
                        <p className="font-body-sm text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed">
                          {hItem.report.aiSummary}
                        </p>
                      )}

                      {/* Doctor Notes & Status inline update */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-2 border-t border-outline-variant/30">
                        <select
                          className="sm:col-span-4 rounded-lg border border-outline-variant bg-surface-container-lowest dark:bg-tertiary px-2 py-1.5 font-body-sm text-xs"
                          value={statusDraft[hItem._id] || 'UNREVIEWED'}
                          onChange={(e) =>
                            setStatusDraft((prev) => ({ ...prev, [hItem._id]: e.target.value }))
                          }
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Update doctor notes for this check-in..."
                          value={notesDraft[hItem._id] ?? ''}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({ ...prev, [hItem._id]: e.target.value }))
                          }
                          className="sm:col-span-6 rounded-lg border border-outline-variant bg-surface-container-lowest dark:bg-tertiary px-2 py-1.5 font-body-sm text-xs"
                        />

                        <button
                          type="button"
                          disabled={savingId === hItem._id}
                          onClick={() => handleSaveCase(hItem._id)}
                          className="sm:col-span-2 py-1.5 px-2 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold hover:bg-primary-container disabled:opacity-50 cursor-pointer"
                        >
                          {savingId === hItem._id ? 'Saving' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-space-xs border-t border-outline-variant/40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActivePatientModal(null);
                  setPatientHistoryData(null);
                }}
                className="px-space-md py-2 rounded-lg border border-outline-variant text-on-surface dark:text-inverse-on-surface font-label-sm text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
