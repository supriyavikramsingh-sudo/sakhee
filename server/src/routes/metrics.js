// server/src/routes/metrics.js
import express from 'express';
import { performanceMetrics } from '../utils/performanceMetrics.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('MetricsRoutes');

/**
 * GET /api/metrics/performance
 * Get comprehensive performance statistics
 */
router.get('/performance', (req, res) => {
  try {
    const stats = performanceMetrics.getPerformanceComparison();

    logger.info('Performance metrics retrieved', {
      totalGenerations: stats.summary.totalGenerations,
      avgTotalTime: stats.summary.avgTotalTime,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to retrieve performance metrics', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve performance metrics',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/metrics/meal-plan-stats
 * Get detailed meal plan generation statistics
 */
router.get('/meal-plan-stats', (req, res) => {
  try {
    const stats = performanceMetrics.getMealPlanStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to retrieve meal plan stats', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve meal plan statistics',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/metrics/recent
 * Get recent performance metrics
 */
router.get('/recent', (req, res) => {
  try {
    const { type = 'mealPlanGeneration', count = 10 } = req.query;
    const recent = performanceMetrics.getRecentMetrics(type, parseInt(count));

    res.json({
      success: true,
      data: {
        type,
        count: recent.length,
        metrics: recent,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve recent metrics', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve recent metrics',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/metrics/compare
 * Compare current performance with baseline
 */
router.post('/compare', (req, res) => {
  try {
    const { baseline } = req.body;

    if (!baseline) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Baseline statistics required for comparison',
        },
      });
    }

    const analysis = performanceMetrics.getImprovementAnalysis(baseline);

    logger.info('Performance comparison complete', {
      hasBaseline: analysis.hasBaseline,
      improvements: analysis.improvements,
    });

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Failed to compare performance', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to compare performance',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/metrics/export
 * Export all metrics for external analysis
 */
router.get('/export', (req, res) => {
  try {
    const exportData = performanceMetrics.exportMetrics();

    logger.info('Metrics exported', {
      mealPlanGenerations: exportData.metrics.mealPlanGeneration.length,
      llmCalls: exportData.metrics.llmCalls.length,
      ragRetrievals: exportData.metrics.ragRetrieval.length,
    });

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Failed to export metrics', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export metrics',
        details: error.message,
      },
    });
  }
});

/**
 * DELETE /api/metrics/clear
 * Clear all stored metrics
 */
router.delete('/clear', (req, res) => {
  try {
    performanceMetrics.clearMetrics();

    logger.info('All metrics cleared');

    res.json({
      success: true,
      message: 'All metrics cleared successfully',
    });
  } catch (error) {
    logger.error('Failed to clear metrics', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear metrics',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/metrics/summary
 * Get a quick summary of current performance
 */
router.get('/summary', (req, res) => {
  try {
    const stats = performanceMetrics.getMealPlanStats();

    const summary = {
      totalGenerations: stats.count,
      averageTotalTime: stats.total.avg,
      averageLLMTime: stats.llm.avg,
      averageRAGTime: stats.rag.avg,
      llmPercentage: stats.llm.percentage,
      ragPercentage: stats.rag.percentage,
      bottleneck: stats.llm.percentage > stats.rag.percentage ? 'LLM' : 'RAG',
      p95TotalTime: stats.total.p95,
      recentPerformance: stats.recentEntries,
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Failed to retrieve metrics summary', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metrics summary',
        details: error.message,
      },
    });
  }
});

export default router;
