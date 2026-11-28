import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COUNSELING_SLOTS } from '../constants/counseling';
import { appointmentApi, messageApi } from '../services/api';
import ProfileViewModal from './ProfileViewModal';

const getNextDays = (count = 21) => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({
      dateStr,
      label,
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    });
  }
  return days;
};

const formatMsgTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatThreadTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MessagingDrawer({ isOpen, onClose, onUnreadChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStudent = user?.role === 'USER';

  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');

  // Inline follow-up booking with the selected previous doctor (Student only)
  const [showBookPanel, setShowBookPanel] = useState(false);
  const calendarDays = useMemo(() => getNextDays(21), []);
  const [bookingDate, setBookingDate] = useState(() => calendarDays[0].dateStr);
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [loadingDoctorSlots, setLoadingDoctorSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('Follow-up Counseling Session');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState({ type: '', text: '' });
  const [viewingProfileId, setViewingProfileId] = useState(null);

  const dateStripRef = useRef(null);
  const messagesEndRef = useRef(null);

  const selectedThread = useMemo(
    () => threads.find((t) => t.partnerId === selectedPartnerId) || null,
    [threads, selectedPartnerId]
  );

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      if (isStudent) {
        return (t.doctor?.fullName || '').toLowerCase().includes(q);
      }
      const nameMatch = (t.patient?.fullName || '').toLowerCase().includes(q);
      const anonMatch = (t.anonymousId || '').toLowerCase().includes(q);
      const orgMatch = (t.orgName || '').toLowerCase().includes(q);
      return nameMatch || anonMatch || orgMatch;
    });
  }, [threads, searchQuery, isStudent]);

  const loadThreads = async (quiet = false) => {
    if (!quiet) setLoadingThreads(true);
    try {
      const data = await messageApi.getThreads();
      const list = data.threads || [];
      setThreads(list);
      onUnreadChange?.(data.totalUnread || 0);
      setSelectedPartnerId((prev) => {
        if (prev && list.some((t) => t.partnerId === prev)) return prev;
        return list[0]?.partnerId || null;
      });
    } catch (err) {
      if (!quiet) setChatError(err.message || 'Failed to load conversations');
    } finally {
      if (!quiet) setLoadingThreads(false);
    }
  };

  const loadMessages = async (partnerId, quiet = false) => {
    if (!partnerId) return;
    if (!quiet) setLoadingMessages(true);
    setChatError('');
    try {
      const data = await messageApi.getMessages(partnerId);
      setMessages(data.messages || []);
      // Clear local unread count for opened thread immediately
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.partnerId === partnerId ? { ...t, unreadCount: 0 } : t
        );
        const total = updated.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
        onUnreadChange?.(total);
        return updated;
      });
    } catch (err) {
      if (!quiet) setChatError(err.message || 'Failed to load messages');
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  };

  const loadSpecificDoctorSlots = async (date, doctorId) => {
    if (!date || !doctorId) return;
    setLoadingDoctorSlots(true);
    setBookingFeedback((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));
    try {
      const data = await appointmentApi.getAvailability({ date, doctorId });
      setDoctorSlots(data.slots || []);
      setSelectedSlot('');
    } catch (err) {
      setDoctorSlots([]);
      setBookingFeedback({ type: 'error', text: err.message || 'Could not load doctor availability' });
    } finally {
      setLoadingDoctorSlots(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadThreads(false);

    const timer = setInterval(() => {
      loadThreads(true);
      if (selectedPartnerId) {
        loadMessages(selectedPartnerId, true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isOpen, selectedPartnerId]);

  useEffect(() => {
    if (isOpen && selectedPartnerId) {
      loadMessages(selectedPartnerId, false);
    } else if (!selectedPartnerId) {
      setMessages([]);
    }
  }, [isOpen, selectedPartnerId]);

  useEffect(() => {
    setShowBookPanel(false);
    setBookingFeedback({ type: '', text: '' });
    setSelectedSlot('');
    setViewingProfileId(null);
  }, [selectedPartnerId]);

  useEffect(() => {
    if (isOpen && isStudent && showBookPanel && selectedPartnerId) {
      loadSpecificDoctorSlots(bookingDate, selectedPartnerId);
    }
  }, [isOpen, isStudent, showBookPanel, selectedPartnerId, bookingDate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedPartnerId]);

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !selectedPartnerId || sending) return;
    setSending(true);
    setChatError('');
    try {
      const data = await messageApi.sendMessage(selectedPartnerId, trimmed);
      setDraft('');
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      loadThreads(true);
    } catch (err) {
      setChatError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleBookWithDoctor = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId || !selectedSlot || bookingSubmitting) return;
    setBookingSubmitting(true);
    setBookingFeedback({ type: '', text: '' });
    try {
      const data = await appointmentApi.bookAppointment({
        date: bookingDate,
        slot: selectedSlot,
        doctorId: selectedPartnerId,
        reason: bookingReason.trim() || 'Follow-up Counseling Session',
        notes: bookingNotes.trim(),
      });
      setBookingFeedback({
        type: 'success',
        text: data.message || 'Follow-up session scheduled successfully.',
      });
      setBookingNotes('');
      setSelectedSlot('');
      loadSpecificDoctorSlots(bookingDate, selectedPartnerId);
      loadThreads(true);
      window.dispatchEvent(new CustomEvent('dpis:appointment-booked'));
    } catch (err) {
      setBookingFeedback({
        type: 'error',
        text: err.message || 'Failed to book session with this clinician',
      });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleGoToRandomBooking = () => {
    onClose();
    navigate('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('dpis:open-counseling-tab'));
    }, 60);
  };

  const scrollDates = (direction) => {
    dateStripRef.current?.scrollBy({ left: direction === 'left' ? -180 : 180, behavior: 'smooth' });
  };

  const getPartnerDisplayName = (thread) => {
    if (!thread) return '';
    if (isStudent) return `Dr. ${thread.doctor?.fullName || 'Clinician'}`;
    if (thread.isCritical && thread.patient?.fullName) return thread.patient.fullName;
    return `Anonymous (${thread.anonymousId})`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="w-full max-w-4xl h-full bg-surface-container-lowest dark:bg-tertiary border-l border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-outline-variant/50 flex items-center justify-between gap-3 bg-surface-container-low/70 dark:bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim">
              <span className="material-symbols-outlined text-[22px]">forum</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface dark:text-inverse-on-surface">
                Clinical Messaging
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                {isStudent
                  ? 'Message your clinicians & book follow-up sessions directly'
                  : 'Secure student messaging (Zero-PII enforced for non-critical cases)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close messaging drawer"
            className="w-9 h-9 rounded-lg bg-surface-container-high dark:bg-tertiary hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Main 2-Pane Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Conversations List */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-outline-variant/50 flex flex-col max-h-56 md:max-h-none bg-surface-container-low/40 dark:bg-surface-container/50 shrink-0">
            <div className="p-3 border-b border-outline-variant/40">
              <div className="relative">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isStudent ? 'Search your doctors...' : 'Search anonymous ID or critical name...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30">
              {loadingThreads && threads.length === 0 ? (
                <div className="p-6 text-center text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/60">
                    chat_bubble_outline
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {isStudent
                      ? 'No clinician threads yet. Book a session in Counseling to connect with a doctor.'
                      : 'No student threads yet. Threads appear when students have sessions with you.'}
                  </p>
                  {isStudent && (
                    <button
                      type="button"
                      onClick={handleGoToRandomBooking}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold cursor-pointer"
                    >
                      Book Counseling Session
                    </button>
                  )}
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = thread.partnerId === selectedPartnerId;
                  return (
                    <button
                      key={thread.partnerId}
                      type="button"
                      onClick={() => setSelectedPartnerId(thread.partnerId)}
                      className={`w-full text-left px-3.5 py-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white'
                          : 'hover:bg-surface-container-high/70 dark:hover:bg-tertiary text-on-surface dark:text-inverse-on-surface'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          !isStudent && thread.isCritical
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                            : 'bg-primary/15 text-primary dark:text-primary-fixed-dim'
                        }`}
                      >
                        {isStudent ? (
                          <span className="material-symbols-outlined text-[18px]">medical_services</span>
                        ) : thread.isCritical ? (
                          <span className="material-symbols-outlined text-[18px]">priority_high</span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-lg text-xs font-bold truncate">
                            {getPartnerDisplayName(thread)}
                          </span>
                          <span className="text-[10px] opacity-75 shrink-0">
                            {thread.lastMessage
                              ? formatThreadTime(thread.lastMessage.createdAt)
                              : thread.lastSessionDate}
                          </span>
                        </div>

                        {!isStudent && (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {thread.isCritical ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                CRITICAL · {thread.anonymousId}
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-80">{thread.orgName}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[11px] opacity-80 truncate">
                            {thread.lastMessage
                              ? `${thread.lastMessage.senderRole === user?.role ? 'You: ' : ''}${thread.lastMessage.content}`
                              : `${thread.sessionCount} session${thread.sessionCount === 1 ? '' : 's'} · Last ${thread.lastSessionDate}`}
                          </p>
                          {thread.unreadCount > 0 && (
                            <span className="px-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Chat & Direct Follow-up Booking Pane */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {!selectedThread ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-2">
                  mark_chat_unread
                </span>
                <h3 className="font-title-sm text-sm font-bold text-on-surface dark:text-inverse-on-surface">
                  Select a conversation
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim max-w-sm mt-1">
                  {isStudent
                    ? 'Choose one of your previous clinicians on the left to message them or book another session with them directly.'
                    : 'Choose a student conversation on the left to exchange follow-up notes.'}
                </p>
                {isStudent && (
                  <button
                    type="button"
                    onClick={handleGoToRandomBooking}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold cursor-pointer"
                  >
                    Match with a Random New Doctor in Calendar
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Conversation Header (Click name area to view profile) */}
                <div className="px-4 py-3 border-b border-outline-variant/50 flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest dark:bg-tertiary">
                  <button
                    type="button"
                    onClick={() => setViewingProfileId(selectedThread.partnerId)}
                    title="Click to view profile"
                    className="min-w-0 text-left px-2 py-1 -mx-2 rounded-lg hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-title-sm text-sm font-bold text-on-surface dark:text-inverse-on-surface truncate group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors">
                        {getPartnerDisplayName(selectedThread)}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container-low dark:bg-surface-container text-on-surface-variant dark:text-tertiary-fixed-dim border border-outline-variant/40 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">person</span>
                        <span>View profile</span>
                      </span>
                      {!isStudent && selectedThread.isCritical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          CRITICAL PRIORITY
                        </span>
                      )}
                      {!isStudent && !selectedThread.isCritical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          Identity Protected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                      {isStudent
                        ? `${selectedThread.sessionCount} session(s) · Last session ${selectedThread.lastSessionDate}`
                        : `${selectedThread.anonymousId} · ${selectedThread.orgName}${
                            selectedThread.isCritical && selectedThread.patient?.email
                              ? ` · ${selectedThread.patient.email}`
                              : ''
                          }`}
                    </p>
                  </button>

                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => setShowBookPanel((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showBookPanel
                          ? 'bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white border border-primary/40'
                          : 'bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">event_available</span>
                      <span>{showBookPanel ? 'Hide Scheduling' : 'Schedule Session'}</span>
                    </button>
                  )}
                </div>

                {/* Collapsible Follow-Up Scheduling Panel for This Specific Previous Doctor */}
                {isStudent && showBookPanel && (
                  <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low/70 dark:bg-surface-container flex flex-col gap-3 max-h-[58%] overflow-y-auto">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-label-lg text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                          Book Follow-Up with Dr. {selectedThread.doctor?.fullName}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Only shows slots where Dr. {selectedThread.doctor?.fullName} is free.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoToRandomBooking}
                        className="text-[11px] font-semibold text-primary dark:text-primary-fixed-dim hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">shuffle</span>
                        <span>Prefer a random new doctor? Use Counseling Calendar</span>
                      </button>
                    </div>

                    {bookingFeedback.text && (
                      <div
                        className={`p-2.5 rounded-lg text-xs border flex items-center gap-2 ${
                          bookingFeedback.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {bookingFeedback.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span>{bookingFeedback.text}</span>
                      </div>
                    )}

                    {/* Date Selector */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollDates('left')}
                        className="w-7 h-7 rounded-full bg-surface-container-high dark:bg-tertiary text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>

                      <div
                        ref={dateStripRef}
                        onWheel={(e) => {
                          if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                        }}
                        className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1 flex-1"
                      >
                        {calendarDays.map((day) => {
                          const isDateSelected = bookingDate === day.dateStr;
                          return (
                            <button
                              key={day.dateStr}
                              type="button"
                              onClick={() => setBookingDate(day.dateStr)}
                              className={`py-1.5 px-2.5 rounded-lg flex flex-col items-center min-w-[68px] border shrink-0 transition-colors cursor-pointer ${
                                isDateSelected
                                  ? 'border-primary dark:border-primary-fixed-dim bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white font-bold'
                                  : 'border-outline-variant/60 bg-surface-container-lowest dark:bg-tertiary text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high'
                              }`}
                            >
                              <span className="text-[9px] uppercase font-bold opacity-80">{day.weekday}</span>
                              <span className="text-sm font-extrabold">{day.dayNum}</span>
                              <span className="text-[9px] opacity-85">{day.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollDates('right')}
                        className="w-7 h-7 rounded-full bg-surface-container-high dark:bg-tertiary text-on-surface dark:text-inverse-on-surface flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>

                    {/* 25-Minute Slots */}
                    <div
                      className={`grid grid-cols-2 sm:grid-cols-3 gap-2 transition-opacity ${
                        loadingDoctorSlots ? 'opacity-60 pointer-events-none' : 'opacity-100'
                      }`}
                    >
                      {COUNSELING_SLOTS.map((slotDef) => {
                        const match = doctorSlots.find((s) => s.slot === slotDef.slot);
                        const isAvailable = match ? match.available : false;
                        const isPicked = selectedSlot === slotDef.slot;
                        return (
                          <button
                            key={slotDef.slot}
                            type="button"
                            disabled={!isAvailable || loadingDoctorSlots}
                            onClick={() => setSelectedSlot(slotDef.slot)}
                            className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                              !isAvailable
                                ? 'border-outline-variant/40 bg-surface-container-lowest/40 dark:bg-tertiary/40 text-on-surface-variant/50 cursor-not-allowed'
                                : isPicked
                                ? 'border-primary dark:border-primary-fixed-dim bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white font-bold cursor-pointer'
                                : 'border-outline-variant/60 bg-surface-container-lowest dark:bg-tertiary text-on-surface dark:text-inverse-on-surface hover:border-primary/60 cursor-pointer'
                            }`}
                          >
                            <div className="text-[11px] font-bold">{slotDef.label}</div>
                            <div className="text-[10px] opacity-80">
                              {loadingDoctorSlots ? 'Checking...' : isAvailable ? 'Available' : 'Unavailable'}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleBookWithDoctor} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1">
                          Session Topic
                        </label>
                        <input
                          type="text"
                          value={bookingReason}
                          onChange={(e) => setBookingReason(e.target.value)}
                          placeholder="Reason for follow-up"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1">
                          Optional Note
                        </label>
                        <input
                          type="text"
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          placeholder="Anything to prep"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          disabled={!selectedSlot || bookingSubmitting}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] disabled:opacity-50 dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold cursor-pointer"
                        >
                          {bookingSubmitting ? 'Booking...' : 'Confirm Booking'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Messages History */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-surface/40 dark:bg-on-primary-fixed/40">
                  {chatError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
                      {chatError}
                    </div>
                  )}

                  {loadingMessages && messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                        No messages yet. Say hello to start a confidential conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                            msg.isMine
                              ? 'bg-[#33452f] dark:bg-[#3f573a] text-white rounded-br-sm'
                              : 'bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-on-surface dark:text-inverse-on-surface rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim mt-1 px-1">
                          {msg.isMine ? 'You' : getPartnerDisplayName(selectedThread)} · {formatMsgTime(msg.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-outline-variant/50 bg-surface-container-lowest dark:bg-tertiary flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${getPartnerDisplayName(selectedThread)}...`}
                    maxLength={2000}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-[#33452f] hover:bg-[#4a5d45] disabled:opacity-50 dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{sending ? 'Sending' : 'Send'}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </aside>
      <ProfileViewModal
        isOpen={Boolean(viewingProfileId)}
        targetUserId={viewingProfileId}
        onClose={() => setViewingProfileId(null)}
      />
    </div>
  );
}
