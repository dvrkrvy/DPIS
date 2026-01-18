import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeUsers, setActiveUsers] = useState(247);

  useEffect(() => {
    // Simulate active users count (can be connected to real API later)
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(200, Math.min(300, prev + change));
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/onboarding');
  };

  if (!isAuthenticated) {
    return null;
  }

  const studentNavItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/screening', label: 'Screening' },
    { path: '/resources', label: 'Resources' },
    { path: '/forum', label: 'Community' },
  ];

  const userName = user?.anonymous_id || user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link to={isAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                DPIS PRO
              </span>
            </Link>

            {/* Navigation Links */}
            {!isAdmin && (
              <div className="hidden md:flex items-center space-x-1">
                {studentNavItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === item.path
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Section - Status Indicators and User */}
          <div className="flex items-center space-x-6">
            {/* System Status Indicators - Hidden on small screens */}
            <div className="hidden lg:flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold">SYSTEM: ALL SYSTEMS OPERATIONAL</span>
              </div>
              
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/50 rounded-full">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046a1 1 0 01.714 0l7 2.5A1 1 0 0119 4.5v7a1 1 0 01-.986 1.05L17 13v-2a1 1 0 00-1-1H4a1 1 0 00-1 1v2l-1.014.05A1 1 0 011 11.5v-7a1 1 0 01.986-.954l7-2.5zM4 11l1 2h10l1-2V6H4v5zm9-5h2v2h-2V6z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-400 font-semibold">LIVE: {activeUsers} ACTIVE USERS ONLINE</span>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/50 rounded-full">
                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                <span className="text-purple-400 font-semibold">NEW AI MODEL V4.2 DEPLOYED</span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile with Premium Badge */}
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                  {userInitial}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-200">
                    {userName.toUpperCase()} 
                    <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-xs rounded-full font-bold">
                      PREMIUM ACCESS
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
