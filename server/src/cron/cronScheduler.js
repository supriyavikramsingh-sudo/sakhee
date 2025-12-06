/**
 * Cron Job Scheduler
 *
 * Central scheduler for all automated jobs in the application.
 * Uses node-cron for scheduling periodic tasks.
 *
 * Phase 5: Polish & Optimization
 */

import cron from 'node-cron';
import { Logger } from '../utils/logger.js';
import { runWeeklyActivityCron } from './weeklyActivityCron.js';

const logger = new Logger('CronScheduler');

// Track scheduled jobs
const scheduledJobs = new Map();

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  logger.info('Initializing cron jobs...');

  // Weekly Activity Calculation - Every Monday at 1:00 AM
  const weeklyActivityJob = cron.schedule(
    '0 1 * * 1', // Cron expression: minute=0, hour=1, day=*, month=*, dayOfWeek=1 (Monday)
    async () => {
      logger.info('Weekly activity cron triggered');
      try {
        const result = await runWeeklyActivityCron();
        if (result.success) {
          logger.info('Weekly activity cron completed successfully', result.stats);
        } else {
          logger.error('Weekly activity cron failed', { error: result.error });
        }
      } catch (error) {
        logger.error('Weekly activity cron execution error', {
          error: error.message,
          stack: error.stack,
        });
      }
    },
    {
      scheduled: true,
      timezone: 'UTC', // Use UTC for consistency across deployments
    }
  );

  scheduledJobs.set('weeklyActivity', weeklyActivityJob);

  logger.info('Cron jobs initialized', {
    jobs: [
      {
        name: 'weeklyActivity',
        schedule: '0 1 * * 1',
        description: 'Calculate weekly activity levels every Monday at 1:00 AM UTC',
      },
    ],
  });
}

/**
 * Stop all cron jobs (used during graceful shutdown)
 */
function stopAllCronJobs() {
  logger.info('Stopping all cron jobs...');

  scheduledJobs.forEach((job, name) => {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  });

  scheduledJobs.clear();
  logger.info('All cron jobs stopped');
}

/**
 * Manually trigger a specific cron job (for testing/debugging)
 *
 * @param {string} jobName - Name of the job to run
 * @returns {Promise<Object>} - Result of the job execution
 */
async function runJobManually(jobName) {
  logger.info(`Manually triggering cron job: ${jobName}`);

  switch (jobName) {
    case 'weeklyActivity':
      return await runWeeklyActivityCron();
    default:
      throw new Error(`Unknown job name: ${jobName}`);
  }
}

/**
 * Get status of all scheduled jobs
 */
function getJobsStatus() {
  const status = [];

  scheduledJobs.forEach((job, name) => {
    status.push({
      name,
      running: job.running || false,
    });
  });

  return status;
}

export { initializeCronJobs, stopAllCronJobs, runJobManually, getJobsStatus };
