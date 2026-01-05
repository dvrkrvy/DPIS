import React from 'react';

// Professional mental health and wellness SVGs
export const WellnessIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#gradient1)" opacity="0.2"/>
    <path d="M50 30 L55 45 L70 45 L58 55 L63 70 L50 60 L37 70 L42 55 L30 45 L45 45 Z" fill="url(#gradient1)"/>
    <defs>
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

export const SupportIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#gradient2)" opacity="0.2"/>
    <circle cx="35" cy="40" r="8" fill="url(#gradient2)"/>
    <circle cx="65" cy="40" r="8" fill="url(#gradient2)"/>
    <path d="M30 65 Q50 75 70 65" stroke="url(#gradient2)" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <defs>
      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  </svg>
);

export const AnalyticsIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="50" width="15" height="30" fill="url(#gradient3)"/>
    <rect x="42.5" y="35" width="15" height="45" fill="url(#gradient3)"/>
    <rect x="65" y="20" width="15" height="60" fill="url(#gradient3)"/>
    <defs>
      <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

export const ResourcesIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="20" width="50" height="60" rx="3" fill="url(#gradient4)" opacity="0.2" stroke="url(#gradient4)" strokeWidth="2"/>
    <line x1="35" y1="35" x2="65" y2="35" stroke="url(#gradient4)" strokeWidth="3" strokeLinecap="round"/>
    <line x1="35" y1="50" x2="65" y2="50" stroke="url(#gradient4)" strokeWidth="3" strokeLinecap="round"/>
    <line x1="35" y1="65" x2="55" y2="65" stroke="url(#gradient4)" strokeWidth="3" strokeLinecap="round"/>
    <defs>
      <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
    </defs>
  </svg>
);

export const ForumIcon = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="25" width="60" height="45" rx="5" fill="url(#gradient5)" opacity="0.2" stroke="url(#gradient5)" strokeWidth="2"/>
    <circle cx="35" cy="40" r="3" fill="url(#gradient5)"/>
    <circle cx="50" cy="40" r="3" fill="url(#gradient5)"/>
    <circle cx="65" cy="40" r="3" fill="url(#gradient5)"/>
    <path d="M35 55 L50 65 L65 55" stroke="url(#gradient5)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <defs>
      <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
  </svg>
);

export const DashboardHero = ({ className = "w-full h-64" }) => (
  <svg className={className} viewBox="0 0 1200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1"/>
        <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1"/>
      </linearGradient>
      <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.3"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="300" fill="url(#heroGradient)"/>
    <path d="M0,150 Q300,100 600,150 T1200,150 L1200,300 L0,300 Z" fill="url(#wave1)" opacity="0.5"/>
    <circle cx="200" cy="80" r="40" fill="#6366f1" opacity="0.2"/>
    <circle cx="1000" cy="220" r="60" fill="#0ea5e9" opacity="0.2"/>
    <circle cx="900" cy="80" r="30" fill="#8b5cf6" opacity="0.2"/>
  </svg>
);

// Background pattern for professional look
export const AccenturePattern = ({ className = "absolute inset-0 opacity-5" }) => (
  <svg className={className} width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6366f1" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);
