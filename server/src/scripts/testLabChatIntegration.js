// server/src/scripts/testLabChatIntegration.js
// Test script to validate lab value integration in chat responses

import { chatChain } from '../langchain/chains/chatChain.js';
import { medicalReportService } from '../services/medicalReportService.js';
import { Logger } from '../utils/logger.js';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig({ path: '.env' });

const logger = new Logger('TestLabChatIntegration');

/**
 * Test scenarios covering all 3 use cases
 */
const testScenarios = [
  {
    name: 'Scenario 1: Symptom Query with High Insulin',
    description:
      'User asks about acne and hair loss. Chat should connect symptoms to elevated insulin and testosterone.',
    userId: 'test_user_high_insulin',
    mockLabValues: {
      insulin_fasting: {
        value: 18,
        unit: 'µIU/mL',
        severity: 'elevated',
      },
      testosterone_total: {
        value: 68,
        unit: 'ng/dL',
        severity: 'pcos-high',
      },
      glucose_fasting: {
        value: 105,
        unit: 'mg/dL',
        severity: 'prediabetes',
      },
    },
    userMessage:
      "Why am I experiencing severe acne and hair loss? It's really affecting my confidence.",
    expectedInResponse: [
      'insulin',
      'testosterone',
      'elevated',
      'glucose',
      'root cause',
      'diet',
      'low-gi',
      'fiber',
    ],
    scenario: 1,
  },
  {
    name: 'Scenario 1b: Symptom Query with Nutritional Deficiency',
    description: 'User asks about fatigue. Chat should identify low ferritin and vitamin D.',
    userId: 'test_user_low_nutrients',
    mockLabValues: {
      ferritin: {
        value: 18,
        unit: 'ng/mL',
        severity: 'low',
      },
      vitamin_d: {
        value: 42,
        unit: 'nmol/L',
        severity: 'deficient',
      },
      vitamin_b12: {
        value: 250,
        unit: 'pg/mL',
        severity: 'low',
      },
    },
    userMessage: 'I feel exhausted all the time and have no energy. What could be causing this?',
    expectedInResponse: ['ferritin', 'vitamin D', 'deficiency', 'fatigue', 'iron', 'energy'],
    scenario: 1,
  },
  {
    name: 'Scenario 2: Lab Value Treatment Query - Insulin',
    description:
      'User asks how to improve insulin levels. Chat should provide specific dietary guidance.',
    userId: 'test_user_treat_insulin',
    mockLabValues: {
      insulin_fasting: {
        value: 22,
        unit: 'µIU/mL',
        severity: 'pcos-high',
      },
      homa_ir: {
        value: 4.2,
        unit: '',
        severity: 'elevated',
      },
    },
    userMessage: 'How can I reduce my insulin levels naturally? What foods should I eat?',
    expectedInResponse: [
      'insulin',
      '22',
      'elevated',
      'low-gi',
      'fiber',
      'protein',
      'reduce',
      'refined carbs',
      'evidence',
    ],
    scenario: 2,
  },
  {
    name: 'Scenario 2b: Lab Value Treatment Query - Vitamin D',
    description: 'User asks about improving Vitamin D.',
    userId: 'test_user_treat_vitamin_d',
    mockLabValues: {
      vitamin_d: {
        value: 35,
        unit: 'nmol/L',
        severity: 'deficient',
      },
    },
    userMessage: 'My vitamin D is low. How can I increase it through diet?',
    expectedInResponse: ['vitamin D', '35', 'deficient', 'sun', 'fortified', 'fatty fish', 'eggs'],
    scenario: 2,
  },
  {
    name: 'Scenario 3: Community Insights with Lab Context',
    description:
      'User feels alone dealing with low iron. Chat should provide Reddit insights + validation.',
    userId: 'test_user_community_iron',
    mockLabValues: {
      ferritin: {
        value: 15,
        unit: 'ng/mL',
        severity: 'low',
      },
      iron: {
        value: 45,
        unit: 'µg/dL',
        severity: 'low',
      },
    },
    userMessage:
      'I feel so alone dealing with low iron and constant fatigue. Has anyone else experienced this?',
    expectedInResponse: ['ferritin', 'not alone', 'many women', 'community', 'iron'],
    scenario: 3,
  },
  {
    name: 'Scenario 3b: Venting with High Testosterone',
    description:
      'User vents about hirsutism. Chat should validate with lab data + community support.',
    userId: 'test_user_vent_hirsutism',
    mockLabValues: {
      testosterone_total: {
        value: 75,
        unit: 'ng/dL',
        severity: 'pcos-high',
      },
      dheas: {
        value: 650,
        unit: 'µg/dL',
        severity: 'pcos-high',
      },
    },
    userMessage:
      "I'm so frustrated with excessive facial hair growth. It's embarrassing and affects my self-esteem.",
    expectedInResponse: [
      'testosterone',
      'elevated',
      'hirsutism',
      'not alone',
      'understand',
      'DHEA',
    ],
    scenario: 3,
  },
];

