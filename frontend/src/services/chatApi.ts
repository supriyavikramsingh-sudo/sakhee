import apiClient from './apiClient'

export const chatApi = {
  // Send a message
  sendMessage: async (message, userId, userContext) => {
    try {
      const response = await apiClient.post('/chat/message', {
        message,
        userId,
        userContext
      })
      return response
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  },

  // Get chat history
  getHistory: async (userId) => {
    try {
      const response = await apiClient.get(`/chat/history/${userId}`)
      return response.data
    } catch (error) {
      console.error('Failed to get history:', error)
      throw error
    }
  },

  // Clear chat history
  clearHistory: async (userId) => {
    try {
      const response = await apiClient.delete(`/chat/history/${userId}`)
      return response
    } catch (error) {
      console.error('Failed to clear history:', error)
      throw error
    }
  },

  // Acknowledge disclaimer
  acknowledgeDisclaimer: async (userId) => {
    try {
      const response = await apiClient.post('/chat/disclaimer-acknowledged', {
        userId
      })
      return response
    } catch (error) {
      console.error('Failed to acknowledge disclaimer:', error)
      throw error
    }
  }
}

export default chatApi