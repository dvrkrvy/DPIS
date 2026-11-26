const API_BASE = import.meta.env.VITE_API_URL || '';

const getToken = () => localStorage.getItem('dpis_token');

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const healthCheck = () => request('/health');

export const authApi = {
  login: (payload) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyInviteCode: (code) =>
    request(`/api/auth/invite/${encodeURIComponent(String(code).trim())}`),
  checkEmailDomain: (email) =>
    request(`/api/auth/check-domain?email=${encodeURIComponent(String(email).trim())}`),
  getOrganizations: () => request('/api/auth/organizations'),
};

export const userApi = {
  submitAssessment: (payload) =>
    request('/api/user/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyReports: () => request('/api/user/reports'),
};

export const adminApi = {
  getMyOrganization: () => request('/api/admin/organization'),
  createOrganization: (payload) =>
    request('/api/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProfiles: ({ severity, month } = {}) => {
    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    if (month) params.set('month', month);
    const qs = params.toString();
    return request(`/api/admin/profiles${qs ? `?${qs}` : ''}`);
  },
  getAnalytics: ({ month } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const qs = params.toString();
    return request(`/api/admin/analytics${qs ? `?${qs}` : ''}`);
  },
  getAiAnalyticsSummary: (payload = {}) =>
    request('/api/admin/analytics/ai-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const doctorApi = {
  getAssignedOrgs: () => request('/api/doctor/orgs'),
  getOrgQueue: (orgId) => request(`/api/doctor/queue/${orgId}`),
  updateCaseStatus: (assessmentId, payload) =>
    request(`/api/doctor/cases/${assessmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
