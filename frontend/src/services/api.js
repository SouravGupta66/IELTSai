// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  // Cold-start AI generation (a new topic/band combo with nothing cached yet)
  // can take several minutes on constrained local hardware. A short timeout
  // here doesn't stop that work server-side - it just throws away a
  // successful result and forces a slow retry, so this errs long.
  timeout: 300000, // 5 minutes
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API ERROR:', err.response?.data || err.message);
    const message = err.response?.data?.detail || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;