// server/src/utils/retryHandler.js
// Retry logic with exponential backoff for API calls

import { Logger } from './logger.js';

const logger = new Logger('RetryHandler');

/**
 * Retry configuration defaults
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'rate_limit_exceeded',
    'timeout',
    'network',
    '429', // Too Many Requests
    '500', // Internal Server Error
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
  ],
};

/**
 * Check if error is retryable
 */
function isRetryableError(error, retryableErrors) {
  if (!error) return false;

  const errorString = error.toString().toLowerCase();
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || '';
  const statusCode = error.status || error.statusCode || '';

  // Check if error matches any retryable pattern
  return retryableErrors.some((pattern) => {
    const patternLower = pattern.toLowerCase();
    return (
      errorString.includes(patternLower) ||
      errorMessage.includes(patternLower) ||
      errorCode === pattern ||
      statusCode.toString() === pattern
    );
  });
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt, config) {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
  const finalDelay = Math.round(cappedDelay + jitter);

  return finalDelay;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {string} context - Context for logging (e.g., "Embeddings", "LLM")
 * @returns {Promise} - Result of the function or throws final error
 */
export async function withRetry(fn, options = {}, context = 'API Call') {
  const config = { ...DEFAULT_CONFIG, ...options };
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Log success on retry
      if (attempt > 0) {
        logger.info(
          `✅ ${context} succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`
        );
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const shouldRetry = isRetryableError(error, config.retryableErrors);

      // If not retryable or max retries reached, throw immediately
      if (!shouldRetry) {
        logger.error(`❌ ${context} failed with non-retryable error`, {
          error: error.message,
          code: error.code,
          status: error.status || error.statusCode,
        });
        throw error;
      }

      // If max retries reached, throw
      if (attempt === config.maxRetries) {
        logger.error(`❌ ${context} failed after ${config.maxRetries} retries`, {
          error: error.message,
          attempts: attempt + 1,
        });
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateDelay(attempt, config);

      logger.warn(`⚠️  ${context} failed (attempt ${attempt + 1}/${config.maxRetries + 1})`, {
        error: error.message,
        code: error.code,
        status: error.status || error.statusCode,
        retryIn: `${delay}ms`,
      });

      // Wait before retry
      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Retry handler class for more complex scenarios
 */
export class RetryHandler {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalRetries: 0,
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, context = 'API Call') {
    this.stats.totalCalls++;
    let retryCount = 0;

    try {
      const result = await withRetry(fn, this.config, context);
      this.stats.successfulCalls++;
      this.stats.totalRetries += retryCount;
      return result;
    } catch (error) {
      this.stats.failedCalls++;
      throw error;
    }
  }

  /**
   * Get retry statistics
   */
  getStats() {
    const successRate =
      this.stats.totalCalls > 0
        ? ((this.stats.successfulCalls / this.stats.totalCalls) * 100).toFixed(2)
        : '0.00';

    const avgRetries =
      this.stats.successfulCalls > 0
        ? (this.stats.totalRetries / this.stats.successfulCalls).toFixed(2)
        : '0.00';

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      avgRetries: parseFloat(avgRetries),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalRetries: 0,
    };
  }
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable(fn, config = {}, context = 'Function') {
  return async (...args) => {
    return withRetry(() => fn(...args), config, context);
  };
}

export default withRetry;