/**
 * Mock saving lab values for test user
 */
async function setupTestUserLabValues(userId, labValues) {
  try {
    logger.info('Setting up test user lab values', {
      userId,
      labCount: Object.keys(labValues).length,
    });

    const mockReportData = {
      filename: 'test_report.pdf',
      reportType: 'lab',
      extractedText: 'Mock lab report for testing',
      labValues: labValues,
      analysis: {
        summary: 'Test lab analysis',
        recommendations: ['Test recommendation 1', 'Test recommendation 2'],
        abnormalValues: [],
        insights: {},
      },
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    const result = await medicalReportService.saveReport(userId, mockReportData);

    if (result.success) {
      logger.info('✅ Test user lab values saved successfully', { userId });
    } else {
      logger.error('❌ Failed to save test user lab values', { userId, error: result.error });
    }

    return result.success;
  } catch (error) {
    logger.error('Error setting up test user', { userId, error: error.message });
    return false;
  }
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  logger.info('\n' + '='.repeat(100));
  logger.info(`TEST: ${scenario.name}`);
  logger.info(`Description: ${scenario.description}`);
  logger.info('='.repeat(100) + '\n');

  try {
    // Step 1: Setup test user with mock lab values
    logger.info('📊 Setting up mock lab values...');
    const setupSuccess = await setupTestUserLabValues(scenario.userId, scenario.mockLabValues);

    if (!setupSuccess) {
      logger.error('❌ FAILED: Could not setup test user lab values');
      return { success: false, scenario: scenario.name };
    }

    // Display lab values
    logger.info('\nMock Lab Values:');
    Object.entries(scenario.mockLabValues).forEach(([name, data]) => {
      logger.info(`  - ${name}: ${data.value} ${data.unit} [${data.severity.toUpperCase()}]`);
    });

    // Step 2: Process chat message
    logger.info(`\n💬 User Message: "${scenario.userMessage}"\n`);
    logger.info('🔄 Processing with enhanced chat chain...\n');

    const startTime = Date.now();

    const response = await chatChain.processMessage(scenario.userMessage, {
      userId: scenario.userId,
      age: 28,
      location: 'Mumbai, India',
      dietaryPreference: 'vegetarian',
      goals: ['manage-symptoms', 'weight-loss'],
    });

    const duration = Date.now() - startTime;

    // Step 3: Display response
    logger.info('✅ Response Generated\n');
    logger.info('=' + '='.repeat(99));
    logger.info('ASSISTANT RESPONSE:');
    logger.info('=' + '='.repeat(99));
    logger.info(response.message.response);
    logger.info('=' + '='.repeat(99) + '\n');

    // Step 4: Analyze response quality
    logger.info('📋 Response Analysis:');
    logger.info(`  - Generation Time: ${duration}ms`);
    logger.info(`  - Response Length: ${response.message.response.length} characters`);

    // Check context usage
    logger.info('\n🔍 Context Used:');
    if (response.contextUsed) {
      Object.entries(response.contextUsed).forEach(([key, value]) => {
        logger.info(`  - ${key}: ${value ? '✅' : '❌'}`);
      });
    }

    // Check sources
    logger.info('\n📚 Sources Retrieved:');
    if (response.sources && response.sources.length > 0) {
      response.sources.forEach((source) => {
        if (source.type === 'medical_report') {
          logger.info(`  ✅ Medical Report: ${source.labCount} lab values`);
        } else if (source.type === 'lab_guidance') {
          logger.info(`  ✅ Lab-Specific Dietary Guidance: ${source.count} documents`);
        } else if (source.type === 'medical') {
          logger.info(`  ✅ General Medical Knowledge: ${source.count} documents`);
        } else if (source.type === 'reddit') {
          logger.info(`  ✅ Reddit Community Insights`);
        } else {
          logger.info(`  ✅ ${source.type}`);
        }
      });
    } else {
      logger.info('  ⚠️ No sources retrieved');
    }

    // Validate expected content
    logger.info('\n✅ Validation Results:');
    let validationsPassed = 0;
    let validationsFailed = 0;

    scenario.expectedInResponse.forEach((expectedTerm) => {
      const found = response.message.response.toLowerCase().includes(expectedTerm.toLowerCase());
      if (found) {
        logger.info(`  ✅ Contains "${expectedTerm}"`);
        validationsPassed++;
      } else {
        logger.warn(`  ⚠️ Missing "${expectedTerm}"`);
        validationsFailed++;
      }
    });

    // Scenario-specific validations
    if (scenario.scenario === 1) {
      logger.info('\n📊 Scenario 1 Validations (Symptom Analysis):');
      const mentionsLabValues = Object.keys(scenario.mockLabValues).some((labName) =>
        response.message.response.toLowerCase().includes(labName.replace(/_/g, ' '))
      );
      logger.info(`  ${mentionsLabValues ? '✅' : '❌'} Response references specific lab values`);

      const explainsPhysiology =
        response.message.response.toLowerCase().includes('cause') ||
        response.message.response.toLowerCase().includes('reason') ||
        response.message.response.toLowerCase().includes('why');
      logger.info(
        `  ${explainsPhysiology ? '✅' : '❌'} Response explains physiological connection`
      );
    }

    if (scenario.scenario === 2) {
      logger.info('\n🎯 Scenario 2 Validations (Treatment Guidance):');
      const providesSpecificFoods =
        response.message.response.toLowerCase().includes('food') ||
        response.message.response.toLowerCase().includes('diet') ||
        response.message.response.toLowerCase().includes('eat');
      logger.info(
        `  ${
          providesSpecificFoods ? '✅' : '❌'
        } Response provides specific dietary recommendations`
      );

      const mentionsCurrentValue = Object.values(scenario.mockLabValues).some((lab) =>
        response.message.response.includes(lab.value.toString())
      );
      logger.info(
        `  ${mentionsCurrentValue ? '✅' : '❌'} Response mentions user's current lab value`
      );
    }

    if (scenario.scenario === 3) {
      logger.info('\n🤝 Scenario 3 Validations (Community Support):');
      const providesValidation =
        response.message.response.toLowerCase().includes('alone') ||
        response.message.response.toLowerCase().includes('many women') ||
        response.message.response.toLowerCase().includes('understand');
      logger.info(`  ${providesValidation ? '✅' : '❌'} Response provides emotional validation`);

      const connectsToLabs =
        response.message.response.toLowerCase().includes('lab') ||
        response.message.response.toLowerCase().includes('value') ||
        Object.keys(scenario.mockLabValues).some((labName) =>
          response.message.response.toLowerCase().includes(labName.replace(/_/g, ' '))
        );
      logger.info(`  ${connectsToLabs ? '✅' : '❌'} Response connects symptoms to lab values`);
    }

    // Check for disclaimers
    logger.info('\n⚠️ Safety Checks:');
    const hasHealthDisclaimer =
      response.message.response.includes('healthcare provider') ||
      response.message.response.includes('doctor') ||
      response.message.response.includes('medical advice');
    logger.info(`  ${hasHealthDisclaimer ? '✅' : '❌'} Includes medical disclaimer`);

    const hasLabDisclaimer = response.message.response.includes('Lab value interpretation');
    logger.info(`  ${hasLabDisclaimer ? '✅' : '⚠️'} Includes lab interpretation disclaimer`);

    // Overall assessment
    logger.info('\n📈 Overall Assessment:');
    const successRate = (validationsPassed / scenario.expectedInResponse.length) * 100;
    logger.info(`  - Validation Success Rate: ${successRate.toFixed(1)}%`);
    logger.info(
      `  - Result: ${
        successRate >= 70 ? '✅ PASSED' : successRate >= 50 ? '⚠️ PARTIAL' : '❌ FAILED'
      }`
    );

    return {
      success: successRate >= 70,
      scenario: scenario.name,
      successRate,
      duration,
    };
  } catch (error) {
    logger.error('❌ Test scenario failed with error', {
      scenario: scenario.name,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

/**
 * Run all test scenarios
 */
async function runAllTests() {
  logger.info('\n' + '🧪'.repeat(50));
  logger.info('LAB-ENHANCED CHAT INTEGRATION TEST SUITE');
  logger.info('🧪'.repeat(50) + '\n');

  const results = [];

  for (const scenario of testScenarios) {
    const result = await runTestScenario(scenario);
    results.push(result);

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  logger.info('\n' + '='.repeat(100));
  logger.info('TEST SUITE SUMMARY');
  logger.info('='.repeat(100) + '\n');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  logger.info(`Total Tests: ${results.length}`);
  logger.info(`✅ Passed: ${passed}`);
  logger.info(`❌ Failed: ${failed}`);
  logger.info(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  results.forEach((result) => {
    logger.info(
      `${result.success ? '✅' : '❌'} ${result.scenario} ${
        result.successRate ? `(${result.successRate.toFixed(1)}%)` : ''
      }`
    );
  });

  logger.info('\n' + '='.repeat(100) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  logger.error('Fatal test error', { error: error.message, stack: error.stack });
  process.exit(1);
});
