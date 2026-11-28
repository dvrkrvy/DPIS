import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/api';

const resizeImageToDataUrl = (file, maxSize = 320) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export default function ProfileEditModal({ isOpen, onClose, onSaved }) {
  const { user, updateSession } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    avatarUrl: '',
    age: '',
    gender: '',
    bio: '',
    yearOrDepartment: '',
    specialization: '',
    education: '',
    yearsOfExperience: '',
    licenseNumber: '',
    languages: '',
    areasOfExpertise: '',
    consultationHours: '',
    email: '',
    anonymousId: '',
    orgName: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSuccess('');

    profileApi
      .getMe()
      .then((data) => {
        if (cancelled) return;
        const p = data.profile || {};
        setForm({
          fullName: p.fullName || '',
          avatarUrl: p.avatarUrl || '',
          age: p.age ?? '',
          gender: p.gender || '',
          bio: p.bio || '',
          yearOrDepartment: p.yearOrDepartment || '',
          specialization: p.specialization || '',
          education: p.education || '',
          yearsOfExperience: p.yearsOfExperience ?? '',
          licenseNumber: p.licenseNumber || '',
          languages: Array.isArray(p.languages) ? p.languages.join(', ') : '',
          areasOfExpertise: Array.isArray(p.areasOfExpertise) ? p.areasOfExpertise.join(', ') : '',
          consultationHours: p.consultationHours || '',
          email: p.email || user?.email || '',
          anonymousId: p.anonymousId || user?.anonymousId || '',
          orgName: p.orgName || '',
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.email, user?.anonymousId]);

  if (!isOpen) return null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }
    setError('');
    try {
      const dataUrl = await resizeImageToDataUrl(file, 320);
      setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err) {
      setError(err.message || 'Could not process image');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: form.fullName,
        avatarUrl: form.avatarUrl,
        age: form.age === '' ? null : Number(form.age),
        gender: form.gender,
        bio: form.bio,
      };

      if (isDoctor) {
        payload.specialization = form.specialization;
        payload.education = form.education;
        payload.yearsOfExperience = form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience);
        payload.licenseNumber = form.licenseNumber;
        payload.languages = form.languages;
        payload.areasOfExpertise = form.areasOfExpertise;
        payload.consultationHours = form.consultationHours;
      } else {
        payload.yearOrDepartment = form.yearOrDepartment;
      }

      const data = await profileApi.updateMe(payload);
      const updated = data.profile;

      updateSession({
        user: {
          ...user,
          fullName: updated.fullName,
          avatarUrl: updated.avatarUrl || '',
        },
      });

      onSaved?.(updated);
      setSuccess('Profile saved successfully.');
      window.dispatchEvent(new CustomEvent('dpis:profile-updated', { detail: updated }));
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl ${
          isDoctor ? 'h-[min(88vh,690px)]' : 'h-[min(88vh,570px)]'
        } rounded-2xl bg-surface-container-lowest dark:bg-tertiary border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/50 flex items-center justify-between bg-surface-container-low/70 dark:bg-surface-container">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[22px]">
              {isDoctor ? 'medical_information' : 'account_circle'}
            </span>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface dark:text-inverse-on-surface">
                {isDoctor ? 'Edit Clinician Profile' : 'Edit Student Profile'}
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                {isDoctor
                  ? 'Visible to students and patients you treat in DPIS counseling'
                  : 'Limited profile visible only to yourself and doctors treating you'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile editor"
            className="w-9 h-9 rounded-lg bg-surface-container-high dark:bg-tertiary hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading profile">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/50">
                  <div className="w-20 h-20 rounded-full bg-surface-container-high dark:bg-tertiary shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-8 w-32 rounded-lg bg-surface-container-high dark:bg-tertiary" />
                    <div className="h-4 w-48 rounded bg-surface-container-high dark:bg-tertiary" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-6 h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                  <div className="sm:col-span-3 h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                  <div className="sm:col-span-3 h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                </div>
                <div className="h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                <div className="h-24 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                {isDoctor && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                      <div className="h-14 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                    </div>
                    <div className="h-20 rounded-lg bg-surface-container-low dark:bg-surface-container" />
                  </>
                )}
              </div>
            ) : (
              <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{success}</span>
                </div>
              )}

              {/* Avatar & Identity Row */}
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant/50">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#33452f] dark:bg-[#3f573a] text-white flex items-center justify-center text-2xl font-bold shrink-0 border-2 border-primary/40">
                  {form.avatarUrl ? (
                    <img
                      src={form.avatarUrl}
                      alt={form.fullName || 'Profile avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (form.fullName?.[0] || user?.fullName?.[0] || 'U').toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      <span>Upload Photo</span>
                    </button>
                    {form.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, avatarUrl: '' }))}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high dark:bg-tertiary text-on-surface dark:text-inverse-on-surface border border-outline-variant/60 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {!isDoctor && form.anonymousId && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim font-semibold">
                        ID: {form.anonymousId}
                      </span>
                    )}
                    {form.orgName && <span>{form.orgName}</span>}
                    {form.email && <span>· {form.email}</span>}
                  </div>
                </div>
              </div>

              {/* Generic Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                    {isDoctor ? 'Clinician Full Name' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={13}
                    max={120}
                    value={form.age}
                    onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="e.g. 22"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Student Limited Fields vs Doctor Rich Clinical Fields */}
              {!isDoctor ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                      Academic Year / Department (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={form.yearOrDepartment}
                      onChange={(e) => setForm((prev) => ({ ...prev, yearOrDepartment: e.target.value }))}
                      placeholder="e.g. 3rd Year Computer Science"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                        Short Bio / Wellness Context
                      </label>
                      <span className="text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                        {form.bio.length}/250
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={250}
                      value={form.bio}
                      onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                      placeholder="Brief personal background or anything helpful for your treating clinician..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary dark:text-primary-fixed-dim shrink-0 mt-0.5">
                      shield_lock
                    </span>
                    <span>
                      Privacy protected: Administrators and other students can never view your profile. Only clinicians treating you can inspect these details.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        Specialization / Clinical Title
                      </label>
                      <input
                        type="text"
                        maxLength={150}
                        value={form.specialization}
                        onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                        placeholder="e.g. Clinical Psychologist & CBT Specialist"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={form.yearsOfExperience}
                        onChange={(e) => setForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
                        placeholder="e.g. 8"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                      Education & Qualifications
                    </label>
                    <input
                      type="text"
                      maxLength={400}
                      value={form.education}
                      onChange={(e) => setForm((prev) => ({ ...prev, education: e.target.value }))}
                      placeholder="e.g. Ph.D. Clinical Psychology (NIMHANS), M.A. Counseling Psychology"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        License / Registration Number
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={form.licenseNumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="e.g. RCI-A48291"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        Consultation Hours
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.consultationHours}
                        onChange={(e) => setForm((prev) => ({ ...prev, consultationHours: e.target.value }))}
                        placeholder="e.g. Daily · 05:00 PM – 08:00 PM"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        Languages Spoken (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={form.languages}
                        onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
                        placeholder="e.g. English, Hindi, Tamil"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface dark:text-inverse-on-surface mb-1">
                        Areas of Expertise (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={form.areasOfExpertise}
                        onChange={(e) => setForm((prev) => ({ ...prev, areasOfExpertise: e.target.value }))}
                        placeholder="e.g. CBT, Anxiety, Trauma, Sleep"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                        Clinical Bio & Therapeutic Approach
                      </label>
                      <span className="text-[10px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                        {form.bio.length}/800
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={800}
                      value={form.bio}
                      onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                      placeholder="Describe your counseling philosophy, background, and how you support students..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-xs text-on-surface dark:text-inverse-on-surface"
                    />
                  </div>
                </div>
              )}
            </>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="px-6 py-3.5 border-t border-outline-variant/40 flex items-center justify-end gap-2 bg-surface-container-low/40 dark:bg-surface-container/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-container text-on-surface dark:text-inverse-on-surface text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="px-4 py-2 rounded-lg bg-[#33452f] hover:bg-[#4a5d45] disabled:opacity-50 dark:bg-[#3f573a] dark:hover:bg-[#4e6b48] text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
