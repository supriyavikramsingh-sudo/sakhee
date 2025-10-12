import { create } from 'zustand'
import { authService } from '../services/authService'
import { firestoreService } from '../services/firestoreService'

export const useAuthStore = create((set, get) => ({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize auth listener
  initAuth: () => {
    authService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const profileResult = await firestoreService.getUserProfile(firebaseUser.uid)
        
        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          },
          userProfile: profileResult.success ? profileResult.data : null,
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        // User is signed out
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    })
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    
    const result = await authService.signInWithGoogle()
    
    if (result.success) {
      // Profile will be loaded by auth state listener
      return { success: true }
    } else {
      set({ error: result.error, isLoading: false })
      return { success: false, error: result.error }
    }
  },

  // Sign out
  signOut: async () => {
    const result = await authService.signOut()
    
    if (result.success) {
      set({
        user: null,
        userProfile: null,
        isAuthenticated: false,
        error: null
      })
    }
    
    return result
  },

  // Update user profile
  updateProfile: async (data) => {
    const { user } = get()
    if (!user) return { success: false, error: 'Not authenticated' }

    const result = await firestoreService.updateUserProfile(user.uid, data)
    
    if (result.success) {
      // Reload profile
      const profileResult = await firestoreService.getUserProfile(user.uid)
      if (profileResult.success) {
        set({ userProfile: profileResult.data })
      }
    }
    
    return result
  },

  // Complete onboarding
  completeOnboarding: async (profileData) => {
    const { user } = get()
    if (!user) return { success: false, error: 'Not authenticated' }

    const result = await firestoreService.completeOnboarding(user.uid, profileData)
    
    if (result.success) {
      // Reload profile
      const profileResult = await firestoreService.getUserProfile(user.uid)
      if (profileResult.success) {
        set({ userProfile: profileResult.data })
      }
    }
    
    return result
  }
}))