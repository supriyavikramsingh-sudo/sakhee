// server/src/utils/__tests__/retryHandler.test.js
// Unit tests for retry handler

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, RetryHandler, isRetryableError, calculateDelay } from '../retryHandler.js';

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt without retry', async () => {
      const successFn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(successFn, {}, 'Test');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(
        fn,
        {
          maxRetries: 3,
          initialDelayMs: 10, // Short delay for testing
        },
        'Test'
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(withRetry(fn, {}, 'Test')).rejects.toThrow('Invalid API key');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(
        withRetry(
          fn,
          {
            maxRetries: 2,
            initialDelayMs: 10,
          },
          'Test'
        )
      ).rejects.toThrow('ETIMEDOUT');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle rate limit errors (429)', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;

      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success');

      const result = await withRetry(
        fn,
        {
          maxRetries: 3,
          initialDelayMs: 10,
        },
        'Test'
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle server errors (500, 502, 503, 504)', async () => {
      const error503 = new Error('Service unavailable');
      error503.statusCode = 503;

      const fn = vi.fn().mockRejectedValueOnce(error503).mockResolvedValueOnce('success');

      const result = await withRetry(
        fn,
        {
          maxRetries: 3,
          initialDelayMs: 10,
        },
        'Test'
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RetryHandler class', () => {
    it('should track statistics correctly', async () => {
      const handler = new RetryHandler({ maxRetries: 2, initialDelayMs: 10 });

      // Successful call
      await handler.execute(() => Promise.resolve('success'), 'Test1');

      // Failed call
      try {
        await handler.execute(() => Promise.reject(new Error('Invalid')), 'Test2');
      } catch (e) {
        // Expected to fail
      }

      // Successful call after retry
      let attempts = 0;
      await handler.execute(() => {
        attempts++;
        if (attempts === 1) throw new Error('ECONNRESET');
        return Promise.resolve('success');
      }, 'Test3');

      const stats = handler.getStats();

      expect(stats.totalCalls).toBe(3);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(1);
    });

    it('should reset statistics', async () => {
      const handler = new RetryHandler();

      await handler.execute(() => Promise.resolve('success'), 'Test');
      handler.resetStats();

      const stats = handler.getStats();

      expect(stats.totalCalls).toBe(0);
      expect(stats.successfulCalls).toBe(0);
      expect(stats.failedCalls).toBe(0);
    });
  });
});
