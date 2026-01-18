import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">Failed to load dashboard data</p>
      </div>
    );
  }

  const userName = user?.anonymous_id || user?.name || 'Alex';
  const resilienceChange = dashboardData.cognitiveResilience?.change || 12;
  const pendingCount = dashboardData.pendingAssessments?.count || 2;
  const completionPercentage = dashboardData.pendingAssessments?.completionPercentage || 75;
  const newResourcesCount = dashboardData.library?.newResourcesCount || 0;
  const trends = dashboardData.mentalResilienceTrends || [];
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

  // Format trends for chart
  const monthNames = ['AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN'];
  const trendValues = trends.length > 0 
    ? trends.map(t => Math.round(t.score || 0))
    : [40, 50, 60, 65, 70, 90]; // Default trend data

  const trendData = monthNames.map((month, index) => ({
    month,
    value: trendValues[index] || 0,
    height: trendValues[index] || 0
  }));

  // Calculate bar heights (normalized to 0-100)
  const maxValue = Math.max(...trendValues, 100);
  const barHeights = trendData.map(item => ({
    ...item,
    heightPercent: (item.value / maxValue) * 100
  }));

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

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased overflow-x-hidden">
      <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Hero Welcome Section */}
        <div className="reveal-up relative rounded-3xl overflow-hidden h-[400px] border border-white/10 shadow-2xl group">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear transform group-hover:scale-110"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2560&auto=format&fit=crop')"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-center px-10 max-w-3xl">
            {/* AI Analysis Complete Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1 w-fit mb-6 border border-white/10">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-mono text-cyan-400">AI ANALYSIS COMPLETE</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
              Welcome back, <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-400 to-cyan-400">
                {userName}.
              </span>
            </h1>
            
            <p className="text-lg text-gray-300 mb-8 max-w-xl font-light">
              Your cognitive resilience score has increased by{' '}
              <span className="text-green-400 font-semibold">+{resilienceChange}%</span> this week. 
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
                className="bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3.5 rounded-xl font-semibold transition-all backdrop-blur-sm"
              >
                View Insights
              </button>
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Screening Tests Widget */}
              <div className="reveal-up delay-100 group relative p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <div className="w-32 h-32 bg-purple-500 rounded-full"></div>
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-lg shadow-purple-500/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">Screening Tests</h3>
                  <p className="text-sm text-gray-400 mb-4">{pendingCount} pending assessments available.</p>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden mb-2">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <button
                    onClick={() => navigate('/screening')}
                    className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                  >
                    Take Assessment
                  </button>
                </div>
              </div>

              {/* Library Widget */}
              <div className="reveal-up delay-200 group relative h-full min-h-[220px] rounded-2xl overflow-hidden cursor-pointer border border-gray-800 hover:border-cyan-500/50 transition-all">
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')"
                  }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                  <div className="mb-auto w-fit p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-cyan-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">Library</h3>
                  <p className="text-sm text-gray-300">
                    {newResourcesCount > 0 ? `${newResourcesCount} new meditation guides added.` : 'New meditation guides added.'}
                  </p>
                  <button
                    onClick={() => navigate('/resources')}
                    className="mt-4 w-full px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 rounded-lg font-semibold transition-colors backdrop-blur-sm"
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
                { icon: 'insights', label: 'Trends', color: 'indigo', route: '/progress' }
              ].map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`reveal-up delay-300 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer group`}
                >
                  <div className={`p-3 rounded-full bg-${item.color}-500/10 text-${item.color}-400 group-hover:bg-${item.color}-500 group-hover:text-white transition-all shadow-lg`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      {item.icon === 'forum' && <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />}
                      {item.icon === 'calendar' && <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />}
                      {item.icon === 'smart_toy' && <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />}
                      {item.icon === 'insights' && <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />}
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-300">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Mental Resilience Trends */}
            <div className="reveal-up delay-400 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-white">Mental Resilience Trends</h3>
                  <p className="text-xs text-gray-500">Last 6 Months Data</p>
                </div>
                <button
                  onClick={() => navigate('/progress')}
                  className="text-xs border border-white/10 hover:bg-white/5 px-3 py-1 rounded text-gray-400 transition-colors"
                >
                  Export Report
                </button>
              </div>
              <div className="relative h-64 w-full flex items-end justify-between px-2 gap-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0 opacity-20">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-full border-t border-dashed border-white"></div>
                  ))}
                </div>
                {/* Bars */}
                {barHeights.map((item, index) => (
                  <div key={item.month} className="flex-1 flex flex-col justify-end items-center gap-2 group cursor-pointer">
                    <div 
                      className={`w-full max-w-[40px] bg-white/5 rounded-t-sm transition-all duration-500 group-hover:bg-white/10 relative overflow-hidden ${
                        index === barHeights.length - 1 ? 'shadow-lg shadow-purple-500/30' : ''
                      }`}
                      style={{ height: `${Math.max(item.heightPercent, 20)}%` }}
                    >
                      <div 
                        className={`absolute bottom-0 w-full ${
                          index === barHeights.length - 1 
                            ? 'bg-gradient-to-t from-purple-600 to-cyan-500' 
                            : `bg-purple-600/70`
                        } transition-all group-hover:opacity-90`}
                        style={{ height: `${item.heightPercent}%` }}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-mono ${index === barHeights.length - 1 ? 'text-white font-bold' : 'text-gray-500'}`}>
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Recent Activity */}
            <div className="reveal-up delay-200 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg h-fit">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-sm">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Recent Activity
                </h3>
                <button 
                  onClick={() => navigate('/progress')}
                  className="text-xs text-cyan-400 hover:text-white transition-colors"
                >
                  See All
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {recentActivities.slice(0, 3).map((activity, index) => (
                  <div 
                    key={index}
                    className="p-4 hover:bg-white/5 transition-colors group cursor-pointer relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      activity.status === 'STABLE' ? 'bg-green-500' :
                      activity.status === 'SAVED' ? 'bg-purple-500' :
                      'bg-orange-500'
                    } transform -translate-x-full group-hover:translate-x-0 transition-transform`}></div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-gray-200 group-hover:text-white">{activity.label}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${activity.statusColor || 'bg-green-500/20 text-green-400 border-green-500/20'}`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{activity.time}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
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
                              className="ml-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-semibold transition-colors"
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
            <div className="reveal-up delay-300 relative bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden shadow-lg p-6 group">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80')"
                }}
              ></div>
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="relative z-10">
                <span className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-2 block">Daily Insight</span>
                <p className="text-lg font-serif italic text-gray-100 mb-4 leading-relaxed">
                  "{dailyInsight.quote}"
                </p>
                <div className="h-px w-10 bg-cyan-500 mb-3"></div>
                <p className="text-sm text-gray-400 font-medium mb-6">{dailyInsight.author}</p>
                <button
                  onClick={handleShareQuote}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
        <button 
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-900 border border-white/10 text-white shadow-lg hover:scale-110 transition-transform group relative overflow-hidden"
          onClick={() => navigate('/help')}
        >
          <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="absolute right-16 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
            Help Center
          </span>
        </button>
        <button 
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 text-white pl-4 pr-6 py-4 rounded-full shadow-lg shadow-purple-500/40 transition-all hover:scale-105"
          onClick={() => navigate('/ai-chat')}
        >
          <div className="bg-white/20 p-1 rounded-full">
            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Ask AI</span>
            <span className="font-bold text-sm">Support Assistant</span>
          </div>
        </button>
      </div>

      {/* Background gradient effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] opacity-20"></div>
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
