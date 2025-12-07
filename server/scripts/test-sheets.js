import googleSheetsService from '../services/googleSheetsService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
  try {
    console.log('🔍 Testing Google Sheets connection...\n');

    // Verify environment variables
    console.log('Environment Check:');
    console.log(`- GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(
      `- GOOGLE_SERVICE_ACCOUNT_EMAIL: ${
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ Set' : '❌ Missing'
      }\n`
    );

    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID is not set in .env file');
    }

    // Initialize the service
    console.log('Step 1: Initializing service...');
    await googleSheetsService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Create header row (if needed)
    console.log('Step 2: Creating/verifying header row...');
    await googleSheetsService.createHeaderRow();
    console.log('✅ Headers created/verified\n');

    // Test appending a row
    console.log('Step 3: Testing row append...');
    const testData = {
      email: 'test@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.076,
      longitude: 72.8777,
      deviceType: 'Desktop',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test User Agent)',
    };

    await googleSheetsService.appendRow(testData);
    console.log('✅ Test row appended successfully\n');

    // Test duplicate check
    console.log('Step 4: Testing duplicate email check...');
    const isDuplicate = await googleSheetsService.checkDuplicateEmail('test@example.com');
    console.log(
      `✅ Duplicate check result: ${
        isDuplicate ? 'Email found (correct!)' : 'Email not found (unexpected!)'
      }\n`
    );

    if (isDuplicate) {
      console.log('🎉 All tests passed!\n');
      console.log('📊 Check your Google Sheet to see the test data.');
      console.log('You can now delete the test row from the sheet.\n');
    } else {
      console.log('⚠️  Warning: Duplicate check did not find the email we just added.');
      console.log('This might indicate an issue with the duplicate check logic.\n');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Check that google-credentials.json exists in server/config/');
    console.error('2. Verify GOOGLE_SHEET_ID is set in .env');
    console.error('3. Ensure the service account email has Editor access to the Google Sheet');
    console.error('4. Check that Google Sheets API is enabled in Google Cloud Console\n');
    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('  Google Sheets Integration Test');
console.log('═══════════════════════════════════════════════════════\n');

testConnection();
