/**
 * Error Monitoring Service
 * Lightweight error tracking and API usage monitoring
 */

import { db } from '../config/firebase.js';

/**
 * Log application error
 * @param {Object} errorData - Error information
 */
export async function logError(errorData) {
  try {
    const {
      userId = 'system',
      errorType = 'unknown',
      message = '',
      stack = '',
      endpoint = '',
      method = '',
      statusCode = 500,
      metadata = {},
    } = errorData;

    const errorLog = {
      userId,
      errorType,
      message,
      stack: stack.substring(0, 2000), // Limit stack trace
      endpoint,
      method,
      statusCode,
      metadata,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    // Store in Firestore
    await db.collection('errorLogs').add(errorLog);

    // Log to console for development
    console.error('[ERROR LOG]', {
      type: errorType,
      message,
      endpoint,
      timestamp: errorLog.timestamp,
    });
  } catch (error) {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to log error:', error.message);
  }
}

/**
 * Log API usage for monitoring
 * @param {Object} usageData - API usage information
 */
export async function logAPIUsage(usageData) {
  try {
    const {
      userId,
      endpoint,
      method,
      statusCode,
      responseTime,
      tokensUsed = 0,
      cached = false,
      success = true,
    } = usageData;

    const usageLog = {
      userId,
      endpoint,
      method,
      statusCode,
      responseTime,
      tokensUsed,
      cached,
      success,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0], // For daily aggregation
    };

    // Store in Firestore
    await db.collection('apiUsage').add(usageLog);
  } catch (error) {
    // Fail silently
    console.error('Failed to log API usage:', error.message);
  }
}

/**
 * Get error statistics for a date range
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Error statistics
 */
export async function getErrorStats(options = {}) {
  try {
    const { startDate, endDate, userId = null, limit = 100 } = options;

    let query = db.collection('errorLogs').orderBy('timestamp', 'desc');

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.limit(limit).get();

    const errors = [];
    snapshot.forEach((doc) => {
      errors.push({ id: doc.id, ...doc.data() });
    });

    // Calculate statistics
    const stats = {
      totalErrors: errors.length,
      byType: {},
      byEndpoint: {},
      byStatusCode: {},
      unresolvedCount: 0,
      recentErrors: errors.slice(0, 10),
    };

    errors.forEach((error) => {
      // By type
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;

      // By endpoint
      if (error.endpoint) {
        stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;
      }

      // By status code
      stats.byStatusCode[error.statusCode] = (stats.byStatusCode[error.statusCode] || 0) + 1;

      // Unresolved
      if (!error.resolved) {
        stats.unresolvedCount++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Failed to get error stats:', error);
    throw error;
  }
}

/**
 * Get API usage statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Usage statistics
 */
export async function getAPIUsageStats(options = {}) {
  try {
    const { date = new Date().toISOString().split('T')[0], userId = null } = options;

    let query = db.collection('apiUsage').where('date', '==', date);

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();

    const usageData = [];
    snapshot.forEach((doc) => {
      usageData.push(doc.data());
    });

    // Calculate statistics
    const stats = {
      date,
      totalRequests: usageData.length,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      cachedRequests: 0,
      cacheHitRate: 0,
      byEndpoint: {},
      byStatusCode: {},
    };

    let totalResponseTime = 0;

    usageData.forEach((usage) => {
      // Success/failure
      if (usage.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }

      // Response time
      totalResponseTime += usage.responseTime || 0;

      // Tokens
      stats.totalTokensUsed += usage.tokensUsed || 0;

      // Cache
      if (usage.cached) {
        stats.cachedRequests++;
      }

      // By endpoint
      const endpoint = usage.endpoint || 'unknown';
      if (!stats.byEndpoint[endpoint]) {
        stats.byEndpoint[endpoint] = {
          count: 0,
          totalResponseTime: 0,
          avgResponseTime: 0,
        };
      }
      stats.byEndpoint[endpoint].count++;
      stats.byEndpoint[endpoint].totalResponseTime += usage.responseTime || 0;

      // By status code
      stats.byStatusCode[usage.statusCode] = (stats.byStatusCode[usage.statusCode] || 0) + 1;
    });

    // Calculate averages
    if (stats.totalRequests > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / stats.totalRequests);
      stats.cacheHitRate = Math.round((stats.cachedRequests / stats.totalRequests) * 100);
    }

    // Calculate per-endpoint averages
    Object.keys(stats.byEndpoint).forEach((endpoint) => {
      const endpointData = stats.byEndpoint[endpoint];
      endpointData.avgResponseTime = Math.round(
        endpointData.totalResponseTime / endpointData.count
      );
    });

    return stats;
  } catch (error) {
    console.error('Failed to get API usage stats:', error);
    throw error;
  }
}

/**
 * Mark error as resolved
 * @param {string} errorId - Error document ID
 * @returns {Promise<void>}
 */
export async function markErrorResolved(errorId) {
  try {
    await db.collection('errorLogs').doc(errorId).update({
      resolved: true,
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to mark error as resolved:', error);
    throw error;
  }
}

/**
 * Clean up old logs (run as scheduled job)
 * @param {number} daysToKeep - Number of days to retain logs
 * @returns {Promise<number>} Number of logs deleted
 */
export async function cleanupOldLogs(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    // Clean error logs
    const errorSnapshot = await db.collection('errorLogs').where('timestamp', '<', cutoffISO).get();

    let deletedCount = 0;
    const batch = db.batch();

    errorSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    // Clean API usage logs
    const usageSnapshot = await db.collection('apiUsage').where('timestamp', '<', cutoffISO).get();

    usageSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    console.log(`Cleaned up ${deletedCount} old logs`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to clean up old logs:', error);
    throw error;
  }
}
