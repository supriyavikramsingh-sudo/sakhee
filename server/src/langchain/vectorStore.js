import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { embeddingsManager } from './embeddings.js';
import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('VectorStore');

class VectorStoreManager {
  constructor() {
    this.vectorStore = null;
    this.dbPath = './src/storage/localCache/vectordb';
    this.isInitialized = false;
  }

  /**
   * Initialize vector store
   * Loads existing vector store from disk or creates a new one
   */
  async initialize() {
    try {
      // Prevent multiple initializations
      if (this.isInitialized && this.vectorStore) {
        logger.info('Vector store already initialized');
        return this.vectorStore;
      }

      // Try to load existing vector store
      if (fs.existsSync(this.dbPath)) {
        logger.info('📦 Loading existing vector store...');
        this.vectorStore = await HNSWLib.load(this.dbPath, embeddingsManager.getEmbeddings());
        this.isInitialized = true;
        logger.info('✅ Vector store loaded successfully');
      } else {
        // Create new vector store
        logger.info('📦 Creating new vector store...');
        this.vectorStore = new HNSWLib(embeddingsManager.getEmbeddings(), {
          space: 'cosine',
        });
        this.isInitialized = true;
        logger.info('✅ New vector store created');
      }

      return this.vectorStore;
    } catch (error) {
      logger.error('Vector store initialization failed', {
        error: error.message,
        stack: error.stack,
      });

      // Create fallback empty vector store
      try {
        this.vectorStore = new HNSWLib(embeddingsManager.getEmbeddings(), {
          space: 'cosine',
        });
        this.isInitialized = true;
        logger.warn('⚠️  Fallback vector store created');
      } catch (fallbackError) {
        logger.error('Fallback vector store creation failed', {
          error: fallbackError.message,
        });
        this.isInitialized = false;
      }

      return this.vectorStore;
    }
  }

  /**
   * Add documents to vector store
   * ✅ FIXED: Properly normalizes document structure before adding
   */
  async addDocuments(documents) {
    try {
      // Validate input
      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        logger.warn('No valid documents provided to addDocuments');
        return false;
      }

      // Ensure vector store is initialized
      if (!this.vectorStore) {
        await this.initialize();
      }

      // ✅ FIXED: Normalize documents to LangChain format
      const docs = documents
        .map((doc, idx) => {
          // Validate document structure
          if (!doc || typeof doc !== 'object') {
            logger.warn(`Invalid document at index ${idx}`, { doc });
            return null;
          }

          // Extract content (handle both property names)
          const content = doc.content || doc.pageContent || '';

          // Ensure content is a string
          const normalizedContent = typeof content === 'string' ? content : String(content);

          return {
            pageContent: normalizedContent, // LangChain standard property
            metadata: {
              source: doc.source || doc.metadata?.source || 'unknown',
              type: doc.type || doc.metadata?.type || 'general',
              id: doc.id || doc.metadata?.id || idx,
              ...(doc.metadata || {}),
            },
          };
        })
        .filter(Boolean); // Remove null entries

      if (docs.length === 0) {
        logger.warn('No valid documents after normalization');
        return false;
      }

      await this.vectorStore.addDocuments(docs);
      logger.info(`📝 Added ${docs.length} documents to vector store`);

      // Save to disk
      await this.save();

      return true;
    } catch (error) {
      logger.error('Failed to add documents', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * ✅ CRITICAL FIX: Perform similarity search with normalized output
   * This is the key method that was causing the substring error
   * Now returns documents with BOTH 'content' and 'pageContent' properties
   */
  async similaritySearch(query, k = 5) {
    try {
      // Validate query
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        logger.warn('Invalid query provided to similaritySearch', { query });
        return [];
      }

      // Ensure vector store is initialized
      if (!this.vectorStore) {
        await this.initialize();
      }

      // Check if vector store is ready
      if (!this.isInitialized || !this.vectorStore) {
        logger.warn('Vector store not properly initialized');
        return [];
      }

      // Perform similarity search
      const results = await this.vectorStore.similaritySearchWithScore(query, k);

      // ✅ CRITICAL FIX: Return normalized document structure
      // This ensures compatibility with both chatChain (expects pageContent)
      // and custom code (expects content)
      return results.map(([doc, score]) => {
        // Safe extraction of content
        const content = doc?.pageContent || '';

        return {
          // Provide BOTH property names for maximum compatibility
          content: content, // For custom code
          pageContent: content, // For LangChain standard
          metadata: doc?.metadata || {},
          score: score ?? 0,
        };
      });
    } catch (error) {
      logger.error('Similarity search failed', {
        error: error.message,
        query: query?.substring(0, 100),
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Save vector store to disk
   */
  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await this.vectorStore.save(this.dbPath);
      logger.info('💾 Vector store saved to disk');
      return true;
    } catch (error) {
      logger.warn('Vector store save failed (non-critical)', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get vector store instance
   */
  getVectorStore() {
    return this.vectorStore;
  }

  /**
   * ✅ NEW: Check if vector store is ready
   */
  isReady() {
    return this.isInitialized && this.vectorStore !== null;
  }

  /**
   * ✅ NEW: Get vector store statistics
   */
  async getStats() {
    try {
      return {
        initialized: this.isInitialized,
        hasVectorStore: !!this.vectorStore,
        dbPath: this.dbPath,
        dbExists: fs.existsSync(this.dbPath),
      };
    } catch (error) {
      logger.error('Failed to get stats', { error: error.message });
      return {
        initialized: false,
        hasVectorStore: false,
        error: error.message,
      };
    }
  }

  /**
   * ✅ NEW: Clear vector store (useful for testing/debugging)
   */
  async clear() {
    try {
      logger.warn('Clearing vector store...');

      // Remove saved files
      if (fs.existsSync(this.dbPath)) {
        fs.rmSync(this.dbPath, { recursive: true, force: true });
        logger.info('Deleted vector store files');
      }

      // Reset state
      this.vectorStore = null;
      this.isInitialized = false;

      // Re-initialize
      await this.initialize();

      logger.info('Vector store cleared and reinitialized');
      return true;
    } catch (error) {
      logger.error('Failed to clear vector store', { error: error.message });
      return false;
    }
  }
}

export const vectorStoreManager = new VectorStoreManager();
export default vectorStoreManager;
