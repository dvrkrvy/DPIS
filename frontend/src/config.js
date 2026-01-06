// Hardcode the API base URL for production
// This ensures it works on GitHub Pages
const API_BASE_URL = 'https://dpis-backend.onrender.com';

// Log to verify it's being used
if (typeof window !== 'undefined') {
  console.log('API Base URL:', API_BASE_URL);
}

export default API_BASE_URL;
