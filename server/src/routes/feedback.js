import express from 'express';
import { FeedbackController } from '../controllers/feedbackController.js';

const router = express.Router();
const feedbackController = new FeedbackController();

/**
 * Submit feedback for a chat message
 * POST /api/feedback
 */
/**
 * Submit feedback for a chat message
 * POST /api/feedback
 */
router.post('/', (req, res) => feedbackController.submitFeedback(req, res));

/**
 * Get feedback history for a user
 * GET /api/feedback/:userId
 */
/**
 * Get feedback history for a user
 * GET /api/feedback/:userId
 */
router.get('/:userId', (req, res) => feedbackController.getUserFeedback(req, res));

/**
 * Get feedback statistics (for admin/analytics)
 * GET /api/feedback/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  await feedbackController.getFeedbackStats(req, res);
});

/**
 * DEBUG: Get all feedback entries (for testing)
 * GET /api/feedback/debug/all
 */
router.get('/debug/all', async (req, res) => {
  await feedbackController.getAllFeedback(req, res);
});

export default router;
