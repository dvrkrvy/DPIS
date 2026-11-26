import { useEffect, useState } from 'react';
import wellnessLogo from '../logos/DPIS Digital Wellness Logo.png';
import { healthCheck } from '../services/api';

export default function Footer() {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    healthCheck()
      .then((res) => {
        if (active && res?.status === 'ok') {
          setApiStatus('online');
        }
      })
      .catch(() => {
        if (active) setApiStatus('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="w-full bg-surface-container-low dark:bg-inverse-surface border-t border-outline-variant/40 py-space-xl transition-colors">
      <div className="max-w-7xl mx-auto px-margin flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant dark:text-tertiary-fixed-dim font-body-sm text-body-sm">
        <div className="flex items-center gap-space-md">
          <img
            alt="DPIS Digital Psychological Intervention System"
            className="h-11 w-auto rounded-lg object-contain shadow-sm"
            src={wellnessLogo}
          />
          <p>© 2025 DPIS (Digital Psychological Intervention System). All rights reserved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <p>Non-diagnostic organizational well-being &amp; psychological screening platform.</p>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high dark:bg-tertiary font-label-sm text-label-sm"
            title="Live backend connection status (/health)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus === 'online'
                  ? 'bg-emerald-600'
                  : apiStatus === 'offline'
                  ? 'bg-error'
                  : 'bg-outline animate-pulse'
              }`}
            />
            {apiStatus === 'online'
              ? 'API Connected'
              : apiStatus === 'offline'
              ? 'API Offline'
              : 'Checking API'}
          </span>
        </div>
      </div>
    </footer>
  );
}
