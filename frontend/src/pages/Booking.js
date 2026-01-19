import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Booking = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [mode, setMode] = useState('video');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/booking/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchSlots = React.useCallback(async () => {
    try {
      const response = await api.get(`/api/booking/slots?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      toast.error('Failed to fetch available slots');
      setAvailableSlots([]);
    }
  }, [selectedDate, token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot('');
    }
  }, [selectedDate, fetchSlots]);


  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !mode) {
      toast.error('Please select a date, time, and mode');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        '/api/booking',
        {
          bookingDate: selectedSlot,
          mode
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Booking created successfully');
      setSelectedDate('');
      setSelectedSlot('');
      setMode('video');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await api.patch(`/api/booking/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const getDateInputMin = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        text: 'Upcoming', 
        bg: darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'schedule'
      },
      confirmed: { 
        text: 'Confirmed', 
        bg: darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'check_circle'
      },
      completed: { 
        text: 'Completed', 
        bg: darkMode ? 'bg-green-500/10 text-green-500 border-green-500/10' : 'bg-green-100 text-green-700 border-green-200',
        icon: 'check_circle'
      },
      cancelled: { 
        text: 'Cancelled', 
        bg: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200',
        icon: 'cancel'
      }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getModeIcon = (mode) => {
    return mode === 'video' ? 'videocam' : mode === 'offline' ? 'location_on' : 'chat';
  };

  const getModeLabel = (mode) => {
    const modeLabels = {
      video: 'Video Call',
      offline: 'In-Person',
      text: 'Text Chat'
    };
    return modeLabels[mode] || mode;
  };

  const handleEmergencyClick = async () => {
    try {
      const response = await api.get('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencyContacts(response.data.contacts);
      setShowEmergencyModal(true);
    } catch (error) {
      console.error('Failed to fetch emergency contacts:', error);
      // Show default contacts even if API fails
      setEmergencyContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowEmergencyModal(true);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-black' : 'bg-surface-light'}`}>
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12 flex-grow relative z-10">
        {/* Title Section */}
        <div className="reveal-up text-center space-y-4">
          <h1 className={`text-4xl md:text-5xl font-display font-bold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
            Book Counseling Session
          </h1>
          <p className={`max-w-lg mx-auto text-lg ${darkMode ? 'text-gray-400 font-light' : 'text-gray-600 font-normal'}`}>
            Secure a confidential space with our certified specialists. Prioritize your mental well-being today.
          </p>
        </div>

        {/* Booking Form */}
        <div className="reveal-up delay-100 relative group">
          <div className={`absolute -inset-1 ${darkMode ? 'bg-gradient-to-r from-primary/30 to-secondary/30' : 'bg-gradient-to-r from-primary/10 to-secondary/10'} rounded-2xl blur-2xl ${darkMode ? 'opacity-50 group-hover:opacity-75' : 'opacity-0 group-hover:opacity-100'} transition duration-1000 group-hover:duration-200`}></div>
          <div className={`relative ${darkMode ? 'bg-surface-card bg-mesh-card border-border-dark' : 'bg-white border-gray-200'} rounded-2xl p-8 md:p-10 shadow-2xl backdrop-blur-xl`}>
            <h2 className={`text-xl font-semibold mb-8 border-l-4 border-primary pl-4 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-black font-bold'}`}>
              New Booking
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">Step 1 of 2</span>
            </h2>
            <form onSubmit={handleBooking} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium uppercase tracking-wider text-[11px] ${darkMode ? 'text-gray-400' : 'text-black font-bold'}`} htmlFor="date">
                    Select Date
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="material-icons-outlined text-xl">calendar_today</span>
                    </div>
                    <input
                      className={`w-full ${darkMode ? 'bg-black/50 border-white/10 text-white placeholder-gray-500 hover:bg-black/70 focus:bg-black/70' : 'bg-transparent border-gray-300 text-black placeholder-gray-400 hover:border-gray-400 focus:border-primary'} border rounded-lg pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer appearance-none font-medium`}
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={getDateInputMin()}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium uppercase tracking-wider text-[11px] ${darkMode ? 'text-gray-400' : 'text-black font-bold'}`} htmlFor="mode">
                    Session Mode
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full ${darkMode ? 'bg-black/50 border-white/10 text-white hover:bg-black/70' : 'bg-transparent border-gray-300 text-black hover:border-gray-400'} border rounded-lg px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer appearance-none font-medium`}
                      id="mode"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      required
                    >
                      <option value="video">Video Call (Secure HD)</option>
                      <option value="offline">In-Person</option>
                    </select>
                    <div className={`absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-black'}`}>
                      <span className="material-icons-outlined">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {availableSlots.length > 0 && (
                <div className="space-y-3">
                  <label className={`block text-sm font-medium uppercase tracking-wider text-[11px] ${darkMode ? 'text-gray-400' : 'text-black font-bold'}`}>
                    Available Time Slots
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableSlots.map((slot, index) => {
                      const slotTime = formatTime(slot);
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`group relative px-4 py-3 rounded-lg border transition-all text-center ${
                            isSelected
                              ? darkMode
                                ? 'border-primary bg-primary/20 text-white shadow-[0_0_10px_rgba(124,77,255,0.3)]'
                                : 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                              : darkMode
                                ? 'border-white/10 bg-white/5 hover:bg-primary hover:border-primary text-white'
                                : 'border-black bg-white hover:bg-gray-50 text-black'
                          }`}
                        >
                          <span className={`text-sm font-medium ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                            {slotTime}
                          </span>
                          {isSelected && (
                            <span className={`absolute -top-1 -right-1 w-2 ${darkMode ? 'h-2' : 'h-2.5'} ${darkMode ? 'bg-white border-2 border-primary' : 'bg-white border-2 border-primary'} rounded-full ${darkMode ? 'animate-pulse' : ''}`}></span>
                          )}
                          {!isSelected && index === 0 && (
                            <span className={`absolute -top-1 -right-1 w-2 ${darkMode ? 'h-2' : 'h-2.5'} bg-green-500 ${darkMode ? 'border-2 border-surface-card' : 'border-2 border-white'} rounded-full`}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && availableSlots.length === 0 && !loading && (
                <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No available slots for this date. Please select another date.
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className={`w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all transform hover:-translate-y-1 ${darkMode ? 'btn-glow shadow-[0_0_15px_rgba(124,77,255,0.4)]' : 'shadow-lg shadow-primary/20 hover:shadow-primary/40'} flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  <span className="material-icons-outlined">calendar_month</span>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
                <p className={`text-center text-xs mt-4 ${darkMode ? 'text-gray-500' : 'text-gray-500 font-medium'}`}>
                  By booking, you agree to our{' '}
                  <button 
                    type="button"
                    className={`${darkMode ? 'text-gray-400 underline hover:text-white' : 'text-black underline hover:text-primary'} transition-colors cursor-pointer`}
                    onClick={() => toast.info('Cancellation Policy: You can cancel bookings up to 24 hours before the scheduled time.')}
                  >
                    Cancellation Policy
                  </button>.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* My Bookings Section */}
        <div className="reveal-up delay-200">
          <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-black font-bold'}`}>
            <span className={`material-icons-outlined ${darkMode ? 'text-gray-400' : 'text-black'}`}>history</span>
            My Bookings
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${darkMode ? 'border-primary' : 'border-primary'} mx-auto mb-4`}></div>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading bookings...</p>
              </div>
            </div>
          ) : bookings.length === 0 ? (
            <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking, index) => {
                const statusBadge = getStatusBadge(booking.status);
                const isUpcoming = booking.status === 'pending' || booking.status === 'confirmed';
                const isCompleted = booking.status === 'completed';
                const isCancelled = booking.status === 'cancelled';
                
                return (
                  <div
                    key={booking.id}
                    className={`group relative ${darkMode ? 'bg-surface-card border-border-dark hover:border-white/20' : 'bg-white border-gray-200 hover:border-primary/50'} rounded-xl p-5 transition-all overflow-hidden ${darkMode ? '' : 'shadow-sm hover:shadow-md'} ${isCancelled ? darkMode ? 'opacity-75 hover:opacity-100' : 'opacity-90 hover:opacity-100' : ''}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUpcoming ? 'bg-primary' : isCompleted ? darkMode ? 'bg-green-500' : 'bg-green-400' : darkMode ? 'bg-gray-700' : 'bg-gray-300'} transform group-hover:scale-y-110 transition-transform origin-center`}></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${darkMode ? isUpcoming ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-gray-800 text-gray-400 border-white/5' : isUpcoming ? 'bg-blue-50 text-primary border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                          <span className={`material-icons-outlined ${darkMode ? 'text-2xl' : 'text-2xl'}`}>{getModeIcon(booking.mode)}</span>
                        </div>
                        <div>
                          <h4 className={`font-medium text-lg ${darkMode ? 'text-white' : 'text-black font-bold'}`}>
                            Appointment {index + 1}
                          </h4>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500 font-medium'}`}>
                            {getModeLabel(booking.mode)} • {formatDate(booking.booking_date)} at {formatTime(booking.booking_date)}
                          </p>
                          {booking.meeting_link && isUpcoming && (
                            <a
                              href={booking.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center text-sm font-medium mt-2 transition-colors ${darkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                            >
                              Join Meeting →
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                          <span className={`font-mono ${darkMode ? '' : 'font-medium'}`}>{formatDate(booking.booking_date)}</span>
                          <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></span>
                          <span className={`font-mono ${darkMode ? '' : 'font-medium'}`}>{formatTime(booking.booking_date)}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border w-fit ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                      <div className="sm:border-l sm:pl-4 flex gap-2">
                        {isUpcoming && (
                          <>
                            <button
                              onClick={() => handleCancel(booking.id)}
                              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-danger/10 text-gray-400 hover:text-danger' : 'hover:bg-red-50 text-gray-400 hover:text-danger'}`}
                              title="Cancel"
                            >
                              <span className="material-icons-outlined text-xl">close</span>
                            </button>
                          </>
                        )}
                        {isCompleted && (
                          <button
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-black'}`}
                            title="View Summary"
                          >
                            <span className="material-icons-outlined text-xl">description</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Buttons - Same as Dashboard */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
        {/* AI Support Assistant Button */}
        <button 
          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-purple-500/40 transition-all hover:scale-110"
          onClick={() => navigate('/ai-chat')}
          title="AI Support Chat"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.69 2 6 4.69 6 8c0 1.1.27 2.14.75 3.05L3 18l6.95-3.75c.91.48 1.95.75 3.05.75 3.31 0 6-2.69 6-6s-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <circle cx="10" cy="8" r="1"/>
            <circle cx="14" cy="8" r="1"/>
            <path d="M9 11h6v1.5H9z"/>
            <path d="M12 1.5v2M7 3.5l1.5-1.5M17 3.5l-1.5-1.5"/>
          </svg>
        </button>

        {/* Emergency Button */}
        <button 
          className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-lg transition-all hover:scale-110 ${
            darkMode 
              ? 'bg-red-600/10 border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white' 
              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
          }`}
          onClick={handleEmergencyClick}
          title="Emergency Support"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Background Effects */}
      <div className={`fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden ${darkMode ? '' : 'bg-white'}`}>
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-primary/10' : 'bg-primary/5'} rounded-full blur-[120px] opacity-20 animate-float`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-secondary/10' : 'bg-secondary/5'} rounded-full blur-[120px] opacity-20 animate-pulse`}></div>
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div
          className={`fixed inset-0 ${darkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 p-4`}
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'} border rounded-xl p-6 max-w-md w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>🆘 Emergency Support</h2>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              If you are in immediate danger, please call <strong className={darkMode ? 'text-red-400' : 'text-red-600'}>911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className={`${darkMode ? 'text-red-400' : 'text-red-600'} font-semibold text-lg hover:underline`}>988</a>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Crisis Text Line:</strong>
                <p className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className={`${darkMode ? 'text-purple-400' : 'text-purple-600'} font-semibold hover:underline`}>
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className={`${darkMode ? 'text-purple-400' : 'text-purple-600'} font-semibold hover:underline`}>
                    {emergencyContacts.institutionPhone}
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className={`w-full font-bold py-2 px-4 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-black hover:bg-gray-900 text-white'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
