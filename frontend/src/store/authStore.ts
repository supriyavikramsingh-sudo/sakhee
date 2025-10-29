import { create } from 'zustand';
import authService from '../services/authService';
import firestoreService from '../services/firestoreService';
import type { DocumentData } from 'firebase/firestore';

interface AuthStoreState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  userProfile: DocumentData | undefined | null;
  error: string | null;

  initAuth: () => void;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { [key: string]: any }) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (profileData: {
    [key: string]: any;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
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
        console.log('🔐 User authenticated:', firebaseUser.email);

        // Load profile from Firestore
        const profileResult = await firestoreService.getUserProfile(firebaseUser.uid);

        if (profileResult.success) {
          console.log('👤 Profile loaded:', profileResult.data);

          set({
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            },
            userProfile: profileResult.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          console.error('❌ Failed to load profile');
          set({
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            },
            userProfile: { onboarded: false }, // Default to not onboarded
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } else {
        // User is signed out
        console.log('🚪 User signed out');
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });

    const result = await authService.signInWithGoogle();

    if (result.success) {
      // Profile will be loaded by auth state listener
      return { success: true };
    } else {
      set({ error: result.error, isLoading: false });
      return { success: false, error: result.error };
    }
  },

  // Sign out
  signOut: async () => {
    const result = await authService.signOut();

    if (result.success) {
      set({
        user: null,
        userProfile: null,
        isAuthenticated: false,
        error: null,
      });
    }

    return result;
  },

  // Update user profile
  updateProfile: async (data) => {
    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await firestoreService.updateUserProfile(user.uid, data);

    if (result.success) {
      // Reload profile
      const profileResult = await firestoreService.getUserProfile(user.uid);
      if (profileResult.success) {
        set({ userProfile: profileResult.data });
      }
    }

    return result;
  },

  // Complete onboarding
  completeOnboarding: async (profileData) => {
    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    console.log('✅ Completing onboarding...', profileData);

    const result = await firestoreService.completeOnboarding(user.uid, profileData);

    if (result.success) {
      console.log('✅ Onboarding completed!');

      // Reload profile to get updated onboarded status
      const profileResult = await firestoreService.getUserProfile(user.uid);
      if (profileResult.success) {
        console.log('👤 Updated profile:', profileResult.data);
        set({ userProfile: profileResult.data });
      }
    } else {
      console.error('❌ Onboarding failed:', result.error);
    }

    return result;
  },
}));
