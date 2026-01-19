import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const Progress = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [moodScore, setMoodScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressData(response.data);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      toast.error('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        '/api/progress/mood',
        { moodScore, notes },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Mood recorded');
      setMoodScore(5);
      setNotes('');
      fetchProgress();
    } catch (error) {
      console.error('Failed to record mood:', error);
      toast.error('Failed to record mood');
    }
  };

  const fetchMoodTrends = async () => {
    try {
      const response = await api.get('/api/progress/mood-trends?days=30', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.trends.map(t => ({
        date: new Date(t.date).toLocaleDateString(),
        mood: parseFloat(t.avg_mood)
      }));
    } catch (error) {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent mb-8">
        Progress Tracking
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Record Mood</h2>
          <form onSubmit={handleMoodSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Mood Score: {moodScore}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={moodScore}
                onChange={(e) => setMoodScore(parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                rows="3"
                placeholder="How are you feeling today?"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              Save Mood
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Activity Summary</h2>
          <div className="space-y-3">
            {progressData?.activities?.map((activity, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{activity.activity_type.replace('_', ' ')}</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">{activity.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Mood History</h2>
        {progressData?.moodHistory?.length > 0 ? (
          <div className="space-y-3">
            {progressData.moodHistory.slice(0, 10).map((entry, index) => (
              <div key={index} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Score: {entry.mood_score}/10</span>
                  {entry.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.notes}</p>}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No mood history yet. Start tracking your mood!</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Screening History</h2>
        {progressData?.screeningHistory?.length > 0 ? (
          <div className="space-y-4">
            {progressData.screeningHistory.map((screening, index) => (
              <div key={index} className="border-l-4 border-primary-500 dark:border-primary-400 pl-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-r-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{screening.test_type}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {screening.score} | {screening.severity}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(screening.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No screening history yet.</p>
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

export default Progress;
