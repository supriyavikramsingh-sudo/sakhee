import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

class AuthService {
  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      // Set persistence
      await setPersistence(auth, browserLocalPersistence);

      // Sign in with popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Create or update user in Firestore
      await this.createOrUpdateUser(user);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create or update user document in Firestore
   */
  async createOrUpdateUser(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New user - create document
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          onboarded: false,
          profileData: {},
        });
        console.log('✅ New user created in Firestore');
      } else {
        // Existing user - update last login
        await setDoc(
          userRef,
          {
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log('✅ User login updated');
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export const authService = new AuthService();
export default authService;
