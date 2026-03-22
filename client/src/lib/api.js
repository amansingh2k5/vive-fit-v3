import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,          // send HTTP-only cookie on every request
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor: surface error messages cleanly ───
api.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
