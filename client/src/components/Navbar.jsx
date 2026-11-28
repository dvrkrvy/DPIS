import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messageApi, profileApi } from '../services/api';
import extendedLogo from '../logos/DPIS Digital Wellness Logo.png';
import MessagingDrawer from './MessagingDrawer';
import ProfileEditModal from './ProfileEditModal';

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
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [unreadCount, setUnreadCount] = useState(0);

  const canUseMessaging = isAuthenticated && (user?.role === 'USER' || user?.role === 'DOCTOR');

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!canUseMessaging) {
      setUnreadCount(0);
      setMessagingOpen(false);
      setProfileEditOpen(false);
      return;
    }

    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const data = await messageApi.getUnreadCount();
        if (!cancelled) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Ignore silent unread count poll error
      }
    };

    profileApi
      .getMe()
      .then((data) => {
        if (!cancelled && data?.profile) {
          setAvatarUrl(data.profile.avatarUrl || '');
        }
      })
      .catch(() => {
        // Ignore silent profile fetch error
      });

    fetchUnread();
    const timer = setInterval(fetchUnread, 20000);
    const openListener = () => setMessagingOpen(true);
    window.addEventListener('dpis:open-messaging', openListener);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('dpis:open-messaging', openListener);
    };
  }, [canUseMessaging, user?.role]);

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
    <>
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
                    ? 'font-label-lg px-space-md py-space-sm transition-colors bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white border border-primary/40 dark:border-primary-fixed-dim/40 font-semibold rounded-lg'
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
              {canUseMessaging && (
                <button
                  type="button"
                  onClick={() => setMessagingOpen(true)}
                  aria-label="Open clinical messages"
                  className="relative px-space-md py-space-sm rounded-lg bg-surface-container-low dark:bg-tertiary border border-outline-variant/60 text-on-surface dark:text-inverse-on-surface hover:bg-surface-container-high dark:hover:bg-tertiary-container font-label-lg text-label-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  <span className="hidden sm:inline">Messages</span>
                  {unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {!location.pathname.startsWith('/dashboard') && (
                <Link
                  className="px-space-md py-space-sm rounded-lg font-label-lg text-label-lg text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors"
                  to="/dashboard"
                >
                  Dashboard
                </Link>
              )}
              <button
                className="px-space-md py-space-sm rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white font-label-lg text-label-lg transition-colors"
                onClick={handleLogout}
                type="button"
              >
                Sign Out
              </button>
              {canUseMessaging ? (
                <button
                  type="button"
                  onClick={() => setProfileEditOpen(true)}
                  className="w-9 h-9 rounded-full overflow-hidden bg-[#33452f] dark:bg-[#3f573a] border-2 border-primary/40 hover:border-primary flex items-center justify-center text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
                  title="Edit your profile"
                  aria-label="Edit your profile"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.fullName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.fullName?.[0] || 'U').toUpperCase()
                  )}
                </button>
              ) : (
                <Link
                  className="w-8 h-8 rounded-full bg-[#33452f] dark:bg-[#3f573a] flex items-center justify-center text-white text-xs font-semibold"
                  title={`${user?.fullName || 'Account'} (${user?.role})`}
                  to="/dashboard"
                >
                  {(user?.fullName?.[0] || 'U').toUpperCase()}
                </Link>
              )}
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
                className="px-space-md py-space-sm rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white font-label-lg text-label-lg transition-colors"
                to="/register"
              >
                Get Started
              </Link>
              <Link
                aria-label="Account sign in"
                className="w-8 h-8 rounded-full bg-[#33452f] dark:bg-[#3f573a] flex items-center justify-center"
                to="/login"
              >
                <span className="material-symbols-outlined text-white text-[18px]">person</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
    {canUseMessaging && (
      <>
        <MessagingDrawer
          isOpen={messagingOpen}
          onClose={() => setMessagingOpen(false)}
          onUnreadChange={setUnreadCount}
        />
        <ProfileEditModal
          isOpen={profileEditOpen}
          onClose={() => setProfileEditOpen(false)}
          onSaved={(updated) => setAvatarUrl(updated?.avatarUrl || '')}
        />
      </>
    )}
    </>
  );
}
