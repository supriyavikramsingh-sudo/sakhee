import axios from 'axios';
import type { 
  UpgradeRequest, 
  CancelRequest, 
  ReactivateRequest 
} from '../types/subscription.type';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: any) => {
    const errorData = error.response?.data;
    const message = errorData?.error?.message || error.message;
    const details = errorData?.error?.details;

    console.error('Subscription API Error:', { message, details, status: error.response?.status });

    const customError: any = new Error(message);
    customError.details = details;
    customError.status = error.response?.status;
    customError.response = errorData;

    return Promise.reject(customError);
  }
);

export const subscriptionApi = {
  /**
   * Get user's subscription details
   */
  getSubscription: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/user/subscription?userId=${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw error;
    }
  },

  /**
   * Upgrade user to Pro (or change billing cycle)
   */
  upgrade: async (data: UpgradeRequest): Promise<any> => {
    try {
      const response = await axiosInstance.put('/user/subscription/upgrade', data);
      return response;
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription (retain access until end of billing cycle)
   */
  cancel: async (data: CancelRequest): Promise<any> => {
    try {
      const response = await axiosInstance.put('/user/subscription/cancel', data);
      return response;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  },

  /**
   * Reactivate canceled subscription
   */
  reactivate: async (data: ReactivateRequest): Promise<any> => {
    try {
      const response = await axiosInstance.put('/user/subscription/reactivate', data);
      return response;
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  },

  /**
   * Get meal plan usage stats
   */
  getUsage: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/user/usage?userId=${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw error;
    }
  },
};

export default subscriptionApi;
