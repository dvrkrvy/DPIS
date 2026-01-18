import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeUsers, setActiveUsers] = useState(247);

  useEffect(() => {
    // Simulate active users count
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(200, Math.min(300, prev + change));
      });
    }, 30000);

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

  const userName = user?.anonymous_id || user?.name || 'Alex User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <header className="fixed w-full top-0 z-50 border-b border-white/10 bg-gray-900/95 backdrop-blur-md">
        {/* Scrolling Status Bar */}
        <div className="bg-gradient-to-r from-purple-600/20 via-blue-900/20 to-purple-600/20 border-b border-white/5 h-8 flex items-center overflow-hidden">
          <div className="whitespace-nowrap animate-scroll-text text-xs font-mono text-cyan-400 flex items-center gap-8">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              SYSTEM: ALL SYSTEMS OPERATIONAL
            </span>
            <span className="flex items-center gap-2">
              <span className="material-icons-outlined text-sm">bolt</span>
              LIVE: {activeUsers} ACTIVE USERS ONLINE
            </span>
            <span className="flex items-center gap-2">
              <span className="material-icons-outlined text-sm">psychology</span>
              NEW AI MODEL V4.2 DEPLOYED
            </span>
            <span className="flex items-center gap-2">
              <span className="material-icons-outlined text-sm">event</span>
              UPCOMING WEBINAR: MANAGING STRESS - 2PM EST
            </span>
          </div>
        </div>

        {/* Main Navbar */}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg transform rotate-3 group-hover:rotate-12 transition-transform duration-500 opacity-80 blur-sm"></div>
                  <div className="relative bg-gray-900 border border-white/20 rounded-lg h-full w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-purple-500/30 z-10">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                </div>
                <span className="text-2xl font-bold tracking-tight text-white group-hover:text-purple-400 transition-all duration-300">
                  DPIS <span className="text-purple-500 text-sm font-light tracking-widest align-top opacity-70">PRO</span>
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
                            ? 'text-white bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                        {location.pathname === item.path && (
                          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-500 rounded-full"></span>
                        )}
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
            </div>

            {/* Right Section - Notifications and User */}
            <div className="flex items-center space-x-6">
              {/* Notification Bell */}
              <button
                className="text-gray-400 hover:text-white transition-colors relative p-2"
                aria-label="Notifications"
              >
                <span className="material-icons-outlined">notifications</span>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-6 border-l border-white/10">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-sm font-semibold text-white">{userName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400">Premium Access</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 p-[2px]">
                  <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <span className="text-white font-semibold text-sm">{userInitial}</span>
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
      </header>

      <style>{`
        @keyframes scroll-text {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll-text {
          animation: scroll-text 20s linear infinite;
        }
      `}</style>
    </>
  );
};

export default Navbar;
