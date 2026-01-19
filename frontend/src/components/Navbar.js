import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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
    { path: '/forum', label: 'Forum' },
    { path: '/booking', label: 'Booking' },
    { path: '/progress', label: 'Progress' },
  ];

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
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className={`fixed w-full top-0 z-50 border-b transition-colors duration-200 ${
      darkMode 
        ? 'bg-gray-900/95 backdrop-blur-md border-white/10' 
        : 'bg-white/95 backdrop-blur-md border-gray-200'
    }`}>
      {/* Main Navbar - NO SCROLLING STATUS BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link 
              to={isAdmin ? '/admin/dashboard' : '/dashboard'} 
              className="flex-shrink-0 flex items-center space-x-3 group cursor-pointer"
            >
              <div className="relative w-10 h-10">
                <div className={`absolute inset-0 bg-gradient-to-br rounded-lg transform rotate-3 group-hover:rotate-12 transition-transform duration-500 opacity-80 blur-sm ${
                  darkMode ? 'from-purple-600 to-cyan-500' : 'from-purple-500 to-blue-500'
                }`}></div>
                <div className={`relative border rounded-lg h-full w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300 shadow-lg z-10 ${
                  darkMode 
                    ? 'bg-gray-900 border-white/20 shadow-purple-500/30' 
                    : 'bg-white border-gray-300 shadow-purple-500/20'
                }`}>
                  <svg className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
              </div>
              <span className={`text-2xl font-bold tracking-tight transition-all duration-300 ${
                darkMode 
                  ? 'text-white group-hover:text-purple-400' 
                  : 'text-gray-900 group-hover:text-purple-600'
              }`}>
                DPIS <span className={`text-sm font-light tracking-widest align-top opacity-70 ${
                  darkMode ? 'text-purple-500' : 'text-purple-600'
                }`}>PRO</span>
              </span>
            </Link>

            {/* Navigation Links */}
            {!isAdmin && (
              <div className="hidden md:block ml-12">
                <nav className="flex space-x-1">
                  {studentNavItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        location.pathname === item.path
                          ? darkMode
                            ? 'text-white bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                            : 'text-purple-700 bg-purple-100 border border-purple-200 shadow-md'
                          : darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-white/5'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                      {location.pathname === item.path && (
                        <span className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                          darkMode ? 'bg-purple-500' : 'bg-purple-600'
                        }`}></span>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Right Section - Theme Toggle, User Profile, and Logout */}
          <div className="flex items-center space-x-6">
            {/* Theme Toggle Button (replaces notification bell) */}
            <button
              onClick={toggleDarkMode}
              className={`relative p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                // Sun icon for light mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for dark mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User Profile */}
            <div className={`flex items-center space-x-3 pl-6 border-l ${
              darkMode ? 'border-white/10' : 'border-gray-300'
            }`}>
              <div className="flex flex-col text-right hidden sm:block">
                <span className={`text-sm font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {userName}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-full bg-gradient-to-r p-[2px] ${
                darkMode ? 'from-purple-600 to-pink-500' : 'from-purple-500 to-pink-400'
              }`}>
                <div className={`h-full w-full rounded-full flex items-center justify-center overflow-hidden ${
                  darkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
                  <span className={`font-semibold text-sm ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>{userInitial}</span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                darkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
