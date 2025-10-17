// server/src/scripts/testMealPlanWithLabs.js

/**
 * Test Script: Lab Values Integration in Meal Plan Generation
 *
 * This script tests the enhanced meal plan generation with medical report lab values.
 * It simulates different lab value scenarios and verifies proper RAG retrieval.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = new Logger('TestMealPlanLabs');

// Test scenarios
const testScenarios = [
  {
    name: 'Scenario 1: Prediabetes + Elevated Insulin',
    description: 'User with insulin resistance and prediabetes',
    preferences: {
      duration: 3,
      region: 'north-india',
      dietType: 'vegetarian',
      budget: 300,
      mealsPerDay: 3,
      restrictions: [],
      cuisines: ['North Indian'],
      healthContext: {
        symptoms: ['weight-changes', 'fatigue'],
        goals: ['weight-management', 'balance-hormones'],
        activityLevel: 'light',
        age: 28,
        medicalData: {
          reportDate: '2025-10-15',
          labValues: {
            glucose_fasting: {
              value: 115,
              unit: 'mg/dL',
              severity: 'prediabetes',
            },
            insulin_fasting: {
              value: 18,
              unit: 'µIU/mL',
              severity: 'elevated',
            },
            homa_ir: {
              value: 5.1,
              unit: '',
              severity: 'critical',
            },
          },
        },
      },
      userOverrides: {},
    },
    expectedOutcome: {
      shouldRetrieveLabGuidance: true,
      minLabGuidanceDocs: 3,
      expectedFoodFocus: [
        'low-GI foods',
        'high fiber',
        'reduced refined carbs',
        'legumes',
        'whole grains',
      ],
    },
  },
  {
    name: 'Scenario 2: High Testosterone + PCOS-High LH',
    description: 'User with hyperandrogenism and hormonal imbalance',
    preferences: {
      duration: 3,
      region: 'south-india',
      dietType: 'vegetarian',
      budget: 350,
      mealsPerDay: 3,
      restrictions: [],
      cuisines: ['South Indian'],
      healthContext: {
        symptoms: ['irregular-periods', 'acne'],
        goals: ['regularize-periods', 'skin-hair'],
        activityLevel: 'moderate',
        age: 26,
        medicalData: {
          reportDate: '2025-10-10',
          labValues: {
            testosterone_total: {
              value: 82,
              unit: 'ng/dL',
              severity: 'high',
            },
            lh: {
              value: 18,
              unit: 'mIU/mL',
              severity: 'pcos-high',
            },
            fsh: {
              value: 5.2,
              unit: 'mIU/mL',
              severity: 'normal',
            },
            lh_fsh_ratio: {
              value: 3.46,
              unit: 'ratio',
              severity: 'critical',
            },
          },
        },
      },
      userOverrides: {},
    },
    expectedOutcome: {
      shouldRetrieveLabGuidance: true,
      minLabGuidanceDocs: 2,
      expectedFoodFocus: [
        'anti-androgenic foods',
        'flaxseeds',
        'spearmint',
        'hormone-balancing',
        'cruciferous vegetables',
      ],
    },
  },
  {
    name: 'Scenario 3: Vitamin D Deficiency + Low Iron',
    description: 'User with nutritional deficiencies',
    preferences: {
      duration: 3,
      region: 'north-india',
      dietType: 'non-vegetarian',
      budget: 400,
      mealsPerDay: 3,
      restrictions: [],
      cuisines: ['North Indian', 'Continental'],
      healthContext: {
        symptoms: ['fatigue', 'hair-loss'],
        goals: ['mood-energy'],
        activityLevel: 'sedentary',
        age: 30,
        medicalData: {
          reportDate: '2025-10-12',
          labValues: {
            vitamin_d: {
              value: 38,
              unit: 'nmol/L',
              severity: 'deficient',
            },
            iron: {
              value: 45,
              unit: 'µg/dL',
              severity: 'low',
            },
            ferritin: {
              value: 18,
              unit: 'ng/mL',
              severity: 'low',
            },
          },
        },
      },
      userOverrides: {},
    },
    expectedOutcome: {
      shouldRetrieveLabGuidance: true,
      minLabGuidanceDocs: 2,
      expectedFoodFocus: [
        'vitamin D sources',
        'fortified dairy',
        'fatty fish',
        'iron-rich foods',
        'vitamin C pairing',
      ],
    },
  },
  {
    name: 'Scenario 4: High Cholesterol + High Triglycerides',
    description: 'User with dyslipidemia',
    preferences: {
      duration: 3,
      region: 'west-india',
      dietType: 'vegetarian',
      budget: 320,
      mealsPerDay: 3,
      restrictions: [],
      cuisines: ['Gujarati'],
      healthContext: {
        symptoms: ['weight-changes'],
        goals: ['weight-management'],
        activityLevel: 'light',
        age: 32,
        medicalData: {
          reportDate: '2025-10-08',
          labValues: {
            cholesterol_total: {
              value: 245,
              unit: 'mg/dL',
              severity: 'high',
            },
            triglycerides: {
              value: 210,
              unit: 'mg/dL',
              severity: 'high',
            },
            hdl_cholesterol: {
              value: 42,
              unit: 'mg/dL',
              severity: 'low',
            },
            ldl_cholesterol: {
              value: 165,
              unit: 'mg/dL',
              severity: 'high',
            },
          },
        },
      },
      userOverrides: {},
    },
    expectedOutcome: {
      shouldRetrieveLabGuidance: true,
      minLabGuidanceDocs: 3,
      expectedFoodFocus: [
        'heart-healthy fats',
        'omega-3',
        'soluble fiber',
        'nuts and seeds',
        'reduce saturated fats',
      ],
    },
  },
  {
    name: 'Scenario 5: All Normal Labs (Control)',
    description: 'User with normal lab values - should use general PCOS guidance',
    preferences: {
      duration: 3,
      region: 'north-india',
      dietType: 'vegetarian',
      budget: 300,
      mealsPerDay: 3,
      restrictions: [],
      cuisines: ['North Indian'],
      healthContext: {
        symptoms: ['irregular-periods'],
        goals: ['regularize-periods'],
        activityLevel: 'moderate',
        age: 25,
        medicalData: {
          reportDate: '2025-10-14',
          labValues: {
            glucose_fasting: {
              value: 88,
              unit: 'mg/dL',
              severity: 'normal',
            },
            insulin_fasting: {
              value: 6,
              unit: 'µIU/mL',
              severity: 'optimal',
            },
            testosterone_total: {
              value: 45,
              unit: 'ng/dL',
              severity: 'normal',
            },
          },
        },
      },
      userOverrides: {},
    },
    expectedOutcome: {
      shouldRetrieveLabGuidance: false, // All normal, should use general guidance
      minLabGuidanceDocs: 0,
      expectedFoodFocus: ['general PCOS nutrition', 'hormone balance'],
    },
  },
];

/**
 * Run test for a single scenario
 */
