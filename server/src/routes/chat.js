// server/src/routes/chat.js
// ✅ UPDATED - Refactored to use MVC pattern with ChatController

import express from 'express';
import { ChatController } from '../controllers/chatController.js';
import { mealPlanIntentDetector } from '../middleware/mealPlanIntentDetector.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send a message and get AI response with lab value integration
 */
router.post('/message', mealPlanIntentDetector, ChatController.processMessage);

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user
 */
router.get('/history/:userId', ChatController.getChatHistory);

/**
 * DELETE /api/chat/history/:userId
 * Clear chat history for a user
 */
router.delete('/history/:userId', ChatController.clearChatHistory);

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat message
 */
router.post('/feedback', ChatController.submitFeedback);

/**
 * GET /api/chat/feedback/:userId
 * Get feedback history for a user (admin/analytics use)
 */
router.get('/feedback/:userId', ChatController.getFeedbackHistory);

export default router;
