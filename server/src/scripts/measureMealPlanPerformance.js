#!/usr/bin/env node
// server/src/scripts/measureMealPlanPerformance.js

/**
 * Performance Measurement Script for Meal Plan Generation
 *
 * This script:
 * 1. Generates multiple meal plans with different configurations
 * 2. Measures LLM response times and RAG retrieval times
 * 3. Compares performance across different scenarios
 * 4. Provides detailed performance analysis
 *
 * Usage:
 *   node server/src/scripts/measureMealPlanPerformance.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js';
import { performanceMetrics } from '../utils/performanceMetrics.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = new Logger('PerformanceMeasurement');

// Test scenarios
const testScenarios = [
  {
    name: 'Simple Plan - Vegetarian, North Indian',
    preferences: {
      duration: 3,
      regions: ['north-indian'],
      cuisines: ['North Indian'],
      dietType: 'vegetarian',
      budget: 'medium',
      restrictions: [],
      mealsPerDay: 3,
      healthContext: {},
      userOverrides: {},
    },
  },
  {
    name: 'Multi-Cuisine Plan - 3 Cuisines',
    preferences: {
      duration: 3,
      regions: ['north-indian', 'south-indian', 'west-indian'],
      cuisines: ['North Indian', 'South Indian', 'Western Indian'],
      dietType: 'vegetarian',
      budget: 'medium',
      restrictions: [],
      mealsPerDay: 3,
      healthContext: {},
      userOverrides: {},
    },
  },
  {
    name: 'Complex Plan - Health Context + Restrictions',
    preferences: {
      duration: 3,
      regions: ['north-indian'],
      cuisines: ['North Indian'],
      dietType: 'vegetarian',
      budget: 'low',
      restrictions: ['gluten-free', 'dairy-free'],
      mealsPerDay: 3,
      healthContext: {
        symptoms: ['weight_gain', 'insulin_resistance'],
        medicalData: {
          labValues: {
            fasting_glucose: { value: 110, status: 'borderline_high' },
            hba1c: { value: 6.0, status: 'borderline_high' },
          },
        },
      },
      userOverrides: {},
    },
  },
  {
    name: 'Keto Plan - Special Diet',
    preferences: {
      duration: 3,
      regions: ['north-indian'],
      cuisines: ['North Indian'],
      dietType: 'non-vegetarian',
      isKeto: true,
      budget: 'high',
      restrictions: [],
      mealsPerDay: 3,
      healthContext: {},
      userOverrides: {},
    },
  },
  {
    name: 'Longer Plan - 7 Days (Chunked)',
    preferences: {
      duration: 7,
      regions: ['north-indian'],
      cuisines: ['North Indian'],
      dietType: 'vegetarian',
      budget: 'medium',
      restrictions: [],
      mealsPerDay: 3,
      healthContext: {},
      userOverrides: {},
    },
  },
];

/**
 * Run performance measurement for all scenarios
 */
