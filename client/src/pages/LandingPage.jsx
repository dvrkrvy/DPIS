import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import stackedLogo from '../logos/DPIS Digital Psychology Logo.png';

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuByV4cwXu9ESM9cvMRr9aQdZTjZTcrq-KS0-ZNUqgZC_SMHqBj7By8OiVOHPhO1Cm-cYA4NDRj7wwvml07HUEhpNkM3Zq2c5GStzC0WGdoZIbQn67zae5CQr_viCrHtQ9Nck3SgB639d39kO2nqTh_T6DPmATHmX8jtPamvwhyZZEZYV4iSTvDdUnAUo-rTtGGA-uUL1xTrS62zrBurKpkxuMWP4gHKwvKN14f6Iso';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section: Asymmetric Editorial Split */}
      <section
        id="overview"
        className="relative w-full overflow-hidden bg-surface dark:bg-on-primary-fixed transition-colors"
      >
        {/* Subtle ambient organic glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-fixed/40 dark:bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-secondary-container/40 dark:bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-margin py-space-xl md:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
            {/* Left Column: Editorial Copy & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start gap-space-lg">
              {/* Non-diagnostic disclaimer badge */}
              <div className="inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-high dark:bg-tertiary text-on-surface-variant dark:text-primary-fixed-dim shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-primary dark:text-primary-fixed-dim">
                  verified_user
                </span>
                <span className="font-label-sm text-label-sm tracking-wide">
                  Preliminary screening indicators — not a medical diagnosis
                </span>
              </div>

              <h1 className="font-display-lg text-display-lg text-on-surface dark:text-inverse-on-surface max-w-2xl">
                Clarity and care for organizational well-being.
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-tertiary-fixed-dim max-w-xl">
                A calm, non-judgmental psychological screening platform for universities and companies. Monthly PHQ-9, GAD-7, and PSS-10 check-ins paired with privacy-first{' '}
                <span className="font-label-lg text-label-lg text-primary dark:text-primary-fixed-dim">
                  anonymousId
                </span>{' '}
                separation.
              </p>

              <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
                {isAuthenticated ? (
                  <Link
                    className="px-space-lg py-3 rounded-lg bg-[#33452f] text-white hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:text-white dark:hover:bg-[#4e6b48] font-label-lg text-label-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-space-sm"
                    to="/dashboard"
                  >
                    <span>Open Your Dashboard</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      className="px-space-lg py-3 rounded-lg bg-[#33452f] text-white hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:text-white dark:hover:bg-[#4e6b48] font-label-lg text-label-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-space-sm"
                      to="/register"
                    >
                      <span>Get Started</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                    <Link
                      className="px-space-lg py-3 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest dark:bg-tertiary dark:text-inverse-on-surface dark:hover:bg-tertiary-container font-label-lg text-label-lg transition-all duration-200"
                      to="/login"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Subtle Trust Metadata */}
              <div className="flex flex-wrap items-center gap-space-lg pt-space-md text-on-surface-variant dark:text-tertiary-fixed-dim font-body-sm text-body-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">
                    lock
                  </span>
                  <span>JWT Authenticated</span>
                </div>
                <span className="text-outline-variant dark:text-outline">/</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">
                    groups
                  </span>
                  <span>Built for 100+ member organizations</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Composition & Live Preview Card */}
            <div className="lg:col-span-5 relative flex flex-col gap-space-md">
              <div className="relative rounded-xl overflow-hidden shadow-xl bg-surface-container-lowest dark:bg-tertiary">
                <img
                  alt="A serene, sunlit university courtyard and modern minimalist wooden study lounge with warm beige sandstone walls, soft natural morning light filtering through olive trees, calm and inviting atmosphere, editorial architectural photography, muted sage and warm cream color palette."
                  className="w-full h-72 object-cover"
                  src={HERO_IMAGE_URL}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <div>
                    <p className="font-label-sm text-label-sm uppercase tracking-wider opacity-90">
                      Monthly Check-In
                    </p>
                    <p className="font-headline-sm text-headline-sm">PHQ-9 · GAD-7 · PSS-10</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-surface/90 text-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">spa</span>
                  </div>
                </div>
              </div>

              {/* Overlapping Tonal Metric Card */}
              <div className="lg:-ml-8 lg:-mt-10 relative z-20 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface p-space-lg shadow-lg flex items-center justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs min-w-0">
                  <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim uppercase tracking-wider">
                    Privacy Architecture
                  </span>
                  <p className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface truncate">
                    Identity &amp; Screening Decoupled
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                    Admins see aggregate trends, never personal names.
                  </p>
                </div>

                {/* Minimal Inline SVG Progress Ring */}
                <div className="shrink-0 relative w-14 h-14 flex items-center justify-center text-primary dark:text-primary-fixed-dim">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle
                      cx="28"
                      cy="28"
                      fill="none"
                      r="22"
                      stroke="currentColor"
                      strokeOpacity="0.18"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      fill="none"
                      r="22"
                      stroke="currentColor"
                      strokeDasharray="138.2"
                      strokeDashoffset="18"
                      strokeLinecap="round"
                      strokeWidth="4"
                    />
                  </svg>
                  <span className="absolute font-label-sm text-label-sm font-semibold">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Column Minimal Feature Grid for the Three Roles */}
      <section
        id="how-it-works"
        className="w-full bg-surface-container-low dark:bg-inverse-surface py-space-xl md:py-24 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-margin">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
            <div className="max-w-2xl">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
                01 / Role-Based Experience
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs">
                Tailored clarity for every member of your organization.
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim max-w-md">
              Each role operates within strict privacy boundaries, ensuring psychological safety while enabling timely, compassionate care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Role 1: Students & Employees */}
            <div className="group rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between gap-space-lg">
              <div className="flex flex-col gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">self_improvement</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim uppercase tracking-wider">
                    Individuals
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface mt-space-xs">
                    Students &amp; Employees
                  </h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Calm, unhurried monthly check-ins using validated PHQ-9, GAD-7, and PSS-10 instruments. Receive AI-guided weekly steps, curated well-being resources, and immediate crisis safety support whenever needed.
                </p>
              </div>
              <div className="flex flex-wrap gap-space-xs pt-space-sm">
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  PHQ-9 &amp; GAD-7
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  AI Weekly Steps
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Crisis Support
                </span>
              </div>
            </div>

            {/* Role 2: Organization Admins */}
            <div className="group rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between gap-space-lg">
              <div className="flex flex-col gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">analytics</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim uppercase tracking-wider">
                    Leadership
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface mt-space-xs">
                    Organization Admins
                  </h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Monitor macro-level well-being with aggregated analytics, severity tier breakdowns, and AI executive summaries. Data is strictly anonymized via{' '}
                  <span className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface">
                    anonymousId
                  </span>
                  —never names or emails.
                </p>
              </div>
              <div className="flex flex-wrap gap-space-xs pt-space-sm">
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Aggregated Trends
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Severity Tiers
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Zero PII
                </span>
              </div>
            </div>

            {/* Role 3: Assigned Clinicians */}
            <div className="group rounded-xl bg-surface-container-lowest dark:bg-tertiary p-space-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between gap-space-lg">
              <div className="flex flex-col gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-secondary-container dark:bg-primary-container text-on-secondary-container dark:text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">medical_services</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim uppercase tracking-wider">
                    Care Teams
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface mt-space-xs">
                    Assigned Clinicians
                  </h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                  Respond where it matters most with a priority triage queue sorted by severity and wait time. Access authorized patient contact visibility, manage case statuses, and record structured clinical notes.
                </p>
              </div>
              <div className="flex flex-wrap gap-space-xs pt-space-sm">
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Priority Triage
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Case Status
                </span>
                <span className="px-space-sm py-space-xs rounded-lg bg-surface-container dark:bg-on-primary-fixed text-on-surface-variant dark:text-primary-fixed-dim font-label-sm text-label-sm">
                  Clinical Notes
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works / Privacy-First Section */}
      <section
        id="privacy"
        className="w-full bg-surface dark:bg-on-primary-fixed py-space-xl md:py-24 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-margin">
          <div className="text-center max-w-2xl mx-auto mb-space-xl">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary dark:text-primary-fixed-dim">
              02 / Privacy-First Architecture
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface mt-space-xs">
              How DPIS protects every participant.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim mt-space-sm">
              Designed from the ground up to separate personal identity from psychological screening data.
            </p>
          </div>

          {/* 3-Step Horizontal Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter relative">
            {/* Step 1 */}
            <div className="rounded-xl bg-surface-container-low dark:bg-tertiary p-space-lg flex flex-col gap-space-md relative">
              <div className="flex items-center justify-between">
                <span className="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim">
                  01
                </span>
                <span className="material-symbols-outlined text-[24px] text-primary dark:text-primary-fixed-dim">
                  key
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface">
                JWT Authentication
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                Users sign in securely via encrypted JSON Web Tokens. Role permissions are verified at every request without exposing session state.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl bg-surface-container-low dark:bg-tertiary p-space-lg flex flex-col gap-space-md relative">
              <div className="flex items-center justify-between">
                <span className="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim">
                  02
                </span>
                <span className="material-symbols-outlined text-[24px] text-primary dark:text-primary-fixed-dim">
                  shield_person
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface">
                anonymousId Separation
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                Screening responses are stored exclusively under an isolated{' '}
                <span className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface">
                  anonymousId
                </span>
                , keeping organizational analytics completely detached from personal identities.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl bg-surface-container-low dark:bg-tertiary p-space-lg flex flex-col gap-space-md relative">
              <div className="flex items-center justify-between">
                <span className="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim">
                  03
                </span>
                <span className="material-symbols-outlined text-[24px] text-primary dark:text-primary-fixed-dim">
                  favorite
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-inverse-on-surface">
                Non-Judgmental Support
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-tertiary-fixed-dim">
                Elevated indicators gently connect individuals to assigned clinicians and curated self-care steps, fostering trust without clinical stigma.
              </p>
            </div>
          </div>

          {/* Bottom Editorial Callout */}
          <div className="mt-space-xl rounded-xl bg-[#33452f] text-white dark:bg-primary-container dark:text-on-primary-container p-space-lg md:p-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg shadow-md">
            <div className="flex items-center gap-space-lg max-w-2xl">
              <img
                alt="DPIS Digital Psychological Intervention System"
                className="hidden sm:block h-20 w-20 rounded-xl bg-surface p-1 object-contain shadow-sm shrink-0"
                src={stackedLogo}
              />
              <div>
                <h3 className="font-headline-md text-headline-md">Ready to support your community?</h3>
                <p className="font-body-md text-body-md opacity-90 mt-space-xs">
                  Deploy DPIS across your university or organization with privacy-first psychological screening.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-md shrink-0">
              <Link
                className="px-space-lg py-3 rounded-lg bg-surface text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg transition-colors"
                to={isAuthenticated ? '/dashboard' : '/register'}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
