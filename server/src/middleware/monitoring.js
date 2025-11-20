/**
 * Monitoring Middleware
 * Automatically logs API usage and errors
 */

import { logError, logAPIUsage } from '../services/monitoringService.js';

/**
 * API usage tracking middleware
 */
export function apiMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send function to capture response
  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    // Log API usage (async, non-blocking)
    logAPIUsage({
      userId: req.userId || req.params.userId || req.query.userId || 'anonymous',
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      success: res.statusCode < 400,
      tokensUsed: res.tokensUsed || 0, // Can be set by routes
      cached: res.fromCache || false, // Can be set by routes
    }).catch((error) => {
      console.error('Failed to log API usage:', error.message);
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(err, req, res, next) {
  // Log the error (async, non-blocking)
  logError({
    userId: req.userId || req.params.userId || req.query.userId || 'system',
    errorType: err.name || 'Error',
    message: err.message || 'Unknown error',
    stack: err.stack || '',
    endpoint: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    metadata: {
      body: JSON.stringify(req.body).substring(0, 500),
      query: JSON.stringify(req.query).substring(0, 500),
      params: JSON.stringify(req.params).substring(0, 500),
      headers: JSON.stringify({
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      }).substring(0, 500),
    },
  }).catch((logError) => {
    console.error('Failed to log error:', logError.message);
  });

  // Pass to next error handler
  next(err);
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();

  // Log slow requests
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log if request takes more than 3 seconds
    if (duration > 3000) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path} - ${duration}ms`, {
        userId: req.userId || 'anonymous',
        statusCode: res.statusCode,
      });

      // Could also log to Firestore for analysis
      logError({
        userId: req.userId || 'anonymous',
        errorType: 'PerformanceWarning',
        message: `Slow request: ${req.method} ${req.path}`,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        metadata: {
          duration,
          threshold: 3000,
        },
      }).catch(() => {});
    }
  });

  next();
}
