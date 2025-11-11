/**
 * Clear All Documents from Pinecone
 *
 * Deletes ALL vectors from the Pinecone index to start fresh.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = new Logger('ClearPinecone');

async function clearAllDocuments() {
  try {
    logger.info('🗑️  Starting Pinecone clear operation...\n');

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'pcos-sakhee-rag';
    const index = pinecone.index(indexName);

    // Step 1: Get current stats
    logger.info('📊 Step 1: Checking current document count...');
    const statsBefore = await index.describeIndexStats();
    const countBefore = statsBefore.totalRecordCount || 0;

    logger.info(`Current document count: ${countBefore}\n`);

    if (countBefore === 0) {
      logger.info('✅ Index is already empty. Nothing to delete.');
      return;
    }

    // Step 2: Confirm deletion
    logger.warn(
      `⚠️  WARNING: About to delete ALL ${countBefore} documents from Pinecone index "${indexName}"`
    );
    logger.warn('⚠️  This action CANNOT be undone!\n');

    logger.info('Proceeding with deletion in 3 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 3: Delete all vectors
    logger.info('🗑️  Step 2: Deleting all vectors from Pinecone...\n');

    // Delete all vectors from the default namespace
    await index.namespace('').deleteAll();

    logger.info('✅ Delete command sent to Pinecone');
    logger.info('⏳ Waiting for Pinecone to process deletion (this may take a few seconds)...\n');

    // Step 4: Wait and verify deletion
    await new Promise((resolve) => setTimeout(resolve, 5000));

    logger.info('📊 Step 3: Verifying deletion...\n');
    const statsAfter = await index.describeIndexStats();
    const countAfter = statsAfter.totalRecordCount || 0;

    logger.info(`Document count before: ${countBefore}`);
    logger.info(`Document count after: ${countAfter}`);

    if (countAfter === 0) {
      logger.info('\n✅ SUCCESS! All documents deleted from Pinecone.');
      logger.info('📝 Index is now empty and ready for fresh ingestion.');
    } else {
      logger.warn(`\n⚠️ ${countAfter} documents still remain. Pinecone may still be processing.`);
      logger.warn('Wait a few more seconds and check stats again.');
    }
  } catch (error) {
    logger.error('Clear operation failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Run
clearAllDocuments()
  .then(() => {
    logger.info('\n🎉 Clear operation complete!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  });
