// server/scripts/diagnose-retrieval.js
// Quick diagnostic to check vector store retrieval

import { vectorStoreManager } from '../src/langchain/vectorStore.js';
import { retriever } from '../src/langchain/retriever.js';
import { Logger } from '../src/utils/logger.js';

const logger = new Logger('DiagnoseRetrieval');

async function diagnoseRetrieval() {
  try {
    logger.info('=== RETRIEVAL DIAGNOSTIC START ===');

    // Initialize vector store
    await vectorStoreManager.initialize();

    // Test query
    const testQuery = 'Himachal Pradesh breakfast non-vegetarian';

    logger.info('Testing query:', testQuery);

    // Get raw results with different minScore thresholds
    const thresholds = [0.0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.6, 0.65, 0.7];

    for (const minScore of thresholds) {
      const results = await retriever.retrieve(testQuery, { topK: 25, minScore });
      logger.info(`minScore=${minScore}: Retrieved ${results.length} documents`);

      if (results.length > 0 && minScore === 0.0) {
        // Show top 3 scores
        const topScores = results.slice(0, 3).map((r) => r.score?.toFixed(3));
        logger.info(`  Top 3 scores: ${topScores.join(', ')}`);
      }
    }

    // Get cache stats
    const cacheStats = vectorStoreManager.getCacheStats();
    logger.info('Cache stats:', cacheStats);

    logger.info('=== RETRIEVAL DIAGNOSTIC END ===');
    process.exit(0);
  } catch (error) {
    logger.error('Diagnostic failed:', error);
    process.exit(1);
  }
}

diagnoseRetrieval();
