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

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  const fetchBookings = async () => {
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
  };

  const fetchSlots = async () => {
    try {
      const response = await api.get(`/api/booking/slots?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      toast.error('Failed to fetch available slots');
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !mode) {
      toast.error('Please select a date, time, and mode');
      return;
    }

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
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent mb-8">
        Book Counseling Session
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">New Booking</h2>
        <form onSubmit={handleBooking}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getDateInputMin()}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              >
                <option value="video">Video Call</option>
                <option value="offline">In-Person</option>
              </select>
            </div>
          </div>
          {availableSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Available Times</label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 border rounded-lg transition-all ${
                      selectedSlot === slot
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-600 shadow-md transform scale-105'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="submit"
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            Book Session
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">My Bookings</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading bookings...</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No bookings yet.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {new Date(booking.booking_date).toLocaleDateString()} at{' '}
                      {new Date(booking.booking_date).toLocaleTimeString()}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Mode: {booking.mode} | Status: {booking.status}
                    </p>
                    {booking.meeting_link && (
                      <a
                        href={booking.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 transition-colors"
                      >
                        Join Meeting →
                      </a>
                    )}
                  </div>
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
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

        <button
          className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-lg transition-all hover:scale-110 ${
            darkMode
              ? 'bg-red-600/10 border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white'
              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
          }`}
          onClick={async () => {
            try {
              const response = await api.get('/api/emergency/contacts', {
                headers: { Authorization: `Bearer ${token}` }
              });
              setEmergencyContacts(response.data.contacts);
              setShowEmergencyModal(true);
            } catch (error) {
              console.error('Failed to fetch emergency contacts:', error);
              setEmergencyContacts({
                hotline: '988',
                institutionEmail: 'support@dpis.edu',
                institutionPhone: '1-800-273-8255'
              });
              setShowEmergencyModal(true);
            }
          }}
          title="Emergency Support"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-white/10' : 'border-gray-200'} rounded-xl p-6 max-w-md w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Emergency Support</h2>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Crisis Text Line:</strong>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
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
