// server/src/utils/performanceMetrics.js

/**
 * Performance Metrics Tracker for Meal Plan Generation
 *
 * Tracks:
 * - LLM response times
 * - RAG retrieval times
 * - Overall generation times
 * - Component-level performance
 *
 * Provides:
 * - Real-time metrics
 * - Historical statistics
 * - Performance comparisons
 * - Bottleneck identification
 */

import { Logger } from './logger.js';

const logger = new Logger('PerformanceMetrics');

class PerformanceMetrics {
  constructor() {
    // Storage for metrics
    this.metrics = {
      mealPlanGeneration: [],
      llmCalls: [],
      ragRetrieval: [],
      componentTimes: [],
    };

    // Configuration
    this.maxHistorySize = 100; // Keep last 100 entries
    this.enableLogging = true;
  }

  /**
   * Start timing an operation
   * @returns {object} Timer object with start time and operation name
   */
  startTimer(operation) {
    return {
      operation,
      startTime: performance.now(),
      metadata: {},
    };
  }

  /**
   * Stop timer and record metric
   * @param {object} timer Timer object from startTimer
   * @param {object} metadata Additional data to store
   * @returns {number} Duration in milliseconds
   */
  endTimer(timer, metadata = {}) {
    const duration = performance.now() - timer.startTime;

    return {
      operation: timer.operation,
      duration,
      timestamp: new Date(),
      metadata: { ...timer.metadata, ...metadata },
    };
  }

  /**
   * Record meal plan generation metrics
   */
  recordMealPlanGeneration(data) {
    const metric = {
      timestamp: new Date(),
      totalDuration: data.totalDuration,
      llmDuration: data.llmDuration,
      ragDuration: data.ragDuration,
      parsingDuration: data.parsingDuration,
      validationDuration: data.validationDuration,
      duration: data.duration || 7,
      mealsPerDay: data.mealsPerDay || 3,
      totalMeals: (data.duration || 7) * (data.mealsPerDay || 3),
      cuisineCount: data.cuisineCount || 1,
      hasHealthContext: data.hasHealthContext || false,
      success: data.success || true,
      metadata: data.metadata || {},
    };

    this.metrics.mealPlanGeneration.push(metric);
    this._trimHistory('mealPlanGeneration');

    if (this.enableLogging) {
      logger.info('📊 Meal plan generation metrics recorded', {
        totalDuration: `${metric.totalDuration.toFixed(0)}ms`,
        llmDuration: `${metric.llmDuration.toFixed(0)}ms`,
        ragDuration: `${metric.ragDuration.toFixed(0)}ms`,
        llmPercentage: `${((metric.llmDuration / metric.totalDuration) * 100).toFixed(1)}%`,
        ragPercentage: `${((metric.ragDuration / metric.totalDuration) * 100).toFixed(1)}%`,
      });
    }

    return metric;
  }

  /**
   * Record LLM call metrics
   */
  recordLLMCall(data) {
    const metric = {
      timestamp: new Date(),
      duration: data.duration,
      model: data.model || 'gpt-4o-mini',
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      promptLength: data.promptLength,
      responseLength: data.responseLength,
      operation: data.operation || 'meal_plan_generation',
      success: data.success || true,
      metadata: data.metadata || {},
    };

    this.metrics.llmCalls.push(metric);
    this._trimHistory('llmCalls');

    if (this.enableLogging) {
      logger.info('🤖 LLM call metrics recorded', {
        duration: `${metric.duration.toFixed(0)}ms`,
        tokens: metric.totalTokens,
        operation: metric.operation,
      });
    }

    return metric;
  }

  /**
   * Record RAG retrieval metrics
   */
  recordRAGRetrieval(data) {
    const metric = {
      timestamp: new Date(),
      duration: data.duration,
      stage: data.stage || 'unknown',
      documentsRetrieved: data.documentsRetrieved || 0,
      query: data.query,
      success: data.success || true,
      metadata: data.metadata || {},
    };

    this.metrics.ragRetrieval.push(metric);
    this._trimHistory('ragRetrieval');

    if (this.enableLogging) {
      logger.info('🔍 RAG retrieval metrics recorded', {
        duration: `${metric.duration.toFixed(0)}ms`,
        stage: metric.stage,
        documents: metric.documentsRetrieved,
      });
    }

    return metric;
  }

