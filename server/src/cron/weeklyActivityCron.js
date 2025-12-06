/**
 * Weekly Activity Calculation Cron Job
 *
 * Runs every Monday at 1:00 AM to calculate weekly activity levels for all active users.
 * This ensures all users have up-to-date weekly activity metrics for TDEE calculations.
 *
 * Phase 5: Polish & Optimization
 */

import admin from 'firebase-admin';
import { Logger } from '../utils/logger.js';
import { calculateWeeklyActivityLevel } from '../services/progressTrackerService.js';

const logger = new Logger('WeeklyActivityCron');

/**
 * Get the start of the current week (Monday)
 */
function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Get all active users (users who logged data in the last 30 days)
 *
 * Note: With subcollection structure (dailyTracking/{userId}/entries/{date}),
 * we need to use collectionGroup query to find active users across all subcollections.
 */
async function getActiveUsers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const db = admin.firestore();

    // Use collectionGroup to query across all 'entries' subcollections
    const snapshot = await db
      .collectionGroup('entries')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();

    // Extract unique user IDs from the document paths
    // Path format: dailyTracking/{userId}/entries/{date}
    const userIds = new Set();
    snapshot.forEach((doc) => {
      // Get userId from the document path
      const pathSegments = doc.ref.path.split('/');
      if (pathSegments[0] === 'dailyTracking' && pathSegments.length >= 2) {
        const userId = pathSegments[1];
        userIds.add(userId);
      }
    });

    return Array.from(userIds);
  } catch (error) {
    logger.error('Failed to fetch active users', { error: error.message });
    throw error;
  }
}

/**
 * Calculate weekly activity for a single user
 */
async function calculateUserWeeklyActivity(userId, weekStartDate) {
  try {
    const result = await calculateWeeklyActivityLevel(userId, weekStartDate);

    if (result) {
      logger.info('Weekly activity calculated', {
        userId,
        weekStartDate,
        exerciseDays: result.exerciseDays,
        activityLevel: result.activityLevel,
      });
      return { success: true, userId };
    } else {
      logger.warn('No data for weekly activity calculation', { userId, weekStartDate });
      return { success: false, userId, reason: 'no_data' };
    }
  } catch (error) {
    logger.error('Weekly activity calculation failed', {
      userId,
      weekStartDate,
      error: error.message,
    });
    return { success: false, userId, error: error.message };
  }
}

/**
 * Main cron job function
 * Processes all active users in batches to avoid overload
 */
async function runWeeklyActivityCron() {
  const startTime = Date.now();
  const weekStartDate = getWeekStartDate();

  logger.info('Starting weekly activity cron job', { weekStartDate });

  try {
    // Get all active users
    const activeUsers = await getActiveUsers();
    logger.info('Active users found', { count: activeUsers.length });

    if (activeUsers.length === 0) {
      logger.info('No active users to process');
      return {
        success: true,
        message: 'No active users to process',
        stats: { total: 0, success: 0, failed: 0 },
      };
    }

    // Process users in batches of 50 to avoid overwhelming the system
    const BATCH_SIZE = 50;
    const results = {
      total: activeUsers.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(activeUsers.length / BATCH_SIZE);

      logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
        batchSize: batch.length,
      });

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map((userId) => calculateUserWeeklyActivity(userId, weekStartDate))
      );

      // Aggregate results
      batchResults.forEach((result) => {
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            userId: result.userId,
            reason: result.reason || result.error,
          });
        }
      });

      // Add delay between batches to avoid rate limits (500ms)
      if (i + BATCH_SIZE < activeUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Weekly activity cron job completed', {
      weekStartDate,
      duration: `${duration}ms`,
      stats: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        successRate: `${((results.success / results.total) * 100).toFixed(2)}%`,
      },
    });

    // Log errors if any (limit to first 10)
    if (results.errors.length > 0) {
      logger.warn('Some users failed processing', {
        failedCount: results.failed,
        sampleErrors: results.errors.slice(0, 10),
      });
    }

    return {
      success: true,
      message: 'Weekly activity calculation completed',
      stats: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        duration: `${duration}ms`,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Weekly activity cron job failed', {
      weekStartDate,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      message: 'Weekly activity cron job failed',
      error: error.message,
    };
  }
}

export { runWeeklyActivityCron, getActiveUsers, getWeekStartDate, calculateUserWeeklyActivity };
