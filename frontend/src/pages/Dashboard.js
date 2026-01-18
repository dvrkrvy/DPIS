import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
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
  const recentActivities = dashboardData.recentActivities || [];

  // Format trends for chart (last 6 months)
  const monthNames = ['AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN'];
  const chartData = trends.map((trend, index) => ({
    month: monthNames[index % monthNames.length],
    score: trend.score || 0
  }));

  // If no trend data, create sample data
  if (chartData.length === 0) {
    for (let i = 0; i < 6; i++) {
      chartData.push({
        month: monthNames[i],
        score: 60 + Math.random() * 20
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGE1Y2Y2IiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] opacity-30"></div>
          
          <div className="relative p-8 md:p-12">
            {/* AI Analysis Complete Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI ANALYSIS COMPLETE
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Welcome back, {userName}.
            </h1>
            
            <p className="text-xl text-gray-300 mb-6 max-w-2xl">
              Your cognitive resilience score has increased by{' '}
              <span className="text-green-400 font-bold">+{resilienceChange}%</span> this week. 
              Continue your journey with today's recommended session.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/resources')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <span>▷</span> Resume Session
              </button>
              <button
                onClick={() => navigate('/progress')}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg font-semibold transition-all duration-200"
              >
                View Insights
              </button>
            </div>
          </div>
        </div>

        {/* Widgets Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Screening Tests Widget */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-200">Screening Tests</h3>
            <p className="text-gray-400 text-sm mb-4">{pendingCount} pending assessments available.</p>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => navigate('/screening')}
              className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Take Assessment
            </button>
          </div>

          {/* Library Widget */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-4 text-gray-200">Library</h3>
              <p className="text-gray-400 text-sm">
                {newResourcesCount > 0 
                  ? `${newResourcesCount} new meditation guides added.`
                  : 'New meditation guides added.'
                }
              </p>
              <button
                onClick={() => navigate('/resources')}
                className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Explore Library
              </button>
            </div>
          </div>

          {/* Recent Activity Widget */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-200">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200">
                          {activity.label || activity.type?.replace('_', ' ')}
                        </span>
                        {activity.status === 'STABLE' && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">STABLE</span>
                        )}
                        {activity.status === 'SAVED' && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">SAVED</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                      {activity.label && activity.label.includes('Journal') && (
                        <p className="text-xs text-gray-500 mt-1">245 words logged</p>
                      )}
                      {activity.label && activity.label.includes('Sleep') && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-2">▲ 5h 20m recorded</p>
                          <button
                            onClick={() => navigate('/ai-chat')}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs font-semibold transition-colors"
                          >
                            ASK AI Support Assistant
                          </button>
                        </div>
                      )}
                    </div>
                    {activity.label && activity.label.includes('Journal') && (
                      <span className="text-gray-500 cursor-help" title="View details">?</span>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200">Anxiety Check</span>
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">STABLE</span>
                      </div>
                      <p className="text-xs text-gray-500">Today, 10:23 AM</p>
                      <p className="text-xs text-gray-500 mt-1">No change from last week.</p>
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200">Daily Journal</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">SAVED</span>
                      </div>
                      <p className="text-xs text-gray-500">Yesterday, 9:45 PM</p>
                      <p className="text-xs text-gray-500 mt-1">245 words logged</p>
                    </div>
                    <span className="text-gray-500 cursor-help" title="View details">?</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/forum')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold text-gray-200">Community</div>
          </button>
          <button
            onClick={() => navigate('/booking')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">📅</div>
            <div className="font-semibold text-gray-200">Schedule</div>
          </button>
          <button
            onClick={() => navigate('/ai-chat')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">🤖</div>
            <div className="font-semibold text-gray-200">AI Chat</div>
          </button>
          <button
            onClick={() => navigate('/progress')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">📈</div>
            <div className="font-semibold text-gray-200">Trends</div>
          </button>
        </div>

        {/* Bottom Section - Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mental Resilience Trends */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-200">Mental Resilience Trends</h3>
              <button
                onClick={() => navigate('/progress')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition-colors"
              >
                Export Report
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Last 6 Months Data</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar dataKey="score" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Insight */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative">
            <div className="absolute top-4 right-4 text-yellow-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Daily Insight</div>
            <blockquote className="text-xl font-medium text-gray-200 mb-4 italic">
              "{dailyInsight.quote}"
            </blockquote>
            <p className="text-sm text-gray-400 mb-6">{dailyInsight.author}</p>
            <button
              onClick={() => {
                navigator.share?.({
                  title: 'Daily Insight',
                  text: `${dailyInsight.quote} ${dailyInsight.author}`
                }).catch(() => {
                  navigator.clipboard.writeText(`${dailyInsight.quote} ${dailyInsight.author}`);
                  toast.success('Quote copied to clipboard!');
                });
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-sm"
            >
              Share Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
