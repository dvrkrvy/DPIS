import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Progress = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [moodScore, setMoodScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');
  const [moodHistory, setMoodHistory] = useState([]);
  const [screeningHistory, setScreeningHistory] = useState([]);
  const [activitySummary, setActivitySummary] = useState({
    forumPosts: 0,
    moodTracking: 0,
    consultations: 0
  });


  const fetchProgress = React.useCallback(async () => {
    setLoading(true);
    try {
      await api.get('/api/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMoodTrends = React.useCallback(async () => {
    try {
      const response = await api.get(`/api/progress/mood-trends?days=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const trends = response.data.trends || [];
      setMoodHistory(trends.slice(0, 10).reverse());
    } catch (error) {
      console.error('Failed to fetch mood trends:', error);
      // Set default data
      setMoodHistory([
        { mood_score: 5, created_at: new Date().toISOString() },
        { mood_score: 7, created_at: new Date(Date.now() - 86400000).toISOString() },
        { mood_score: 4, created_at: new Date(Date.now() - 172800000).toISOString() },
      ]);
    }
  }, [timeRange, token]);

  const fetchScreeningHistory = React.useCallback(async () => {
    try {
      const response = await api.get('/api/screening/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScreeningHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch screening history:', error);
      setScreeningHistory([]);
    }
  }, [token]);

  const fetchActivitySummary = React.useCallback(async () => {
    try {
      // Fetch forum posts count
      const forumResponse = await api.get('/api/forum/posts?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch mood entries count
      const moodResponse = await api.get('/api/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch bookings count
      const bookingResponse = await api.get('/api/booking/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActivitySummary({
        forumPosts: forumResponse.data.posts?.length || 0,
        moodTracking: moodResponse.data.moodHistory?.length || 0,
        consultations: bookingResponse.data.bookings?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch activity summary:', error);
    }
  }, [token]);

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
      toast.success('Mood recorded successfully');
      setMoodScore(5);
      setNotes('');
      fetchProgress();
      fetchMoodTrends();
      fetchActivitySummary();
    } catch (error) {
      console.error('Failed to record mood:', error);
      toast.error('Failed to record mood');
    }
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
      setEmergencyContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowEmergencyModal(true);
    }
  };

  const getSeverityBadge = (testType, score) => {
    let severity = 'Minimal';
    let bgColor = 'bg-green-700';
    
    if (testType === 'PHQ9') {
      if (score >= 20) { severity = 'Severe'; bgColor = 'bg-red-700'; }
      else if (score >= 15) { severity = 'Moderately Severe'; bgColor = 'bg-orange-700'; }
      else if (score >= 10) { severity = 'Moderate'; bgColor = 'bg-yellow-600'; }
      else if (score >= 5) { severity = 'Mild'; bgColor = 'bg-yellow-500'; }
    } else if (testType === 'GAD7') {
      if (score >= 15) { severity = 'Severe'; bgColor = 'bg-red-700'; }
      else if (score >= 10) { severity = 'Moderate'; bgColor = 'bg-yellow-600'; }
      else if (score >= 5) { severity = 'Mild'; bgColor = 'bg-yellow-500'; }
    } else if (testType === 'GHQ12') {
      if (score >= 10) { severity = 'Severe'; bgColor = 'bg-red-700'; }
      else if (score >= 7) { severity = 'Moderate'; bgColor = 'bg-yellow-600'; }
      else if (score >= 3) { severity = 'Mild'; bgColor = 'bg-yellow-500'; }
    }
    
    return { severity, bgColor };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  // Prepare chart data
  const chartData = {
    labels: moodHistory.slice(0, 7).map((_, i) => {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days[i] || `Day ${i + 1}`;
    }),
    datasets: [{
      label: 'Mood Score',
      data: moodHistory.slice(0, 7).map(entry => entry.mood_score || 5),
      borderColor: '#A100FF',
      backgroundColor: darkMode 
        ? 'rgba(161, 0, 255, 0.5)' 
        : 'rgba(161, 0, 255, 0.2)',
      borderWidth: 3,
      pointBackgroundColor: darkMode ? '#000' : '#fff',
      pointBorderColor: '#A100FF',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointHoverBackgroundColor: '#A100FF',
      pointHoverBorderColor: '#fff',
      tension: 0.3,
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: darkMode ? '#000' : '#fff',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#333' : '#E0E0E0',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return 'Score: ' + context.parsed.y + '/10';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#E0E0E0',
          drawBorder: false,
          borderDash: darkMode ? undefined : [2, 4]
        },
        ticks: {
          color: darkMode ? '#999' : '#666',
          font: {
            family: 'Inter',
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: darkMode ? '#999' : '#666',
          font: {
            family: 'Inter',
            size: 11
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${darkMode ? 'border-primary' : 'border-primary'}`}></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-black text-white' : 'bg-white text-black'} font-body antialiased`}>
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-24">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className={`text-5xl md:text-6xl font-extrabold tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
              Progress Tracking
            </h1>
            <p className={`text-lg max-w-2xl ${darkMode ? 'text-white opacity-80' : 'text-gray-600'}`}>
              Monitor your well-being journey through data-driven insights and daily reflections.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className={`flex items-center gap-2 px-4 py-2 border text-sm font-bold uppercase tracking-wider transition-all ${
                darkMode 
                  ? 'border-[#333333] hover:border-white text-white hover:bg-white hover:text-black bg-black'
                  : 'border-gray-300 hover:border-black text-black hover:bg-black hover:text-white bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Data
            </button>
          </div>
        </div>

        {/* Record Mood and Activity Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Record Mood */}
            <div className={`lg:col-span-7 ${darkMode ? 'bg-black border-[#333333] hover:border-gray-500' : 'bg-white border-[#E0E0E0] hover:border-gray-400'} border p-8 relative group transition-colors duration-300`}>
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-black'} flex items-center gap-3`}>
              <span className="material-symbols-outlined text-primary">mood</span>
              Record Mood
            </h2>
            <form onSubmit={handleMoodSubmit}>
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <label className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-black'}`}>
                    Mood Score
                  </label>
                  <span className={`text-3xl font-bold text-primary ${darkMode ? 'text-glow' : ''}`}>
                    {moodScore}<span className={`text-lg ${darkMode ? 'text-white' : 'text-gray-500'} font-normal`}>/10</span>
                  </span>
                </div>
                <div className="relative pt-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={moodScore}
                    onChange={(e) => setMoodScore(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className={`flex justify-between text-xs mt-2 font-mono uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>Poor</span>
                    <span>Neutral</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full ${darkMode ? 'bg-black border-[#333333] text-white placeholder-gray-600' : 'bg-white border-[#E0E0E0] text-black placeholder-gray-400'} border p-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none h-32`}
                  placeholder="How are you feeling today? reflect on your day..."
                />
              </div>
              <button 
                type="submit"
                className={`bg-primary text-white px-8 py-3 font-bold text-sm uppercase tracking-wider transition-all duration-200 w-full sm:w-auto border border-primary ${
                  darkMode 
                    ? 'hover:bg-white hover:text-primary hover:border-white' 
                    : 'hover:bg-black hover:text-white hover:border-black'
                }`}
              >
                Save Entry
              </button>
            </form>
          </div>

          {/* Activity Summary */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className={`${darkMode ? 'bg-black border-[#333333]' : 'bg-white border-[#E0E0E0]'} border p-8 h-full`}>
              <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-black'} flex items-center gap-2`}>
                <span className={`material-symbols-outlined ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>analytics</span>
                Activity Summary
              </h2>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 ${darkMode ? 'bg-black border-[#333333] hover:border-primary' : 'bg-white border-[#E0E0E0] hover:border-primary'} border transition-colors cursor-pointer group`}>
                  <span className={darkMode ? 'text-white' : 'text-black font-medium'}>Forum Posts</span>
                  <span className={`${darkMode ? 'bg-[#333333] text-white' : 'bg-black text-white'} px-3 py-1 text-sm font-bold`}>
                    {activitySummary.forumPosts}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-4 ${darkMode ? 'bg-black border-[#333333] hover:border-primary' : 'bg-white border-[#E0E0E0] hover:border-primary'} border transition-colors cursor-pointer group`}>
                  <span className={darkMode ? 'text-white' : 'text-black font-medium'}>Mood Tracking</span>
                  <span className={`bg-primary text-white px-3 py-1 text-sm font-bold`}>
                    {activitySummary.moodTracking}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-4 ${darkMode ? 'bg-black border-[#333333] hover:border-primary opacity-60 hover:opacity-100' : 'bg-white border-[#E0E0E0] hover:border-primary opacity-70 hover:opacity-100'} border transition-colors cursor-pointer group`}>
                  <span className={darkMode ? 'text-white' : 'text-black font-medium'}>Consultations</span>
                  <span className={`${darkMode ? 'bg-[#222] text-gray-400' : 'bg-gray-200 text-gray-500'} px-3 py-1 text-sm font-bold`}>
                    {activitySummary.consultations}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mood Trends and Recent History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Mood Trends Chart */}
          <div className={`lg:col-span-2 ${darkMode ? 'bg-black border-[#333333]' : 'bg-white border-[#E0E0E0]'} border p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Mood Trends</h2>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`${darkMode ? 'bg-black text-white border-[#333333]' : 'bg-white text-black border-[#E0E0E0]'} text-sm border p-1 outline-none focus:border-primary`}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
            <div className={`relative h-64 w-full ${darkMode ? 'chart-glow' : ''}`}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Recent Mood History */}
          <div className={`lg:col-span-1 ${darkMode ? 'bg-black border-[#333333]' : 'bg-white border-[#E0E0E0]'} border p-8 flex flex-col`}>
            <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-black'}`}>Recent Mood History</h2>
            <div className="space-y-0 flex-grow">
              {moodHistory.slice(0, 3).map((entry, index) => (
                <div 
                  key={index}
                  className={`flex flex-col py-4 border-b ${darkMode ? 'border-[#333333] hover:bg-white/5' : 'border-[#E0E0E0] hover:bg-gray-50'} transition-colors`}
                >
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                      {entry.mood_score || 5}<span className={`text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>/10</span>
                    </span>
                    <span className={`text-xs font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <div className={`w-full h-1 ${darkMode ? 'bg-[#222]' : 'bg-gray-200'}`}>
                    <div 
                      className={`bg-primary h-1 ${darkMode ? 'shadow-[0_0_8px_rgba(161,0,255,0.8)]' : ''}`}
                      style={{ width: `${((entry.mood_score || 5) / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              type="button"
              onClick={() => toast.info('Full history feature coming soon!')}
              className={`mt-4 text-xs font-bold text-primary uppercase tracking-widest transition-colors flex items-center gap-1 ${
                darkMode ? 'hover:text-white' : 'hover:text-black'
              }`}
            >
              View Full History <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Screening History */}
        <div className={`${darkMode ? 'bg-black border-[#333333]' : 'bg-white border-[#E0E0E0]'} border p-8`}>
          <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-black'} flex items-center gap-3`}>
            <span className={`material-symbols-outlined ${darkMode ? 'text-accent-teal' : 'text-black'}`}>assignment_turned_in</span>
            Screening History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-[#333333]' : 'border-[#E0E0E0]'}`}>
                  <th className={`pb-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Test Name</th>
                  <th className={`pb-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Result</th>
                  <th className={`pb-4 text-xs font-bold uppercase tracking-wider text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                  <th className={`pb-4 text-xs font-bold uppercase tracking-wider text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-[#333333]' : 'divide-[#E0E0E0]'}`}>
                {screeningHistory.length > 0 ? (
                  screeningHistory.map((screening, index) => {
                    const badge = getSeverityBadge(screening.test_type, screening.score);
                    return (
                      <tr key={index} className={`group transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                        <td className="py-5 pr-4">
                          <div className={`font-bold text-lg ${darkMode ? 'text-white group-hover:text-primary' : 'text-black group-hover:text-primary'} transition-colors`}>
                            {screening.test_type}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {screening.test_type === 'PHQ9' ? 'Patient Health Questionnaire' :
                             screening.test_type === 'GAD7' ? 'Generalized Anxiety Disorder' :
                             'General Health Questionnaire'}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 ${badge.bgColor} text-white text-xs font-bold`}>
                              {badge.severity}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Score: {screening.score}
                            </span>
                          </div>
                        </td>
                        <td className={`py-5 px-4 text-right font-mono text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(screening.created_at)}
                        </td>
                        <td className="py-5 pl-4 text-right">
                          <button className={`${darkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'} transition-colors`}>
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className={`py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No screening history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

export default Progress;
