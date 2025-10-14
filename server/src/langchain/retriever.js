// server/src/langchain/retriever.js
// ✅ FIXED: Standardized document structure with both 'content' and 'pageContent'

import { vectorStoreManager } from './vectorStore.js';
import { appConfig } from '../config/appConfig.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Retriever');

class Retriever {
  /**
   * Retrieve relevant documents for a query
   * ✅ FIXED: Returns normalized document structure
   */
  async retrieve(query, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK;
      const minScore = options.minScore || appConfig.rag.minScore;

      // Validate query
      if (!query || typeof query !== 'string') {
        logger.warn('Invalid query provided', { query });
        return [];
      }

      // Get similar documents from vector store
      const results = await vectorStoreManager.similaritySearch(query, topK);

      // Filter by minimum score
      const filtered = results.filter((r) => {
        const score = r?.score ?? 0;
        return score >= minScore;
      });

      logger.info(`🔍 Retrieved ${filtered.length} relevant documents`);

      // ✅ FIXED: Normalize document structure
      return filtered.map((doc) => this.normalizeDocument(doc));
    } catch (error) {
      logger.error('Retrieval failed', { error: error.message, stack: error.stack });
      return [];
    }
  }

  /**
   * Retrieve documents by specific type
   */
  async retrieveByType(query, documentType, options = {}) {
    try {
      const results = await this.retrieve(query, options);

      // Filter by document type
      const filtered = results.filter((r) => {
        const docType = r?.metadata?.type;
        return docType === documentType;
      });

      logger.info(`🔍 Retrieved ${filtered.length} documents of type '${documentType}'`);

      return filtered;
    } catch (error) {
      logger.error('Type-based retrieval failed', { error: error.message });
      return [];
    }
  }

  /**
   * ✅ NEW: Normalize document structure to support both formats
   * Ensures compatibility with LangChain and custom code
   */
  normalizeDocument(doc) {
    if (!doc) {
      return {
        content: '',
        pageContent: '',
        metadata: {},
        score: 0,
      };
    }

    // Extract content (handles both property names)
    const content = doc.content || doc.pageContent || '';

    // Ensure content is a string
    const normalizedContent = typeof content === 'string' ? content : String(content);

    return {
      // Provide both property names for maximum compatibility
      content: normalizedContent,
      pageContent: normalizedContent,
      metadata: doc.metadata || {},
      score: doc.score ?? 0,
    };
  }

  /**
   * ✅ FIXED: Format context with defensive programming
   */
  formatContextFromResults(results) {
    if (!results || !Array.isArray(results)) {
      logger.warn('Invalid results provided to formatContextFromResults');
      return '';
    }

    if (results.length === 0) {
      return '';
    }

    return results
      .map((result, idx) => {
        try {
          // Safe extraction of content and metadata
          const content = result?.content || result?.pageContent || '';
          const source = result?.metadata?.source || 'Unknown Source';
          const type = result?.metadata?.type || 'unknown';

          return `[${idx + 1}] ${content}\n(Source: ${source} | Type: ${type})`;
        } catch (error) {
          logger.warn(`Error formatting result ${idx}`, { error: error.message });
          return `[${idx + 1}] [Error retrieving content]`;
        }
      })
      .join('\n\n');
  }

  /**
   * ✅ NEW: Get retrieval statistics
   */
  async getStats() {
    try {
      const vectorStore = vectorStoreManager.getVectorStore();

      return {
        initialized: !!vectorStore,
        status: 'ready',
      };
    } catch (error) {
      logger.error('Failed to get retriever stats', { error: error.message });
      return {
        initialized: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * ✅ NEW: Clear memory/cache (if needed for testing)
   */
  async clearCache() {
    try {
      logger.info('Clearing retriever cache...');
      // Add cache clearing logic if implemented
      return true;
    } catch (error) {
      logger.error('Failed to clear cache', { error: error.message });
      return false;
    }
  }
}

export const retriever = new Retriever();
export default retriever;
