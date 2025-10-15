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
  (response) => {
    console.log('Axios interceptor - raw response:', response);
    console.log('Axios interceptor - response.data:', response.data);
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.error?.message || error.message;
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export const apiClient = {
  // ============================================
  // CHAT ENDPOINTS
  // ============================================

  /**
   * Send a chat message
   * @param {string} message - User message
   * @param {object} context - User context (userId, profile, etc.)
   * @returns {Promise<object>} Chat response
   */
  chat: async (message, context = {}) => {
    try {
      console.log('Sending chat message:', { message, context });
      const response = await axiosInstance.post('/chat/message', {
        message,
        userId: context.userId,
        userContext: context,
      });
      console.log('Chat response received:', response);
      return response;
    } catch (error) {
      console.error('Chat API error:', error);
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      }
      throw error;
    }
  },

  /**
   * Get chat history
   * @param {string} userId - User ID
   * @returns {Promise<object>} Chat history
   */
  getChatHistory: async (userId) => {
    try {
      const response = await axiosInstance.get(`/chat/history/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  },

  /**
   * Clear chat history
   * @param {string} userId - User ID
   * @returns {Promise<object>} Success response
   */
  clearChatHistory: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/chat/history/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      throw error;
    }
  },

  // ============================================
  // MEAL PLANNING ENDPOINTS
  // ============================================

  /**
   * Generate a personalized meal plan
   * @param {object} preferences - Meal preferences
   * @returns {Promise<object>} Generated meal plan
   */
  generateMealPlan: async (preferences) => {
    try {
      const response = await axiosInstance.post('/meals/generate', preferences);
      return response;
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      throw error;
    }
  },

  /**
   * Get specific meal plan
   * @param {string} planId - Meal plan ID
   * @returns {Promise<object>} Meal plan details
   */
  getMealPlan: async (planId) => {
    try {
      const response = await axiosInstance.get(`/meals/${planId}`);
      return response;
    } catch (error) {
      console.error('Failed to get meal plan:', error);
      throw error;
    }
  },

  /**
   * Get user's meal plans
   * @param {string} userId - User ID
   * @returns {Promise<object>} List of meal plans
   */
  getUserMealPlans: async (userId) => {
    try {
      const response = await axiosInstance.get(`/meals/user/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get user meal plans:', error);
      throw error;
    }
  },

  /**
   * Update meal plan
   * @param {string} planId - Meal plan ID
   * @param {object} data - Update data
   * @returns {Promise<object>} Updated meal plan
   */
  updateMealPlan: async (planId, data) => {
    try {
      const response = await axiosInstance.put(`/meals/${planId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update meal plan:', error);
      throw error;
    }
  },

  /**
   * Delete meal plan
   * @param {string} planId - Meal plan ID
   * @returns {Promise<object>} Success response
   */
  deleteMealPlan: async (planId) => {
    try {
      const response = await axiosInstance.delete(`/meals/${planId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      throw error;
    }
  },

  // ============================================
  // ONBOARDING ENDPOINTS
  // ============================================

  /**
   * Start onboarding process
   * @param {object} data - Initial user data
   * @returns {Promise<object>} User ID and initial state
   */
  startOnboarding: async (data) => {
    try {
      const response = await axiosInstance.post('/onboarding/start', data);
      return response;
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      throw error;
    }
  },

  /**
   * Save onboarding step
   * @param {string} userId - User ID
   * @param {number} stepNumber - Step number
   * @param {object} data - Step data
   * @returns {Promise<object>} Success response
   */
  saveOnboardingStep: async (userId, stepNumber, data) => {
    try {
      const response = await axiosInstance.post(`/onboarding/${userId}/save-step`, {
        stepNumber,
        data,
      });
      return response;
    } catch (error) {
      console.error('Failed to save onboarding step:', error);
      throw error;
    }
  },

  /**
   * Complete onboarding
   * @param {string} userId - User ID
   * @param {object} finalData - Final onboarding data
   * @returns {Promise<object>} Completed profile
   */
  completeOnboarding: async (userId, finalData) => {
    try {
      const response = await axiosInstance.post(`/onboarding/${userId}/complete`, { finalData });
      return response;
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  },

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<object>} User profile
   */
  getUserProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`/onboarding/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  // ============================================
  // PROGRESS TRACKING ENDPOINTS (Placeholder)
  // ============================================

  /**
   * Get user progress
   * @param {string} userId - User ID
   * @returns {Promise<object>} Progress data
   */
  getProgress: async (userId) => {
    try {
      const response = await axiosInstance.get(`/progress/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  },

  /**
   * Update progress
   * @param {string} userId - User ID
   * @param {object} data - Progress data
   * @returns {Promise<object>} Updated progress
   */
  updateProgress: async (userId, data) => {
    try {
      const response = await axiosInstance.put(`/progress/${userId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  },

  // ============================================
  // FILE UPLOAD ENDPOINTS (Placeholder)
  // ============================================

  /**
   * Upload file (medical report)
   * @param {File} file - File to upload
   * @param {string} userId - User ID
   * @returns {Promise<object>} Upload response
   */
  uploadFile: async (file, userId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },

  // ============================================
  // COMMUNITY INSIGHTS ENDPOINTS (Placeholder)
  // ============================================

  /**
   * Get Reddit insights for a topic
   * @param {string} topic - Topic to search
   * @returns {Promise<object>} Reddit insights
   */
  getRedditInsights: async (topic) => {
    try {
      const response = await axiosInstance.get(`/community/reddit/${topic}`);
      return response;
    } catch (error) {
      console.error('Failed to get Reddit insights:', error);
      throw error;
    }
  },

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check API health
   * @returns {Promise<object>} Health status
   */
  health: async () => {
    try {
      const response = await axiosInstance.get('/health');
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  uploadFile: async (file, userId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await axiosInstance.post('/upload/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },

  getReport: async (reportId) => {
    try {
      const response = await axiosInstance.get(`/upload/report/${reportId}`);
      return response;
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  },

  getUserReports: async (userId) => {
    try {
      const response = await axiosInstance.get(`/upload/user/${userId}/reports`);
      return response;
    } catch (error) {
      console.error('Failed to get user reports:', error);
      throw error;
    }
  },

  deleteReport: async (reportId) => {
    try {
      const response = await axiosInstance.delete(`/upload/report/${reportId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  },
  logProgress: async (userId, data) => {
    try {
      const response = await axiosInstance.post(`/progress/${userId}/log`, data);
      return response;
    } catch (error) {
      console.error('Failed to log progress:', error);
      throw error;
    }
  },

  getProgress: async (userId, params = {}) => {
    try {
      const response = await axiosInstance.get(`/progress/${userId}`, { params });
      return response;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  },

  updateProgressEntry: async (userId, entryId, data) => {
    try {
      const response = await axiosInstance.put(`/progress/${userId}/entry/${entryId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  },

  deleteProgressEntry: async (userId, entryId) => {
    try {
      const response = await axiosInstance.delete(`/progress/${userId}/entry/${entryId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  },

  setGoals: async (userId, goals) => {
    try {
      const response = await axiosInstance.post(`/progress/${userId}/goals`, { goals });
      return response;
    } catch (error) {
      console.error('Failed to set goals:', error);
      throw error;
    }
  },
};

// Default export
export default apiClient;
