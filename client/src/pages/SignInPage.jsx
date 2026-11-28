import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import emblemLogo from '../logos/Nature-Tech Brain Emblem.png';

export default function SignInPage() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoNote, setInfoNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoNote('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError('Invalid email or password');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center py-space-xl">
      <div className="w-full max-w-[460px] flex flex-col gap-space-lg">
        <div className="flex items-center justify-between">
          <Link
            className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors"
            to="/"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </Link>
          <button
            aria-label="Toggle color theme"
            className="inline-flex items-center gap-space-sm px-3 py-1.5 rounded-full bg-surface-container dark:bg-tertiary text-on-surface-variant dark:text-tertiary-fixed-dim hover:bg-surface-container-high dark:hover:bg-tertiary-container transition-colors font-label-sm text-label-sm shadow-sm"
            onClick={toggleTheme}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>

        <div className="w-full bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 rounded-xl shadow-md p-space-xl flex flex-col gap-space-lg relative overflow-hidden transition-colors">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/5 dark:bg-primary-fixed/10 pointer-events-none" />

          <div className="flex flex-col items-center text-center gap-space-md relative">
            <Link
              className="w-12 h-12 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed flex items-center justify-center shadow-sm overflow-hidden"
              to="/"
            >
              <img alt="DPIS Logo" className="w-12 h-12 object-cover" src={emblemLogo} />
            </Link>
            <div className="flex flex-col gap-space-xs">
              <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface">
                Welcome back
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                Sign in to access your well-being portal
              </p>
            </div>
          </div>

          <form className="flex flex-col gap-space-md" noValidate onSubmit={handleSubmit}>
            <div className="flex flex-col gap-space-xs">
              <label
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                htmlFor="email"
              >
                Email address
              </label>
              <input
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.edu"
                type="email"
                value={email}
              />
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
                  htmlFor="password"
                >
                  Password
                </label>
                <button
                  className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim hover:text-primary-container transition-colors"
                  onClick={() =>
                    setInfoNote(
                      'Please contact your organization administrator to reset your password.'
                    )
                  }
                  type="button"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  autoComplete="current-password"
                  className="w-full pl-4 pr-11 py-3 rounded-lg bg-surface-container-low dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container dark:focus:bg-tertiary-container transition-colors"
                  id="password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-outline hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors flex items-center justify-center"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-space-sm px-3.5 py-2.5 rounded-lg bg-error-container/60 text-on-error-container font-body-sm text-body-sm"
                role="alert"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
                <span>{error}</span>
              </div>
            )}

            {infoNote && !error && (
              <div
                className="flex items-center gap-space-sm px-3.5 py-2.5 rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-tertiary-fixed-dim font-body-sm text-body-sm"
                role="status"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 text-primary dark:text-primary-fixed-dim">
                  info
                </span>
                <span>{infoNote}</span>
              </div>
            )}

            <button
              className="w-full mt-space-xs py-3 px-4 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white disabled:opacity-60 transition-colors font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-space-sm"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          <div className="flex flex-col items-center gap-space-sm pt-space-xs text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
              Don’t have an account?
              <Link
                className="font-label-lg text-label-lg text-primary dark:text-primary-fixed-dim hover:text-primary-container transition-colors ml-1"
                to="/register"
              >
                Register
              </Link>
            </p>
            <p className="font-label-sm text-label-sm text-outline dark:text-tertiary-fixed-dim/80">
              Role-based access (Student/Employee, Admin, Clinician) via secure JWT.
            </p>
          </div>
        </div>

        <div className="w-full rounded-xl bg-surface-container dark:bg-tertiary px-4 py-3.5 flex items-start gap-space-md transition-colors">
          <span
            className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px] shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            <span className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface">
              Privacy-first &amp; non-diagnostic.
            </span>{' '}
            Your responses are confidential, encrypted, and never used for clinical diagnosis without your explicit consent.
          </p>
        </div>
      </div>
    </div>
  );
}
