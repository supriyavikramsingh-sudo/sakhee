import axios from 'axios';
import config from '../config';

const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  // timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (request) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || error.message;
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export const apiClient = {
  // Chat endpoints
  chat: (message, context = {}) => axiosInstance.post('/chat', { message, context }),

  // Meal planning endpoints
  generateMealPlan: (preferences) => axiosInstance.post('/meals/generate', preferences),

  getMealPlan: (id) => axiosInstance.get(`/meals/${id}`),

  // Onboarding endpoints
  startOnboarding: (data) => axiosInstance.post('/onboarding/create', data),

  completeOnboarding: (userId, data) => axiosInstance.post(`/onboarding/${userId}/complete`, data),

  // Progress endpoints
  getProgress: (userId) => axiosInstance.get(`/progress/${userId}`),

  updateProgress: (userId, data) => axiosInstance.put(`/progress/${userId}`, data),

  // File upload
  uploadFile: (file, userId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    return axiosInstance.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Community insights
  getRedditInsights: (topic) => axiosInstance.get(`/community/reddit/${topic}`),

  // Health check
  health: () => axiosInstance.get('/health'),
};

export default apiClient;