async function runTestScenario(scenario, index) {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`TEST ${index + 1}: ${scenario.name}`);
  logger.info(`Description: ${scenario.description}`);
  logger.info(`${'='.repeat(80)}\n`);

  try {
    // Display lab values
    if (scenario.preferences.healthContext.medicalData?.labValues) {
      logger.info('📊 Lab Values:');
      Object.entries(scenario.preferences.healthContext.medicalData.labValues).forEach(
        ([name, data]) => {
          logger.info(`  - ${name}: ${data.value} ${data.unit} [${data.severity.toUpperCase()}]`);
        }
      );
      logger.info('');
    }

    // Generate meal plan
    logger.info('🔄 Generating meal plan...\n');
    const startTime = Date.now();

    const mealPlan = await mealPlanChain.generateMealPlan(scenario.preferences);

    const duration = Date.now() - startTime;
    logger.info(`✅ Generation completed in ${duration}ms\n`);

    // Validate results
    logger.info('🔍 Validation Results:');

    // Check for RAG metadata
    if (!mealPlan.ragMetadata) {
      logger.error('❌ FAILED: No RAG metadata in response');
      return { success: false, scenario: scenario.name };
    }

    logger.info('✅ RAG metadata present');

    // Display RAG metadata
    logger.info('\n📋 RAG Metadata:');
    logger.info(`  - Meal Templates Used: ${mealPlan.ragMetadata.mealTemplatesUsed}`);
    logger.info(`  - Nutrition Guidelines Used: ${mealPlan.ragMetadata.nutritionGuidelinesUsed}`);
    logger.info(`  - Lab Guidance Used: ${mealPlan.ragMetadata.labGuidanceUsed || 0}`);
    logger.info(
      `  - Symptom Recommendations: ${
        mealPlan.ragMetadata.symptomSpecificRecommendations ? 'Yes' : 'No'
      }`
    );
    logger.info(`  - Retrieval Quality: ${mealPlan.ragMetadata.retrievalQuality}`);

    // Validate lab guidance retrieval
    const labGuidanceUsed = mealPlan.ragMetadata.labGuidanceUsed || 0;

    if (scenario.expectedOutcome.shouldRetrieveLabGuidance) {
      if (labGuidanceUsed < scenario.expectedOutcome.minLabGuidanceDocs) {
        logger.error(
          `❌ FAILED: Expected at least ${scenario.expectedOutcome.minLabGuidanceDocs} lab guidance docs, got ${labGuidanceUsed}`
        );
        return { success: false, scenario: scenario.name };
      }
      logger.info(
        `✅ Lab guidance retrieved (${labGuidanceUsed} docs) - meets minimum requirement`
      );
    } else {
      if (labGuidanceUsed > 0) {
        logger.warn(
          `⚠️  WARNING: Expected no lab guidance (all normal labs), but got ${labGuidanceUsed} docs`
        );
      } else {
        logger.info('✅ No lab guidance retrieved (expected for normal labs)');
      }
    }

    // Check meal plan structure
    if (!mealPlan.days || !Array.isArray(mealPlan.days)) {
      logger.error('❌ FAILED: Invalid meal plan structure');
      return { success: false, scenario: scenario.name };
    }

    logger.info(`✅ Meal plan has ${mealPlan.days.length} days`);

    // Validate day structure
    let totalMeals = 0;
    let totalCalories = 0;

    mealPlan.days.forEach((day, dayIndex) => {
      const dayCalories = day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      totalCalories += dayCalories;
      totalMeals += day.meals.length;

      logger.info(`  Day ${day.dayNumber}: ${day.meals.length} meals, ${dayCalories} kcal`);
    });

    const avgCaloriesPerDay = Math.round(totalCalories / mealPlan.days.length);
    logger.info(`\n📊 Nutrition Summary:`);
    logger.info(`  - Total Meals: ${totalMeals}`);
    logger.info(`  - Avg Calories/Day: ${avgCaloriesPerDay} kcal`);

    // Validate calorie targets
    if (avgCaloriesPerDay < 1900 || avgCaloriesPerDay > 2100) {
      logger.warn(
        `⚠️  WARNING: Average calories (${avgCaloriesPerDay}) outside target range (1900-2100)`
      );
    } else {
      logger.info('✅ Calorie targets met');
    }

    // Sample meal display
    logger.info('\n🍽️  Sample Meals:');
    const sampleDay = mealPlan.days[0];
    sampleDay.meals.slice(0, 2).forEach((meal) => {
      logger.info(`  ${meal.mealType}: ${meal.name}`);
      logger.info(`    Macros: ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fats}g fats`);
      logger.info(`    Calories: ${meal.calories} kcal | GI: ${meal.gi}`);
      logger.info(`    Tip: ${meal.tip}`);
    });

    logger.info(`\n✅ TEST PASSED: ${scenario.name}\n`);

    return {
      success: true,
      scenario: scenario.name,
      ragMetadata: mealPlan.ragMetadata,
      avgCaloriesPerDay,
      totalMeals,
    };
  } catch (error) {
    logger.error(`❌ TEST FAILED: ${scenario.name}`);
    logger.error(`Error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  logger.info('\n🧪 Lab Values Integration Test Suite');
  logger.info('Testing meal plan generation with medical report lab values\n');
  logger.info(`Total Scenarios: ${testScenarios.length}\n`);

  const results = [];

  for (let i = 0; i < testScenarios.length; i++) {
    const result = await runTestScenario(testScenarios[i], i);
    results.push(result);

    // Wait between tests to avoid rate limiting
    if (i < testScenarios.length - 1) {
      logger.info('⏳ Waiting 2 seconds before next test...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  logger.info('\n' + '='.repeat(80));
  logger.info('📊 TEST SUITE SUMMARY');
  logger.info('='.repeat(80) + '\n');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  logger.info(`Total Tests: ${results.length}`);
  logger.info(`Passed: ${passed} ✅`);
  logger.info(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  logger.info(`Success Rate: ${Math.round((passed / results.length) * 100)}%\n`);

  // Detailed results
  logger.info('Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    logger.info(`${status} Test ${index + 1}: ${result.scenario}`);

    if (result.success && result.ragMetadata) {
      logger.info(
        `     Lab Guidance: ${result.ragMetadata.labGuidanceUsed || 0} docs | Quality: ${
          result.ragMetadata.retrievalQuality
        }`
      );
    }

    if (!result.success && result.error) {
      logger.info(`     Error: ${result.error}`);
    }
  });

  logger.info('\n' + '='.repeat(80));

  if (failed === 0) {
    logger.info('🎉 ALL TESTS PASSED! Lab integration is working correctly.');
  } else {
    logger.error(`⚠️  ${failed} TEST(S) FAILED. Review logs above for details.`);
  }

  logger.info('='.repeat(80) + '\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  logger.error('Fatal error running tests:', error);
  process.exit(1);
});
