const UserIdentity = require('../models/UserIdentity');
const {
    isGoogleOAuthConfigured,
    getRedirectUri,
    verifyOAuthState,
    buildGoogleAuthUrl,
    exchangeCodeForTokens,
    fetchGoogleUserEmail,
} = require('../services/googleMeet.service');

const sanitizeOrigin = (rawOrigin) => {
    if (!rawOrigin || typeof rawOrigin !== 'string') return 'http://localhost:5173';
    try {
        const parsed = new URL(rawOrigin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.origin;
        }
    } catch {
        // ignore invalid origin
    }
    return 'http://localhost:5173';
};

const getGoogleStatus = async (req, res) => {
    try {
        const configured = isGoogleOAuthConfigured();
        const doctor = await UserIdentity.findById(req.user.userId).select(
            'googleAuth.email +googleAuth.refreshToken +googleAuth.accessToken'
        );
        const connected = Boolean(doctor?.googleAuth?.refreshToken || doctor?.googleAuth?.accessToken);

        return res.json({
            configured,
            connected,
            googleEmail: connected ? doctor?.googleAuth?.email || null : null,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to inspect Google Meet status', error: err.message });
    }
};

const getGoogleAuthUrl = async (req, res) => {
    try {
        if (!isGoogleOAuthConfigured()) {
            return res.status(400).json({
                code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
                message: 'Google OAuth credentials are not configured in server .env',
            });
        }

        const origin = sanitizeOrigin(req.query.origin || req.get('origin'));
        const url = buildGoogleAuthUrl(req, req.user.userId, origin);
        return res.json({ url });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to build Google OAuth URL', error: err.message });
    }
};

const handleGoogleCallback = async (req, res) => {
    const { code, state, error } = req.query;
    let redirectOrigin = 'http://localhost:5173';

    try {
        if (!state) {
            return res.redirect(`${redirectOrigin}/dashboard?google=error&reason=missing_state`);
        }

        const decoded = verifyOAuthState(String(state));
        redirectOrigin = sanitizeOrigin(decoded.redirectOrigin);

        if (error) {
            return res.redirect(`${redirectOrigin}/dashboard?google=error&reason=${encodeURIComponent(String(error))}`);
        }

        if (!code) {
            return res.redirect(`${redirectOrigin}/dashboard?google=error&reason=missing_code`);
        }

        const redirectUri = getRedirectUri(req);
        const tokens = await exchangeCodeForTokens(String(code), redirectUri);
        const email = await fetchGoogleUserEmail(tokens.access_token);
        const expiry = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000);

        const doctor = await UserIdentity.findById(decoded.userId).select('+googleAuth.refreshToken');
        if (!doctor || doctor.role !== 'DOCTOR') {
            return res.redirect(`${redirectOrigin}/dashboard?google=error&reason=unauthorized`);
        }

        doctor.googleAuth = {
            email: email || doctor.email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || doctor.googleAuth?.refreshToken || null,
            tokenExpiry: expiry,
        };
        await doctor.save();

        return res.redirect(`${redirectOrigin}/dashboard?google=connected`);
    } catch (err) {
        return res.redirect(
            `${redirectOrigin}/dashboard?google=error&reason=${encodeURIComponent(err.message || 'oauth_failed')}`
        );
    }
};

const disconnectGoogle = async (req, res) => {
    try {
        await UserIdentity.findByIdAndUpdate(req.user.userId, {
            $set: {
                googleAuth: {
                    email: null,
                    accessToken: null,
                    refreshToken: null,
                    tokenExpiry: null,
                },
            },
        });
        return res.json({ message: 'Google account disconnected' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to disconnect Google account', error: err.message });
    }
};

module.exports = {
    getGoogleStatus,
    getGoogleAuthUrl,
    handleGoogleCallback,
    disconnectGoogle,
};
