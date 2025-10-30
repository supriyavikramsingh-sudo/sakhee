import apiClient from './apiClient';

export interface ChatFeedback {
  messageId: string;
  userId: string;
  userPrompt: string;
  aiResponse: string;
  feedback: 'positive' | 'negative';
  timestamp: number;
}

export const feedbackService = {
  async submitFeedback(feedbackData: Omit<ChatFeedback, 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      // Map frontend feedback values to backend expected values
      const backendFeedback = feedbackData.feedback === 'positive' ? 'thumbs_up' : 'thumbs_down';
      
      console.log('🌐 FeedbackService: Preparing to submit feedback', {
        messageId: feedbackData.messageId,
        userId: feedbackData.userId,
        feedback: backendFeedback,
        originalFeedback: feedbackData.feedback,
        hasPrompt: !!feedbackData.userPrompt,
        hasResponse: !!feedbackData.aiResponse
      });

      const response = await apiClient.submitFeedback({
        messageId: feedbackData.messageId,
        userId: feedbackData.userId,
        userPrompt: feedbackData.userPrompt,
        aiResponse: feedbackData.aiResponse,
        feedback: backendFeedback
      });

      console.log('✅ FeedbackService: Response received', response);
      return { success: true };
    } catch (error) {
      console.error('❌ FeedbackService: Failed to submit feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit feedback' 
      };
    }
  },

  async getFeedbackHistory(userId: string): Promise<{ success: boolean; data?: ChatFeedback[]; error?: string }> {
    try {
      const response: any = await apiClient.getFeedbackHistory(userId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get feedback history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get feedback history' 
      };
    }
  }
};
