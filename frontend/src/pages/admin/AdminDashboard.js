import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [emergencyFlags, setEmergencyFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchEmergencyFlags();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergencyFlags = async () => {
    try {
      const response = await api.get('/api/admin/emergency-flags?resolved=false', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencyFlags(response.data.flags || []);
    } catch (error) {
      console.error('Failed to fetch emergency flags:', error);
    }
  };

  const handleResolveFlag = async (flagId) => {
    try {
      await api.patch(`/api/admin/emergency-flags/${flagId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Flag resolved');
      fetchEmergencyFlags();
    } catch (error) {
      toast.error('Failed to resolve flag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const severityData = dashboardData?.severityDistribution?.map(s => ({
    name: s.severity,
    value: parseInt(s.count)
  })) || [];

  const screeningTypeData = dashboardData?.screeningByType?.map(s => ({
    name: s.test_type,
    value: parseInt(s.count)
  })) || [];

  const dailyTrendsData = dashboardData?.dailyTrends?.map(t => ({
    date: new Date(t.date).toLocaleDateString(),
    screenings: parseInt(t.count)
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-primary-600">{dashboardData?.overview?.totalUsers || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm mb-2">Active Users (30d)</h3>
          <p className="text-3xl font-bold text-primary-600">{dashboardData?.overview?.activeUsers || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm mb-2">Total Screenings</h3>
          <p className="text-3xl font-bold text-primary-600">{dashboardData?.overview?.totalScreenings || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm mb-2">High Risk Flags</h3>
          <p className="text-3xl font-bold text-red-600">{dashboardData?.overview?.highRiskFlags || 0}</p>
        </div>
      </div>

      {emergencyFlags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-red-600">Active Emergency Flags</h2>
          <div className="space-y-3">
            {emergencyFlags.map(flag => (
              <div key={flag.id} className="border-l-4 border-red-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{flag.flag_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">Severity: {flag.severity}</p>
                    <p className="text-sm text-gray-700 mt-1">{flag.context}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(flag.flagged_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveFlag(flag.id)}
                    className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 text-sm"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Screening Test Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={screeningTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Daily Screening Trends (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrendsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="screenings" stroke="#0ea5e9" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminDashboard;
