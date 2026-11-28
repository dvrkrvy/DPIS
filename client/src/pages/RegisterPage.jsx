import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import emblemLogo from '../logos/Nature-Tech Brain Emblem.png';
import { authApi } from '../services/api';

const REGISTRATION_TABS = [
  {
    id: 'USER',
    label: 'Users',
    icon: 'self_improvement',
    subtitle: 'Register with your company or university email to join your institution',
    namePlaceholder: 'Alex Rivera',
    emailPlaceholder: 'alex.rivera@university.edu',
  },
  {
    id: 'ADMIN',
    label: 'Admins',
    icon: 'analytics',
    subtitle: 'Register with your institutional email to create your single permanent organization',
    namePlaceholder: 'Jordan Patel',
    emailPlaceholder: 'wellness@university.edu',
  },
  {
    id: 'DOCTOR',
    label: 'Doctors',
    icon: 'medical_services',
    subtitle: 'Access priority triage queues and support assigned organizations',
    namePlaceholder: 'Dr. Maya Lin',
    emailPlaceholder: 'dr.lin@clinic.org',
  },
];

function getPasswordStrength(val) {
  if (!val) return { width: '0%', label: 'Min. 8 characters' };
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const widths = ['0%', '25%', '50%', '75%', '100%'];
  const labels = ['Min. 8 characters', 'Weak', 'Fair', 'Good', 'Strong'];
  return { width: widths[score], label: labels[score] };
}

