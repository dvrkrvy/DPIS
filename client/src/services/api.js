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
  getPatientHistory: (anonymousId) => request(`/api/admin/patient/${anonymousId}/history`),
  getAnalytics: ({ month } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const qs = params.toString();
    return request(`/api/admin/analytics${qs ? `?${qs}` : ''}`);
  },
  getTreatmentRecords: () => request('/api/admin/treatment-records'),
  getAiAnalyticsSummary: (payload = {}) =>
    request('/api/admin/analytics/ai-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const doctorApi = {
  getAssignedOrgs: () => request('/api/doctor/orgs'),
  getOrgQueue: (orgId) => request(`/api/doctor/queue/${orgId}`),
  getPatientHistory: (anonymousId) => request(`/api/doctor/patient/${anonymousId}/history`),
  updateCaseStatus: (assessmentId, payload) =>
    request(`/api/doctor/cases/${assessmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export const appointmentApi = {
  getAvailability: ({ date, doctorId } = {}) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (doctorId) params.set('doctorId', doctorId);
    const qs = params.toString();
    return request(`/api/appointments/availability${qs ? `?${qs}` : ''}`);
  },
  getMyAppointments: () => request('/api/appointments/my'),
  bookAppointment: (payload) =>
    request('/api/appointments/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rescheduleAppointment: (id, payload) =>
    request(`/api/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getDoctorAppointments: ({ date } = {}) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const qs = params.toString();
    return request(`/api/appointments/doctor${qs ? `?${qs}` : ''}`);
  },
  doctorBookAppointment: (payload) =>
    request('/api/appointments/doctor-book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAppointmentStatus: (id, payload) =>
    request(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  startMeeting: (id, payload = {}) =>
    request(`/api/appointments/${id}/meet/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  endMeeting: (id) =>
    request(`/api/appointments/${id}/meet/end`, {
      method: 'POST',
    }),
};

export const googleApi = {
  getStatus: () => request('/api/google/status'),
  getAuthUrl: (origin) =>
    request(`/api/google/auth-url?origin=${encodeURIComponent(origin || window.location.origin)}`),
  disconnect: () =>
    request('/api/google/disconnect', {
      method: 'DELETE',
    }),
};

export const messageApi = {
  getUnreadCount: () => request('/api/messages/unread-count'),
  getThreads: () => request('/api/messages/threads'),
  getMessages: (partnerId) => request(`/api/messages/threads/${encodeURIComponent(partnerId)}`),
  sendMessage: (partnerId, content) =>
    request(`/api/messages/threads/${encodeURIComponent(partnerId)}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

export const profileApi = {
  getMe: () => request('/api/profile/me'),
  updateMe: (payload) =>
    request('/api/profile/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getById: (targetId) => request(`/api/profile/${encodeURIComponent(targetId)}`),
};
