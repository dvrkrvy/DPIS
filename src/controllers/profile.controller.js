const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Assessment = require('../models/Assessment');
const UserIdentity = require('../models/UserIdentity');

const sanitizeStringList = (val, maxItems = 12, maxLen = 60) => {
    const rawList = Array.isArray(val)
        ? val
        : typeof val === 'string'
        ? val.split(',')
        : [];
    const seen = new Set();
    const out = [];
    for (const item of rawList) {
        if (typeof item !== 'string') continue;
        const clean = item.trim().slice(0, maxLen);
        if (!clean) continue;
        const lower = clean.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        out.push(clean);
        if (out.length >= maxItems) break;
    }
    return out;
};

const isValidAvatarUrl = (val) => {
    if (!val) return true;
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return true;
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
        return trimmed.length <= 1000;
    }
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
        return trimmed.length <= 600000;
    }
    return false;
};

const buildProfilePayload = (targetUser, { isSelf = false, isCritical = false, treatedStats = null, viewerRole = null }) => {
    const p = targetUser.profile || {};
    const base = {
        id: targetUser._id,
        role: targetUser.role,
        fullName: targetUser.fullName,
        avatarUrl: p.avatarUrl || '',
        age: p.age ?? null,
        gender: p.gender || '',
        bio: p.bio || '',
        orgName: targetUser.orgId?.name || '',
        updatedAt: targetUser.updatedAt,
    };

    if (isSelf) {
        base.email = targetUser.email;
    }

    if (targetUser.role === 'USER') {
        base.anonymousId = targetUser.anonymousId;
        base.yearOrDepartment = p.yearOrDepartment || '';
        if (!isSelf && viewerRole === 'DOCTOR') {
            base.isCritical = Boolean(isCritical);
            if (isCritical) {
                base.email = targetUser.email;
            }
            if (treatedStats) {
                base.completedSessionsWithYou = treatedStats.completed;
                base.totalSessionsWithYou = treatedStats.total;
            }
        }
        return base;
    }

    if (targetUser.role === 'DOCTOR') {
        base.specialization = p.specialization || '';
        base.education = p.education || '';
        base.yearsOfExperience = p.yearsOfExperience ?? null;
        base.licenseNumber = p.licenseNumber || '';
        base.languages = Array.isArray(p.languages) ? p.languages : [];
        base.areasOfExpertise = Array.isArray(p.areasOfExpertise) ? p.areasOfExpertise : [];
        base.consultationHours = p.consultationHours || '';
        return base;
    }

    return base;
};

/**
 * GET /api/profile/me
 * Returns the authenticated student or doctor's own editable profile.
 */
