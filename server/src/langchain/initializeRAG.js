import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vectorStoreManager } from './vectorStore.js';
import { embeddingsManager } from './embeddings.js';
import { Logger } from '../utils/logger.js';
import { Pinecone } from '@pinecone-database/pinecone';

const logger = new Logger('RAG-Init');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize RAG system on server startup
 * Connects to Pinecone and verifies documents are indexed
 */
export async function initializeRAG() {
  try {
    logger.info('🚀 Initializing RAG system...');

    const templatesPath = path.join(__dirname, '../data/meal_templates');

    // Check if data files exist
    const templatesExist = fs.existsSync(templatesPath);

    if (!templatesExist) {
      logger.warn('⚠️  No meal_templates folder found. Creating it...');
      fs.mkdirSync(templatesPath, { recursive: true });
      logger.info('✅ meal_templates folder created. Please add .txt template files and restart.');
      return false;
    }

    // Count template files
    const templateFiles = fs.readdirSync(templatesPath).filter((file) => file.endsWith('.txt'));

    if (templateFiles.length === 0) {
      logger.warn('⚠️  No .txt template files found in meal_templates/');
      logger.info('💡 Add template files and run: npm run ingest:all');
      return false;
    }

    logger.info(`📂 Found ${templateFiles.length} template files: ${templateFiles.join(', ')}`);

    // Initialize embeddings and Pinecone vector store
    await embeddingsManager.initialize();
    await vectorStoreManager.initialize();

    // Check Pinecone document count
    try {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'pcos-sakhee-rag');
      const stats = await index.describeIndexStats();
      const totalDocs = stats.totalRecordCount || 0;

      if (totalDocs === 0) {
        logger.warn('⚠️  Pinecone index is empty. Run ingestion scripts:');
        logger.info('   npm run ingest:all');
        logger.info('💡 Server will start but meal plan generation may use fallback templates');
        return false;
      }

      logger.info(`✅ RAG system initialized successfully`);
      logger.info(`📊 Pinecone index contains ${totalDocs} documents`);

      // Test retrieval to verify vector store is working
      const testResults = await vectorStoreManager.similaritySearch('breakfast', 1);
      if (testResults.length > 0) {
        logger.info('✅ Retrieval test successful');
        return true;
      } else {
        logger.warn('⚠️  Retrieval test returned no results. Consider re-ingesting:');
        logger.info('   npm run ingest:all');
        return false;
      }
    } catch (error) {
      logger.error('Pinecone connection failed', { error: error.message });
      logger.warn('⚠️  Server will continue with fallback templates');
      return false;
    }
  } catch (error) {
    logger.error('RAG initialization failed', { error: error.message, stack: error.stack });
    logger.warn('⚠️  Server will continue with fallback meal templates');
    return false;
  }
}

/**
 * Get RAG system status
 * Checks Pinecone index stats and data files
 */
export async function getRAGStatus() {
  try {
    const templatesPath = path.join(__dirname, '../data/meal_templates');
    const templatesExist = fs.existsSync(templatesPath);

    let templateCount = 0;
    let templateFiles = [];

    if (templatesExist) {
      templateFiles = fs.readdirSync(templatesPath).filter((file) => file.endsWith('.txt'));
      templateCount = templateFiles.length;
    }

    // Get Pinecone stats
    let indexedDocuments = 0;
    let testQuery = null;
    let pineconeConnected = false;

    try {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'pcos-sakhee-rag');
      const stats = await index.describeIndexStats();
      indexedDocuments = stats.totalRecordCount || 0;
      pineconeConnected = true;

      // Test retrieval
      if (vectorStoreManager.vectorStore) {
        const results = await vectorStoreManager.similaritySearch('test', 1);
        testQuery = results.length > 0;
      }
    } catch (error) {
      logger.error('Failed to get Pinecone stats', { error: error.message });
      pineconeConnected = false;
      testQuery = false;
    }

    return {
      pineconeConnected,
      templatesExist,
      templateCount,
      templateFiles,
      indexedDocuments,
      retrievalWorks: testQuery,
      status: pineconeConnected && indexedDocuments > 0 && testQuery ? 'ready' : 'needs-ingestion',
    };
  } catch (error) {
    logger.error('Failed to get RAG status', { error: error.message });
    return {
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Check if data files have been modified
 * Compares template file timestamps to determine if re-ingestion is needed
 */
export async function needsRefresh() {
  try {
    const templatesPath = path.join(__dirname, '../data/meal_templates');

    if (!fs.existsSync(templatesPath)) {
      return true;
    }

    // Get Pinecone stats to check last update time
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'pcos-sakhee-rag');
    const stats = await index.describeIndexStats();

    // If no documents, definitely needs refresh
    if (!stats.totalRecordCount || stats.totalRecordCount === 0) {
      logger.info('🔄 Pinecone index is empty - needs ingestion');
      return true;
    }

    // Check if template files exist
    const templateFiles = fs
      .readdirSync(templatesPath)
      .filter((file) => file.endsWith('.txt'))
      .map((file) => path.join(templatesPath, file));

    if (templateFiles.length === 0) {
      logger.info('🔄 No template files found - needs ingestion');
      return true;
    }

    // Note: Without a local timestamp for Pinecone updates, we can't automatically
    // detect if templates have been modified. This would require storing ingestion
    // timestamps in Pinecone metadata or a separate database.
    // For now, we'll just check if documents exist.

    return false;
  } catch (error) {
    logger.error('Failed to check refresh status', { error: error.message });
    return false;
  }
}

export default { initializeRAG, getRAGStatus, needsRefresh };