export default function RegisterPage() {
  const { register, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState('USER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [matchedOrg, setMatchedOrg] = useState(null);
  const [domainError, setDomainError] = useState('');
  const [checkingDomain, setCheckingDomain] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const currentTab = REGISTRATION_TABS.find((t) => t.id === activeRole) || REGISTRATION_TABS[0];
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleTabChange = (roleId) => {
    setActiveRole(roleId);
    setError('');
    setDomainError('');
    setMatchedOrg(null);
  };

  const verifyUserEmailDomain = async (emailVal) => {
    const trimmed = String(emailVal || '').trim();
    if (activeRole !== 'USER' || !trimmed.includes('@')) {
      setMatchedOrg(null);
      setDomainError('');
      return;
    }

    setCheckingDomain(true);
    setDomainError('');
    try {
      const res = await authApi.checkEmailDomain(trimmed);
      setMatchedOrg(res.organization);
    } catch (err) {
      setMatchedOrg(null);
      setDomainError(err.message || 'This institution is not part of DPIS yet.');
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (matchedOrg) setMatchedOrg(null);
    if (domainError) setDomainError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, company/university email, and password are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: activeRole,
      };

      if (inviteCode.trim()) {
        payload.inviteCode = inviteCode.trim();
      }

      await register(payload);
      setCreated(true);
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
      setCreated(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full py-space-xl">
      <div className="w-full max-w-[460px] mx-auto flex items-center justify-between mb-space-md">
        <Link
          className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors"
          to="/"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Home</span>
        </Link>
        <button
          aria-label="Toggle color mode"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-tertiary text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container dark:hover:bg-tertiary-container transition-colors font-label-sm text-label-sm cursor-pointer"
          onClick={toggleTheme}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>

      <div className="w-full max-w-[460px] mx-auto bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 rounded-xl shadow-md p-8 sm:p-10 transition-colors">
        <div className="flex flex-col items-center text-center mb-space-lg">
          <Link
            className="w-12 h-12 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed flex items-center justify-center mb-space-md overflow-hidden shadow-sm"
            to="/"
          >
            <img alt="DPIS Logo" className="w-12 h-12 object-cover" src={emblemLogo} />
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface mb-1">
            Create your account
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            {currentTab.subtitle}
          </p>
        </div>

        {/* Role Tabs: Users | Admins | Doctors */}
        <div
          aria-label="Registration role"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-container-low dark:bg-on-primary-fixed mb-space-lg"
          role="tablist"
        >
          {REGISTRATION_TABS.map((tab) => {
            const isSelected = activeRole === tab.id;
            return (
              <button
                key={tab.id}
                aria-selected={isSelected}
                className={`py-2 px-2 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-primary dark:border-primary-fixed-dim bg-primary-fixed dark:bg-primary-container text-stone-900 dark:text-white font-semibold shadow-sm'
                    : 'border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface'
                }`}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form className="flex flex-col gap-space-md" noValidate onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label
              className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
              htmlFor="fullName"
            >
              Full Name
            </label>
            <input
              autoComplete="name"
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
              id="fullName"
              name="fullName"
              onChange={(e) => setFullName(e.target.value)}
              placeholder={currentTab.namePlaceholder}
              required
              type="text"
              value={fullName}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="email"
              >
                {activeRole === 'DOCTOR' ? 'Email Address' : 'Company / University Email'}
              </label>
              {activeRole === 'USER' && checkingDomain && (
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Checking institution...
                </span>
              )}
            </div>
            <input
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
              id="email"
              name="email"
              onBlur={(e) => verifyUserEmailDomain(e.target.value)}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder={currentTab.emailPlaceholder}
              required
              type="email"
              value={email}
            />

            {activeRole === 'USER' && matchedOrg && (
              <div className="mt-1 px-3 py-2 rounded-lg bg-secondary-container/70 dark:bg-primary-container/60 text-on-secondary-container dark:text-on-primary-container flex items-center gap-2 font-body-sm text-body-sm">
                <span
                  className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>
                  Institution matched: <strong>{matchedOrg.name}</strong> ({matchedOrg.type})
                </span>
              </div>
            )}

            {activeRole === 'USER' && domainError && (
              <div className="mt-1 px-3 py-2 rounded-lg bg-error-container/60 text-on-error-container flex items-center gap-2 font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{domainError}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="password"
              >
                Password
              </label>
              <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                {strength.label}
              </span>
            </div>
            <div className="relative">
              <input
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-11 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
                id="password"
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label="Toggle password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors cursor-pointer"
                onClick={() => setShowPassword((prev) => !prev)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div className="w-full h-1 rounded-full bg-surface-container dark:bg-on-primary-fixed overflow-hidden mt-0.5">
              <div
                className="h-full bg-primary dark:bg-primary-fixed-dim transition-all duration-300 rounded-full"
                style={{ width: strength.width }}
              />
            </div>
          </div>

          {activeRole === 'USER' && (
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface flex items-center justify-between"
                htmlFor="inviteCode"
              >
                <span>Organization Invite Code</span>
                <span className="font-label-sm text-label-sm text-outline">Optional</span>
              </label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md uppercase tracking-wide focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
                id="inviteCode"
                name="inviteCode"
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Optional if using company email"
                type="text"
                value={inviteCode}
              />
            </div>
          )}

          {activeRole === 'ADMIN' && (
            <div className="px-3.5 py-2.5 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant dark:text-tertiary-fixed-dim font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim shrink-0 mt-0.5">
                domain_add
              </span>
              <span>
                One admin can create only one organization and remains permanently linked to it after setup.
              </span>
            </div>
          )}

          {activeRole === 'DOCTOR' && (
            <div className="px-3.5 py-2.5 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface-variant dark:text-tertiary-fixed-dim font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim shrink-0 mt-0.5">
                info
              </span>
              <span>
                Clinicians can support multiple assigned organizations and are matched by organization admins.
              </span>
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-space-sm px-3.5 py-2.5 rounded-lg bg-error-container/60 text-on-error-container font-body-sm text-body-sm"
              role="alert"
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
              <span>{error}</span>
            </div>
          )}

          <button
            className="w-full mt-space-sm py-3.5 px-6 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white disabled:opacity-60 transition-colors font-label-lg text-label-lg cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            disabled={loading}
            type="submit"
          >
            <span>
              {created
                ? 'Account Created'
                : loading
                ? 'Creating Account...'
                : `Create ${currentTab.label.slice(0, -1)} Account`}
            </span>
            <span className="material-symbols-outlined text-[18px]">
              {created ? 'check' : 'arrow_forward'}
            </span>
          </button>
        </form>

        <div className="mt-space-lg p-4 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed flex items-start gap-3">
          <span
            className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px] shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            Your clinical screening records are tied to an{' '}
            <span className="text-on-surface dark:text-inverse-on-surface font-medium">
              anonymousId
            </span>
            , separate from your login identity.
          </p>
        </div>

        <div className="mt-space-lg text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            Already have an account?
            <Link
              className="text-primary dark:text-primary-fixed-dim font-medium hover:underline ml-1"
              to="/login"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