const getMyProfile = async (req, res) => {
    try {
        const user = await UserIdentity.findById(req.user.userId)
            .populate('orgId', 'name type')
            .select('-passwordHash -googleAuth');

        if (!user) {
            return res.status(404).json({ message: 'User account not found' });
        }

        return res.json({
            profile: buildProfilePayload(user, { isSelf: true, viewerRole: req.user.role }),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load profile', error: err.message });
    }
};

/**
 * PUT /api/profile/me
 * Allows authenticated USER (limited fields) or DOCTOR (full clinical fields) to edit their own profile.
 */
const updateMyProfile = async (req, res) => {
    try {
        const user = await UserIdentity.findById(req.user.userId).populate('orgId', 'name type');
        if (!user) {
            return res.status(404).json({ message: 'User account not found' });
        }

        const {
            fullName,
            avatarUrl,
            age,
            gender,
            bio,
            yearOrDepartment,
            specialization,
            education,
            yearsOfExperience,
            licenseNumber,
            languages,
            areasOfExpertise,
            consultationHours,
        } = req.body || {};

        if (fullName !== undefined) {
            const cleanName = String(fullName).trim();
            if (cleanName.length < 2 || cleanName.length > 100) {
                return res.status(400).json({ message: 'Full name must be between 2 and 100 characters' });
            }
            user.fullName = cleanName;
        }

        if (!user.profile) {
            user.profile = {};
        }

        if (avatarUrl !== undefined) {
            if (!isValidAvatarUrl(avatarUrl)) {
                return res.status(400).json({
                    message: 'Profile photo must be a valid image URL or uploaded PNG/JPEG/WEBP/GIF image under 450 KB',
                });
            }
            user.profile.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
        }

        if (age !== undefined) {
            if (age === null || age === '') {
                user.profile.age = null;
            } else {
                const numAge = Number(age);
                if (!Number.isInteger(numAge) || numAge < 13 || numAge > 120) {
                    return res.status(400).json({ message: 'Age must be a whole number between 13 and 120' });
                }
                user.profile.age = numAge;
            }
        }

        if (gender !== undefined) {
            user.profile.gender = String(gender || '').trim().slice(0, 40);
        }

        if (user.role === 'USER') {
            if (bio !== undefined) {
                user.profile.bio = String(bio || '').trim().slice(0, 250);
            }
            if (yearOrDepartment !== undefined) {
                user.profile.yearOrDepartment = String(yearOrDepartment || '').trim().slice(0, 100);
            }
        } else if (user.role === 'DOCTOR') {
            if (bio !== undefined) {
                user.profile.bio = String(bio || '').trim().slice(0, 800);
            }
            if (specialization !== undefined) {
                user.profile.specialization = String(specialization || '').trim().slice(0, 150);
            }
            if (education !== undefined) {
                user.profile.education = String(education || '').trim().slice(0, 400);
            }
            if (yearsOfExperience !== undefined) {
                if (yearsOfExperience === null || yearsOfExperience === '') {
                    user.profile.yearsOfExperience = null;
                } else {
                    const numExp = Number(yearsOfExperience);
                    if (!Number.isFinite(numExp) || numExp < 0 || numExp > 80) {
                        return res.status(400).json({ message: 'Years of experience must be between 0 and 80' });
                    }
                    user.profile.yearsOfExperience = Math.round(numExp);
                }
            }
            if (licenseNumber !== undefined) {
                user.profile.licenseNumber = String(licenseNumber || '').trim().slice(0, 80);
            }
            if (languages !== undefined) {
                user.profile.languages = sanitizeStringList(languages, 10, 40);
            }
            if (areasOfExpertise !== undefined) {
                user.profile.areasOfExpertise = sanitizeStringList(areasOfExpertise, 15, 60);
            }
            if (consultationHours !== undefined) {
                user.profile.consultationHours = String(consultationHours || '').trim().slice(0, 120);
            }
        }

        user.markModified('profile');
        await user.save();

        return res.json({
            message: 'Profile updated successfully',
            profile: buildProfilePayload(user, { isSelf: true, viewerRole: req.user.role }),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update profile', error: err.message });
    }
};

/**
 * GET /api/profile/:targetId
 * Strictly enforces DPIS profile access rules:
 * - ADMIN: cannot view student profiles (403).
 * - USER (student): can view DOCTOR profiles or their own profile only (never another student's).
 * - DOCTOR: can view DOCTOR profiles or student profiles ONLY for students treated/in-care by this doctor.
 */
const getProfileById = async (req, res) => {
    try {
        const { targetId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({ message: 'Invalid profile identifier' });
        }

        const targetUser = await UserIdentity.findById(targetId)
            .populate('orgId', 'name type')
            .select('-passwordHash -googleAuth');

        if (!targetUser) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        if (targetUser.role === 'ADMIN') {
            return res.status(403).json({ message: 'Administrator accounts do not expose public profiles' });
        }

        const viewerRole = req.user.role;
        const isSelf = String(targetUser._id) === String(req.user.userId);

        if (viewerRole === 'ADMIN') {
            if (targetUser.role === 'USER') {
                return res.status(403).json({
                    message: 'Privacy Violation: Administrators are strictly prohibited from viewing student profiles.',
                });
            }
            // Allow viewing Doctor profiles only
            return res.json({
                profile: buildProfilePayload(targetUser, { isSelf: false, viewerRole }),
            });
        }

        if (viewerRole === 'USER') {
            if (!isSelf && targetUser.role !== 'DOCTOR') {
                return res.status(403).json({
                    message: 'Access denied. Students can only view clinician profiles or their own profile.',
                });
            }
            return res.json({
                profile: buildProfilePayload(targetUser, { isSelf, viewerRole }),
            });
        }

        if (viewerRole === 'DOCTOR') {
            if (targetUser.role === 'DOCTOR') {
                return res.json({
                    profile: buildProfilePayload(targetUser, { isSelf, viewerRole }),
                });
            }

            // targetUser.role === 'USER' -> Verify treated/active session relationship with THIS doctor
            const sessions = await Appointment.find({
                studentId: targetUser._id,
                doctorId: req.user.userId,
                status: { $in: ['COMPLETED', 'SCHEDULED', 'RESCHEDULED'] },
            }).select('status');

            if (sessions.length === 0) {
                return res.status(403).json({
                    message: 'Access denied. You can only view profiles of students treated or currently counseled by you.',
                });
            }

            const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;
            const hasCriticalAssessment = Boolean(
                await Assessment.exists({
                    userId: targetUser._id,
                    severityTier: 'CRITICAL',
                })
            );

            return res.json({
                profile: buildProfilePayload(targetUser, {
                    isSelf: false,
                    isCritical: hasCriticalAssessment,
                    treatedStats: {
                        completed: completedCount,
                        total: sessions.length,
                    },
                    viewerRole,
                }),
            });
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load profile', error: err.message });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    getProfileById,
};
