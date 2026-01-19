import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { token, user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [testHistory, setTestHistory] = useState([]); // For mental resilience graph
  const [loading, setLoading] = useState(true);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchTestResults();
    fetchTestHistory();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/progress/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
      // Set default data on error
      setDashboardData({
        cognitiveResilience: { score: 75, change: 12, trend: 'up' },
        recentActivities: [],
        pendingAssessments: { count: 2, tests: ['PHQ9', 'GAD7'], completionPercentage: 75 },
        library: { newResourcesCount: 0 },
        mentalResilienceTrends: [],
        dailyInsight: { quote: "The only journey is the one within.", author: "— Rainer Maria Rilke" }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTestResults = async () => {
    try {
      const response = await api.get('/api/screening/latest', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResults(response.data.results || []);
    } catch (error) {
      console.error('Failed to load test results:', error);
      // Don't show error toast for this, just log it
    }
  };

  const fetchTestHistory = async () => {
    try {
      const response = await api.get('/api/screening/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load test history:', error);
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
      // Show default contacts even if API fails
      setEmergencyContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowEmergencyModal(true);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        darkMode ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            darkMode ? 'border-purple-500' : 'border-purple-600'
          }`}></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        darkMode ? 'bg-black' : 'bg-gray-50'
      }`}>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Failed to load dashboard data</p>
      </div>
    );
  }

  // Get username from database (user enters this when logging in)
  const getUserDisplayName = () => {
    // Priority: username (from database login) > name > anonymous_id
    if (user?.username) {
      return user.username;
    }
    if (user?.name) {
      return user.name;
    }
    if (user?.anonymous_id) {
      const id = user.anonymous_id;
      if (id.length > 12) {
        return id.substring(0, 8) + '...';
      }
      return id;
    }
    return 'User';
  };

  const userName = getUserDisplayName();
  const resilienceChange = dashboardData.cognitiveResilience?.change || 12;
  const pendingCount = dashboardData.pendingAssessments?.count || 2;
  const completionPercentage = dashboardData.pendingAssessments?.completionPercentage || 75;
  const newResourcesCount = dashboardData.library?.newResourcesCount || 0;
  const dailyInsight = dashboardData.dailyInsight || { quote: "The only journey is the one within.", author: "— Rainer Maria Rilke" };
  
  // Format recent activities
  let recentActivities = dashboardData.recentActivities || [];
  if (recentActivities.length === 0) {
    recentActivities = [
      {
        type: 'anxiety_check',
        label: 'Anxiety Check',
        time: 'Today, 10:23 AM',
        status: 'STABLE',
        statusColor: 'bg-green-500/20 text-green-400 border-green-500/20',
        description: 'No change from last week'
      },
      {
        type: 'daily_journal',
        label: 'Daily Journal',
        time: 'Yesterday, 9:45 PM',
        status: 'SAVED',
        statusColor: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
        description: '245 words logged'
      },
      {
        type: 'sleep_pattern',
        label: 'Sleep Pattern',
        time: 'Jan 10, 2026',
        status: 'REVIEW',
        statusColor: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
        description: '5h 20m recorded'
      }
    ];
  }

  // Process test history for graph - get last 5 test scores
  const processTestScores = () => {
    // Get last 5 test results sorted by date (most recent first)
    const lastFiveTests = [...testHistory]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .reverse(); // Reverse to show oldest to newest

    if (lastFiveTests.length === 0) {
      return [];
    }

    return lastFiveTests.map((test, index) => {
      const testType = test.test_type?.toUpperCase();
      const testDate = new Date(test.created_at);
      
      // Format date for display
      const dateStr = testDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });

      // Get max score for the test type
      const maxScore = testType === 'PHQ9' ? 27 : 
                      testType === 'GAD7' ? 21 : 
                      testType === 'GHQ' ? 12 : 27;

      return {
        id: test.id || index,
        testType,
        score: test.score,
        date: dateStr,
        fullDate: testDate,
        maxScore,
        color: testType === 'PHQ9' ? '#6366f1' : // Indigo
               testType === 'GAD7' ? '#0ea5e9' : // Sky blue
               testType === 'GHQ' ? '#8b5cf6' : '#6b7280', // Purple or gray
        label: testType === 'PHQ9' ? 'PHQ-9' :
               testType === 'GAD7' ? 'GAD-7' :
               testType === 'GHQ' ? 'GHQ-12' : testType
      };
    });
  };

  const testScoreData = processTestScores();
  
  // Find the maximum ACTUAL score across all tests for proportional scaling
  // This ensures score 10 is twice as tall as score 5
  const maxActualScore = testScoreData.length > 0 
    ? Math.max(...testScoreData.map(t => t.score || 0), 1) // At least 1 to avoid division by zero
    : 1;
  
  // Standard graph height - fixed for consistency
  const graphHeight = 350;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'minimal': return 'bg-green-500/20 text-green-400 border-green-500/20';
      case 'mild': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
      case 'moderate': return 'bg-orange-500/20 text-orange-400 border-orange-500/20';
      case 'severe':
      case 'moderately_severe':
        return 'bg-red-500/20 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  const handleShareQuote = () => {
    const text = `${dailyInsight.quote} ${dailyInsight.author}`;
    if (navigator.share) {
      navigator.share({
        title: 'Daily Insight',
        text: text
      }).catch(() => {
        navigator.clipboard.writeText(text);
        toast.success('Quote copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Quote copied to clipboard!');
    }
  };

  // Theme-aware classes
  const bgMain = darkMode ? 'bg-black' : 'bg-gray-50';
  const textMain = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const cardBorder = darkMode ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen font-sans antialiased overflow-x-hidden transition-colors ${bgMain} ${textMain}`}>
      <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Hero Welcome Section */}
        <div className={`reveal-up relative rounded-3xl overflow-hidden h-[400px] border shadow-2xl group ${
          darkMode ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear transform group-hover:scale-110"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2560&auto=format&fit=crop')"
            }}
          ></div>
          <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-r from-black via-black/80 to-transparent' : 'bg-gradient-to-r from-white via-white/80 to-transparent'}`}></div>
          
          <div className="relative z-10 h-full flex flex-col justify-center px-10 max-w-3xl">
            {/* AI Analysis Complete Badge */}
            <div className={`inline-flex items-center space-x-2 backdrop-blur-md rounded-full px-3 py-1 w-fit mb-6 border ${
              darkMode ? 'bg-white/10 border-white/10' : 'bg-black/10 border-black/10'
            }`}>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className={`text-xs font-mono ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>AI ANALYSIS COMPLETE</span>
            </div>

            <h1 className={`text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome back, <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-purple-400 to-cyan-400">
                {userName}.
              </span>
            </h1>
            
            <p className={`text-lg mb-8 max-w-xl font-light ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Your cognitive resilience score has increased by{' '}
              <span className="text-green-500 font-semibold">+{resilienceChange}%</span> this week. 
              Continue your journey with today's recommended session.
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => navigate('/resources')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all transform hover:-translate-y-1 flex items-center gap-2 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Resume Session
              </button>
              <button
                onClick={() => navigate('/progress')}
                className={`px-8 py-3.5 rounded-xl font-semibold transition-all backdrop-blur-sm border ${
                  darkMode 
                    ? 'bg-white/5 hover:bg-white/10 border-white/20 text-white' 
                    : 'bg-gray-900/5 hover:bg-gray-900/10 border-gray-900/20 text-gray-900'
                }`}
              >
                View Insights
              </button>
            </div>
          </div>
        </div>

        {/* Test Results Section */}
        {testResults.length > 0 && (
          <div className={`reveal-up delay-100 ${cardBg} ${cardBorder} rounded-2xl p-6 shadow-lg border`}>
            <h3 className={`text-lg font-semibold mb-4 ${textMain}`}>Recent Test Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testResults.slice(0, 3).map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${textMain}`}>{result.test_type}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getSeverityColor(result.severity)}`}>
                      {result.severity.replace('_', ' ')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold mb-1 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {result.score}
                  </p>
                  <p className={`text-xs ${textSecondary}`}>
                    {new Date(result.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/screening')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              View All Results →
            </button>
          </div>
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Screening Tests Widget */}
              <div className={`reveal-up delay-100 group relative p-6 ${cardBg} ${cardBorder} rounded-2xl hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden border`}>
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
                  <div className="w-32 h-32 bg-purple-500 rounded-full"></div>
                </div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:text-white transition-colors shadow-lg ${
                    darkMode 
                      ? 'bg-purple-600/20 text-purple-400 group-hover:bg-purple-600' 
                      : 'bg-purple-100 text-purple-600 group-hover:bg-purple-600'
                  }`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-semibold mb-1 group-hover:text-purple-400 transition-colors ${textMain}`}>Screening Tests</h3>
                  <p className={`text-sm mb-4 ${textSecondary}`}>{pendingCount} pending assessments available.</p>
                  <div className={`w-full rounded-full h-1.5 overflow-hidden mb-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className={`flex justify-between text-xs ${textSecondary}`}>
                    <span>Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <button
                    onClick={() => navigate('/screening')}
                    className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-white"
                  >
                    Take Assessment
                  </button>
                </div>
              </div>

              {/* Library Widget */}
              <div className={`reveal-up delay-200 group relative h-full min-h-[220px] rounded-2xl overflow-hidden cursor-pointer border transition-all ${cardBorder} hover:border-cyan-500/50`}>
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')"
                  }}
                ></div>
                <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-t from-black via-black/60 to-transparent' : 'bg-gradient-to-t from-white via-white/60 to-transparent'}`}></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                  <div className={`mb-auto w-fit p-2 backdrop-blur-md rounded-lg border ${
                    darkMode ? 'bg-black/40 border-white/10 text-cyan-400' : 'bg-white/80 border-gray-300 text-cyan-600'
                  }`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-semibold mb-1 group-hover:text-cyan-400 transition-colors ${textMain}`}>Library</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {newResourcesCount > 0 ? `${newResourcesCount} new meditation guides added.` : 'New meditation guides added.'}
                  </p>
                  <button
                    onClick={() => navigate('/resources')}
                    className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold transition-colors backdrop-blur-sm ${
                      darkMode 
                        ? 'bg-cyan-600/80 hover:bg-cyan-600 text-white' 
                        : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    }`}
                  >
                    Explore Library
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Access Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'forum', label: 'Community', color: 'green', route: '/forum' },
                { icon: 'calendar', label: 'Schedule', color: 'orange', route: '/booking' },
                { icon: 'smart_toy', label: 'AI Chat', color: 'pink', route: '/ai-chat' },
                { icon: 'menu_book', label: 'Resources', color: 'indigo', route: '/resources' }
              ].map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`reveal-up delay-300 ${cardBg} ${cardBorder} rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-opacity-50 transition-colors cursor-pointer group border`}
                >
                  <div className={`p-3 rounded-full group-hover:text-white transition-all shadow-lg ${
                    item.color === 'green' ? 'bg-green-500/10 text-green-400 group-hover:bg-green-500' :
                    item.color === 'orange' ? 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500' :
                    item.color === 'pink' ? 'bg-pink-500/10 text-pink-400 group-hover:bg-pink-500' :
                    'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500'
                  }`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      {item.icon === 'forum' && <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />}
                      {item.icon === 'calendar' && <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />}
                      {item.icon === 'smart_toy' && <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />}
                      {item.icon === 'menu_book' && <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />}
                      {item.icon === 'insights' && <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />}
                    </svg>
                  </div>
                  <span className={`text-sm font-medium ${textSecondary}`}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Last 5 Test Scores Graph */}
            <div className={`reveal-up delay-400 ${cardBg} ${cardBorder} rounded-2xl p-6 shadow-lg border`}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className={`text-lg font-semibold ${textMain}`}>Recent Test Scores</h3>
                  <p className={`text-xs ${textSecondary}`}>Last 5 Screening Test Results</p>
                </div>
                <button
                  onClick={() => navigate('/screening')}
                  className={`text-xs border rounded px-3 py-1 transition-colors ${
                    darkMode 
                      ? 'border-white/10 hover:bg-white/5 text-gray-400' 
                      : 'border-gray-300 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  View All
                </button>
              </div>
              
              {/* Test Scores Graph - Standard Bar Chart */}
              <div className="w-full">
                {/* Graph Container */}
                <div className="relative w-full" style={{ height: `${graphHeight}px` }}>
                  {/* Y-axis */}
                  <div className="absolute left-0 top-0 bottom-12 w-12 flex flex-col justify-between border-r pr-2"
                    style={{ borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    {testScoreData.length > 0 && [0, 1, 2, 3, 4].map(i => {
                      // Y-axis labels: 0 (bottom), 25%, 50%, 75%, maxActualScore (top)
                      // Top label should be exact maxActualScore, others evenly spaced
                      const scoreValue = i === 0 
                        ? maxActualScore  // Top: exact max score
                        : i === 4 
                          ? 0  // Bottom: 0
                          : Math.round((maxActualScore / 4) * (4 - i)); // Middle values
                      return (
                        <div key={i} className={`text-xs font-medium ${textSecondary} text-right`}>
                          {scoreValue}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Graph Area - Full height for bars */}
                  <div className="ml-14 absolute top-0 bottom-12 left-0 right-0" style={{ height: `${graphHeight - 48}px` }}>
                    {/* Grid Lines - aligned with Y-axis values */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div 
                          key={i} 
                          className={`w-full border-t border-dashed ${
                            darkMode ? 'border-white/10' : 'border-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                    
                    {/* Bars Container - Uses full height */}
                    {testScoreData.length > 0 ? (
                      <div className="absolute inset-0 flex items-end justify-around gap-3 px-4" style={{ height: '100%' }}>
                        {testScoreData.map((testData, index) => {
                          const isLastBar = index === testScoreData.length - 1;
                          // Calculate bar height as percentage of FULL graph area height
                          // Graph area height = graphHeight - 48px (for labels)
                          const graphAreaHeight = graphHeight - 48;
                          // Bar height = (score / maxActualScore) * graphAreaHeight
                          const barHeightPixels = maxActualScore > 0 
                            ? (testData.score / maxActualScore) * graphAreaHeight
                            : 0;
                          // Convert to percentage of container
                          const barHeightPercent = graphAreaHeight > 0
                            ? (barHeightPixels / graphAreaHeight) * 100
                            : 0;
                          // For score 0, show a tiny visible bar
                          const barHeight = testData.score === 0 ? 2 : barHeightPercent;
                          
                          return (
                            <div 
                              key={testData.id} 
                              className="flex-1 flex flex-col items-center justify-end group relative max-w-[120px]"
                              style={{ height: '100%' }}
                            >
                              {/* Bar - Uses full available height */}
                              <div 
                                className={`w-full rounded-t transition-all duration-300 hover:opacity-90 ${
                                  isLastBar ? 'ring-2 ring-cyan-400/50 shadow-lg' : ''
                                }`}
                                style={{
                                  height: `${barHeight}%`,
                                  backgroundColor: testData.color,
                                  minHeight: testData.score === 0 ? '4px' : '0px',
                                  boxShadow: isLastBar 
                                    ? `0 0 15px ${testData.color}50`
                                    : `0 2px 4px rgba(0,0,0,0.1)`
                                }}
                                title={`${testData.label}: ${testData.score}/${testData.maxScore}`}
                              >
                                {/* Score label on hover */}
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white px-2 py-1 rounded whitespace-nowrap z-10"
                                     style={{ backgroundColor: testData.color }}>
                                  {testData.score}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className={`text-sm ${textSecondary}`}>No test scores available</p>
                      </div>
                    )}
                  </div>
                  
                  {/* X-axis Labels - Below the graph */}
                  {testScoreData.length > 0 && (
                    <div className="absolute bottom-0 left-14 right-0 h-12 flex items-start justify-around gap-3 px-4">
                      {testScoreData.map((testData, index) => {
                        const isLastBar = index === testScoreData.length - 1;
                        return (
                          <div 
                            key={testData.id} 
                            className="flex-1 flex flex-col items-center gap-1 max-w-[120px]"
                          >
                            <span className={`text-xs font-medium ${
                              isLastBar 
                                ? darkMode ? 'text-white font-bold' : 'text-gray-900 font-bold'
                                : textSecondary
                            }`}>
                              {testData.date}
                            </span>
                            <span className={`text-[10px] ${textSecondary}`}>
                              {testData.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-6 pt-4 border-t"
                style={{ borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className={`text-xs ${textSecondary}`}>PHQ-9 (Depression)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0ea5e9' }}></div>
                  <span className={`text-xs ${textSecondary}`}>GAD-7 (Anxiety)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span className={`text-xs ${textSecondary}`}>GHQ-12 (General Health)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Recent Activity */}
            <div className={`reveal-up delay-200 ${cardBg} ${cardBorder} rounded-2xl overflow-hidden shadow-lg h-fit border`}>
              <div className={`p-5 border-b flex justify-between items-center backdrop-blur-sm ${
                darkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'
              }`}>
                <h3 className={`font-semibold flex items-center gap-2 ${textMain}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Recent Activity
                </h3>
                <button 
                  onClick={() => navigate('/progress')}
                  className={`text-xs transition-colors ${
                    darkMode ? 'text-cyan-400 hover:text-white' : 'text-cyan-600 hover:text-cyan-700'
                  }`}
                >
                  See All
                </button>
              </div>
              <div className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                {recentActivities.slice(0, 3).map((activity, index) => (
                  <div 
                    key={index}
                    className={`p-4 hover:opacity-80 transition-colors group cursor-pointer relative overflow-hidden ${
                      darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      activity.status === 'STABLE' ? 'bg-green-500' :
                      activity.status === 'SAVED' ? 'bg-purple-500' :
                      'bg-orange-500'
                    } transform -translate-x-full group-hover:translate-x-0 transition-transform`}></div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium group-hover:opacity-90 ${textMain}`}>{activity.label}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${activity.statusColor || 'bg-green-500/20 text-green-400 border-green-500/20'}`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className={`text-xs mb-2 ${textSecondary}`}>{activity.time}</p>
                    <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                      {activity.description && (
                        <>
                          {activity.type === 'sleep_pattern' ? (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {activity.description}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                              </svg>
                              {activity.description}
                            </>
                          )}
                          {activity.type === 'sleep_pattern' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/ai-chat');
                              }}
                              className="ml-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-semibold transition-colors text-white"
                            >
                              ASK AI Support Assistant
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Insight */}
            <div className={`reveal-up delay-300 relative rounded-2xl border overflow-hidden shadow-lg p-6 group ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-900 to-black border-white/10' 
                : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
            }`}>
              <div 
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
                  darkMode ? 'opacity-20 group-hover:opacity-30' : 'opacity-10 group-hover:opacity-20'
                }`}
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80')"
                }}
              ></div>
              <div className={`absolute top-0 right-0 p-4 opacity-20 ${textSecondary}`}>
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="relative z-10">
                <span className={`text-xs font-mono uppercase tracking-widest mb-2 block ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>Daily Insight</span>
                <p className={`text-lg font-serif italic mb-4 leading-relaxed ${
                  darkMode ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  "{dailyInsight.quote}"
                </p>
                <div className="h-px w-10 bg-cyan-500 mb-3"></div>
                <p className={`text-sm font-medium mb-6 ${textSecondary}`}>{dailyInsight.author}</p>
                <button
                  onClick={handleShareQuote}
                  className={`w-full py-2 border rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    darkMode 
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300' 
                      : 'bg-gray-900/5 hover:bg-gray-900/10 border-gray-300 text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  Share Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* New Floating Action Buttons - Replacing old ones */}
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
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowEmergencyModal(false)}
        >
          <div 
            className={`${cardBg} ${cardBorder} rounded-xl p-6 max-w-md w-full shadow-2xl border`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-2xl font-bold text-red-600 dark:text-red-400 mb-4`}>🆘 Emergency Support</h2>
            <p className={`mb-4 ${textSecondary}`}>
              If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
              }`}>
                <strong className={`block mb-1 ${textMain}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
              }`}>
                <strong className={`block mb-1 ${textMain}`}>Crisis Text Line:</strong>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <strong className={`block mb-1 ${textMain}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">{emergencyContacts.institutionEmail}</a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <strong className={`block mb-1 ${textMain}`}>Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">{emergencyContacts.institutionPhone}</a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Background gradient effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 ${
          darkMode ? 'bg-purple-600/20' : 'bg-purple-400/10'
        }`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${
          darkMode ? 'bg-cyan-500/20' : 'bg-cyan-400/10'
        }`}></div>
      </div>

      <style>{`
        @keyframes reveal-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .reveal-up {
          animation: reveal-up 0.8s forwards;
          opacity: 0;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

export default Dashboard;
