import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import EmergencyButton from './components/EmergencyButton';

// Student Routes
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ScreeningTest from './pages/ScreeningTest';
import Resources from './pages/Resources';
import Forum from './pages/Forum';
import Booking from './pages/Booking';
import Progress from './pages/Progress';
import AIChat from './pages/AIChat';

// Admin Routes
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <EmergencyButton />
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/screening" element={<PrivateRoute><ScreeningTest /></PrivateRoute>} />
              <Route path="/resources" element={<PrivateRoute><Resources /></PrivateRoute>} />
              <Route path="/forum" element={<PrivateRoute><Forum /></PrivateRoute>} />
              <Route path="/booking" element={<PrivateRoute><Booking /></PrivateRoute>} />
              <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
              <Route path="/ai-chat" element={<PrivateRoute><AIChat /></PrivateRoute>} />
              
              <Route path="/admin/dashboard" element={<PrivateRoute requireAdmin><AdminDashboard /></PrivateRoute>} />
              
              <Route path="/" element={<Navigate to="/onboarding" replace />} />
            </Routes>
            <Toaster 
              position="top-right" 
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
