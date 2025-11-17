// server/src/services/jobService.js
import { Logger } from '../utils/logger.js';

const logger = new Logger('JobService');

// In-memory job storage (for production, use Redis or database)
const jobs = new Map();

class JobService {
  /**
   * Create a new background job
   * @param {string} type - Type of job (e.g., 'meal-generation')
   * @param {string} userId - User ID
   * @param {object} metadata - Additional job metadata
   * @returns {object} Job object with ID and initial status
   */
  createJob(type, userId, metadata = {}) {
    const jobId = `${type}_${userId}_${Date.now()}`;

    const job = {
      id: jobId,
      type,
      userId,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      result: null,
      error: null,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    jobs.set(jobId, job);

    logger.info('Job created', { jobId, type, userId });

    return job;
  }

  /**
   * Update job status
   * @param {string} jobId - Job ID
   * @param {object} updates - Updates to apply
   */
  updateJob(jobId, updates) {
    const job = jobs.get(jobId);

    if (!job) {
      logger.warn('Job not found for update', { jobId });
      return null;
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updatedJob.completedAt = new Date();
    }

    jobs.set(jobId, updatedJob);

    logger.info('Job updated', {
      jobId,
      status: updatedJob.status,
      progress: updatedJob.progress,
    });

    return updatedJob;
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {object|null} Job object or null
   */
  getJob(jobId) {
    return jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a user
   * @param {string} userId - User ID
   * @returns {array} Array of job objects
   */
  getUserJobs(userId) {
    return Array.from(jobs.values())
      .filter((job) => job.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get active jobs for a user
   * @param {string} userId - User ID
   * @returns {array} Array of active job objects
   */
  getActiveUserJobs(userId) {
    return this.getUserJobs(userId).filter(
      (job) => job.status === 'pending' || job.status === 'processing'
    );
  }

  /**
   * Mark job as completed
   * @param {string} jobId - Job ID
   * @param {object} result - Job result data
   */
  completeJob(jobId, result) {
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result,
    });
  }

  /**
   * Mark job as failed
   * @param {string} jobId - Job ID
   * @param {string} error - Error message
   */
  failJob(jobId, error) {
    return this.updateJob(jobId, {
      status: 'failed',
      error,
    });
  }

  /**
   * Update job progress
   * @param {string} jobId - Job ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(jobId, progress, message = '') {
    return this.updateJob(jobId, {
      status: 'processing',
      progress,
      metadata: {
        ...jobs.get(jobId)?.metadata,
        progressMessage: message,
      },
    });
  }

  /**
   * Delete old completed jobs (cleanup)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000) {
    // Default: 24 hours
    const now = Date.now();
    let deletedCount = 0;

    for (const [jobId, job] of jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        now - job.completedAt.getTime() > maxAgeMs
      ) {
        jobs.delete(jobId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info('Cleaned up old jobs', { deletedCount });
    }

    return deletedCount;
  }
}

// Create singleton instance
const jobService = new JobService();

// Run cleanup every hour
setInterval(() => {
  jobService.cleanupOldJobs();
}, 60 * 60 * 1000);

export default jobService;
