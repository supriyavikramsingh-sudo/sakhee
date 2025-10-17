// server/src/routes/chat.js
// ✅ UPDATED - Passes userId to chatChain for lab value retrieval

import express from 'express';
import { chatChain } from '../langchain/chains/chatChain.js';
import { Logger } from '../utils/logger.js';
import { mealPlanIntentDetector } from '../middleware/mealPlanIntentDetector.js';

const router = express.Router();
const logger = new Logger('ChatRoutes');

// Store for chat history (replace with DB in production)
const chatHistories = new Map();

/**
 * POST /api/chat/message
 * Send a message and get AI response with lab value integration
 */
router.post('/message', mealPlanIntentDetector, async (req, res) => {
  try {
    const { message, userId, userContext = {} } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message cannot be empty' },
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID is required' },
      });
    }

    logger.info('Processing chat message with lab value integration', {
      userId,
      messageLength: message.length,
      hasUserContext: !!userContext,
    });

    // Get or create chat history
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }

    // CRITICAL: Pass userId in userContext for lab value retrieval
    const enrichedContext = {
      ...userContext,
      userId, // Ensure userId is always available
    };

    // Process message with RAG + Lab Values + Reddit + SERP
    const response = await chatChain.processMessage(message, enrichedContext);

    // Add to history
    const history = chatHistories.get(userId);
    history.push({
      type: 'user',
      message,
      timestamp: new Date(),
    });
    history.push({
      type: 'assistant',
      message: response.message,
      sources: response.sources,
      contextUsed: response.contextUsed,
      timestamp: new Date(),
    });

    // Keep only last 50 messages
    if (history.length > 50) {
      chatHistories.set(userId, history.slice(-50));
    }

    // Check for health-related flags
    const requiresDoctor = req.requiresDoctorConsultation;
    const severity = req.severityLevel;

    res.json({
      success: true,
      data: {
        message: response.message,
        sources: response.sources,
        contextUsed: response.contextUsed,
        requiresDoctor,
        severity,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Chat message processing failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process message', details: error.message },
    });
  }
});

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user
 */
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const history = chatHistories.get(userId) || [];

    res.json({
      success: true,
      data: {
        messages: history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error('Get chat history failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve chat history' },
    });
  }
});

/**
 * DELETE /api/chat/history/:userId
 * Clear chat history for a user
 */
router.delete('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    chatHistories.delete(userId);

    logger.info('Chat history cleared', { userId });

    res.json({
      success: true,
      data: { message: 'Chat history cleared successfully' },
    });
  } catch (error) {
    logger.error('Clear chat history failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to clear chat history' },
    });
  }
});

export default router;