  /**
   * Record component timing
   */
  recordComponentTime(component, duration, metadata = {}) {
    const metric = {
      timestamp: new Date(),
      component,
      duration,
      metadata,
    };

    this.metrics.componentTimes.push(metric);
    this._trimHistory('componentTimes');

    return metric;
  }

  /**
   * Get statistics for a metric type
   */
  getStats(metricType = 'mealPlanGeneration') {
    const data = this.metrics[metricType];

    if (!data || data.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0,
      };
    }

    // Calculate statistics based on duration
    const durations = data
      .filter((m) => m.duration !== undefined && m.duration !== null)
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        count: data.length,
        avg: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sum = durations.reduce((acc, val) => acc + val, 0);
    const avg = sum / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const median = this._percentile(durations, 50);
    const p95 = this._percentile(durations, 95);
    const p99 = this._percentile(durations, 99);

    return {
      count: durations.length,
      avg: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      median: Math.round(median),
      p95: Math.round(p95),
      p99: Math.round(p99),
    };
  }

  /**
   * Get detailed meal plan generation statistics
   */
  getMealPlanStats() {
    const data = this.metrics.mealPlanGeneration;

    if (data.length === 0) {
      return {
        count: 0,
        total: { avg: 0, min: 0, max: 0, p95: 0 },
        llm: { avg: 0, min: 0, max: 0, p95: 0, percentage: 0 },
        rag: { avg: 0, min: 0, max: 0, p95: 0, percentage: 0 },
        parsing: { avg: 0, min: 0, max: 0, p95: 0, percentage: 0 },
        validation: { avg: 0, min: 0, max: 0, p95: 0, percentage: 0 },
      };
    }

    const getComponentStats = (field) => {
      const values = data
        .filter((m) => m[field] !== undefined)
        .map((m) => m[field])
        .sort((a, b) => a - b);

      if (values.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

      const sum = values.reduce((acc, val) => acc + val, 0);
      return {
        avg: Math.round(sum / values.length),
        min: Math.round(values[0]),
        max: Math.round(values[values.length - 1]),
        p95: Math.round(this._percentile(values, 95)),
      };
    };

    const totalStats = getComponentStats('totalDuration');
    const llmStats = getComponentStats('llmDuration');
    const ragStats = getComponentStats('ragDuration');
    const parsingStats = getComponentStats('parsingDuration');
    const validationStats = getComponentStats('validationDuration');

    // Calculate percentages
    const avgTotal = totalStats.avg || 1;
    const llmPercentage = Math.round((llmStats.avg / avgTotal) * 100);
    const ragPercentage = Math.round((ragStats.avg / avgTotal) * 100);
    const parsingPercentage = Math.round((parsingStats.avg / avgTotal) * 100);
    const validationPercentage = Math.round((validationStats.avg / avgTotal) * 100);

    return {
      count: data.length,
      total: totalStats,
      llm: { ...llmStats, percentage: llmPercentage },
      rag: { ...ragStats, percentage: ragPercentage },
      parsing: { ...parsingStats, percentage: parsingPercentage },
      validation: { ...validationStats, percentage: validationPercentage },
      recentEntries: data.slice(-10).map((m) => ({
        timestamp: m.timestamp,
        totalDuration: Math.round(m.totalDuration),
        llmDuration: Math.round(m.llmDuration),
        ragDuration: Math.round(m.ragDuration),
        success: m.success,
      })),
    };
  }

  /**
   * Get performance comparison
   */
  getPerformanceComparison() {
    const mealPlanStats = this.getMealPlanStats();
    const llmStats = this.getStats('llmCalls');
    const ragStats = this.getStats('ragRetrieval');

    return {
      mealPlanGeneration: mealPlanStats,
      llmCalls: llmStats,
      ragRetrieval: ragStats,
      summary: {
        totalGenerations: mealPlanStats.count,
        avgTotalTime: mealPlanStats.total.avg,
        avgLLMTime: mealPlanStats.llm.avg,
        avgRAGTime: mealPlanStats.rag.avg,
        llmPercentage: mealPlanStats.llm.percentage,
        ragPercentage: mealPlanStats.rag.percentage,
        bottleneck: this._identifyBottleneck(mealPlanStats),
      },
    };
  }

  /**
   * Get performance improvement analysis
   */
  getImprovementAnalysis(baselineStats = null) {
    const currentStats = this.getMealPlanStats();

    if (!baselineStats || currentStats.count === 0) {
      return {
        hasBaseline: false,
        current: currentStats,
        message: 'No baseline available for comparison',
      };
    }

    const improvements = {
      totalTime: this._calculateImprovement(baselineStats.total.avg, currentStats.total.avg),
      llmTime: this._calculateImprovement(baselineStats.llm.avg, currentStats.llm.avg),
      ragTime: this._calculateImprovement(baselineStats.rag.avg, currentStats.rag.avg),
      p95Time: this._calculateImprovement(baselineStats.total.p95, currentStats.total.p95),
    };

    return {
      hasBaseline: true,
      baseline: baselineStats,
      current: currentStats,
      improvements,
      summary: this._generateImprovementSummary(improvements),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      mealPlanGeneration: [],
      llmCalls: [],
      ragRetrieval: [],
      componentTimes: [],
    };
    logger.info('All metrics cleared');
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(type = 'mealPlanGeneration', count = 10) {
    return this.metrics[type].slice(-count);
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      exportTime: new Date(),
      metrics: this.metrics,
      stats: {
        mealPlanGeneration: this.getMealPlanStats(),
        llmCalls: this.getStats('llmCalls'),
        ragRetrieval: this.getStats('ragRetrieval'),
      },
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  _trimHistory(metricType) {
    if (this.metrics[metricType].length > this.maxHistorySize) {
      this.metrics[metricType] = this.metrics[metricType].slice(-this.maxHistorySize);
    }
  }

  _percentile(sorted, percentile) {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  _calculateImprovement(baseline, current) {
    if (!baseline || baseline === 0) {
      return { value: 0, percentage: 0, improved: false };
    }

    const difference = baseline - current;
    const percentage = (difference / baseline) * 100;
    const improved = difference > 0;

    return {
      baseline,
      current,
      difference: Math.round(difference),
      percentage: Math.round(percentage * 10) / 10,
      improved,
    };
  }

  _identifyBottleneck(stats) {
    const components = [
      { name: 'LLM', percentage: stats.llm.percentage, avg: stats.llm.avg },
      { name: 'RAG', percentage: stats.rag.percentage, avg: stats.rag.avg },
      { name: 'Parsing', percentage: stats.parsing.percentage, avg: stats.parsing.avg },
      { name: 'Validation', percentage: stats.validation.percentage, avg: stats.validation.avg },
    ];

    const bottleneck = components.reduce((max, comp) =>
      comp.percentage > max.percentage ? comp : max
    );

    return bottleneck.name;
  }

  _generateImprovementSummary(improvements) {
    const messages = [];

    if (improvements.totalTime.improved) {
      messages.push(
        `Total time improved by ${improvements.totalTime.percentage}% (${improvements.totalTime.difference}ms faster)`
      );
    } else {
      messages.push(
        `Total time regressed by ${Math.abs(improvements.totalTime.percentage)}% (${Math.abs(
          improvements.totalTime.difference
        )}ms slower)`
      );
    }

    if (improvements.llmTime.improved) {
      messages.push(
        `LLM time improved by ${improvements.llmTime.percentage}% (${improvements.llmTime.difference}ms faster)`
      );
    }

    if (improvements.ragTime.improved) {
      messages.push(
        `RAG time improved by ${improvements.ragTime.percentage}% (${improvements.ragTime.difference}ms faster)`
      );
    }

    return messages;
  }
}

// Export singleton instance
export const performanceMetrics = new PerformanceMetrics();
export { PerformanceMetrics };
