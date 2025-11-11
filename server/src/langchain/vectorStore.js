import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { embeddingsManager } from './embeddings.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('VectorStore');

class VectorStoreManager {
  constructor() {
    this.vectorStore = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'pcos-sakhee-rag';
    this.pineconeApiKey = process.env.PINECONE_API_KEY;
    this.pineconeClient = null;
    this.pineconeIndex = null;
    this.isInitialized = false;
  }

  /**
   * Initialize vector store with Pinecone
   * Creates or connects to existing Pinecone index
   */
  async initialize() {
    try {
      // Prevent multiple initializations
      if (this.isInitialized && this.vectorStore) {
        logger.info('✅ Vector store already initialized');
        return this.vectorStore;
      }

      // Validate Pinecone credentials
      if (!this.pineconeApiKey) {
        throw new Error('Missing Pinecone API key. Please set PINECONE_API_KEY in .env');
      }

      logger.info('📦 Initializing Pinecone vector store...', {
        indexName: this.indexName,
      });

      // Initialize Pinecone client
      this.pineconeClient = new Pinecone({
        apiKey: this.pineconeApiKey,
      });

      // Get the index
      this.pineconeIndex = this.pineconeClient.index(this.indexName);

      // Create LangChain vector store with Pinecone
      this.vectorStore = await PineconeStore.fromExistingIndex(embeddingsManager.getEmbeddings(), {
        pineconeIndex: this.pineconeIndex,
        namespace: '', // Use default namespace
      });

      this.isInitialized = true;

      // Get index stats
      try {
        const stats = await this.pineconeIndex.describeIndexStats();
        const totalVectors = stats.totalRecordCount || 0;
        logger.info(`✅ Pinecone ready: ${totalVectors} documents in index "${this.indexName}"`);
      } catch (e) {
        logger.info(`✅ Pinecone ready with index "${this.indexName}"`);
      }

      return this.vectorStore;
    } catch (error) {
      logger.error('Pinecone initialization failed', {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Add documents to Pinecone vector store
   * Pinecone automatically persists data - no manual save needed
   * Handles batching for optimal performance
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

      // ✅ Normalize documents to LangChain format
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

          // Normalize metadata - Pinecone accepts various types
          // Convert arrays to comma-separated strings for better queryability
          const normalizedMetadata = {};
          if (doc.metadata && typeof doc.metadata === 'object') {
            for (const [key, value] of Object.entries(doc.metadata)) {
              if (Array.isArray(value)) {
                // Convert arrays to comma-separated strings
                normalizedMetadata[key] = value.join(', ');
              } else if (typeof value === 'object' && value !== null) {
                // Convert objects to JSON strings
                normalizedMetadata[key] = JSON.stringify(value);
              } else {
                // Keep scalar values as-is
                normalizedMetadata[key] = value;
              }
            }
          }

          return {
            pageContent: normalizedContent, // LangChain standard property
            metadata: normalizedMetadata,
          };
        })
        .filter(Boolean); // Remove null entries

      if (docs.length === 0) {
        logger.warn('No valid documents after normalization');
        return false;
      }

      // ✅ Batch documents for optimal performance
      const BATCH_SIZE = 100; // Pinecone recommends 100-200 per batch
      const totalDocs = docs.length;

      if (totalDocs <= BATCH_SIZE) {
        // Small batch - add directly
        await this.vectorStore.addDocuments(docs);
        logger.info(`📝 Added ${docs.length} documents to Pinecone`);
      } else {
        // Large batch - split into chunks
        logger.info(
          `📦 Batching ${totalDocs} documents (${Math.ceil(
            totalDocs / BATCH_SIZE
          )} batches of ${BATCH_SIZE})`
        );

        for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
          const batch = docs.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(totalDocs / BATCH_SIZE);

          logger.info(
            `📝 Uploading batch ${batchNum}/${totalBatches} (${batch.length} documents)...`
          );
          await this.vectorStore.addDocuments(batch);
        }

        logger.info(
          `✅ Successfully added all ${totalDocs} documents in ${Math.ceil(
            totalDocs / BATCH_SIZE
          )} batches`
        );
      }

      return true;
    } catch (error) {
      logger.error('Failed to add documents to Pinecone', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Perform similarity search with Pinecone
   * Returns documents with normalized output structure
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

      // Perform similarity search using LangChain's PineconeStore
      const results = await this.vectorStore.similaritySearchWithScore(query, k);

      // ✅ Return normalized document structure
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
   * Save vector store (no-op for Pinecone as it auto-persists)
   * Kept for backwards compatibility with ingestion scripts
   */
  async save() {
    // Pinecone automatically persists data - no manual save needed
    logger.info('💾 Pinecone auto-persists data (no manual save needed)');
    return true;
  }

  /**
   * Get vector store instance
   */
  getVectorStore() {
    return this.vectorStore;
  }

  /**
   * Check if vector store is ready
   */
  isReady() {
    return this.isInitialized && this.vectorStore !== null;
  }

  /**
   * Get vector store statistics
   */
  async getStats() {
    try {
      let docCount = 'unknown';

      if (this.pineconeIndex) {
        try {
          const stats = await this.pineconeIndex.describeIndexStats();
          docCount = stats.totalRecordCount || 0;
        } catch (e) {
          // Ignore stats errors
        }
      }

      return {
        initialized: this.isInitialized,
        hasVectorStore: !!this.vectorStore,
        indexName: this.indexName,
        documentCount: docCount,
        embeddingCache: embeddingsManager.getCacheStats(),
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
   * Get embedding cache statistics
   */
  getCacheStats() {
    return embeddingsManager.getCacheStats();
  }

  /**
   * Clear vector store (delete all vectors from Pinecone index)
   */
  async clear() {
    try {
      logger.warn('⚠️  Clearing Pinecone index...');

      if (this.pineconeIndex) {
        try {
          // Delete all vectors in the namespace
          await this.pineconeIndex.namespace('').deleteAll();
          logger.info(`✅ Deleted all vectors from Pinecone index "${this.indexName}"`);
        } catch (e) {
          logger.warn('Could not clear index:', e.message);
        }
      }

      // Reset state
      this.vectorStore = null;
      this.isInitialized = false;

      // Re-initialize
      await this.initialize();

      logger.info('✅ Pinecone index cleared and reinitialized');
      return true;
    } catch (error) {
      logger.error('Failed to clear Pinecone index', { error: error.message });
      return false;
    }
  }
}

export const vectorStoreManager = new VectorStoreManager();
export default vectorStoreManager;
