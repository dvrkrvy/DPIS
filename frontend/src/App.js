import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on public auth pages (onboarding/login)
  const pathname = location.pathname;
  if (pathname === '/onboarding' || pathname === '/admin/login' || pathname === '/' || pathname === '') {
    return null;
  }

  // Floating AI Chat button - exact same size as Emergency, slightly above it
  return (
    <button
      onClick={() => navigate('/ai-chat')}
      className="fixed bottom-20 right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg z-50 flex items-center justify-center gap-2"
      style={{ width: '160px' }}
      title="AI Support Chat"
    >
      <span>🤖</span>
      <span>AI Chat</span>
    </button>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-900 transition-colors duration-200">
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
