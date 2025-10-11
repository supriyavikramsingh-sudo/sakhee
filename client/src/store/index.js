import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setLoading: (loading) => set({ isLoading: loading })
}))

export const useUserProfileStore = create((set) => ({
  profile: null,
  onboarded: false,
  preferences: {},

  setProfile: (profile) => set({ profile }),
  setOnboarded: (onboarded) => set({ onboarded }),
  setPreferences: (preferences) => set((state) => ({
    preferences: { ...state.preferences, ...preferences }
  }))
}))

export const useChatStore = create((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  clearMessages: () => set({ messages: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Add messages from history
  loadHistory: (messages) => set({ messages }),
  
  // Remove message by ID
  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(m => m.id !== messageId)
  }))
}))

export const useMealStore = create((set) => ({
  currentMealPlan: null,
  mealHistory: [],

  setMealPlan: (plan) => set({ currentMealPlan: plan }),
  addToHistory: (plan) => set((state) => ({
    mealHistory: [...state.mealHistory, plan]
  }))
}))

export const useProgressStore = create((set) => ({
  symptoms: [],
  weight: null,
  measurements: {},

  updateSymptoms: (symptoms) => set({ symptoms }),
  updateWeight: (weight) => set({ weight }),
  updateMeasurements: (measurements) => set({ measurements })
}))