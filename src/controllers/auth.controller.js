const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserIdentity = require('../models/UserIdentity');
const Organization = require('../models/Organization');
const { normalizeEmailDomain } = require('../utils/domain');

const register = async (req, res) => {
    try {
        const { email, password, fullName, role, orgId, inviteCode } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'email, password, and fullName are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await UserIdentity.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const userRole = role || 'USER';
        let validOrgId = null;

        if (userRole === 'USER') {
            const domain = normalizeEmailDomain(normalizedEmail);
            if (!domain) {
                return res.status(400).json({ message: 'Please provide a valid company or university email address' });
            }

            const domainOrg = await Organization.findOne({ emailDomain: domain });

            if (inviteCode && String(inviteCode).trim()) {
                const inviteOrg = await Organization.findOne({
                    inviteCode: String(inviteCode).toUpperCase().trim(),
                });
                if (!inviteOrg) {
                    return res.status(404).json({ message: 'Invalid organization invite code' });
                }
                if (inviteOrg.emailDomain && inviteOrg.emailDomain !== domain) {
                    return res.status(400).json({
                        message: `Please use your @${inviteOrg.emailDomain} company or university email to join ${inviteOrg.name}.`,
                    });
                }
                validOrgId = inviteOrg._id;
            } else if (domainOrg) {
                validOrgId = domainOrg._id;
            } else if (orgId) {
                const fallbackOrg = await Organization.findById(orgId);
                if (!fallbackOrg) {
                    return res.status(404).json({ message: 'Organization not found' });
                }
                validOrgId = fallbackOrg._id;
            } else {
                return res.status(404).json({
                    message: `This institution (@${domain}) is not part of DPIS yet. Please register with your enrolled company or university email.`,
                });
            }
        } else {
            if (inviteCode && String(inviteCode).trim()) {
                const org = await Organization.findOne({
                    inviteCode: String(inviteCode).toUpperCase().trim(),
                });
                if (!org) {
                    return res.status(404).json({ message: 'Invalid organization invite code' });
                }
                validOrgId = org._id;
            } else if (orgId) {
                const org = await Organization.findById(orgId);
                if (!org) {
                    return res.status(404).json({ message: 'Organization not found' });
                }
                validOrgId = org._id;
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await UserIdentity.create({
            email: normalizedEmail,
            passwordHash,
            fullName,
            role: userRole,
            orgId: validOrgId,
        });

        if (userRole === 'DOCTOR') {
            await Organization.updateMany({}, { $addToSet: { assignedDoctors: user._id } });
        }

        return res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                orgId: user.orgId,
                anonymousId: user.anonymousId,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }

        const user = await UserIdentity.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role === 'ADMIN' && !user.orgId) {
            let ownedOrg = await Organization.findOne({ createdBy: user._id });
            if (!ownedOrg && user.email) {
                const domain = normalizeEmailDomain(user.email);
                if (domain) {
                    ownedOrg = await Organization.findOne({ emailDomain: domain });
                }
            }
            if (ownedOrg) {
                user.orgId = ownedOrg._id;
                await user.save();
                if (!ownedOrg.createdBy) {
                    ownedOrg.createdBy = user._id;
                    await ownedOrg.save();
                }
            }
        }

        if (user.role === 'DOCTOR') {
            await Organization.updateMany(
                { assignedDoctors: { $ne: user._id } },
                { $addToSet: { assignedDoctors: user._id } }
            );
        }

        const token = jwt.sign(
            {
                userId: user._id,
                anonymousId: user.anonymousId,
                orgId: user.orgId,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                orgId: user.orgId,
                anonymousId: user.anonymousId,
                avatarUrl: user.profile?.avatarUrl || '',
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

const verifyInviteCode = async (req, res) => {
    try {
        const code = String(req.params.code || '').toUpperCase().trim();
        if (!code) {
            return res.status(400).json({ message: 'Invite code is required' });
        }

        const org = await Organization.findOne({ inviteCode: code }).select(
            '_id name type emailDomain inviteCode'
        );
        if (!org) {
            return res.status(404).json({ message: 'Invalid organization invite code' });
        }

        return res.json({ organization: org });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to verify invite code', error: err.message });
    }
};

const checkEmailDomain = async (req, res) => {
    try {
        const domain = normalizeEmailDomain(String(req.query.email || ''));
        if (!domain) {
            return res.status(400).json({ message: 'Please enter a valid company or university email' });
        }

        const org = await Organization.findOne({ emailDomain: domain }).select(
            '_id name type emailDomain inviteCode'
        );
        if (!org) {
            return res.status(404).json({
                message: `This institution (@${domain}) is not part of DPIS yet.`,
            });
        }

        return res.json({ organization: org });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to verify institution domain', error: err.message });
    }
};

const getOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find()
            .select('_id name type emailDomain')
            .sort({ name: 1 });
        return res.json({ organizations });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load organizations', error: err.message });
    }
};

module.exports = {
    register,
    login,
    verifyInviteCode,
    checkEmailDomain,
    getOrganizations,
};
