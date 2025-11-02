// server/src/routes/chat.js
// ✅ UPDATED - Refactored to use MVC pattern with ChatController

import express from 'express';
import { ChatController } from '../controllers/chatController.js';
import { mealPlanIntentDetector } from '../middleware/mealPlanIntentDetector.js';

const router = express.Router();
const chatController = new ChatController();

/**
 * POST /api/chat/message
 * Send a message and get AI response with lab value integration
 */
router.post('/message', mealPlanIntentDetector, chatController.processMessage.bind(chatController));

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user
 */
router.get('/history/:userId', chatController.getChatHistory.bind(chatController));

/**
 * DELETE /api/chat/history/:userId
 * Clear chat history for a user
 */
router.delete('/history/:userId', chatController.clearChatHistory.bind(chatController));

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat message
 */
router.post('/feedback', chatController.submitFeedback.bind(chatController));

/**
 * GET /api/chat/feedback/:userId
 * Get feedback history for a user (admin/analytics use)
 */
router.get('/feedback/:userId', chatController.getFeedbackHistory.bind(chatController));

export default router;