async function runPerformanceTest() {
  logger.info('🚀 Starting meal plan performance measurement');
  logger.info(`Testing ${testScenarios.length} scenarios\n`);

  // Clear existing metrics to start fresh
  performanceMetrics.clearMetrics();

  const results = [];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`📊 Scenario ${i + 1}/${testScenarios.length}: ${scenario.name}`);
    logger.info(`${'='.repeat(70)}`);

    try {
      const startTime = performance.now();
      const mealPlan = await mealPlanChain.generateMealPlan(scenario.preferences);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const result = {
        scenario: scenario.name,
        success: true,
        duration: Math.round(duration),
        daysGenerated: mealPlan.days?.length || 0,
        performanceMetrics: mealPlan.performanceMetrics,
        ragQuality: mealPlan.ragMetadata?.retrievalQuality,
      };

      results.push(result);

      logger.info(`✅ Success`, {
        duration: `${result.duration}ms`,
        days: result.daysGenerated,
        llmTime: `${result.performanceMetrics?.llmDuration || 0}ms`,
        ragTime: `${result.performanceMetrics?.ragDuration || 0}ms`,
        ragQuality: result.ragQuality,
      });

      // Wait a bit between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error(`❌ Failed: ${error.message}`);
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message,
      });
    }
  }

  logger.info(`\n${'='.repeat(70)}`);
  logger.info('📈 PERFORMANCE ANALYSIS');
  logger.info(`${'='.repeat(70)}\n`);

  // Get overall statistics
  const stats = performanceMetrics.getMealPlanStats();

  logger.info('Overall Statistics:');
  logger.info(`  Total Generations: ${stats.count}`);
  logger.info(`  Average Total Time: ${stats.total.avg}ms`);
  logger.info(`  Min Total Time: ${stats.total.min}ms`);
  logger.info(`  Max Total Time: ${stats.total.max}ms`);
  logger.info(`  P95 Total Time: ${stats.total.p95}ms\n`);

  logger.info('Component Breakdown:');
  logger.info(`  LLM Time: ${stats.llm.avg}ms (${stats.llm.percentage}% of total)`);
  logger.info(`  RAG Time: ${stats.rag.avg}ms (${stats.rag.percentage}% of total)`);
  logger.info(`  Parsing Time: ${stats.parsing.avg}ms (${stats.parsing.percentage}% of total)`);
  logger.info(
    `  Validation Time: ${stats.validation.avg}ms (${stats.validation.percentage}% of total)\n`
  );

  // Individual scenario results
  logger.info('Individual Scenario Results:');
  results.forEach((result, index) => {
    if (result.success) {
      logger.info(`\n  ${index + 1}. ${result.scenario}`);
      logger.info(`     Total: ${result.duration}ms`);
      logger.info(
        `     LLM: ${result.performanceMetrics?.llmDuration || 0}ms (${
          result.performanceMetrics?.llmPercentage || 0
        }%)`
      );
      logger.info(
        `     RAG: ${result.performanceMetrics?.ragDuration || 0}ms (${
          result.performanceMetrics?.ragPercentage || 0
        }%)`
      );
      logger.info(`     Days: ${result.daysGenerated}`);
      logger.info(`     Quality: ${result.ragQuality}`);
    } else {
      logger.info(`\n  ${index + 1}. ${result.scenario}`);
      logger.info(`     Status: FAILED`);
      logger.info(`     Error: ${result.error}`);
    }
  });

  // Identify bottleneck
  const bottleneck = stats.llm.percentage > stats.rag.percentage ? 'LLM' : 'RAG';
  logger.info(
    `\n⚠️  Primary Bottleneck: ${bottleneck} (${
      bottleneck === 'LLM' ? stats.llm.percentage : stats.rag.percentage
    }% of total time)`
  );

  // Performance insights
  logger.info(`\n💡 Performance Insights:`);
  if (stats.llm.percentage > 60) {
    logger.info(`  - LLM calls dominate processing time (${stats.llm.percentage}%)`);
    logger.info(`  - Consider: prompt optimization, caching, or using a faster model`);
  }
  if (stats.rag.percentage > 30) {
    logger.info(`  - RAG retrieval is significant (${stats.rag.percentage}%)`);
    logger.info(`  - Consider: vector index optimization or query caching`);
  }
  if (stats.total.avg > 10000) {
    logger.info(`  - Average generation time is high (${stats.total.avg}ms)`);
    logger.info(`  - Consider: parallel processing or chunking strategies`);
  }
  if (stats.total.p95 > stats.total.avg * 1.5) {
    logger.info(
      `  - High variance in performance (P95: ${stats.total.p95}ms vs Avg: ${stats.total.avg}ms)`
    );
    logger.info(`  - Consider: investigating outlier cases`);
  }

  // Export metrics
  logger.info(`\n📊 Exporting metrics for further analysis...`);
  const exportData = performanceMetrics.exportMetrics();

  logger.info(`\n✅ Performance measurement complete!`);
  logger.info(`   Metrics available at: /api/metrics/performance`);

  return {
    results,
    stats,
    exportData,
  };
}

/**
 * Compare with baseline performance
 */
async function compareWithBaseline(baseline) {
  logger.info('\n📊 Comparing with baseline performance...');

  const current = performanceMetrics.getMealPlanStats();
  const analysis = performanceMetrics.getImprovementAnalysis(baseline);

  if (analysis.hasBaseline) {
    logger.info('\nPerformance Comparison:');
    logger.info(
      `  Total Time: ${analysis.improvements.totalTime.baseline}ms → ${
        analysis.improvements.totalTime.current
      }ms (${analysis.improvements.totalTime.improved ? '✅' : '❌'} ${
        analysis.improvements.totalTime.percentage
      }%)`
    );
    logger.info(
      `  LLM Time: ${analysis.improvements.llmTime.baseline}ms → ${
        analysis.improvements.llmTime.current
      }ms (${analysis.improvements.llmTime.improved ? '✅' : '❌'} ${
        analysis.improvements.llmTime.percentage
      }%)`
    );
    logger.info(
      `  RAG Time: ${analysis.improvements.ragTime.baseline}ms → ${
        analysis.improvements.ragTime.current
      }ms (${analysis.improvements.ragTime.improved ? '✅' : '❌'} ${
        analysis.improvements.ragTime.percentage
      }%)`
    );
    logger.info(
      `  P95 Time: ${analysis.improvements.p95Time.baseline}ms → ${
        analysis.improvements.p95Time.current
      }ms (${analysis.improvements.p95Time.improved ? '✅' : '❌'} ${
        analysis.improvements.p95Time.percentage
      }%)`
    );

    logger.info('\nSummary:');
    analysis.summary.forEach((msg) => logger.info(`  ${msg}`));
  } else {
    logger.info('  No baseline available for comparison');
  }

  return analysis;
}

// Run the performance test
runPerformanceTest()
  .then((data) => {
    logger.info('\n✅ All performance tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Performance test failed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
