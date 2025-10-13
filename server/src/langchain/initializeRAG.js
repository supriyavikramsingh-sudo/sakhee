import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vectorStoreManager } from './vectorStore.js';
import { embeddingsManager } from './embeddings.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RAG-Init');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize RAG system on server startup
 * Checks if vector store exists, if not - triggers ingestion
 */
export async function initializeRAG() {
  try {
    logger.info('🚀 Initializing RAG system...');

    const vectorDbPath = path.join(__dirname, '../storage/localCache/vectordb');
    const templatesPath = path.join(__dirname, '../data/meal_templates');

    // Check if vector store exists
    const vectorStoreExists = fs.existsSync(vectorDbPath);
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
      logger.info('💡 Add template files and run: npm run ingest:meals');
      return false;
    }

    logger.info(`📂 Found ${templateFiles.length} template files: ${templateFiles.join(', ')}`);

    // Initialize embeddings and vector store
    await embeddingsManager.initialize();
    await vectorStoreManager.initialize();

    if (!vectorStoreExists) {
      logger.warn('⚠️  Vector store not found. Run ingestion script first:');
      logger.info('   npm run ingest:meals');
      logger.info('💡 Server will start but meal plan generation may use fallback templates');
      return false;
    }

    // Test retrieval to verify vector store is working
    try {
      const testResults = await vectorStoreManager.similaritySearch('breakfast', 1);
      if (testResults.length > 0) {
        logger.info('✅ RAG system initialized successfully');
        logger.info(`📊 Vector store loaded with indexed meal templates`);
        return true;
      } else {
        logger.warn('⚠️  Vector store exists but appears empty. Consider re-ingesting:');
        logger.info('   npm run ingest:meals');
        return false;
      }
    } catch (error) {
      logger.error('Vector store test failed', { error: error.message });
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
 */
export async function getRAGStatus() {
  try {
    const vectorDbPath = path.join(__dirname, '../storage/localCache/vectordb');
    const templatesPath = path.join(__dirname, '../data/meal_templates');

    const vectorStoreExists = fs.existsSync(vectorDbPath);
    const templatesExist = fs.existsSync(templatesPath);

    let templateCount = 0;
    let templateFiles = [];

    if (templatesExist) {
      templateFiles = fs.readdirSync(templatesPath).filter((file) => file.endsWith('.txt'));
      templateCount = templateFiles.length;
    }

    let indexedDocuments = 0;
    let testQuery = null;

    if (vectorStoreExists && vectorStoreManager.vectorStore) {
      try {
        const results = await vectorStoreManager.similaritySearch('test', 1);
        testQuery = results.length > 0;
        // Approximate document count (not directly available in HNSWLib)
        indexedDocuments = '~' + templateCount * 25; // Estimate based on avg meals per template
      } catch (error) {
        testQuery = false;
      }
    }

    return {
      vectorStoreExists,
      templatesExist,
      templateCount,
      templateFiles,
      indexedDocuments,
      retrievalWorks: testQuery,
      status: vectorStoreExists && testQuery ? 'ready' : 'needs-ingestion',
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
 * Check if vector store needs refresh
 * Compares last modified time of templates vs vector store
 */
export async function needsRefresh() {
  try {
    const vectorDbPath = path.join(__dirname, '../storage/localCache/vectordb');
    const templatesPath = path.join(__dirname, '../data/meal_templates');

    if (!fs.existsSync(vectorDbPath) || !fs.existsSync(templatesPath)) {
      return true;
    }

    const vectorStats = fs.statSync(vectorDbPath);
    const templateFiles = fs
      .readdirSync(templatesPath)
      .filter((file) => file.endsWith('.txt'))
      .map((file) => path.join(templatesPath, file));

    // Check if any template file is newer than vector store
    for (const templateFile of templateFiles) {
      const templateStats = fs.statSync(templateFile);
      if (templateStats.mtime > vectorStats.mtime) {
        logger.info(`🔄 Template file ${path.basename(templateFile)} is newer than vector store`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('Failed to check refresh status', { error: error.message });
    return false;
  }
}

export default { initializeRAG, getRAGStatus, needsRefresh };
