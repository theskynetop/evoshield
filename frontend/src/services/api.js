import axios from 'axios';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export const wafApi = {
  // Traffic
  getTraffic:    (params) => api.get('/api/traffic', { params }),
  getLiveStream: ()       => api.get('/api/traffic/live'),

  // Attack Logs
  getLogs:       (params) => api.get('/api/logs', { params }),
  getLogById:    (id)     => api.get(`/api/logs/${id}`),

  // Rules
  getRules:      ()       => api.get('/api/rules'),
  createRule:    (data)   => api.post('/api/rules', data),
  updateRule:    (id, d)  => api.put(`/api/rules/${id}`, d),
  deleteRule:    (id)     => api.delete(`/api/rules/${id}`),
  toggleRule:    (id)     => api.patch(`/api/rules/${id}/toggle`),

  // AI / ML
  runInference:  (data)   => api.post('/api/ml/inference', data),
  getSHAP:       (data)   => api.post('/api/ml/shap', data),
  getModelStats: ()       => api.get('/api/ml/stats'),
  retrainModel:  ()       => api.post('/api/ml/retrain'),

  // Self-Healing
  triggerHealing: ()      => api.post('/api/healing/trigger'),
  getHealingHistory: ()   => api.get('/api/healing/history'),

  // Reports
  getReport:     (params) => api.get('/api/reports', { params }),
  exportReport:  (params) => api.get('/api/reports/export', { params, responseType: 'blob' }),

  // Dashboard
  getDashboard:  ()       => api.get('/api/dashboard'),
  getStats:      ()       => api.get('/api/dashboard/stats'),
};

export default api;
