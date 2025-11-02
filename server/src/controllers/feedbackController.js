import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

export class FeedbackController {
  constructor() {
    this.logger = new Logger('FeedbackController');
    this.FEEDBACK_COLLECTION = 'chatFeedback';
  }

  /**
   * Submit feedback for a chat message
   */
  async submitFeedback(req, res) {
    const requestId = req.requestId;
    
    try {
      this.logger.info('📝 Feedback submission received', {
        requestId,
        body: req.body,
        hasMessageId: !!req.body.messageId,
        hasUserId: !!req.body.userId,
        hasFeedback: !!req.body.feedback,
      });

      const { messageId, userId, feedback, userPrompt, aiResponse } = req.body;

      // Validate required fields
      if (!messageId || !userId || !feedback) {
        this.logger.warn('⚠️ Missing required fields', { 
          requestId,
          messageId, 
          userId, 
          feedback 
        });
        return res.status(400).json({
          success: false,
          error: { message: 'Missing required fields: messageId, userId, feedback' },
        });
      }

      // Validate feedback type
      if (!['thumbs_up', 'thumbs_down'].includes(feedback)) {
        this.logger.warn('⚠️ Invalid feedback type', { requestId, feedback });
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid feedback type. Must be thumbs_up or thumbs_down' },
        });
      }

      // Create feedback entry
      const feedbackEntry = {
        messageId,
        userId,
        feedback,
        userPrompt: userPrompt || '',
        aiResponse: aiResponse || '',
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString(),
      };

      // Store feedback in Firestore
      const docRef = await addDoc(collection(db, this.FEEDBACK_COLLECTION), feedbackEntry);

      this.logger.info(`✅ Feedback stored successfully in Firestore`, {
        requestId,
        feedbackId: docRef.id,
        feedback,
        messageId,
        userId: userId.substring(0, 8) + '...',
      });

      res.json({
        success: true,
        data: {
          id: docRef.id,
          message: 'Feedback submitted successfully',
        },
      });
    } catch (error) {
      this.logger.error('❌ Error submitting feedback:', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  /**
   * Get feedback history for a user
   */
  async getUserFeedback(req, res) {
    const requestId = req.requestId;
    
    try {
      const { userId } = req.params;

      if (!userId) {
        this.logger.warn('⚠️ User ID is required', { requestId });
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' },
        });
      }

      // Query Firestore for user's feedback
      const q = query(
        collection(db, this.FEEDBACK_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const userFeedback = [];

      querySnapshot.forEach((doc) => {
        userFeedback.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().createdAt,
        });
      });

      this.logger.info('📊 User feedback retrieved', {
        requestId,
        userId: userId.substring(0, 8) + '...',
        count: userFeedback.length,
      });

      res.json({
        success: true,
        data: userFeedback,
      });
    } catch (error) {
      this.logger.error('❌ Error retrieving feedback:', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  /**
   * Get feedback statistics (for admin/analytics)
   */
  async getFeedbackStats(req, res) {
    const requestId = req.requestId;
    
    try {
      // Get all feedback from Firestore
      const querySnapshot = await getDocs(collection(db, this.FEEDBACK_COLLECTION));
      const allFeedback = [];

      querySnapshot.forEach((doc) => {
        allFeedback.push(doc.data());
      });

      const stats = {
        total: allFeedback.length,
        thumbsUp: allFeedback.filter((f) => f.feedback === 'thumbs_up').length,
        thumbsDown: allFeedback.filter((f) => f.feedback === 'thumbs_down').length,
        uniqueUsers: new Set(allFeedback.map((f) => f.userId)).size,
      };

      this.logger.info('📊 Feedback stats calculated', { requestId, stats });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      this.logger.error('❌ Error retrieving feedback stats:', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  /**
   * DEBUG: Get all feedback entries (for testing)
   */
  async getAllFeedback(req, res) {
    const requestId = req.requestId;
    
    try {
      // Get all feedback from Firestore
      const querySnapshot = await getDocs(collection(db, this.FEEDBACK_COLLECTION));
      const allFeedback = [];

      querySnapshot.forEach((doc) => {
        allFeedback.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().createdAt,
        });
      });

      this.logger.info('🔍 Debug: All feedback requested from Firestore', {
        requestId,
        count: allFeedback.length,
      });

      res.json({
        success: true,
        data: {
          feedback: allFeedback,
          count: allFeedback.length,
          source: 'Firestore',
          collection: this.FEEDBACK_COLLECTION,
        },
      });
    } catch (error) {
      this.logger.error('❌ Error retrieving all feedback:', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }
}
