import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const Progress = () => {
  const { token } = useAuth();
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
      const response = await axios.get('/api/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressData(response.data);
    } catch (error) {
      toast.error('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
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
      toast.error('Failed to record mood');
    }
  };

  const fetchMoodTrends = async () => {
    try {
      const response = await axios.get('/api/progress/mood-trends?days=30', {
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
    </div>
  );
};

export default Progress;
