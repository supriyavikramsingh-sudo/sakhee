/**
 * Progress Tracker API Service
 * Handles all API calls for period tracking, daily tracking, ovulation, and reports
 */

import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: any) => {
    const errorData = error.response?.data;
    const message = errorData?.error?.message || error.message;
    const details = errorData?.error?.details;

    console.error('Progress Tracker API Error:', { message, details, status: error.response?.status });

    const customError: any = new Error(message);
    customError.details = details;
    customError.status = error.response?.status;
    customError.response = errorData;

    return Promise.reject(customError);
  }
);

export const progressTrackerApi = {
  // =====================================================
  // PERIOD TRACKING
  // =====================================================

  /**
   * Initialize period tracking setup (first-time user)
   */
  initializePeriodSetup: async (userId: string, setupData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/period/setup', {
        userId,
        ...setupData,
      });
      return response;
    } catch (error) {
      console.error('Failed to initialize period setup:', error);
      throw error;
    }
  },

  /**
   * Get period setup status
   */
  getPeriodSetup: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/period/setup/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get period setup:', error);
      throw error;
    }
  },

  /**
   * Log a new period cycle
   */
  logPeriod: async (userId: string, cycleData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/period/log', {
        userId,
        ...cycleData,
      });
      return response;
    } catch (error) {
      console.error('Failed to log period:', error);
      throw error;
    }
  },

  /**
   * Get all cycles for timeline
   */
  getCycles: async (userId: string, limit: number = 6): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/period/cycles/${userId}`, {
        params: { limit },
      });
      return response;
    } catch (error) {
      console.error('Failed to get cycles:', error);
      throw error;
    }
  },

  /**
   * Get specific cycle details
   */
  getCycle: async (userId: string, cycleId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/period/cycle/${userId}/${cycleId}`);
      return response;
    } catch (error) {
      console.error('Failed to get cycle:', error);
      throw error;
    }
  },

  /**
   * Update an existing cycle
   */
  updateCycle: async (userId: string, cycleId: string, updateData: any): Promise<any> => {
    try {
      const response = await axiosInstance.put(`/progress/period/update/${cycleId}`, {
        ...updateData,
        userId,
      });
      return response;
    } catch (error) {
      console.error('Failed to update cycle:', error);
      throw error;
    }
  },

  /**
   * Update period duration system-wide
   */
  updatePeriodDuration: async (userId: string, newDuration?: number, declined: boolean = false): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/period/update-duration', {
        userId,
        newDuration,
        declined,
      });
      return response;
    } catch (error) {
      console.error('Failed to update period duration:', error);
      throw error;
    }
  },

  /**
   * Decline period duration update offer
   */
  declinePeriodDurationUpdate: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/period/update-duration', {
        userId,
        declined: true,
      });
      return response;
    } catch (error) {
      console.error('Failed to decline period duration update:', error);
      throw error;
    }
  },

  /**
   * Generate AI insights for a cycle
   */
  generateCycleInsights: async (userId: string, cycleId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post(`/progress/period/insights/${cycleId}`, {
        userId,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw error;
    }
  },

  /**
   * Get ovulation prediction (data-driven or estimated)
   */
  getOvulationPrediction: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/period/ovulation-prediction/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get ovulation prediction:', error);
      throw error;
    }
  },

  // =====================================================
  // DAILY TRACKING
  // =====================================================

  /**
   * Save daily tracking entry
   */
  saveDailyTracking: async (userId: string, date: string, trackingData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/daily', {
        userId,
        date,
        ...trackingData,
      });
      return response;
    } catch (error) {
      console.error('Failed to save daily tracking:', error);
      throw error;
    }
  },

  /**
   * Get daily tracking for specific date
   */
  getDailyTracking: async (userId: string, date: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/daily/${userId}/${date}`);
      return response;
    } catch (error) {
      console.error('Failed to get daily tracking:', error);
      throw error;
    }
  },

  /**
   * Get daily tracking for date range
   */
  getDailyTrackingRange: async (userId: string, startDate: string, endDate: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/daily/range/${userId}`, {
        params: { startDate, endDate },
      });
      return response;
    } catch (error) {
      console.error('Failed to get daily tracking range:', error);
      throw error;
    }
  },

  /**
   * Get current cycle day
   */
  getCurrentCycleDay: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/cycle-day/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get cycle day:', error);
      throw error;
    }
  },

  // =====================================================
  // WEIGHT TRACKING
  // =====================================================

  /**
   * Get goal achievement status
   */
  getGoalAchievement: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/weight/goal/${userId}`);
      return response;
    } catch (error) {
      console.error('Failed to get goal achievement:', error);
      throw error;
    }
  },

  /**
   * Dismiss goal achievement banner
   */
  dismissGoalBanner: async (userId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/weight/goal/dismiss', {
        userId,
      });
      return response;
    } catch (error) {
      console.error('Failed to dismiss goal banner:', error);
      throw error;
    }
  },

  // =====================================================
  // WEEKLY SYMPTOM TRACKING
  // =====================================================

  /**
   * Save weekly symptoms
   */
  saveWeeklySymptoms: async (userId: string, weekId: string, symptomData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/weekly-symptoms', {
        userId,
        weekId,
        ...symptomData,
      });
      return response;
    } catch (error) {
      console.error('Failed to save weekly symptoms:', error);
      throw error;
    }
  },

  /**
   * Get weekly symptoms for specific week
   */
  getWeeklySymptoms: async (userId: string, weekId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/weekly-symptoms/${userId}/${weekId}`);
      return response;
    } catch (error) {
      console.error('Failed to get weekly symptoms:', error);
      throw error;
    }
  },

  /**
   * Get weekly symptoms for date range
   */
  getWeeklySymptomsRange: async (userId: string, startWeek: string, endWeek: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/weekly-symptoms/range/${userId}`, {
        params: { startWeek, endWeek },
      });
      return response;
    } catch (error) {
      console.error('Failed to get weekly symptoms range:', error);
      throw error;
    }
  },

  // =====================================================
  // WEEKLY SUMMARIES
  // =====================================================

  /**
   * Get weekly summary for specific week
   */
  getWeeklySummary: async (userId: string, weekId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/weekly-summary/${userId}/${weekId}`);
      return response;
    } catch (error) {
      console.error('Failed to get weekly summary:', error);
      throw error;
    }
  },

  /**
   * Get weekly summaries for date range
   */
  getWeeklySummariesRange: async (userId: string, numberOfWeeks: number): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/weekly-summaries/${userId}`, {
        params: { weeks: numberOfWeeks },
      });
      return response;
    } catch (error) {
      console.error('Failed to get weekly summaries range:', error);
      throw error;
    }
  },

  /**
   * Generate weekly summary manually
   */
  generateWeeklySummary: async (userId: string, weekId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/weekly-summary/generate', {
        userId,
        weekId,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate weekly summary:', error);
      throw error;
    }
  },

  // =====================================================
  // MONTHLY REPORTS
  // =====================================================

  /**
   * Get monthly report for specific month
   */
  getMonthlyReport: async (userId: string, monthId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/monthly-report/${userId}/${monthId}`);
      return response;
    } catch (error) {
      console.error('Failed to get monthly report:', error);
      throw error;
    }
  },

  /**
   * Get monthly reports for date range
   */
  getMonthlyReportsRange: async (userId: string, numberOfMonths: number): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/progress/monthly-reports/${userId}`, {
        params: { months: numberOfMonths },
      });
      return response;
    } catch (error) {
      console.error('Failed to get monthly reports range:', error);
      throw error;
    }
  },

  /**
   * Generate monthly report manually
   */
  generateMonthlyReport: async (userId: string, monthId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post('/progress/monthly-report/generate', {
        userId,
        monthId,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
      throw error;
    }
  },

  // =====================================================
  // AI INSIGHTS
  // =====================================================

  /**
   * Generate AI-powered insights for a monthly report
   */
  generateAIInsights: async (
    userId: string,
    monthId: string,
    options?: {
      previousMonths?: any[];
      userProfile?: any;
      forceRegenerate?: boolean;
    }
  ): Promise<any> => {
    try {
      const response = await axiosInstance.post(`/progress/ai-insights/${userId}/${monthId}`, {
        previousMonths: options?.previousMonths || [],
        userProfile: options?.userProfile || {},
        forceRegenerate: options?.forceRegenerate || false,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      throw error;
    }
  },

  /**
   * Generate long-term AI insights across multiple months
   */
  generateLongTermAIInsights: async (
    userId: string, 
    numberOfMonths: number = 6,
    forceRegenerate: boolean = false
  ): Promise<any> => {
    try {
      const response = await axiosInstance.post(`/progress/ai-insights/long-term/${userId}`, {
        numberOfMonths,
        forceRegenerate,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate long-term AI insights:', error);
      throw error;
    }
  },

  /**
   * Export daily tracking data
   */
  exportDailyTracking: async (
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      format?: 'csv' | 'json';
    }
  ): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.format) params.append('format', options.format);

      const response = await axiosInstance.get(`/progress/export/daily/${userId}?${params.toString()}`, {
        responseType: 'blob',
      });

      // Trigger file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-tracking-${userId}.${options?.format || 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export daily tracking:', error);
      throw error;
    }
  },

  /**
   * Export weekly summaries
   */
  exportWeeklySummaries: async (
    userId: string,
    options?: {
      numberOfWeeks?: number;
      format?: 'csv' | 'json';
    }
  ): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (options?.numberOfWeeks) params.append('numberOfWeeks', options.numberOfWeeks.toString());
      if (options?.format) params.append('format', options.format);

      const response = await axiosInstance.get(`/progress/export/weekly/${userId}?${params.toString()}`, {
        responseType: 'blob',
      });

      // Trigger file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-summaries-${userId}.${options?.format || 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export weekly summaries:', error);
      throw error;
    }
  },

  /**
   * Export monthly reports
   */
  exportMonthlyReports: async (
    userId: string,
    options?: {
      numberOfMonths?: number;
      format?: 'csv' | 'json';
      includeAIInsights?: boolean;
    }
  ): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (options?.numberOfMonths) params.append('numberOfMonths', options.numberOfMonths.toString());
      if (options?.format) params.append('format', options.format);
      if (options?.includeAIInsights !== undefined) {
        params.append('includeAIInsights', options.includeAIInsights.toString());
      }

      const response = await axiosInstance.get(`/progress/export/monthly/${userId}?${params.toString()}`, {
        responseType: 'blob',
      });

      // Trigger file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-reports-${userId}.${options?.format || 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export monthly reports:', error);
      throw error;
    }
  },

  /**
   * Export all progress tracking data (JSON only)
   */
  exportAllData: async (userId: string): Promise<void> => {
    try {
      const response = await axiosInstance.get(`/progress/export/all/${userId}`, {
        responseType: 'blob',
      });

      // Trigger file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `progress-tracking-complete-${userId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export all data:', error);
      throw error;
    }
  },

  /**
   * Export monthly report as PDF
   */
  exportMonthlyReportPDF: async (
    userId: string,
    monthId: string,
    includeAIInsights: boolean = true
  ): Promise<void> => {
    try {
      const params = new URLSearchParams();
      params.append('includeAIInsights', includeAIInsights.toString());

      const response = await axiosInstance.get(
        `/progress/export/pdf/${userId}/${monthId}?${params.toString()}`,
        {
          responseType: 'blob',
        }
      );

      // Trigger file download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-report-${monthId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw error;
    }
  },
};

export default progressTrackerApi;
