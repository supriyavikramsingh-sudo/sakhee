import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirestoreService {
  // ==========================================
  // USER PROFILE
  // ==========================================

  async checkMealPlanLimit(userId) {
    try {
      const usageRef = doc(db, 'users', userId, 'mealPlanUsage', 'counter');

      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        // First time user - can generate
        return {
          success: true,
          canGenerate: true,
          planCount: 0,
          isPro: false,
        };
      }

      const data = usageDoc.data();
      const isPro = data.isPro || false;
      const planCount = data.totalGenerated || 0;

      // Pro users have unlimited plans
      if (isPro) {
        return {
          success: true,
          canGenerate: true,
          planCount,
          isPro: true,
        };
      }

      // Free users: limit to 1 plan
      const canGenerate = planCount < 1;

      return {
        success: true,
        canGenerate,
        planCount,
        isPro: false,
      };
    } catch (error) {
      console.error('Check meal plan limit error:', error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Increment meal plan usage counter after successful generation
   * @param {string} userId
   */
  async incrementMealPlanUsage(userId) {
    try {
      const usageRef = doc(db, 'users', userId, 'mealPlanUsage', 'counter');
      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        // Create initial usage document
        await setDoc(usageRef, {
          totalGenerated: 1,
          firstGeneratedAt: serverTimestamp(),
          lastGeneratedAt: serverTimestamp(),
          isPro: false,
        });
      } else {
        // Increment existing counter
        const currentCount = usageDoc.data().totalGenerated || 0;
        await updateDoc(usageRef, {
          totalGenerated: currentCount + 1,
          lastGeneratedAt: serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Increment meal plan usage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is whitelisted for testing (bypass limits)
   * @param {string} email
   * @returns {boolean}
   */
  isTestAccount(email) {
    // ⚠️ IMPORTANT: Add your test email here
    const testEmails = ['supriyavikramsingh@gmail.com'];

    return testEmails.includes(email.toLowerCase());
  }

  /**
   * Get meal plan usage for a user
   * @param {string} userId
   */
  async getMealPlanUsage(userId) {
    try {
      const usageRef = doc(db, 'users', userId, 'mealPlanUsage', 'counter');
      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        return {
          success: true,
          data: {
            totalGenerated: 0,
            isPro: false,
          },
        };
      }

      return {
        success: true,
        data: usageDoc.data(),
      };
    } catch (error) {
      console.error('Get meal plan usage error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(userId, data) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async completeOnboarding(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          onboarded: true,
          profileData,
          onboardedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true };
    } catch (error) {
      console.error('Complete onboarding error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // MEAL PLANS
  // ==========================================

  async saveMealPlan(userId, mealPlanData) {
    try {
      const mealPlanRef = doc(collection(db, 'users', userId, 'mealPlans'));
      await setDoc(mealPlanRef, {
        ...mealPlanData,
        createdAt: serverTimestamp(),
        active: true,
      });
      return { success: true, id: mealPlanRef.id };
    } catch (error) {
      console.error('Save meal plan error:', error);
      return { success: false, error: error.message };
    }
  }

  async getMealPlans(userId) {
    try {
      const mealPlansRef = collection(db, 'users', userId, 'mealPlans');
      const q = query(mealPlansRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const plans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, data: plans };
    } catch (error) {
      console.error('Get meal plans error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMealPlan(userId, planId) {
    try {
      const planRef = doc(db, 'users', userId, 'mealPlans', planId);
      await deleteDoc(planRef);
      return { success: true };
    } catch (error) {
      console.error('Delete meal plan error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // PROGRESS TRACKING
  // ==========================================

  async logProgress(userId, progressData) {
    try {
      const progressRef = collection(db, 'users', userId, 'progress');
      const docRef = await addDoc(progressRef, {
        ...progressData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Log progress error:', error);
      return { success: false, error: error.message };
    }
  }

  async getProgress(userId, startDate, endDate) {
    try {
      const progressRef = collection(db, 'users', userId, 'progress');
      let q = query(progressRef, orderBy('date', 'desc'));

      if (startDate) {
        q = query(q, where('date', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate));
      }

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, data: entries };
    } catch (error) {
      console.error('Get progress error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteProgressEntry(userId, entryId) {
    try {
      const entryRef = doc(db, 'users', userId, 'progress', entryId);
      await deleteDoc(entryRef);
      return { success: true };
    } catch (error) {
      console.error('Delete progress entry error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // MEDICAL REPORTS (Single Report Per User)
  // ==========================================

  /**
   * Get user's current medical report
   */
  async getUserMedicalReport(userId) {
    try {
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
      const reportDoc = await getDoc(reportRef);

      if (reportDoc.exists()) {
        return {
          success: true,
          data: {
            id: reportDoc.id,
            ...reportDoc.data(),
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Get user medical report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save medical report (replaces existing)
   */
  async saveMedicalReport(userId, reportData) {
    try {
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
      await setDoc(reportRef, {
        ...reportData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: 'current' };
    } catch (error) {
      console.error('Save medical report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user's medical report
   */
  async deleteMedicalReport(userId) {
    try {
      const reportRef = doc(db, 'users', userId, 'medicalReport', 'current');
      await deleteDoc(reportRef);
      return { success: true };
    } catch (error) {
      console.error('Delete medical report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a medical report
   */
  async hasMedicalReport(userId) {
    try {
      const result = await this.getUserMedicalReport(userId);
      return {
        success: true,
        hasReport: result.success && result.data !== null,
      };
    } catch (error) {
      console.error('Check medical report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // LEGACY REPORTS (Multi-Report System - Deprecated)
  // ==========================================

  async saveReport(userId, reportData) {
    try {
      const reportRef = doc(collection(db, 'users', userId, 'reports'));
      await setDoc(reportRef, {
        ...reportData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: reportRef.id };
    } catch (error) {
      console.error('Save report error:', error);
      return { success: false, error: error.message };
    }
  }

  async getReports(userId) {
    try {
      const reportsRef = collection(db, 'users', userId, 'reports');
      const q = query(reportsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const reports = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, data: reports };
    } catch (error) {
      console.error('Get reports error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteReport(userId, reportId) {
    try {
      const reportRef = doc(db, 'users', userId, 'reports', reportId);
      await deleteDoc(reportRef);
      return { success: true };
    } catch (error) {
      console.error('Delete report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // CHAT HISTORY
  // ==========================================

  async saveChatMessage(userId, message) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory');
      const docRef = await addDoc(chatRef, {
        ...message,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Save chat message error:', error);
      return { success: false, error: error.message };
    }
  }

  async getChatHistory(userId, limitCount = 50) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory');
      const q = query(chatRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      const messages = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .reverse(); // Reverse to get chronological order

      return { success: true, data: messages };
    } catch (error) {
      console.error('Get chat history error:', error);
      return { success: false, error: error.message };
    }
  }

  async clearChatHistory(userId) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory');
      const snapshot = await getDocs(chatRef);

      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return { success: true };
    } catch (error) {
      console.error('Clear chat history error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;
