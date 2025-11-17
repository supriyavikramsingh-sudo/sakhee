// server/src/routes/jobs.js
import express from 'express';
import jobService from '../services/jobService.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('JobRoutes');

/**
 * GET /api/jobs/:jobId
 * Get job status by ID
 */
router.get('/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { message: 'Job not found' },
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error('Failed to get job', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get job status' },
    });
  }
});

/**
 * GET /api/jobs/user/:userId
 * Get all jobs for a user
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const jobs = jobService.getUserJobs(userId);

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error('Failed to get user jobs', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get user jobs' },
    });
  }
});

/**
 * GET /api/jobs/user/:userId/active
 * Get active jobs for a user
 */
router.get('/user/:userId/active', (req, res) => {
  try {
    const { userId } = req.params;
    const jobs = jobService.getActiveUserJobs(userId);

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error('Failed to get active jobs', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get active jobs' },
    });
  }
});

export default router;
