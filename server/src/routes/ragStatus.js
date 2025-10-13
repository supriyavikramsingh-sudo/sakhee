import express from 'express';
import { getRAGStatus, needsRefresh } from '../langchain/initializeRAG.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('RAG-Status');

/**
 * GET /api/rag/status
 * Get RAG system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getRAGStatus();
    const needsUpdate = await needsRefresh();

    res.json({
      success: true,
      data: {
        ...status,
        needsRefresh: needsUpdate,
        recommendation: getRecommendation(status, needsUpdate),
      },
    });
  } catch (error) {
    logger.error('Failed to get RAG status', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get RAG status' },
    });
  }
});

/**
 * GET /api/rag/health
 * Quick health check for RAG system
 */
router.get('/health', async (req, res) => {
  try {
    const status = await getRAGStatus();

    if (status.status === 'ready') {
      res.json({
        success: true,
        message: 'RAG system is healthy',
        status: 'ready',
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'RAG system needs attention',
        status: status.status,
        recommendation: getRecommendation(status, false),
      });
    }
  } catch (error) {
    logger.error('RAG health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'RAG health check failed',
      error: error.message,
    });
  }
});

/**
 * Helper to generate recommendations
 */
function getRecommendation(status, needsUpdate) {
  if (status.status === 'error') {
    return 'Critical error in RAG system. Check logs and restart server.';
  }

  if (!status.templatesExist) {
    return 'Create server/src/data/meal_templates/ folder and add .txt template files.';
  }

  if (status.templateCount === 0) {
    return 'Add meal template .txt files to server/src/data/meal_templates/.';
  }

  if (!status.vectorStoreExists) {
    return 'Run: npm run ingest:meals (vector store not created yet)';
  }

  if (!status.retrievalWorks) {
    return 'Vector store exists but not working. Re-run: npm run ingest:meals';
  }

  if (needsUpdate) {
    return 'Templates updated. Run: npm run ingest:meals to refresh vector store.';
  }

  return 'RAG system is healthy. All templates indexed and retrieval working.';
}

export default router;
