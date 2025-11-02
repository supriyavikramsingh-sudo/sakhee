const express = require('express');
const progressController = require('../controllers/progressController');

const router = express.Router();

/**
 * POST /api/progress/:userId/log
 * Log daily progress entry
 */
router.post('/:userId/log', progressController.logProgress);

/**
 * GET /api/progress/:userId
 * Get user progress data
 */
router.get('/:userId', progressController.getUserProgress);

/**
 * PUT /api/progress/:userId/entry/:entryId
 * Update progress entry
 */
router.put('/:userId/entry/:entryId', progressController.updateProgress);

/**
 * DELETE /api/progress/:userId/entry/:entryId
 * Delete progress entry
 */
router.delete('/:userId/entry/:entryId', progressController.deleteProgress);

/**
 * POST /api/progress/:userId/goals
 * Set or update goals
 */
router.post('/:userId/goals', progressController.setGoals);

/**
 * GET /api/progress/:userId/analytics
 * Get progress analytics
 */
router.get('/:userId/analytics', progressController.getAnalytics);

module.exports = router;
export default router
