import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('civictrust_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('civictrust_token');
      localStorage.removeItem('civictrust_user');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  getMe: () => api.get('/auth/me'),
};

// Grievance APIs
export const grievanceAPI = {
  create: (data) => api.post('/grievances', data),
  getAll: (params) => api.get('/grievances', { params }),
  getById: (id) => api.get(`/grievances/${id}`),
  track: (trackingId) => api.get(`/grievances/track/${trackingId}`),
  updateStatus: (id, data) => api.patch(`/grievances/${id}/status`, data),
  uploadResolutionProof: (id, data) => api.post(`/grievances/${id}/resolution-proof`, data),
  assign: (id, data) => api.patch(`/grievances/${id}/assign`, data),
  submitFeedback: (id, data) => api.post(`/grievances/${id}/feedback`, data),
  escalate: (id, data) => api.patch(`/grievances/${id}/escalate`, data),
  reopen: (id, data) => api.patch(`/grievances/${id}/reopen`, data),
  getStats: () => api.get('/grievances/stats'),
};

// AI APIs
export const aiAPI = {
  classify: (data) => api.post('/ai/classify', data),
  checkDuplicate: (data) => api.post('/ai/check-duplicate', data),
  generateResponse: (data) => api.post('/ai/generate-response', data),
};

// Taxonomy APIs
export const taxonomyAPI = {
  getAll: () => api.get('/taxonomy'),
  getById: (id) => api.get(`/taxonomy/${id}`),
  create: (data) => api.post('/taxonomy', data),
  update: (id, data) => api.put(`/taxonomy/${id}`, data),
  toggle: (id) => api.patch(`/taxonomy/${id}/toggle`),
  remove: (id) => api.delete(`/taxonomy/${id}`),
};

export default api;
