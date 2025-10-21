import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Initialize __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Logger } from '../utils/logger.js';

const logger = new Logger('MasterIngestion');

/**
 * Run a script and log its output
 */
async function runScript(scriptName, description) {
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`🚀 Starting: ${description}`);
  logger.info(`${'='.repeat(60)}\n`);

  try {
    const scriptPath = path.join(__dirname, scriptName);
    // Properly quote the path to handle spaces
    const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    logger.info(`\n✅ ${description} completed successfully!\n`);
    return true;
  } catch (error) {
    logger.error(`❌ ${description} failed:`, { error: error.message });
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

/**
 * Main ingestion flow
 */
async function ingestAll() {
  logger.info('🎬 Starting complete RAG system ingestion...');
  logger.info('This will ingest: Meal Templates, Medical Knowledge, and Nutritional Data\n');

  const startTime = Date.now();
  const results = {
    meals: false,
    medical: false,
    nutritional: false,
  };

  // Step 1: Ingest Meal Templates
  results.meals = await runScript('ingestMealTemplates.js', 'Meal Template Ingestion');

  // Step 2: Ingest Medical Knowledge
  results.medical = await runScript('ingestMedicalKnowledge.js', 'Medical Knowledge Ingestion');

  // Step 3: Ingest Nutritional Data
  results.nutritional = await runScript('ingestNutritionalData.js', 'Nutritional Data Ingestion');

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logger.info('\n' + '='.repeat(60));
  logger.info('📊 INGESTION SUMMARY');
  logger.info('='.repeat(60));
  logger.info(`Meal Templates:    ${results.meals ? '✅ SUCCESS' : '❌ FAILED'}`);
  logger.info(`Medical Knowledge: ${results.medical ? '✅ SUCCESS' : '❌ FAILED'}`);
  logger.info(`Nutritional Data:  ${results.nutritional ? '✅ SUCCESS' : '❌ FAILED'}`);
  logger.info(`Total Duration:    ${duration}s`);
  logger.info('='.repeat(60));

  const allSuccess = results.meals && results.medical && results.nutritional;

  if (allSuccess) {
    logger.info('\n🎉 Complete RAG system ingestion successful!');
    logger.info('✅ All knowledge sources are now available in the vector store.');
    logger.info('\n💡 Next steps:');
    logger.info('   1. Start your server: npm run dev');
    logger.info('   2. Check RAG status: curl http://localhost:5000/api/rag/status');
    logger.info('   3. Test the chat interface with PCOS questions');
  } else {
    logger.warn('\n⚠️  Some ingestion tasks failed. Please check the logs above.');
    logger.info('💡 You can re-run individual scripts:');
    if (!results.meals) logger.info('   - npm run ingest:meals');
    if (!results.medical) logger.info('   - npm run ingest:medical');
    if (!results.nutritional) logger.info('   - npm run ingest:nutritional');
  }

  process.exit(allSuccess ? 0 : 1);
}

// Run master ingestion
ingestAll().catch((error) => {
  logger.error('Master ingestion failed', { error: error.message });
  process.exit(1);
});
