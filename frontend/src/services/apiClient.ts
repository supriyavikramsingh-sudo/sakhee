import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  // timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (request) => {
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
  (error: any) => {
    const errorData = error.response?.data;
    const message = errorData?.error?.message || error.message;
    const details = errorData?.error?.details;

    console.error('API Error:', { message, details, status: error.response?.status });

    // Create a custom error object that preserves all error information
    const customError: any = new Error(message);
    customError.details = details;
    customError.status = error.response?.status;
    customError.response = errorData;

    return Promise.reject(customError);
  }
);

export const apiClient = {
  // ============================================
  // CHAT ENDPOINTS
  // ============================================
  chat: async (message: string, context: any = {}): Promise<object> => {
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
  getChatHistory: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/chat/history/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  },
  clearChatHistory: async (userId: string): Promise<object> => {
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
  generateMealPlan: async (preferences: any): Promise<object> => {
    try {
      const response = await axiosInstance.post('/meals/generate', preferences);
      return response;
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      throw error;
    }
  },
  getMealPlan: async (planId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/meals/${planId}`);
      return response;
    } catch (error) {
      console.error('Failed to get meal plan:', error);
      throw error;
    }
  },
  getUserMealPlans: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/meals/user/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get user meal plans:', error);
      throw error;
    }
  },
  updateMealPlan: async (planId: string, data): Promise<object> => {
    try {
      const response = await axiosInstance.put(`/meals/${planId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update meal plan:', error);
      throw error;
    }
  },
  deleteMealPlan: async (planId: string): Promise<object> => {
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
  startOnboarding: async (data): Promise<object> => {
    try {
      const response = await axiosInstance.post('/onboarding/start', data);
      return response;
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      throw error;
    }
  },
  saveOnboardingStep: async (userId: string, stepNumber: number, data): Promise<object> => {
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
  completeOnboarding: async (userId: string, finalData): Promise<object> => {
    try {
      const response = await axiosInstance.post(`/onboarding/${userId}/complete`, { finalData });
      return response;
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  },
  getUserProfile: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/onboarding/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  updateProgress: async (userId: string, data): Promise<object> => {
    try {
      const response = await axiosInstance.put(`/progress/${userId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  },

  // ============================================
  // COMMUNITY INSIGHTS ENDPOINTS (Placeholder)
  // ============================================
  getRedditInsights: async (topic: string): Promise<object> => {
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
  health: async (): Promise<object> => {
    try {
      const response = await axiosInstance.get('/health');
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // ============================================
  // MEDICAL REPORT ENDPOINTS
  // ============================================
  uploadFile: async (file: File, userId: string): Promise<object> => {
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
  getUserReport: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/upload/user/${userId}/report`);
      return response;
    } catch (error) {
      console.error('Failed to get user report:', error);
      throw error;
    }
  },
  hasUserReport: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/upload/user/${userId}/has-report`);
      return response;
    } catch (error) {
      console.error('Failed to check if user has report:', error);
      throw error;
    }
  },
  deleteUserReport: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.delete(`/upload/user/${userId}/report`);
      return response;
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  },
  logProgress: async (userId: string, data): Promise<object> => {
    try {
      const response = await axiosInstance.post(`/progress/${userId}/log`, data);
      return response;
    } catch (error) {
      console.error('Failed to log progress:', error);
      throw error;
    }
  },
  getProgress: async (userId: string, params = {}): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/progress/${userId}`, { params });
      return response;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  },
  updateProgressEntry: async (userId: string, entryId: string, data): Promise<object> => {
    try {
      const response = await axiosInstance.put(`/progress/${userId}/entry/${entryId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  },
  deleteProgressEntry: async (userId: string, entryId: string) => {
    try {
      const response = await axiosInstance.delete(`/progress/${userId}/entry/${entryId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  },
  setGoals: async (userId: string, goals) => {
    try {
      const response = await axiosInstance.post(`/progress/${userId}/goals`, { goals });
      return response;
    } catch (error) {
      console.error('Failed to set goals:', error);
      throw error;
    }
  },

  // ============================================
  // FEEDBACK ENDPOINTS
  // ============================================
  submitFeedback: async (feedbackData: {
    messageId: string;
    userId: string;
    userPrompt: string;
    aiResponse: string;
    feedback: string;
  }): Promise<object> => {
    try {
      console.log('📤 ApiClient: Submitting feedback to /api/feedback', feedbackData);
      const response = await axiosInstance.post('/feedback', feedbackData);
      console.log('✅ ApiClient: Feedback response:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiClient: Failed to submit feedback:', error);
      throw error;
    }
  },

  getFeedbackHistory: async (userId: string): Promise<object> => {
    try {
      const response = await axiosInstance.get(`/feedback/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get feedback history:', error);
      throw error;
    }
  },
};

export default apiClient;
