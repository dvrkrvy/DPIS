import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import EmergencyButton from './components/EmergencyButton';

// Student Pages
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ScreeningTest from './pages/ScreeningTest';
import Resources from './pages/Resources';
import Forum from './pages/Forum';
import Booking from './pages/Booking';
import Progress from './pages/Progress';
import AIChat from './pages/AIChat';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function AIChatButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/ai-chat')}
      style={{ 
        position: 'fixed',
        bottom: '140px',
        right: '24px',
        zIndex: 99999,
        background: 'linear-gradient(to right, #2563eb, #9333ea)',
        color: 'white',
        fontWeight: 'bold',
        padding: '12px 24px',
        borderRadius: '9999px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.05)';
        e.target.style.background = 'linear-gradient(to right, #1d4ed8, #7e22ce)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.background = 'linear-gradient(to right, #2563eb, #9333ea)';
      }}
      title="AI Support Chat"
    >
      <span style={{ fontSize: '20px' }}>🤖</span>
      <span>AI Chat</span>
    </button>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Navbar />
          <AIChatButton />
          <EmergencyButton />

          <Routes>
            {/* Public routes */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected student routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/screening"
              element={
                <PrivateRoute>
                  <ScreeningTest />
                </PrivateRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <PrivateRoute>
                  <Resources />
                </PrivateRoute>
              }
            />
            <Route
              path="/forum"
              element={
                <PrivateRoute>
                  <Forum />
                </PrivateRoute>
              }
            />
            <Route
              path="/booking"
              element={
                <PrivateRoute>
                  <Booking />
                </PrivateRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <PrivateRoute>
                  <Progress />
                </PrivateRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <PrivateRoute>
                  <AIChat />
                </PrivateRoute>
              }
            />

            {/* Admin route */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute requireAdmin>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* Default route */}
            <Route path="/" element={<Navigate to="/onboarding" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-white',
            }}
          />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
