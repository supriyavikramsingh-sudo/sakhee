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
  addDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

class FirestoreService {
  // ==========================================
  // USER PROFILE
  // ==========================================

  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() }
      }
      return { success: false, error: 'User not found' }
    } catch (error) {
      console.error('Get user profile error:', error)
      return { success: false, error: error.message }
    }
  }

  async updateUserProfile(userId, data) {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (error) {
      console.error('Update user profile error:', error)
      return { success: false, error: error.message }
    }
  }

  async completeOnboarding(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        onboarded: true,
        profileData,
        onboardedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (error) {
      console.error('Complete onboarding error:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // MEAL PLANS
  // ==========================================

  async saveMealPlan(userId, mealPlanData) {
    try {
      const mealPlanRef = doc(collection(db, 'users', userId, 'mealPlans'))
      await setDoc(mealPlanRef, {
        ...mealPlanData,
        createdAt: serverTimestamp(),
        active: true
      })
      return { success: true, id: mealPlanRef.id }
    } catch (error) {
      console.error('Save meal plan error:', error)
      return { success: false, error: error.message }
    }
  }

  async getMealPlans(userId) {
    try {
      const mealPlansRef = collection(db, 'users', userId, 'mealPlans')
      const q = query(mealPlansRef, orderBy('createdAt', 'desc'), limit(10))
      const snapshot = await getDocs(q)
      
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return { success: true, data: plans }
    } catch (error) {
      console.error('Get meal plans error:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteMealPlan(userId, planId) {
    try {
      const planRef = doc(db, 'users', userId, 'mealPlans', planId)
      await deleteDoc(planRef)
      return { success: true }
    } catch (error) {
      console.error('Delete meal plan error:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // PROGRESS TRACKING
  // ==========================================

  async logProgress(userId, progressData) {
    try {
      const progressRef = collection(db, 'users', userId, 'progress')
      const docRef = await addDoc(progressRef, {
        ...progressData,
        createdAt: serverTimestamp()
      })
      return { success: true, id: docRef.id }
    } catch (error) {
      console.error('Log progress error:', error)
      return { success: false, error: error.message }
    }
  }

  async getProgress(userId, startDate, endDate) {
    try {
      const progressRef = collection(db, 'users', userId, 'progress')
      let q = query(progressRef, orderBy('date', 'desc'))

      if (startDate) {
        q = query(q, where('date', '>=', startDate))
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate))
      }

      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return { success: true, data: entries }
    } catch (error) {
      console.error('Get progress error:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteProgressEntry(userId, entryId) {
    try {
      const entryRef = doc(db, 'users', userId, 'progress', entryId)
      await deleteDoc(entryRef)
      return { success: true }
    } catch (error) {
      console.error('Delete progress entry error:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // MEDICAL REPORTS
  // ==========================================

  async saveReport(userId, reportData) {
    try {
      const reportRef = doc(collection(db, 'users', userId, 'reports'))
      await setDoc(reportRef, {
        ...reportData,
        createdAt: serverTimestamp()
      })
      return { success: true, id: reportRef.id }
    } catch (error) {
      console.error('Save report error:', error)
      return { success: false, error: error.message }
    }
  }

  async getReports(userId) {
    try {
      const reportsRef = collection(db, 'users', userId, 'reports')
      const q = query(reportsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return { success: true, data: reports }
    } catch (error) {
      console.error('Get reports error:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteReport(userId, reportId) {
    try {
      const reportRef = doc(db, 'users', userId, 'reports', reportId)
      await deleteDoc(reportRef)
      return { success: true }
    } catch (error) {
      console.error('Delete report error:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // CHAT HISTORY
  // ==========================================

  async saveChatMessage(userId, message) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory')
      const docRef = await addDoc(chatRef, {
        ...message,
        createdAt: serverTimestamp()
      })
      return { success: true, id: docRef.id }
    } catch (error) {
      console.error('Save chat message error:', error)
      return { success: false, error: error.message }
    }
  }

  async getChatHistory(userId, limitCount = 50) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory')
      const q = query(chatRef, orderBy('createdAt', 'desc'), limit(limitCount))
      const snapshot = await getDocs(q)
      
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse() // Reverse to get chronological order
      
      return { success: true, data: messages }
    } catch (error) {
      console.error('Get chat history error:', error)
      return { success: false, error: error.message }
    }
  }

  async clearChatHistory(userId) {
    try {
      const chatRef = collection(db, 'users', userId, 'chatHistory')
      const snapshot = await getDocs(chatRef)
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      return { success: true }
    } catch (error) {
      console.error('Clear chat history error:', error)
      return { success: false, error: error.message }
    }
  }
}

export const firestoreService = new FirestoreService()
export default firestoreService