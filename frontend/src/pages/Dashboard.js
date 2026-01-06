import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { DashboardHero } from '../components/SVGIcons';

const Dashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [latestScreenings, setLatestScreenings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/api/screening/latest', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLatestScreenings(response.data.results || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'minimal': return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
      case 'mild': return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30';
      case 'moderate': return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
      case 'severe':
      case 'moderately_severe':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasCompletedScreening = latestScreenings.length > 0;
  
  // Map test types to distinct colors (Accenture-style professional colors)
  const getTestColor = (testType) => {
    switch(testType) {
      case 'PHQ9': return '#6366f1'; // Indigo
      case 'GAD7': return '#0ea5e9'; // Sky blue
      case 'GHQ': return '#8b5cf6';  // Purple
      default: return '#6b7280';     // Gray fallback
    }
  };

  const screeningData = latestScreenings.map(s => ({
    test: s.test_type,
    score: s.score,
    date: new Date(s.created_at).toLocaleDateString(),
    color: getTestColor(s.test_type)
  }));

  // Create bars with different colors
  const renderCustomBar = (entry, index) => {
    return <Cell key={`cell-${index}`} fill={entry.color} />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Hero Section with SVG Background */}
      <div className="relative mb-12 rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 dark:from-indigo-800 dark:via-blue-800 dark:to-purple-800 shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <DashboardHero />
        </div>
        <div className="relative px-8 py-12 text-white">
          <h1 className="text-5xl font-bold mb-3">Dashboard</h1>
          <p className="text-xl text-blue-100">Welcome to your mental health support dashboard</p>
        </div>
      </div>

      {!hasCompletedScreening && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-6 mb-6 rounded-r-lg shadow-md animate-slide-up">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                You haven't completed a screening test yet. Please complete one to get personalized recommendations.
              </p>
              <Link
                to="/screening"
                className="mt-3 inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
              >
                Take Screening Test →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/screening" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-indigo-500 dark:hover:border-indigo-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">Screening Tests</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Assess your mental health</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">📊</div>
          </div>
        </Link>

        <Link to="/resources" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-cyan-500 dark:hover:border-cyan-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-1">Resources</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Access support materials</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">📚</div>
          </div>
        </Link>

        <Link to="/forum" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">Peer Support</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Connect with peers</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">💬</div>
          </div>
        </Link>

        <Link to="/booking" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-1">Book Session</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Schedule counseling</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">📅</div>
          </div>
        </Link>

        <Link to="/ai-chat" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-pink-500 dark:hover:border-pink-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors mb-1">AI Support</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Chat with AI assistant</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">🤖</div>
          </div>
        </Link>

        <Link to="/progress" className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-violet-500 dark:hover:border-violet-400 transform hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors mb-1">Progress</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Track your journey</p>
            </div>
            <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all">📈</div>
          </div>
        </Link>
      </div>

      {hasCompletedScreening && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Latest Screening Results</h2>
          <div className="space-y-4 mb-6">
            {latestScreenings.map((screening, index) => (
              <div key={index} className="border-l-4 border-primary-500 dark:border-primary-400 pl-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-r-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{screening.test_type}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Score: {screening.score} | {new Date(screening.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(screening.severity)}`}>
                    {screening.severity.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {screeningData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Scores Comparison</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={screeningData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="test" 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    style={{ fontSize: '14px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="square"
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {screeningData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">PHQ-9 (Depression)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-sky-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">GAD-7 (Anxiety)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">GHQ-12 (General Health)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
