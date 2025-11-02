import express from 'express';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('FeedbackRoute');

// Firestore collection name
const FEEDBACK_COLLECTION = 'chatFeedback';

/**
 * Submit feedback for a chat message
 * POST /api/feedback
 */
router.post('/', async (req, res) => {
  try {
    logger.info('📝 Feedback submission received', {
      body: req.body,
      hasMessageId: !!req.body.messageId,
      hasUserId: !!req.body.userId,
      hasFeedback: !!req.body.feedback,
    });

    const { messageId, userId, feedback, userPrompt, aiResponse } = req.body;

    // Validate required fields
    if (!messageId || !userId || !feedback) {
      logger.warn('⚠️ Missing required fields', { messageId, userId, feedback });
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: messageId, userId, feedback' },
      });
    }

    // Validate feedback type
    if (!['thumbs_up', 'thumbs_down'].includes(feedback)) {
      logger.warn('⚠️ Invalid feedback type', { feedback });
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
    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedbackEntry);

    logger.info(`✅ Feedback stored successfully in Firestore`, {
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
    logger.error('❌ Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

/**
 * Get feedback history for a user
 * GET /api/feedback/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID is required' },
      });
    }

    // Query Firestore for user's feedback
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
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

    logger.info('📊 User feedback retrieved', {
      userId: userId.substring(0, 8) + '...',
      count: userFeedback.length,
    });

    res.json({
      success: true,
      data: userFeedback,
    });
  } catch (error) {
    logger.error('Error retrieving feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

/**
 * Get feedback statistics (for admin/analytics)
 * GET /api/feedback/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // Get all feedback from Firestore
    const querySnapshot = await getDocs(collection(db, FEEDBACK_COLLECTION));
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

    logger.info('📊 Feedback stats calculated', stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error retrieving feedback stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

/**
 * DEBUG: Get all feedback entries (for testing)
 * GET /api/feedback/debug/all
 */
router.get('/debug/all', async (req, res) => {
  try {
    // Get all feedback from Firestore
    const querySnapshot = await getDocs(collection(db, FEEDBACK_COLLECTION));
    const allFeedback = [];

    querySnapshot.forEach((doc) => {
      allFeedback.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().createdAt,
      });
    });

    logger.info('🔍 Debug: All feedback requested from Firestore', {
      count: allFeedback.length,
    });

    res.json({
      success: true,
      data: {
        feedback: allFeedback,
        count: allFeedback.length,
        source: 'Firestore',
        collection: FEEDBACK_COLLECTION,
      },
    });
  } catch (error) {
    logger.error('Error retrieving all feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

export default router;
