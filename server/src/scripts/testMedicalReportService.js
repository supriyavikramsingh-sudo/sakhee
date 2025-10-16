/**
 * Test Script for Medical Report Service
 * Run with: node server/src/scripts/testMedicalReportService.js
 */

import { medicalReportService } from '../services/medicalReportService.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('MedicalReportServiceTest');

async function runTests() {
  const testUserId = 'test_user_123';

  try {
    logger.info('🧪 Starting Medical Report Service Tests...');

    // Test 1: Check if user has report (should be false initially)
    logger.info('\n📋 Test 1: Check if user has report');
    const hasReport1 = await medicalReportService.hasReport(testUserId);
    logger.info('Result:', hasReport1);

    // Test 2: Save a test report
    logger.info('\n📋 Test 2: Save test report');
    const testReport = {
      filename: 'test_lab_report.pdf',
      reportType: 'lab',
      extractedText: 'Test lab values: TSH: 2.5, Glucose: 95',
      labValues: {
        TSH: { value: 2.5, unit: 'mIU/L' },
        Glucose: { value: 95, unit: 'mg/dL' },
      },
      analysis: {
        summary: 'Test analysis summary',
        recommendations: ['Test recommendation 1'],
      },
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    const saveResult = await medicalReportService.saveReport(testUserId, testReport);
    logger.info('Save result:', saveResult);

    // Test 3: Get the saved report
    logger.info('\n📋 Test 3: Get saved report');
    const getResult = await medicalReportService.getUserReport(testUserId);
    logger.info('Get result:', getResult);

    // Test 4: Check if user has report (should be true now)
    logger.info('\n📋 Test 4: Check if user has report (after save)');
    const hasReport2 = await medicalReportService.hasReport(testUserId);
    logger.info('Result:', hasReport2);

    // Test 5: Get lab values
    logger.info('\n📋 Test 5: Get lab values');
    const labValues = await medicalReportService.getLabValues(testUserId);
    logger.info('Lab values:', labValues);

    // Test 6: Update analysis
    logger.info('\n📋 Test 6: Update analysis');
    const newAnalysis = {
      summary: 'Updated analysis summary',
      recommendations: ['Updated recommendation 1', 'Updated recommendation 2'],
    };
    const updateResult = await medicalReportService.updateReportAnalysis(testUserId, newAnalysis);
    logger.info('Update result:', updateResult);

    // Test 7: Save new report (should replace previous)
    logger.info('\n📋 Test 7: Save new report (replacement test)');
    const newReport = {
      filename: 'new_lab_report.pdf',
      reportType: 'lab',
      extractedText: 'New lab values: TSH: 3.0, Glucose: 100',
      labValues: {
        TSH: { value: 3.0, unit: 'mIU/L' },
        Glucose: { value: 100, unit: 'mg/dL' },
      },
      analysis: {
        summary: 'New analysis summary',
        recommendations: ['New recommendation 1'],
      },
      fileSize: 2048,
      mimeType: 'application/pdf',
    };

    const replaceResult = await medicalReportService.saveReport(testUserId, newReport);
    logger.info('Replace result:', replaceResult);

    // Test 8: Verify replacement (should only have new report)
    logger.info('\n📋 Test 8: Verify replacement');
    const verifyResult = await medicalReportService.getUserReport(testUserId);
    logger.info('Current report filename:', verifyResult.data?.filename);
    logger.info('Should be: new_lab_report.pdf');

    // Test 9: Delete report
    logger.info('\n📋 Test 9: Delete report');
    const deleteResult = await medicalReportService.deleteReport(testUserId);
    logger.info('Delete result:', deleteResult);

    // Test 10: Verify deletion
    logger.info('\n📋 Test 10: Verify deletion');
    const hasReport3 = await medicalReportService.hasReport(testUserId);
    logger.info('Has report after deletion:', hasReport3);

    logger.info('\n✅ All tests completed!');
    logger.info('\n⚠️  Note: This script tests the service layer. To clean up test data:');
    logger.info('   - Go to Firebase Console');
    logger.info(`   - Navigate to users/${testUserId}/medicalReport`);
    logger.info('   - Delete any test documents');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
