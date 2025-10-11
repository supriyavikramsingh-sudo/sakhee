import apiClient from './apiClient'

export const mealApi = {
  // Generate meal plan
  generatePlan: async (preferences) => {
    try {
      const response = await apiClient.post('/meals/generate', preferences)
      return response
    } catch (error) {
      console.error('Failed to generate meal plan:', error)
      throw error
    }
  },

  // Get meal plan by ID
  getPlan: async (planId) => {
    try {
      const response = await apiClient.get(`/meals/${planId}`)
      return response
    } catch (error) {
      console.error('Failed to get meal plan:', error)
      throw error
    }
  },

  // Get user's meal plans
  getUserPlans: async (userId) => {
    try {
      const response = await apiClient.get(`/meals/user/${userId}`)
      return response
    } catch (error) {
      console.error('Failed to get user meal plans:', error)
      throw error
    }
  },

  // Update meal plan
  updatePlan: async (planId, data) => {
    try {
      const response = await apiClient.put(`/meals/${planId}`, data)
      return response
    } catch (error) {
      console.error('Failed to update meal plan:', error)
      throw error
    }
  },

  // Delete meal plan
  deletePlan: async (planId) => {
    try {
      const response = await apiClient.delete(`/meals/${planId}`)
      return response
    } catch (error) {
      console.error('Failed to delete meal plan:', error)
      throw error
    }
  }
}

export default mealApi