import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import extendedLogo from '../logos/DPIS Digital Wellness Logo.png';

const LANDING_NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'privacy', label: 'Privacy' },
];

const ADMIN_NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'screenings', label: 'Screenings' },
  { id: 'well-being', label: 'Well-being' },
  { id: 'reports', label: 'Reports' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const isLanding = location.pathname === '/';
  const isAdminDashboard =
    isAuthenticated && user?.role === 'ADMIN' && location.pathname === '/dashboard';

  const navItems = isAdminDashboard ? ADMIN_NAV_ITEMS : LANDING_NAV_ITEMS;

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setActiveSection(sectionId);

    if (isAdminDashboard) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!isLanding) {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleBadgeLabel =
    user?.role === 'ADMIN'
      ? 'Administrator'
      : user?.role === 'DOCTOR'
      ? 'Clinician'
      : 'Member';

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-on-primary-fixed/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:border-b dark:border-outline-variant/40 transition-colors">
      <div className="h-20 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter">
        <Link className="flex items-center shrink-0" to="/">
          <img
            alt="DPIS Digital Psychological Intervention System"
            className="h-14 sm:h-16 w-auto rounded-lg object-contain shadow-sm"
            src={extendedLogo}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-space-xs lg:gap-space-md">
          {navItems.map((item) => {
            const isActive = (isLanding || isAdminDashboard) && activeSection === item.id;
            return (
              <a
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'font-label-lg px-space-md py-space-sm transition-colors bg-primary-container text-on-primary-container rounded-lg'
                    : 'font-label-lg text-label-lg text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary hover:text-on-surface dark:hover:text-inverse-on-surface px-space-md py-space-sm rounded-lg transition-colors'
                }
                href={`#${item.id}`}
                onClick={(e) => handleSectionClick(e, item.id)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-space-sm">
          <button
            aria-label="Toggle theme"
            className="p-space-sm rounded-lg bg-surface-container-low dark:bg-tertiary text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary-container hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors flex items-center justify-center"
            onClick={toggleTheme}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-space-sm bg-surface-container-low dark:bg-tertiary px-space-md py-space-xs rounded-full">
                <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                  {roleBadgeLabel}
                </span>
              </div>
              {!location.pathname.startsWith('/dashboard') && (
                <Link
                  className="px-space-md py-space-sm rounded-lg font-label-lg text-label-lg text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors"
                  to="/dashboard"
                >
                  Dashboard
                </Link>
              )}
              <button
                className="px-space-md py-space-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-lg text-label-lg transition-colors"
                onClick={handleLogout}
                type="button"
              >
                Sign Out
              </button>
              <Link
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-semibold"
                title={`${user?.fullName || 'Account'} (${user?.role})`}
                to="/dashboard"
              >
                {(user?.fullName?.[0] || 'U').toUpperCase()}
              </Link>
            </>
          ) : (
            <>
              <Link
                className="px-space-md py-space-sm rounded-lg font-label-lg text-label-lg text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors"
                to="/login"
              >
                Sign In
              </Link>
              <Link
                className="px-space-md py-space-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-lg text-label-lg transition-colors"
                to="/register"
              >
                Get Started
              </Link>
              <Link
                aria-label="Account sign in"
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                to="/login"
              >
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
