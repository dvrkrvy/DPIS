import { useEffect, useState } from 'react';
import { profileApi } from '../services/api';

export default function ProfileViewModal({ isOpen, targetUserId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);

    profileApi
      .getById(targetUserId)
      .then((data) => {
        if (!cancelled) setProfile(data.profile || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetUserId]);

  if (!isOpen) return null;

  const isDoctorProfile = profile?.role === 'DOCTOR';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg h-[min(84vh,540px)] rounded-2xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-outline-variant/50 flex items-center justify-between bg-surface-container-low/70 dark:bg-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[20px]">
              {isDoctorProfile ? 'medical_services' : 'person'}
            </span>
            <h2 className="font-headline-sm text-sm font-bold text-on-surface dark:text-inverse-on-surface">
              {profile ? (isDoctorProfile ? 'Clinician Profile' : 'Student Profile') : 'Profile'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile view"
            className="w-8 h-8 rounded-lg bg-surface-container-high dark:bg-tertiary hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading profile">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-container-high dark:bg-surface-container shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-44 rounded bg-surface-container-high dark:bg-surface-container" />
                  <div className="h-3.5 w-32 rounded bg-surface-container-low dark:bg-surface-container" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-16 rounded-full bg-surface-container-low dark:bg-surface-container" />
                    <div className="h-5 w-20 rounded-full bg-surface-container-low dark:bg-surface-container" />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant/40 space-y-3">
                <div className="h-16 rounded-xl bg-surface-container-low dark:bg-surface-container" />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-14 rounded-xl bg-surface-container-low dark:bg-surface-container" />
                  <div className="h-14 rounded-xl bg-surface-container-low dark:bg-surface-container" />
                </div>
                <div className="h-24 rounded-xl bg-surface-container-low dark:bg-surface-container" />
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>{error}</span>
            </div>
          ) : profile ? (
            <>
              {/* Hero Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#33452f] dark:bg-[#3f573a] text-white flex items-center justify-center text-xl font-bold shrink-0 border-2 border-primary/40">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (profile.fullName?.[0] || 'U').toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-headline-sm text-lg font-bold text-on-surface dark:text-inverse-on-surface truncate">
                      {isDoctorProfile ? `Dr. ${profile.fullName}` : profile.fullName}
                    </h3>
                    {profile.isCritical && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        CRITICAL CARE
                      </span>
                    )}
                  </div>

                  {isDoctorProfile ? (
                    <p className="text-xs font-medium text-primary dark:text-primary-fixed-dim mt-0.5">
                      {profile.specialization || 'Licensed Mental Health Clinician'}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant dark:text-tertiary-fixed-dim mt-0.5">
                      {profile.anonymousId}
                      {profile.orgName ? ` · ${profile.orgName}` : ''}
                    </p>
                  )}

                  {/* Quick Demographic Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {profile.age !== null && profile.age !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 text-on-surface dark:text-inverse-on-surface">
                        Age {profile.age}
                      </span>
                    )}
                    {profile.gender && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 text-on-surface dark:text-inverse-on-surface">
                        {profile.gender}
                      </span>
                    )}
                    {isDoctorProfile && profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary dark:text-primary-fixed-dim font-semibold">
                        {profile.yearsOfExperience}+ yrs experience
                      </span>
                    )}
                    {!isDoctorProfile && profile.yearOrDepartment && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 text-on-surface dark:text-inverse-on-surface">
                        {profile.yearOrDepartment}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctor Extended Details */}
              {isDoctorProfile ? (
                <div className="space-y-3 pt-2 border-t border-outline-variant/40">
                  {profile.education && (
                    <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/40">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-[15px]">school</span>
                        <span>Education & Qualifications</span>
                      </div>
                      <p className="text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed">
                        {profile.education}
                      </p>
                    </div>
                  )}

                  {(profile.licenseNumber || profile.consultationHours) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {profile.licenseNumber && (
                        <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/40">
                          <div className="text-[10px] font-bold uppercase text-on-surface-variant dark:text-tertiary-fixed-dim">
                            License / Registration
                          </div>
                          <div className="text-xs font-semibold text-on-surface dark:text-inverse-on-surface mt-0.5">
                            {profile.licenseNumber}
                          </div>
                        </div>
                      )}
                      {profile.consultationHours && (
                        <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/40">
                          <div className="text-[10px] font-bold uppercase text-on-surface-variant dark:text-tertiary-fixed-dim">
                            Consultation Hours
                          </div>
                          <div className="text-xs font-semibold text-on-surface dark:text-inverse-on-surface mt-0.5">
                            {profile.consultationHours}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {profile.areasOfExpertise?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1.5">
                        Areas of Expertise
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.areasOfExpertise.map((area) => (
                          <span
                            key={area}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary dark:text-primary-fixed-dim border border-primary/20"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.languages?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1.5">
                        Languages Spoken
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.languages.map((lang) => (
                          <span
                            key={lang}
                            className="px-2.5 py-1 rounded-full text-[11px] bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 text-on-surface dark:text-inverse-on-surface"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1">
                      About & Clinical Approach
                    </div>
                    <p className="text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed whitespace-pre-wrap">
                      {profile.bio || 'No clinical biography added yet.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Student Limited Profile Details (Treated by doctor only) */
                <div className="space-y-3 pt-2 border-t border-outline-variant/40">
                  {profile.totalSessionsWithYou !== undefined && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/40">
                        <div className="text-[10px] font-bold uppercase text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Sessions With You
                        </div>
                        <div className="text-sm font-bold text-on-surface dark:text-inverse-on-surface mt-0.5">
                          {profile.totalSessionsWithYou}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/40">
                        <div className="text-[10px] font-bold uppercase text-on-surface-variant dark:text-tertiary-fixed-dim">
                          Completed Sessions
                        </div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {profile.completedSessionsWithYou}
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.email && (
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/25">
                      <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                        Critical Contact Email
                      </div>
                      <div className="text-xs font-medium text-on-surface dark:text-inverse-on-surface mt-0.5">
                        {profile.email}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-bold text-on-surface-variant dark:text-tertiary-fixed-dim mb-1">
                      Student Note
                    </div>
                    <p className="text-xs text-on-surface dark:text-inverse-on-surface leading-relaxed whitespace-pre-wrap">
                      {profile.bio || 'No additional student bio shared yet.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/40 flex justify-end bg-surface-container-low/40 dark:bg-surface-container/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
