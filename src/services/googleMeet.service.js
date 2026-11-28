const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserIdentity = require('../models/UserIdentity');

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_EVENTS_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Checks whether Google OAuth 2.0 client credentials are configured.
 */
function isGoogleOAuthConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Resolves the OAuth callback URL cleanly (supporting Vite dev proxy on :5173).
 */
function getRedirectUri(req) {
    if (process.env.GOOGLE_REDIRECT_URI) {
        return process.env.GOOGLE_REDIRECT_URI;
    }
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${proto}://${host}/api/google/callback`;
}

/**
 * Signs a short-lived OAuth state JWT tying the callback to the initiating doctor.
 */
function signOAuthState(userId, redirectOrigin) {
    return jwt.sign(
        {
            userId: String(userId),
            redirectOrigin: redirectOrigin || 'http://localhost:5173',
            purpose: 'google_meet_oauth',
        },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );
}

/**
 * Verifies the OAuth state JWT returned by Google.
 */
function verifyOAuthState(stateToken) {
    const decoded = jwt.verify(stateToken, process.env.JWT_SECRET);
    if (!decoded || decoded.purpose !== 'google_meet_oauth' || !decoded.userId) {
        throw new Error('Invalid OAuth state');
    }
    return decoded;
}

/**
 * Builds the Google OAuth 2.0 consent URL requesting Calendar conference creation & email identity.
 */
function buildGoogleAuthUrl(req, userId, redirectOrigin) {
    const redirectUri = getRedirectUri(req);
    const state = signOAuthState(userId, redirectOrigin);
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
        state,
    });
    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
async function exchangeCodeForTokens(code, redirectUri) {
    const body = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });

    const resp = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(data.error_description || data.error || 'Failed to exchange Google OAuth code');
    }
    return data;
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
async function refreshGoogleAccessToken(refreshToken) {
    const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
    });

    const resp = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(data.error_description || data.error || 'Google session expired; reconnect Google account');
    }
    return data;
}

/**
 * Fetches the authenticated Google user's email address.
 */
async function fetchGoogleUserEmail(accessToken) {
    const resp = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.email || null;
}

/**
 * Returns a valid Google access token for the doctor, refreshing if needed.
 */
async function getValidDoctorGoogleAuth(doctorId) {
    const doctor = await UserIdentity.findById(doctorId).select(
        '+googleAuth.accessToken +googleAuth.refreshToken +googleAuth.tokenExpiry googleAuth.email'
    );

    if (!doctor || !doctor.googleAuth || (!doctor.googleAuth.refreshToken && !doctor.googleAuth.accessToken)) {
        return null;
    }

    const { accessToken, refreshToken, tokenExpiry, email } = doctor.googleAuth;
    const expiresAt = tokenExpiry ? new Date(tokenExpiry).getTime() : 0;

    // Refresh if expired or expiring within 60 seconds
    if (!accessToken || Date.now() > expiresAt - 60_000) {
        if (!refreshToken) {
            return null;
        }
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        const newAccessToken = refreshed.access_token;
        const newExpiry = new Date(Date.now() + (Number(refreshed.expires_in) || 3600) * 1000);

        doctor.googleAuth.accessToken = newAccessToken;
        doctor.googleAuth.tokenExpiry = newExpiry;
        if (refreshed.refresh_token) {
            doctor.googleAuth.refreshToken = refreshed.refresh_token;
        }
        await doctor.save();

        return { accessToken: newAccessToken, email };
    }

    return { accessToken, email };
}

/**
 * Creates a real Google Calendar conference event with a Google Meet room
 * owned by the doctor's Google account (making the doctor the Meet Host/Admin).
 * Does not include student PII in the calendar event.
 */
async function createGoogleMeetSession({ accessToken, appointment }) {
    const timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
    const startLocal = `${appointment.date}T${appointment.slotStart}:00`;
    const endLocal = `${appointment.date}T${appointment.slotEnd}:00`;

    const payload = {
        summary: 'DPIS Confidential Counseling Session',
        description: `DPIS 25-minute counseling consultation (${appointment.slot}). Privacy-protected session.`,
        start: {
            dateTime: startLocal,
            timeZone,
        },
        end: {
            dateTime: endLocal,
            timeZone,
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        conferenceData: {
            createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };

    const resp = await fetch(`${GOOGLE_CALENDAR_EVENTS_ENDPOINT}?conferenceDataVersion=1`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(data?.error?.message || 'Google Calendar API failed to generate Meet room');
    }

    const meetEntry = data?.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video');
    const meetingLink = data.hangoutLink || meetEntry?.uri;
    if (!meetingLink) {
        throw new Error('Google Calendar created the event, but no Google Meet link was returned');
    }

    const parsed = normalizeGoogleMeetUrl(meetingLink);
    return {
        meetingLink: parsed ? parsed.meetingLink : meetingLink,
        meetingCode: parsed ? parsed.meetingCode : data?.conferenceData?.conferenceId || '',
        googleEventId: data.id || '',
    };
}

/**
 * Validates and normalizes either a full https://meet.google.com/xxx-yyyy-zzz URL
 * or a bare Google Meet code (xxx-yyyy-zzz).
 */
function normalizeGoogleMeetUrl(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    // Allow bare code e.g. abc-defg-hij (letters/digits separated by hyphens)
    const bareCodeMatch = trimmed.match(/^([a-zA-Z0-9]{3,5}-[a-zA-Z0-9]{3,5}-[a-zA-Z0-9]{3,5})$/);
    if (bareCodeMatch) {
        const code = bareCodeMatch[1].toLowerCase();
        return {
            meetingLink: `https://meet.google.com/${code}`,
            meetingCode: code,
        };
    }

    let urlStr = trimmed;
    if (!/^https?:\/\//i.test(urlStr)) {
        urlStr = `https://${urlStr}`;
    }

    try {
        const parsed = new URL(urlStr);
        if (parsed.hostname !== 'meet.google.com') {
            return null;
        }
        const pathCode = parsed.pathname.replace(/^\/+|\/+$/g, '');
        if (!pathCode || pathCode.toLowerCase() === 'new') {
            return null;
        }
        return {
            meetingLink: `https://meet.google.com/${pathCode}`,
            meetingCode: pathCode,
        };
    } catch {
        return null;
    }
}

/**
 * Appends ?authuser=<email> for the doctor when opening Meet so Chrome pre-selects their Host Google account.
 */
function buildHostJoinUrl(meetingLink, hostEmail) {
    if (!meetingLink) return '';
    if (!hostEmail) return meetingLink;
    const sep = meetingLink.includes('?') ? '&' : '?';
    return `${meetingLink}${sep}authuser=${encodeURIComponent(hostEmail)}`;
}

module.exports = {
    isGoogleOAuthConfigured,
    getRedirectUri,
    verifyOAuthState,
    buildGoogleAuthUrl,
    exchangeCodeForTokens,
    fetchGoogleUserEmail,
    getValidDoctorGoogleAuth,
    createGoogleMeetSession,
    normalizeGoogleMeetUrl,
    buildHostJoinUrl,
};
