/**
 * Cron Jobs Management Routes
 *
 * Provides endpoints to manually trigger and check status of cron jobs.
 * Useful for testing and debugging.
 *
 * Phase 5: Polish & Optimization
 */

import express from 'express';
import { runJobManually, getJobsStatus } from '../cron/cronScheduler.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('CronRoutes');

/**
 * GET /api/cron/status
 * Get status of all scheduled cron jobs
 */
router.get('/status', (req, res) => {
  try {
    const status = getJobsStatus();
    res.json({
      success: true,
      data: {
        jobs: status,
        count: status.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get cron jobs status', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cron jobs status',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/cron/trigger/:jobName
 * Manually trigger a specific cron job
 *
 * Available jobs:
 * - weeklyActivity: Calculate weekly activity levels for all users
 */
router.post('/trigger/:jobName', async (req, res) => {
  const { jobName } = req.params;

  logger.info(`Manual trigger requested for job: ${jobName}`);

  try {
    const result = await runJobManually(jobName);

    if (result.success) {
      logger.info(`Job ${jobName} completed successfully`, result.stats);
      res.json({
        success: true,
        message: result.message,
        data: result.stats,
        errors: result.errors,
      });
    } else {
      logger.error(`Job ${jobName} failed`, { error: result.error });
      res.status(500).json({
        success: false,
        error: {
          message: result.message,
          details: result.error,
        },
      });
    }
  } catch (error) {
    logger.error(`Failed to run job ${jobName}`, { error: error.message });
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/cron/help
 * Get help information about available cron jobs
 */
router.get('/help', (req, res) => {
  res.json({
    success: true,
    data: {
      jobs: [
        {
          name: 'weeklyActivity',
          schedule: '0 1 * * 1',
          description: 'Calculate weekly activity levels every Monday at 1:00 AM UTC',
          manualTrigger: 'POST /api/cron/trigger/weeklyActivity',
        },
      ],
      endpoints: {
        status: 'GET /api/cron/status',
        trigger: 'POST /api/cron/trigger/:jobName',
        help: 'GET /api/cron/help',
      },
    },
  });
});

export default router;
