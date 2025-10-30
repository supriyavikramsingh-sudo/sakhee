import express from 'express';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('FeedbackRoute');

// Store feedback in memory for now (in production, this should be in a database)
const feedbackStore = new Map();

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
      timestamp: new Date().toISOString(),
      id: `${userId}_${messageId}_${Date.now()}`,
    };

    // Store feedback
    feedbackStore.set(feedbackEntry.id, feedbackEntry);

    logger.info(`✅ Feedback stored successfully`, {
      feedbackId: feedbackEntry.id,
      feedback,
      messageId,
      userId: userId.substring(0, 8) + '...',
      totalFeedbackCount: feedbackStore.size,
    });

    res.json({
      success: true,
      data: {
        id: feedbackEntry.id,
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

    // Filter feedback by userId
    const userFeedback = Array.from(feedbackStore.values())
      .filter((feedback) => feedback.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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
    const allFeedback = Array.from(feedbackStore.values());

    const stats = {
      total: allFeedback.length,
      thumbsUp: allFeedback.filter((f) => f.feedback === 'thumbs_up').length,
      thumbsDown: allFeedback.filter((f) => f.feedback === 'thumbs_down').length,
      uniqueUsers: new Set(allFeedback.map((f) => f.userId)).size,
    };

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
    const allFeedback = Array.from(feedbackStore.values());

    logger.info('🔍 Debug: All feedback requested', {
      count: allFeedback.length,
      storeSize: feedbackStore.size,
    });

    res.json({
      success: true,
      data: {
        feedback: allFeedback,
        count: allFeedback.length,
        storeKeys: Array.from(feedbackStore.keys()),
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
