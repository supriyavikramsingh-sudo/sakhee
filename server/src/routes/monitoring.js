/**
 * Monitoring Routes
 * Dashboard endpoints for viewing error logs and API usage statistics
 */

import express from 'express';
import {
  getErrorStats,
  getAPIUsageStats,
  markErrorResolved,
  cleanupOldLogs,
} from '../services/monitoringService.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('MonitoringRoutes');

/**
 * Middleware to verify admin access (placeholder - implement proper auth)
 */
const verifyAdmin = (req, res, next) => {
  // TODO: Implement proper admin authentication
  // For now, just log the access attempt
  logger.info('Admin route accessed', { path: req.path });
  next();
};

/**
 * GET /api/monitoring/errors
 * Get error statistics
 */
router.get('/errors', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, limit } = req.query;

    const stats = await getErrorStats({
      startDate,
      endDate,
      userId,
      limit: limit ? parseInt(limit) : 100,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get error stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve error statistics',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/monitoring/usage
 * Get API usage statistics
 */
router.get('/usage', verifyAdmin, async (req, res) => {
  try {
    const { date, userId } = req.query;

    const stats = await getAPIUsageStats({
      date,
      userId,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get API usage stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve API usage statistics',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/monitoring/errors/:errorId/resolve
 * Mark an error as resolved
 */
router.put('/errors/:errorId/resolve', verifyAdmin, async (req, res) => {
  try {
    const { errorId } = req.params;

    await markErrorResolved(errorId);

    res.json({
      success: true,
      message: 'Error marked as resolved',
    });
  } catch (error) {
    logger.error('Mark error resolved failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to mark error as resolved',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/monitoring/cleanup
 * Clean up old logs
 */
router.post('/cleanup', verifyAdmin, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const deletedCount = await cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old logs`,
      deletedCount,
    });
  } catch (error) {
    logger.error('Cleanup logs failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clean up logs',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/monitoring/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        details: error.message,
      },
    });
  }
});

export default router;
