import axios from 'axios';
import API_BASE_URL from '../config';

// Ensure baseURL is set correctly - remove trailing slash if present
const baseURL = (API_BASE_URL || 'https://dpis-backend.onrender.com').replace(/\/$/, '');

console.log('🔧 Creating axios instance with baseURL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Verify baseURL is set
if (!api.defaults.baseURL) {
  console.error('❌ WARNING: axios baseURL is not set!');
  api.defaults.baseURL = baseURL;
} else {
  console.log('✅ Axios baseURL verified:', api.defaults.baseURL);
}

// Override request to ensure baseURL is always used
const originalRequest = api.request;
api.request = function(config) {
  // Ensure baseURL is always set
  if (!config.baseURL && api.defaults.baseURL) {
    config.baseURL = api.defaults.baseURL;
  }
  // If URL starts with http, don't modify it
  // Otherwise, ensure it's relative and will use baseURL
  if (config.url && !config.url.startsWith('http')) {
    // Remove leading slash to ensure it's relative
    if (config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }
  }
  return originalRequest.call(this, config);
};

// Add request interceptor to log requests
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses and errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
      responseData: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default api;
