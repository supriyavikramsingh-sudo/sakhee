import { create } from 'zustand';

interface MealStoreState {
  currentMealPlan: any | null;
  mealHistory: any[];

  setMealPlan: (plan: any) => void;
  addToHistory: (plan: any) => void;
}

export const useChatStore = create((set) => ({
  messages: [],
  allMessages: [], // Store all messages
  isLoading: false,
  error: null,
  visibleCount: 5, // Show 5 messages at a time
  hasMoreMessages: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      allMessages: [...state.allMessages, message],
    })),

  clearMessages: () =>
    set({ messages: [], allMessages: [], visibleCount: 5, hasMoreMessages: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Add messages from history
  loadHistory: (messages) =>
    set({
      allMessages: messages,
      messages: messages.slice(-5), // Show last 5 messages initially
      visibleCount: 5,
      hasMoreMessages: messages.length > 5,
    }),

  // Load more messages
  loadMoreMessages: () =>
    set((state) => {
      const newVisibleCount = state.visibleCount + 5;
      const startIndex = Math.max(0, state.allMessages.length - newVisibleCount);
      return {
        visibleCount: newVisibleCount,
        messages: state.allMessages.slice(startIndex),
        hasMoreMessages: startIndex > 0,
      };
    }),

  // Remove message by ID
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
      allMessages: state.allMessages.filter((m) => m.id !== messageId),
    })),
}));

export const useMealStore = create<MealStoreState>((set) => ({
  currentMealPlan: null,
  mealHistory: [],

  setMealPlan: (plan) => set({ currentMealPlan: plan }),
  addToHistory: (plan) =>
    set((state) => ({
      mealHistory: [...state.mealHistory, plan],
    })),
}));

export const useProgressStore = create((set) => ({
  symptoms: [],
  weight: null,
  measurements: {},

  updateSymptoms: (symptoms) => set({ symptoms }),
  updateWeight: (weight) => set({ weight }),
  updateMeasurements: (measurements) => set({ measurements }),
}));
